from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.api.deps import get_current_user, require_roles
from backend.app.core.permissions import RoleCode
from backend.app.models.entities import (
    User, OverlapFlag, Case, Institution, Bureau, CaseRelationship, CoordinationDecision
)
from backend.app.schemas.all_schemas import (
    OverlapFlagOut, OverlapReviewRequest, CaseSimpleOut, CoordinationDecisionOut
)
from backend.app.services.overlap_service import process_coordination_decision

router = APIRouter(prefix="/overlaps", tags=["Cross-Bureau Coordination"])

@router.get("", response_model=List[OverlapFlagOut])
def list_overlaps(
    state: Optional[str] = Query(None),
    region_id: Optional[int] = Query(None),
    institution_id: Optional[int] = Query(None),
    bureau_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(OverlapFlag).join(Institution)

    # Scoping for regional users
    user_roles = [r.code for r in current_user.roles]
    if RoleCode.REGIONAL_OFFICE in user_roles and RoleCode.ADMIN not in user_roles:
        reg_ids = [ba.region_id for ba in current_user.bureau_assignments if ba.region_id is not None]
        if reg_ids:
            query = query.filter(Institution.region_id.in_(reg_ids))

    if state and state != "ALL":
        query = query.filter(OverlapFlag.relationship_state == state)
    if region_id and RoleCode.REGIONAL_OFFICE not in user_roles:
        query = query.filter(Institution.region_id == region_id)
    if institution_id:
        query = query.filter(OverlapFlag.institution_id == institution_id)

    flags = query.order_by(OverlapFlag.last_checked_at.desc()).all()

    results = []
    for f in flags:
        # Get active cases for this institution
        active_cases = db.query(Case).filter(
            Case.institution_id == f.institution_id,
            Case.status.notin_(["Disposed", "Closed – Action Taken", "Closed – No Action Required"])
        ).all()

        involved_bureau_names = list(set([c.current_bureau.name for c in active_cases if c.current_bureau]))
        if bureau_id:
            b_ids = [c.current_bureau_id for c in active_cases]
            if bureau_id not in b_ids:
                continue

        case_outs = []
        for c in active_cases:
            co = CaseSimpleOut.model_validate(c)
            co.current_bureau_name = c.current_bureau.name if c.current_bureau else None
            co.assigned_officer_name = c.current_officer.display_name if c.current_officer else "Unassigned"
            case_outs.append(co)

        decision_outs = [
            CoordinationDecisionOut(
                id=d.id,
                action_type=d.action_type,
                remarks=d.remarks,
                performed_by_name=d.actor.display_name if d.actor else "System",
                created_at=d.created_at
            ) for d in f.decisions
        ]

        out = OverlapFlagOut(
            id=f.id,
            institution_id=f.institution_id,
            institution_name=f.institution.institution_name if f.institution else "N/A",
            permanent_id=f.institution.permanent_id if f.institution else "N/A",
            institution_state=f.institution.state if f.institution else "N/A",
            institution_region=f.institution.region.name if (f.institution and f.institution.region) else "N/A",
            detection_type=f.detection_type,
            detection_reason=f.detection_reason,
            relationship_state=f.relationship_state,
            first_detected_at=f.first_detected_at,
            last_checked_at=f.last_checked_at,
            reviewed_by_name=f.reviewer.display_name if f.reviewer else None,
            reviewed_at=f.reviewed_at,
            coordination_owner_name=f.coordination_owner.display_name if f.coordination_owner else None,
            involved_cases=case_outs,
            involved_bureaus=involved_bureau_names,
            decisions=decision_outs
        )
        results.append(out)

    return results

@router.get("/{overlap_id}", response_model=OverlapFlagOut)
def get_overlap_detail(
    overlap_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    flag = db.query(OverlapFlag).filter(OverlapFlag.id == overlap_id).first()
    if not flag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Overlap record not found")

    active_cases = db.query(Case).filter(
        Case.institution_id == flag.institution_id,
        Case.status.notin_(["Disposed", "Closed – Action Taken", "Closed – No Action Required"])
    ).all()

    involved_bureau_names = list(set([c.current_bureau.name for c in active_cases if c.current_bureau]))

    case_outs = []
    for c in active_cases:
        co = CaseSimpleOut.model_validate(c)
        co.current_bureau_name = c.current_bureau.name if c.current_bureau else None
        co.assigned_officer_name = c.current_officer.display_name if c.current_officer else "Unassigned"
        case_outs.append(co)

    decision_outs = [
        CoordinationDecisionOut(
            id=d.id,
            action_type=d.action_type,
            remarks=d.remarks,
            performed_by_name=d.actor.display_name if d.actor else "System",
            created_at=d.created_at
        ) for d in flag.decisions
    ]

    return OverlapFlagOut(
        id=flag.id,
        institution_id=flag.institution_id,
        institution_name=flag.institution.institution_name,
        permanent_id=flag.institution.permanent_id,
        institution_state=flag.institution.state,
        institution_region=flag.institution.region.name if flag.institution.region else "N/A",
        detection_type=flag.detection_type,
        detection_reason=flag.detection_reason,
        relationship_state=flag.relationship_state,
        first_detected_at=flag.first_detected_at,
        last_checked_at=flag.last_checked_at,
        reviewed_by_name=flag.reviewer.display_name if flag.reviewer else None,
        reviewed_at=flag.reviewed_at,
        coordination_owner_name=flag.coordination_owner.display_name if flag.coordination_owner else None,
        involved_cases=case_outs,
        involved_bureaus=involved_bureau_names,
        decisions=decision_outs
    )

@router.post("/{overlap_id}/review", response_model=OverlapFlagOut)
def record_overlap_coordination(
    overlap_id: int,
    review_req: OverlapReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([RoleCode.ADMIN, RoleCode.BUREAU_HEAD, RoleCode.PGRC_OFFICER, RoleCode.RB_OFFICER]))
):
    try:
        updated_flag = process_coordination_decision(
            db=db,
            overlap_flag_id=overlap_id,
            action_type=review_req.action_type,
            remarks=review_req.remarks,
            actor_id=current_user.id,
            coordination_owner_id=review_req.coordination_owner_id
        )
        db.commit()
        return get_overlap_detail(overlap_id=overlap_id, db=db, current_user=current_user)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
