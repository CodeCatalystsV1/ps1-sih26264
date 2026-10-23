from datetime import datetime, timezone
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from backend.app.models.entities import (
    OverlapFlag, CaseRelationship, CoordinationDecision, Case, Institution, Bureau, WorkflowHistory
)
from backend.app.services.notification_service import notify_bureau_and_admins
from backend.app.services.audit_service import log_audit_event

REQUIRED_OVERLAP_ALERT_MESSAGE = "POTENTIAL OVERLAPPING CASES – COORDINATION REQUIRED"

ACTIVE_CASE_STATUSES = [
    "Received", "Acknowledged", "Under Scrutiny", "Assigned",
    "Institution Notice Issued", "Awaiting Response", "Under Verification",
    "Committee Review", "Action Taken", "Transferred", "Escalated", "Reopened"
]

TERMINAL_STATUSES = [
    "Disposed", "Closed – Action Taken", "Closed – No Action Required"
]

def detect_overlaps_for_institution(db: Session, institution_id: int) -> Optional[OverlapFlag]:
    """
    Deterministic cross-Bureau overlap detection based on AICTE Permanent ID.
    Qualifying condition: Two or more active cases for the same verified institution
    currently handled by differing Bureaus or Cells.
    """
    institution = db.query(Institution).filter(Institution.id == institution_id).first()
    if not institution or institution.verification_status != "VERIFIED":
        return None

    # Retrieve all active cases for this institution
    active_cases = db.query(Case).filter(
        Case.institution_id == institution_id,
        Case.status.notin_(TERMINAL_STATUSES)
    ).all()

    if len(active_cases) < 2:
        return None

    # Check distinct bureaus
    bureau_ids = list(set([c.current_bureau_id for c in active_cases]))
    if len(bureau_ids) < 2:
        # Multiple cases in the same bureau is NOT a cross-bureau overlap
        return None

    # Qualifying cross-Bureau overlap exists!
    bureau_names = [b.name for b in db.query(Bureau).filter(Bureau.id.in_(bureau_ids)).all()]
    case_refs = [c.case_reference for c in active_cases]

    detection_reason = (
        f"Two or more active cases ({', '.join(case_refs)}) are associated with verified "
        f"institution Permanent ID {institution.permanent_id} ({institution.institution_name}). "
        f"The cases are currently assigned to differing Bureaus ({', '.join(bureau_names)}). "
        f"Review whether coordination is required."
    )

    # Check if an existing OverlapFlag exists for this institution
    overlap_flag = db.query(OverlapFlag).filter(
        OverlapFlag.institution_id == institution_id
    ).first()

    now = datetime.now(timezone.utc)
    if not overlap_flag:
        overlap_flag = OverlapFlag(
            institution_id=institution_id,
            detection_type="DETERMINISTIC_PERMANENT_ID",
            detection_reason=detection_reason,
            relationship_state="POTENTIAL_OVERLAP",
            first_detected_at=now,
            last_checked_at=now
        )
        db.add(overlap_flag)
        db.flush()

        # Notify relevant bureaus and administrators
        notify_bureau_and_admins(
            db=db,
            notification_type="OVERLAP_DETECTED",
            title=REQUIRED_OVERLAP_ALERT_MESSAGE,
            message=detection_reason,
            bureau_ids=bureau_ids,
            institution_id=institution_id,
            overlap_flag_id=overlap_flag.id
        )

        log_audit_event(
            db=db,
            action_type="OVERLAP_FLAG_CREATED",
            record_type="OverlapFlag",
            record_id=str(overlap_flag.id),
            metadata={"institution_permanent_id": institution.permanent_id, "bureaus": bureau_names}
        )
    else:
        # Update last checked timestamp and reason
        overlap_flag.last_checked_at = now
        overlap_flag.detection_reason = detection_reason

    # Synchronize case relationships (pairs of active cases across different bureaus)
    for i in range(len(active_cases)):
        for j in range(i + 1, len(active_cases)):
            case_a = active_cases[i]
            case_b = active_cases[j]
            if case_a.current_bureau_id != case_b.current_bureau_id:
                rel = db.query(CaseRelationship).filter(
                    ((CaseRelationship.source_case_id == case_a.id) & (CaseRelationship.related_case_id == case_b.id)) |
                    ((CaseRelationship.source_case_id == case_b.id) & (CaseRelationship.related_case_id == case_a.id))
                ).first()
                if not rel:
                    rel = CaseRelationship(
                        source_case_id=case_a.id,
                        related_case_id=case_b.id,
                        overlap_flag_id=overlap_flag.id,
                        relationship_type="CROSS_BUREAU_OVERLAP",
                        relationship_state=overlap_flag.relationship_state,
                        reason="Deterministic Permanent ID match across differing handling Bureaus",
                        created_at=now,
                        updated_at=now
                    )
                    db.add(rel)

    db.flush()
    return overlap_flag

def process_coordination_decision(
    db: Session,
    overlap_flag_id: int,
    action_type: str,
    remarks: str,
    actor_id: int,
    coordination_owner_id: Optional[int] = None
) -> OverlapFlag:
    """
    Executes authorized human review and coordination actions.
    Supported actions:
    - REVIEW: Marks state as UNDER_REVIEW
    - CONFIRM_RELATED: Marks state as CONFIRMED_RELATED
    - MARK_NOT_RELATED: Marks state as NOT_RELATED
    - REQUEST_COORDINATION: Marks state as COORDINATION_REQUESTED
    - RECORD_JOINT_ACTION: Marks state as JOINT_ACTION_IN_PROGRESS
    - ESCALATE: Marks state as ESCALATED
    - COMPLETE: Marks state as COORDINATION_COMPLETED
    """
    flag = db.query(OverlapFlag).filter(OverlapFlag.id == overlap_flag_id).first()
    if not flag:
        raise ValueError(f"Overlap flag {overlap_flag_id} not found")

    action_to_state_map = {
        "REVIEW": "UNDER_REVIEW",
        "CONFIRM_RELATED": "CONFIRMED_RELATED",
        "MARK_NOT_RELATED": "NOT_RELATED",
        "REQUEST_COORDINATION": "COORDINATION_REQUESTED",
        "RECORD_JOINT_ACTION": "JOINT_ACTION_IN_PROGRESS",
        "ESCALATE": "ESCALATED",
        "COMPLETE": "COORDINATION_COMPLETED",
    }

    new_state = action_to_state_map.get(action_type.upper(), flag.relationship_state)
    prev_state = flag.relationship_state

    flag.relationship_state = new_state
    now = datetime.now(timezone.utc)
    flag.reviewed_at = now
    flag.reviewed_by = actor_id
    if coordination_owner_id:
        flag.coordination_owner_id = coordination_owner_id

    # Create coordination decision entry
    decision = CoordinationDecision(
        overlap_flag_id=flag.id,
        action_type=action_type.upper(),
        remarks=remarks,
        performed_by=actor_id,
        created_at=now
    )
    db.add(decision)

    # Update child relationships
    for rel in flag.relationships:
        rel.relationship_state = new_state
        rel.updated_at = now

    # Record workflow history on all involved cases
    involved_cases = db.query(Case).filter(
        Case.institution_id == flag.institution_id,
        Case.status.notin_(TERMINAL_STATUSES)
    ).all()

    for c in involved_cases:
        wf = WorkflowHistory(
            institution_id=flag.institution_id,
            case_id=c.id,
            action_type=f"COORDINATION_{action_type.upper()}",
            previous_value=prev_state,
            new_value=new_state,
            remarks=remarks,
            performed_by=actor_id,
            created_at=now
        )
        db.add(wf)

    # Log audit event
    log_audit_event(
        db=db,
        action_type=f"OVERLAP_{action_type.upper()}",
        record_type="OverlapFlag",
        record_id=str(flag.id),
        user_id=actor_id,
        metadata={"previous_state": prev_state, "new_state": new_state, "remarks": remarks}
    )

    db.flush()
    return flag
