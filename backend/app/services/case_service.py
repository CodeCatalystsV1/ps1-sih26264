from datetime import datetime, timezone
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_
from backend.app.models.entities import (
    Case, CaseStatus, CaseTransition, WorkflowHistory, Institution, Bureau, User, OverlapFlag
)
from backend.app.services.overlap_service import detect_overlaps_for_institution
from backend.app.services.audit_service import log_audit_event

ALLOWED_TRANSITIONS: Dict[str, List[str]] = {
    "Received": ["Acknowledged", "Under Scrutiny", "Transferred", "Closed – No Action Required"],
    "Acknowledged": ["Under Scrutiny", "Assigned", "Transferred"],
    "Under Scrutiny": ["Assigned", "Institution Notice Issued", "Transferred", "Closed – No Action Required"],
    "Assigned": ["Institution Notice Issued", "Awaiting Response", "Under Verification", "Transferred", "Under Scrutiny"],
    "Institution Notice Issued": ["Awaiting Response", "Under Verification", "Action Taken"],
    "Awaiting Response": ["Under Verification", "Committee Review", "Action Taken", "Transferred"],
    "Under Verification": ["Committee Review", "Action Taken", "Transferred", "Awaiting Response"],
    "Committee Review": ["Action Taken", "Disposed", "Transferred", "Under Verification"],
    "Action Taken": ["Disposed", "Closed – Action Taken", "Closed – No Action Required"],
    "Disposed": ["Reopened"],
    "Closed – Action Taken": ["Reopened"],
    "Closed – No Action Required": ["Reopened"],
    "Transferred": ["Received", "Under Scrutiny", "Assigned", "Under Verification"],
    "Escalated": ["Committee Review", "Action Taken", "Transferred"],
    "Reopened": ["Under Scrutiny", "Under Verification", "Assigned"]
}

def validate_status_transition(current_status: str, new_status: str, is_admin: bool = False) -> bool:
    if is_admin:
        return True # Admin can perform administrative override
    allowed = ALLOWED_TRANSITIONS.get(current_status, [])
    return new_status in allowed

def update_case_status(
    db: Session,
    case_id: int,
    new_status: str,
    remarks: str,
    actor_id: int,
    is_admin: bool = False,
    next_action: Optional[str] = None
) -> Case:
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise ValueError(f"Case {case_id} not found.")

    if case.status == new_status:
        raise ValueError(f"Case is already in status '{new_status}'.")

    if not validate_status_transition(case.status, new_status, is_admin=is_admin):
        allowed = ALLOWED_TRANSITIONS.get(case.status, [])
        raise ValueError(f"Invalid transition from '{case.status}' to '{new_status}'. Permitted: {', '.join(allowed) if allowed else 'None'}")

    prev_status = case.status
    now = datetime.now(timezone.utc)

    case.status = new_status
    case.last_action = f"Status updated to {new_status}"
    case.last_action_at = now
    if next_action:
        case.next_action = next_action

    # Record workflow history
    wf = WorkflowHistory(
        institution_id=case.institution_id,
        case_id=case.id,
        action_type="STATUS_CHANGE",
        previous_value=prev_status,
        new_value=new_status,
        remarks=remarks,
        performed_by=actor_id,
        created_at=now
    )
    db.add(wf)

    # Log audit event
    log_audit_event(
        db=db,
        action_type="CASE_STATUS_UPDATED",
        record_type="Case",
        record_id=str(case.id),
        user_id=actor_id,
        metadata={"from_status": prev_status, "to_status": new_status, "remarks": remarks}
    )

    db.flush()

    # Re-evaluate overlaps for the institution
    detect_overlaps_for_institution(db=db, institution_id=case.institution_id)

    db.commit()
    db.refresh(case)
    return case

def record_case_action(
    db: Session,
    case_id: int,
    action_type: str,
    action_details: str,
    actor_id: int,
    next_action: Optional[str] = None
) -> Case:
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise ValueError(f"Case {case_id} not found.")

    now = datetime.now(timezone.utc)
    case.last_action = action_details
    case.last_action_at = now
    if next_action:
        case.next_action = next_action

    wf = WorkflowHistory(
        institution_id=case.institution_id,
        case_id=case.id,
        action_type=f"CASE_ACTION_{action_type.upper()}",
        previous_value=None,
        new_value=action_details,
        remarks=action_details,
        performed_by=actor_id,
        created_at=now
    )
    db.add(wf)

    log_audit_event(
        db=db,
        action_type="CASE_ACTION_RECORDED",
        record_type="Case",
        record_id=str(case.id),
        user_id=actor_id,
        metadata={"action_type": action_type, "details": action_details}
    )

    db.commit()
    db.refresh(case)
    return case
