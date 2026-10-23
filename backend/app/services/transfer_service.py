from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from backend.app.models.entities import (
    Case, Assignment, Transfer, WorkflowHistory, Bureau, User, Notification
)
from backend.app.services.notification_service import create_notification, notify_bureau_and_admins
from backend.app.services.overlap_service import detect_overlaps_for_institution
from backend.app.services.audit_service import log_audit_event

def assign_case_to_officer(
    db: Session,
    case_id: int,
    officer_id: int,
    reason: str,
    actor_id: int,
    bureau_id: Optional[int] = None
) -> Assignment:
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise ValueError(f"Case {case_id} not found.")

    target_officer = db.query(User).filter(User.id == officer_id).first()
    if not target_officer:
        raise ValueError(f"Target officer ID {officer_id} not found.")

    target_bureau_id = bureau_id if bureau_id else case.current_bureau_id
    now = datetime.now(timezone.utc)

    # Deactivate previous active assignment without deleting history
    prev_assignments = db.query(Assignment).filter(
        Assignment.case_id == case.id,
        Assignment.assignment_status == "ACTIVE"
    ).all()
    for pa in prev_assignments:
        pa.assignment_status = "REASSIGNED"

    new_assignment = Assignment(
        case_id=case.id,
        bureau_id=target_bureau_id,
        officer_id=officer_id,
        assigned_by=actor_id,
        assigned_at=now,
        reason=reason,
        assignment_status="ACTIVE"
    )
    db.add(new_assignment)

    case.current_officer_id = officer_id
    case.current_bureau_id = target_bureau_id
    case.last_action = f"Assigned to officer {target_officer.display_name}"
    case.last_action_at = now
    case.next_action = "Review grievance and prepare scrutiny notes"
    if case.status in ["Received", "Under Scrutiny"]:
        case.status = "Assigned"

    # Record workflow history
    wf = WorkflowHistory(
        institution_id=case.institution_id,
        case_id=case.id,
        action_type="CASE_ASSIGNMENT",
        previous_value=str(prev_assignments[0].officer_id) if prev_assignments else None,
        new_value=str(officer_id),
        remarks=f"Assigned to {target_officer.display_name}. Reason: {reason}",
        performed_by=actor_id,
        created_at=now
    )
    db.add(wf)

    # Notify officer
    create_notification(
        db=db,
        notification_type="NEW_ASSIGNMENT",
        title=f"New Assignment: Case {case.case_reference}",
        message=f"You have been assigned Case {case.case_reference} ({case.institution.institution_name}). Reason: {reason}",
        recipient_user_ids=[officer_id],
        institution_id=case.institution_id,
        case_id=case.id
    )

    log_audit_event(
        db=db,
        action_type="CASE_ASSIGNED",
        record_type="Case",
        record_id=str(case.id),
        user_id=actor_id,
        metadata={"assigned_to": officer_id, "officer_name": target_officer.display_name, "reason": reason}
    )

    db.flush()
    detect_overlaps_for_institution(db=db, institution_id=case.institution_id)
    db.commit()
    return new_assignment

def transfer_case(
    db: Session,
    case_id: int,
    to_bureau_id: int,
    transfer_reason: str,
    actor_id: int,
    to_officer_id: Optional[int] = None
) -> Transfer:
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise ValueError(f"Case {case_id} not found.")

    target_bureau = db.query(Bureau).filter(Bureau.id == to_bureau_id).first()
    if not target_bureau:
        raise ValueError(f"Destination Bureau ID {to_bureau_id} does not exist.")

    if case.current_bureau_id == to_bureau_id:
        raise ValueError("Destination Bureau cannot be the same as current handling Bureau.")

    from_bureau_id = case.current_bureau_id
    from_officer_id = case.current_officer_id
    from_bureau_name = case.current_bureau.name if case.current_bureau else "Unknown"

    now = datetime.now(timezone.utc)

    # Create immutable transfer record
    transfer = Transfer(
        case_id=case.id,
        from_bureau_id=from_bureau_id,
        to_bureau_id=to_bureau_id,
        from_officer_id=from_officer_id,
        to_officer_id=to_officer_id,
        initiated_by=actor_id,
        transfer_reason=transfer_reason,
        transferred_at=now,
        receiving_status="ACCEPTED" if to_officer_id else "PENDING_ACCEPTANCE",
        receiving_remarks=f"Transferred from {from_bureau_name}"
    )
    db.add(transfer)

    # Deactivate current active assignments
    for pa in db.query(Assignment).filter(Assignment.case_id == case.id, Assignment.assignment_status == "ACTIVE").all():
        pa.assignment_status = "TRANSFERRED"

    # Update case's current bureau and officer
    case.current_bureau_id = to_bureau_id
    case.current_officer_id = to_officer_id
    case.status = "Transferred"
    case.last_action = f"Transferred from {from_bureau_name} to {target_bureau.name}"
    case.last_action_at = now
    case.next_action = "Destination Bureau review and officer allocation"

    if to_officer_id:
        # Create new assignment in destination bureau
        assign = Assignment(
            case_id=case.id,
            bureau_id=to_bureau_id,
            officer_id=to_officer_id,
            assigned_by=actor_id,
            assigned_at=now,
            reason=f"Assigned upon inter-bureau transfer: {transfer_reason}",
            assignment_status="ACTIVE"
        )
        db.add(assign)

    # Workflow history
    wf = WorkflowHistory(
        institution_id=case.institution_id,
        case_id=case.id,
        action_type="CASE_TRANSFERRED",
        previous_value=from_bureau_name,
        new_value=target_bureau.name,
        remarks=f"Inter-bureau transfer initiated. Reason: {transfer_reason}",
        performed_by=actor_id,
        created_at=now
    )
    db.add(wf)

    # Notify destination bureau and administrators
    notify_bureau_and_admins(
        db=db,
        notification_type="TRANSFER",
        title=f"Incoming Case Transfer: {case.case_reference}",
        message=f"Case {case.case_reference} ({case.institution.institution_name}) transferred from {from_bureau_name} to {target_bureau.name}. Reason: {transfer_reason}",
        bureau_ids=[to_bureau_id],
        institution_id=case.institution_id,
        case_id=case.id
    )

    log_audit_event(
        db=db,
        action_type="CASE_TRANSFERRED",
        record_type="Case",
        record_id=str(case.id),
        user_id=actor_id,
        metadata={
            "from_bureau_id": from_bureau_id,
            "to_bureau_id": to_bureau_id,
            "to_bureau_name": target_bureau.name,
            "reason": transfer_reason
        }
    )

    db.flush()
    # Overlap detection state re-evaluation
    detect_overlaps_for_institution(db=db, institution_id=case.institution_id)

    db.commit()
    db.refresh(transfer)
    return transfer
