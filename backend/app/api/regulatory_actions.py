from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.app.core.database import get_db
from backend.app.api.deps import get_current_user, require_roles
from backend.app.core.permissions import RoleCode, user_has_role, enforce_user_bureau_or_admin
from backend.app.models.entities import (
    User, RegulatoryAction, ActionConflict, Case, Institution, Bureau, WorkflowHistory
)
from backend.app.schemas.all_schemas import (
    ActionValidationRequest, ActionValidationResponse, ActionConflictItem,
    RegulatoryActionCreate, RegulatoryActionUpdate, RegulatoryActionOut,
    ActionConflictOut, ConflictResolutionRequest
)
from backend.app.services.action_conflict_service import (
    evaluate_potential_action_conflicts, create_regulatory_action_with_guard,
    resolve_action_conflict
)

router = APIRouter(prefix="/actions", tags=["Regulatory Action Conflict Guard"])

def enrich_action_out(action: RegulatoryAction, db: Session) -> RegulatoryActionOut:
    conflicts_count = db.query(ActionConflict).filter(
        ActionConflict.proposed_action_id == action.id,
        ActionConflict.status.in_(["PENDING_REVIEW", "COORDINATION_REQUESTED"])
    ).count()

    return RegulatoryActionOut(
        id=action.id,
        case_id=action.case_id,
        case_reference=action.case.case_reference if action.case else "N/A",
        institution_id=action.institution_id,
        institution_name=action.institution.institution_name if action.institution else "N/A",
        permanent_id=action.institution.permanent_id if action.institution else "N/A",
        bureau_id=action.bureau_id,
        bureau_name=action.bureau.name if action.bureau else "N/A",
        bureau_code=action.bureau.code if action.bureau else "N/A",
        created_by_id=action.created_by_id,
        created_by_name=action.creator.display_name if action.creator else "System",
        action_type=action.action_type,
        title=action.title,
        description=action.description,
        subject_category=action.subject_category,
        scheduled_date=action.scheduled_date,
        status=action.status,
        created_at=action.created_at,
        updated_at=action.updated_at,
        active_conflicts_count=conflicts_count
    )

def enrich_conflict_out(conflict: ActionConflict) -> ActionConflictOut:
    prop = conflict.proposed_action
    ext = conflict.existing_action
    inst = conflict.institution

    return ActionConflictOut(
        id=conflict.id,
        proposed_action_id=conflict.proposed_action_id,
        proposed_action_title=prop.title if prop else "Proposed Action",
        proposed_action_type=prop.action_type if prop else "N/A",
        proposed_bureau_name=prop.bureau.name if (prop and prop.bureau) else "N/A",
        proposed_case_reference=prop.case.case_reference if (prop and prop.case) else "N/A",
        existing_action_id=conflict.existing_action_id,
        existing_action_title=ext.title if ext else "Existing Action",
        existing_action_type=ext.action_type if ext else "N/A",
        existing_bureau_name=ext.bureau.name if (ext and ext.bureau) else "N/A",
        existing_case_reference=ext.case.case_reference if (ext and ext.case) else "N/A",
        institution_id=conflict.institution_id,
        institution_name=inst.institution_name if inst else "N/A",
        permanent_id=inst.permanent_id if inst else "N/A",
        conflict_type=conflict.conflict_type,
        severity=conflict.severity,
        explanation=conflict.explanation,
        status=conflict.status,
        detected_at=conflict.detected_at,
        reviewed_by_id=conflict.reviewed_by_id,
        reviewed_by_name=conflict.reviewer.display_name if conflict.reviewer else None,
        reviewed_at=conflict.reviewed_at,
        resolution_type=conflict.resolution_type,
        resolution_notes=conflict.resolution_notes
    )

# 1. Standalone Action Conflict Validation (Pre-submission check)
@router.post("/validate", response_model=ActionValidationResponse)
def validate_action(
    req: ActionValidationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    case = db.query(Case).filter(Case.id == req.case_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case {req.case_id} not found.")

    enforce_user_bureau_or_admin(current_user, case.current_bureau_id)

    conflicts_data = evaluate_potential_action_conflicts(
        db=db,
        case_id=req.case_id,
        action_type=req.action_type,
        subject_category=req.subject_category,
        title=req.title,
        description=req.description,
        scheduled_date=req.scheduled_date
    )

    conflict_items = [ActionConflictItem(**c) for c in conflicts_data]
    highest_severity = None
    if any(c.severity == "HIGH" for c in conflict_items):
        highest_severity = "HIGH"
    elif any(c.severity == "MEDIUM" for c in conflict_items):
        highest_severity = "MEDIUM"
    elif conflict_items:
        highest_severity = "LOW"

    return ActionValidationResponse(
        has_conflicts=len(conflict_items) > 0,
        conflict_count=len(conflict_items),
        highest_severity=highest_severity,
        institution_id=case.institution_id,
        institution_name=case.institution.institution_name,
        permanent_id=case.institution.permanent_id,
        conflicts=conflict_items
    )

# IMPORTANT ROUTING ORDER: Register /conflicts fixed routes BEFORE /{action_id} dynamic route

# 5. List Action Conflicts
@router.get("/conflicts", response_model=List[ActionConflictOut])
def list_action_conflicts(
    institution_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    severity: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ActionConflict)

    if institution_id:
        query = query.filter(ActionConflict.institution_id == institution_id)
    if status_filter and status_filter != "ALL":
        query = query.filter(ActionConflict.status == status_filter)
    if severity and severity != "ALL":
        query = query.filter(ActionConflict.severity == severity)

    conflicts = query.order_by(ActionConflict.detected_at.desc()).all()
    return [enrich_conflict_out(c) for c in conflicts]

# 6. Get Conflict Details
@router.get("/conflicts/{conflict_id}", response_model=ActionConflictOut)
def get_conflict_detail(
    conflict_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    conflict = db.query(ActionConflict).filter(ActionConflict.id == conflict_id).first()
    if not conflict:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Conflict {conflict_id} not found.")

    return enrich_conflict_out(conflict)

# 7. Resolve Action Conflict
@router.post("/conflicts/{conflict_id}/resolve", response_model=ActionConflictOut)
def resolve_conflict_decision(
    conflict_id: int,
    req: ConflictResolutionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    conflict = db.query(ActionConflict).filter(ActionConflict.id == conflict_id).first()
    if not conflict:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Conflict {conflict_id} not found.")

    # Permissions check:
    # PROCEED_WITH_JUSTIFICATION (Supervisor override) requires ROLE_ADMIN, ROLE_BUREAU_HEAD, or ROLE_MANAGEMENT
    if req.resolution_type == "PROCEED_WITH_JUSTIFICATION":
        override_roles = [RoleCode.ADMIN, RoleCode.BUREAU_HEAD, RoleCode.MANAGEMENT]
        if not user_has_role(current_user, override_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Supervisor-level privileges (Bureau Head, Management or Admin) required to authorize an action override."
            )
        if not req.resolution_notes or len(req.resolution_notes.strip()) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A detailed justification (minimum 10 characters) is legally required for regulatory action overrides."
            )

    try:
        resolved = resolve_action_conflict(
            db=db,
            conflict_id=conflict_id,
            resolution_type=req.resolution_type,
            resolution_notes=req.resolution_notes,
            reviewer=current_user
        )
        return enrich_conflict_out(resolved)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))

# 2. Create Proposed Regulatory Action (Server-enforces Conflict Guard)
@router.post("", response_model=RegulatoryActionOut, status_code=status.HTTP_201_CREATED)
def create_action(
    action_in: RegulatoryActionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([
        RoleCode.ADMIN, RoleCode.BUREAU_HEAD, RoleCode.PGRC_OFFICER,
        RoleCode.RB_OFFICER, RoleCode.BUREAU_OFFICER, RoleCode.MANAGEMENT
    ]))
):
    case = db.query(Case).filter(Case.id == action_in.case_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case {action_in.case_id} not found.")

    enforce_user_bureau_or_admin(current_user, case.current_bureau_id)

    try:
        action, _ = create_regulatory_action_with_guard(
            db=db,
            case_id=action_in.case_id,
            action_type=action_in.action_type,
            title=action_in.title,
            description=action_in.description,
            subject_category=action_in.subject_category,
            actor=current_user,
            scheduled_date=action_in.scheduled_date,
            override_justification=action_in.override_justification
        )
        return enrich_action_out(action, db)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))

# 3. List Regulatory Actions
@router.get("", response_model=List[RegulatoryActionOut])
def list_actions(
    case_id: Optional[int] = Query(None),
    institution_id: Optional[int] = Query(None),
    bureau_id: Optional[int] = Query(None),
    action_type: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(RegulatoryAction)

    if case_id:
        query = query.filter(RegulatoryAction.case_id == case_id)
    if institution_id:
        query = query.filter(RegulatoryAction.institution_id == institution_id)
    if bureau_id:
        query = query.filter(RegulatoryAction.bureau_id == bureau_id)
    if action_type and action_type != "ALL":
        query = query.filter(RegulatoryAction.action_type == action_type)
    if status_filter and status_filter != "ALL":
        query = query.filter(RegulatoryAction.status == status_filter)

    actions = query.order_by(RegulatoryAction.created_at.desc()).all()
    return [enrich_action_out(a, db) for a in actions]

# 4. Get Action Details
@router.get("/{action_id}", response_model=RegulatoryActionOut)
def get_action_detail(
    action_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    action = db.query(RegulatoryAction).filter(RegulatoryAction.id == action_id).first()
    if not action:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Action {action_id} not found.")

    return enrich_action_out(action, db)

# 8. Update Proposed Regulatory Action
@router.patch("/{action_id}", response_model=RegulatoryActionOut)
def update_action(
    action_id: int,
    update_in: RegulatoryActionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    action = db.query(RegulatoryAction).filter(RegulatoryAction.id == action_id).first()
    if not action:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Action {action_id} not found.")

    enforce_user_bureau_or_admin(current_user, action.bureau_id)

    now = datetime.now(timezone.utc)
    material_change = False

    if update_in.title is not None and update_in.title != action.title:
        action.title = update_in.title
        material_change = True
    if update_in.description is not None:
        action.description = update_in.description
    if update_in.subject_category is not None and update_in.subject_category != action.subject_category:
        action.subject_category = update_in.subject_category
        material_change = True
    if update_in.scheduled_date is not None and update_in.scheduled_date != action.scheduled_date:
        action.scheduled_date = update_in.scheduled_date
        material_change = True
    if update_in.status is not None:
        action.status = update_in.status

    action.updated_at = now

    # If material change in category/type/date, re-evaluate conflicts
    if material_change:
        conflicts_data = evaluate_potential_action_conflicts(
            db=db,
            case_id=action.case_id,
            action_type=action.action_type,
            subject_category=action.subject_category,
            title=action.title,
            description=action.description,
            scheduled_date=action.scheduled_date,
            exclude_action_id=action.id
        )

        # Clear obsolete pending conflicts and re-populate
        db.query(ActionConflict).filter(
            ActionConflict.proposed_action_id == action.id,
            ActionConflict.status == "PENDING_REVIEW"
        ).delete()

        for c_item in conflicts_data:
            c_rec = ActionConflict(
                proposed_action_id=action.id,
                existing_action_id=c_item["existing_action_id"],
                institution_id=action.institution_id,
                conflict_type=c_item["conflict_type"],
                severity=c_item["severity"],
                explanation=c_item["explanation"],
                status="PENDING_REVIEW",
                detected_at=now
            )
            db.add(c_rec)

        if conflicts_data:
            action.status = "PENDING_CONFLICT_REVIEW"

    db.commit()
    db.refresh(action)
    return enrich_action_out(action, db)
