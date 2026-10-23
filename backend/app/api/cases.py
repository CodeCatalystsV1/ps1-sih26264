from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from backend.app.core.database import get_db
from backend.app.api.deps import get_current_user, require_roles
from backend.app.core.permissions import RoleCode, user_has_role, enforce_user_bureau_or_admin, enforce_user_region_or_admin
from backend.app.models.entities import (
    User, Case, Institution, Bureau, WorkflowHistory, Assignment, Transfer, Document, OverlapFlag, CaseRelationship
)
from backend.app.schemas.all_schemas import (
    CaseOut, CaseDetailOut, CaseCreate, CaseStatusUpdate, CaseActionCreate,
    WorkflowHistoryOut, AssignmentOut, TransferOut, DocumentOut, CaseSimpleOut
)
from backend.app.services.case_service import update_case_status, record_case_action
from backend.app.services.complaint_service import generate_case_reference
from backend.app.services.deadline_service import calculate_case_deadline
from backend.app.services.overlap_service import detect_overlaps_for_institution

router = APIRouter(prefix="/cases", tags=["Cases"])

def enrich_case_out(case: Case) -> CaseOut:
    now = datetime.now(timezone.utc)
    out = CaseOut.model_validate(case)
    out.institution_name = case.institution.institution_name if case.institution else "N/A"
    out.permanent_id = case.institution.permanent_id if case.institution else "N/A"
    out.institution_region = case.institution.region.name if (case.institution and case.institution.region) else None
    out.current_bureau_name = case.current_bureau.name if case.current_bureau else "N/A"
    out.current_bureau_code = case.current_bureau.code if case.current_bureau else "N/A"
    out.current_officer_name = case.current_officer.display_name if case.current_officer else "Unassigned"

    # Deadline status
    if case.applicable_deadline_at:
        dl = case.applicable_deadline_at
        if dl.tzinfo is None:
            dl = dl.replace(tzinfo=timezone.utc)
        out.is_overdue = now > dl
        out.days_remaining = (dl - now).days
        out.deadline_status_label = f"Overdue by {abs(out.days_remaining)} days" if out.is_overdue else f"{out.days_remaining} days remaining"
    else:
        out.is_overdue = False
        out.days_remaining = None
        out.deadline_status_label = "Deadline not configured"

    # Overlap indicator
    overlap = case.institution.overlap_flags if case.institution else []
    active_overlaps = [f for f in overlap if f.relationship_state in ["POTENTIAL_OVERLAP", "UNDER_REVIEW", "COORDINATION_REQUESTED", "JOINT_ACTION_IN_PROGRESS", "ESCALATED"]]
    out.has_potential_overlap = len(active_overlaps) > 0

    # Linked complaints
    out.linked_complaint_ids = [l.complaint_id for l in case.complaint_links]
    out.linked_complaint_refs = [l.complaint.complaint_reference for l in case.complaint_links if l.complaint]

    return out

@router.get("", response_model=List[CaseOut])
def list_cases(
    search: Optional[str] = Query(None),
    institution_id: Optional[int] = Query(None),
    bureau_id: Optional[int] = Query(None),
    region_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    officer_id: Optional[int] = Query(None),
    is_overdue: Optional[bool] = Query(None),
    has_overlap: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Case)

    # Regional / Bureau scoping
    user_roles = [r.code for r in current_user.roles]
    if RoleCode.REGIONAL_OFFICE in user_roles and RoleCode.ADMIN not in user_roles:
        reg_ids = [ba.region_id for ba in current_user.bureau_assignments if ba.region_id is not None]
        if reg_ids:
            query = query.join(Institution).filter(Institution.region_id.in_(reg_ids))

    if institution_id:
        query = query.filter(Case.institution_id == institution_id)
    if bureau_id:
        query = query.filter(Case.current_bureau_id == bureau_id)
    if region_id and RoleCode.REGIONAL_OFFICE not in user_roles:
        query = query.join(Institution).filter(Institution.region_id == region_id)
    if status and status != "ALL":
        query = query.filter(Case.status == status)
    if priority and priority != "ALL":
        query = query.filter(Case.priority == priority)
    if officer_id:
        query = query.filter(Case.current_officer_id == officer_id)

    now = datetime.now(timezone.utc)
    if is_overdue is True:
        query = query.filter(
            Case.applicable_deadline_at.isnot(None),
            Case.applicable_deadline_at < now,
            Case.status.notin_(["Disposed", "Closed – Action Taken", "Closed – No Action Required"])
        )

    if search:
        term = f"%{search.strip()}%"
        query = query.join(Institution).filter(
            or_(
                Case.case_reference.ilike(term),
                Case.title.ilike(term),
                Institution.institution_name.ilike(term),
                Institution.permanent_id.ilike(term)
            )
        )

    cases = query.order_by(Case.created_at.desc()).offset(skip).limit(limit).all()
    results = [enrich_case_out(c) for c in cases]

    if has_overlap is not None:
        results = [r for r in results if r.has_potential_overlap == has_overlap]

    return results

@router.post("", response_model=CaseOut, status_code=status.HTTP_201_CREATED)
def create_case(
    case_in: CaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([RoleCode.ADMIN, RoleCode.PGRC_OFFICER, RoleCode.RB_OFFICER, RoleCode.BUREAU_HEAD]))
):
    inst = db.query(Institution).filter(Institution.id == case_in.institution_id).first()
    if not inst:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Institution not found")

    bureau = db.query(Bureau).filter(Bureau.id == case_in.current_bureau_id).first()
    if not bureau:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bureau not found")

    case_ref = generate_case_reference(db)
    now = datetime.now(timezone.utc)
    deadline, _ = calculate_case_deadline(db=db, bureau_id=bureau.id, from_date=now)

    case = Case(
        case_reference=case_ref,
        institution_id=inst.id,
        current_bureau_id=bureau.id,
        current_officer_id=case_in.current_officer_id,
        title=case_in.title,
        category=case_in.category,
        status="Received",
        priority=case_in.priority,
        received_at=now,
        last_action="Case opened directly by authorized official",
        last_action_at=now,
        next_action=case_in.next_action or "Review grievance and assign handling officer",
        expected_disposal_at=case_in.expected_disposal_at,
        applicable_deadline_at=deadline,
        created_by=current_user.id,
        updated_by=current_user.id
    )
    db.add(case)
    db.flush()

    wf = WorkflowHistory(
        institution_id=inst.id,
        case_id=case.id,
        action_type="CASE_INITIALIZED",
        previous_value=None,
        new_value="Received",
        remarks="Case created manually",
        performed_by=current_user.id,
        created_at=now
    )
    db.add(wf)
    detect_overlaps_for_institution(db, inst.id)
    db.commit()
    db.refresh(case)

    return enrich_case_out(case)

@router.get("/{case_id}", response_model=CaseDetailOut)
def get_case_detail(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    base_out = enrich_case_out(case)
    detail = CaseDetailOut(**base_out.model_dump())

    # Workflow history
    detail.workflow_history = [
        WorkflowHistoryOut(
            id=w.id,
            action_type=w.action_type,
            previous_value=w.previous_value,
            new_value=w.new_value,
            remarks=w.remarks,
            performed_by_name=w.actor.display_name if w.actor else "System",
            created_at=w.created_at
        ) for w in case.workflow_history
    ]

    # Assignments
    detail.assignments = [
        AssignmentOut(
            id=a.id,
            bureau_name=a.bureau.name if a.bureau else "",
            officer_name=a.officer.display_name if a.officer else "Unknown",
            assigned_by_name=a.assigner.display_name if a.assigner else "System",
            assigned_at=a.assigned_at,
            reason=a.reason,
            assignment_status=a.assignment_status
        ) for a in case.assignments
    ]

    # Transfers
    detail.transfers = [
        TransferOut(
            id=t.id,
            from_bureau_name=t.from_bureau.name if t.from_bureau else "",
            to_bureau_name=t.to_bureau.name if t.to_bureau else "",
            from_officer_name=t.from_officer.display_name if t.from_officer else None,
            to_officer_name=t.to_officer.display_name if t.to_officer else None,
            initiated_by_name=t.initiator.display_name if t.initiator else "System",
            transfer_reason=t.transfer_reason,
            transferred_at=t.transferred_at,
            receiving_status=t.receiving_status,
            receiving_remarks=t.receiving_remarks
        ) for t in case.transfers
    ]

    detail.documents = [DocumentOut.model_validate(d) for d in case.documents]

    # Related cases for same institution
    other_cases = db.query(Case).filter(
        Case.institution_id == case.institution_id,
        Case.id != case.id
    ).all()
    rel_outs = []
    for oc in other_cases:
        ro = CaseSimpleOut.model_validate(oc)
        ro.current_bureau_name = oc.current_bureau.name if oc.current_bureau else None
        ro.assigned_officer_name = oc.current_officer.display_name if oc.current_officer else "Unassigned"
        rel_outs.append(ro)
    detail.related_cases = rel_outs

    return detail

@router.post("/{case_id}/status", response_model=CaseOut)
def change_case_status(
    case_id: int,
    status_update: CaseStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([RoleCode.ADMIN, RoleCode.PGRC_OFFICER, RoleCode.RB_OFFICER, RoleCode.BUREAU_HEAD]))
):
    is_admin = RoleCode.ADMIN in [r.code for r in current_user.roles]
    try:
        updated_case = update_case_status(
            db=db,
            case_id=case_id,
            new_status=status_update.new_status,
            remarks=status_update.remarks,
            actor_id=current_user.id,
            is_admin=is_admin,
            next_action=status_update.next_action
        )
        return enrich_case_out(updated_case)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/{case_id}/actions", response_model=CaseOut)
def add_case_action(
    case_id: int,
    action_in: CaseActionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([RoleCode.ADMIN, RoleCode.PGRC_OFFICER, RoleCode.RB_OFFICER, RoleCode.BUREAU_HEAD]))
):
    try:
        updated_case = record_case_action(
            db=db,
            case_id=case_id,
            action_type=action_in.action_type,
            action_details=action_in.action_details,
            actor_id=current_user.id,
            next_action=action_in.next_action
        )
        return enrich_case_out(updated_case)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
