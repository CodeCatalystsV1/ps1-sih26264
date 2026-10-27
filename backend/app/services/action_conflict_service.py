from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.app.models.entities import (
    RegulatoryAction, ActionConflict, Case, Institution, Bureau, User, WorkflowHistory
)
from backend.app.services.notification_service import create_notification
from backend.app.services.audit_service import log_audit_event

# Configurable scheduling conflict evaluation window (default 30 days)
DEFAULT_CONFLICT_SCHEDULE_WINDOW_DAYS = 30

# Inactive or non-interfering action statuses
TERMINAL_ACTION_STATUSES = ["CANCELLED", "COMPLETED"]

def evaluate_potential_action_conflicts(
    db: Session,
    case_id: int,
    action_type: str,
    subject_category: str,
    title: str,
    description: str,
    scheduled_date: Optional[datetime] = None,
    exclude_action_id: Optional[int] = None,
    window_days: int = DEFAULT_CONFLICT_SCHEDULE_WINDOW_DAYS
) -> List[Dict[str, Any]]:
    """
    Evaluates proposed action against existing active/planned actions for the same verified institution.
    Deterministic explainable matching rules:
    Rule 1: Same verified institution ID
    Rule 2: Cross-bureau prioritization (distinct handling bureau)
    Rule 3: Action type compatibility (INSPECTION <-> INSPECTION, DOC_REQUEST <-> DOC_REQUEST, etc.)
    Rule 4: Standardized subject category matching
    Rule 5: Active status filter (ignores CANCELLED / COMPLETED)
    Rule 6: Configurable scheduled date window evaluation
    Rule 7: Human-readable explainable rationale
    """
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise ValueError(f"Case with ID {case_id} not found.")

    institution = db.query(Institution).filter(Institution.id == case.institution_id).first()
    if not institution:
        raise ValueError(f"Institution for case {case_id} not found.")

    now = datetime.now(timezone.utc)
    if scheduled_date and scheduled_date.tzinfo is None:
        scheduled_date = scheduled_date.replace(tzinfo=timezone.utc)

    # Query active/planned regulatory actions for this institution
    query = db.query(RegulatoryAction).filter(
        RegulatoryAction.institution_id == case.institution_id,
        RegulatoryAction.status.notin_(TERMINAL_ACTION_STATUSES)
    )

    if exclude_action_id:
        query = query.filter(RegulatoryAction.id != exclude_action_id)

    existing_actions = query.all()
    detected_conflicts: List[Dict[str, Any]] = []

    for ext in existing_actions:
        is_cross_bureau = (ext.bureau_id != case.current_bureau_id)
        same_subject = (ext.subject_category.upper() == subject_category.upper())
        same_type = (ext.action_type.upper() == action_type.upper())
        
        # Scheduling proximity evaluation
        ext_date = ext.scheduled_date
        if ext_date and ext_date.tzinfo is None:
            ext_date = ext_date.replace(tzinfo=timezone.utc)

        dates_close = False
        date_diff_days = None
        if scheduled_date and ext_date:
            date_diff_days = abs((scheduled_date - ext_date).days)
            if date_diff_days <= window_days:
                dates_close = True
        elif not scheduled_date and not ext_date:
            # Both open-ended without fixed dates, evaluated by active status proximity
            dates_close = True
        else:
            # One has a date, other is planned/open-ended
            dates_close = True

        conflict_found = False
        conflict_type = None
        severity = "LOW"
        explanation = ""

        # Case 1: Duplicate Inspection
        if action_type.upper() == "INSPECTION" and ext.action_type.upper() == "INSPECTION" and same_subject:
            conflict_found = True
            conflict_type = "DUPLICATE_INSPECTION"
            if is_cross_bureau:
                severity = "HIGH" if dates_close else "MEDIUM"
                diff_text = f" (within {date_diff_days} days)" if date_diff_days is not None else ""
                explanation = (
                    f"Potential duplicate inspection{diff_text}: {ext.bureau.name} has already recorded a "
                    f"'{ext.title}' covering subject '{subject_category}' for {institution.institution_name} "
                    f"under case {ext.case.case_reference}."
                )
            else:
                severity = "MEDIUM"
                explanation = (
                    f"Same-Bureau duplicate inspection: Your bureau already has an active inspection "
                    f"'{ext.title}' for {institution.institution_name} under case {ext.case.case_reference}."
                )

        # Case 2: Redundant Document Request
        elif action_type.upper() == "DOCUMENT_REQUEST" and ext.action_type.upper() == "DOCUMENT_REQUEST" and same_subject:
            conflict_found = True
            conflict_type = "REDUNDANT_DOCUMENT_REQUEST"
            severity = "HIGH" if is_cross_bureau else "MEDIUM"
            bureau_name = ext.bureau.name if is_cross_bureau else "your bureau"
            explanation = (
                f"Redundant document demand: {bureau_name} has already issued document requisition "
                f"'{ext.title}' for category '{subject_category}' under case {ext.case.case_reference}. "
                f"Consolidate document lists to prevent repetitive institutional compliance burdens."
            )

        # Case 3: Overlapping Compliance Review or Show-Cause Notice on same subject
        elif same_subject and (
            (action_type.upper() in ["SHOW_CAUSE_NOTICE", "COMPLIANCE_REVIEW"]) or
            (ext.action_type.upper() in ["SHOW_CAUSE_NOTICE", "COMPLIANCE_REVIEW"])
        ):
            conflict_found = True
            conflict_type = "RELATED_NOTICE" if "SHOW_CAUSE" in (action_type + ext.action_type) else "OVERLAPPING_COMPLIANCE_REVIEW"
            severity = "HIGH" if (is_cross_bureau and same_type) else "MEDIUM"
            explanation = (
                f"Cross-bureau regulatory overlap: An active proceeding '{ext.title}' ({ext.action_type}) "
                f"is handled by {ext.bureau.name} regarding '{subject_category}'. Simultaneous inquiry notices "
                f"require cross-bureau alignment to prevent conflicting directives."
            )

        # Case 4: Weakly related action on same institution (different subject, cross-bureau inspection)
        elif is_cross_bureau and same_type and action_type.upper() == "INSPECTION":
            conflict_found = True
            conflict_type = "OVERLAPPING_COMPLIANCE_REVIEW"
            severity = "LOW"
            explanation = (
                f"Informational notice: {ext.bureau.name} has an active inspection '{ext.title}' "
                f"under case {ext.case.case_reference} regarding '{ext.subject_category}'. Consider a combined inspection."
            )

        if conflict_found:
            detected_conflicts.append({
                "existing_action_id": ext.id,
                "existing_action_title": ext.title,
                "existing_action_type": ext.action_type,
                "existing_subject_category": ext.subject_category,
                "existing_bureau_name": ext.bureau.name,
                "existing_bureau_code": ext.bureau.code,
                "existing_case_reference": ext.case.case_reference,
                "existing_status": ext.status,
                "existing_scheduled_date": ext.scheduled_date,
                "conflict_type": conflict_type,
                "severity": severity,
                "explanation": explanation,
                "is_cross_bureau": is_cross_bureau
            })

    return detected_conflicts

def create_regulatory_action_with_guard(
    db: Session,
    case_id: int,
    action_type: str,
    title: str,
    description: str,
    subject_category: str,
    actor: User,
    scheduled_date: Optional[datetime] = None,
    override_justification: Optional[str] = None
) -> Tuple[RegulatoryAction, List[ActionConflict]]:
    """
    Server-side transactional creation of a proposed regulatory action with mandatory Action Conflict Guard evaluation.
    """
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise ValueError(f"Case with ID {case_id} not found.")

    bureau_id = case.current_bureau_id

    # 1. Evaluate conflicts
    conflicts_data = evaluate_potential_action_conflicts(
        db=db,
        case_id=case_id,
        action_type=action_type,
        subject_category=subject_category,
        title=title,
        description=description,
        scheduled_date=scheduled_date
    )

    now = datetime.now(timezone.utc)
    has_conflicts = len(conflicts_data) > 0
    highest_severity = "LOW"
    if any(c["severity"] == "HIGH" for c in conflicts_data):
        highest_severity = "HIGH"
    elif any(c["severity"] == "MEDIUM" for c in conflicts_data):
        highest_severity = "MEDIUM"

    # If conflicts exist, set status to PENDING_CONFLICT_REVIEW
    initial_status = "PENDING_CONFLICT_REVIEW" if has_conflicts else "PROPOSED"

    action = RegulatoryAction(
        case_id=case_id,
        institution_id=case.institution_id,
        bureau_id=bureau_id,
        created_by_id=actor.id,
        action_type=action_type,
        title=title,
        description=description,
        subject_category=subject_category,
        scheduled_date=scheduled_date,
        status=initial_status,
        created_at=now,
        updated_at=now
    )
    db.add(action)
    db.flush()

    persisted_conflicts: List[ActionConflict] = []
    for c_item in conflicts_data:
        conflict_rec = ActionConflict(
            proposed_action_id=action.id,
            existing_action_id=c_item["existing_action_id"],
            institution_id=case.institution_id,
            conflict_type=c_item["conflict_type"],
            severity=c_item["severity"],
            explanation=c_item["explanation"],
            status="PENDING_REVIEW",
            detected_at=now
        )
        db.add(conflict_rec)
        db.flush()
        persisted_conflicts.append(conflict_rec)

    # Record workflow history on case
    wf = WorkflowHistory(
        institution_id=case.institution_id,
        case_id=case.id,
        action_type="REGULATORY_ACTION_PROPOSED",
        previous_value=None,
        new_value=f"{action_type} - {title}",
        remarks=f"Action proposed by {actor.display_name}. Conflicts detected: {len(persisted_conflicts)}",
        performed_by=actor.id,
        created_at=now
    )
    db.add(wf)

    # In-app notifications if conflicts detected
    if persisted_conflicts:
        # Notify proposing officer
        create_notification(
            db=db,
            notification_type="ACTION_CONFLICT_DETECTED",
            title=f"Potential Action Conflict: {action.title}",
            message=f"{len(persisted_conflicts)} potential conflict(s) detected for {case.institution.institution_name}. Human coordination review required.",
            recipient_user_ids=[actor.id],
            institution_id=case.institution_id,
            case_id=case.id
        )

        # Notify existing conflicting action owners / bureau officers
        conflicting_action_ids = [c["existing_action_id"] for c in conflicts_data]
        existing_actions = db.query(RegulatoryAction).filter(RegulatoryAction.id.in_(conflicting_action_ids)).all()
        other_user_ids = [a.created_by_id for a in existing_actions if a.created_by_id and a.created_by_id != actor.id]
        if other_user_ids:
            create_notification(
                db=db,
                notification_type="ACTION_CONFLICT_DETECTED",
                title=f"Cross-Bureau Action Warning: {case.institution.institution_name}",
                message=f"Another bureau ({case.current_bureau.name}) has proposed a potentially overlapping {action_type} for {case.institution.institution_name}.",
                recipient_user_ids=other_user_ids,
                institution_id=case.institution_id,
                case_id=case.id
            )

    # Log audit event
    log_audit_event(
        db=db,
        action_type="REGULATORY_ACTION_CREATED",
        record_type="RegulatoryAction",
        record_id=str(action.id),
        user_id=actor.id,
        metadata={
            "case_reference": case.case_reference,
            "action_type": action_type,
            "subject_category": subject_category,
            "conflict_count": len(persisted_conflicts),
            "highest_severity": highest_severity if has_conflicts else None
        }
    )

    db.commit()
    db.refresh(action)
    return action, persisted_conflicts

def resolve_action_conflict(
    db: Session,
    conflict_id: int,
    resolution_type: str,
    resolution_notes: str,
    reviewer: User
) -> ActionConflict:
    """
    Executes authorized human resolution on an ActionConflict warning.
    Allowed resolution types:
    - REQUEST_COORDINATION
    - REVISE_ACTION
    - PROCEED_WITH_JUSTIFICATION
    - DISMISS_FALSE_POSITIVE
    """
    conflict = db.query(ActionConflict).filter(ActionConflict.id == conflict_id).first()
    if not conflict:
        raise ValueError(f"Action conflict with ID {conflict_id} not found.")

    valid_types = [
        "REQUEST_COORDINATION", "REVISE_ACTION",
        "PROCEED_WITH_JUSTIFICATION", "DISMISS_FALSE_POSITIVE"
    ]
    if resolution_type not in valid_types:
        raise ValueError(f"Invalid resolution type. Must be one of: {', '.join(valid_types)}")

    now = datetime.now(timezone.utc)
    prev_status = conflict.status

    conflict.resolution_type = resolution_type
    conflict.resolution_notes = resolution_notes
    conflict.reviewed_by_id = reviewer.id
    conflict.reviewed_at = now

    if resolution_type == "REQUEST_COORDINATION":
        conflict.status = "COORDINATION_REQUESTED"
        conflict.proposed_action.status = "PENDING_CONFLICT_REVIEW"
    elif resolution_type == "REVISE_ACTION":
        conflict.status = "RESOLVED_REVISED"
        conflict.proposed_action.status = "DRAFT"
    elif resolution_type == "PROCEED_WITH_JUSTIFICATION":
        conflict.status = "RESOLVED_AUTHORIZED_OVERRIDE"
        # Check if all other conflicts for this proposed action are resolved
        other_active_conflicts = db.query(ActionConflict).filter(
            ActionConflict.proposed_action_id == conflict.proposed_action_id,
            ActionConflict.id != conflict.id,
            ActionConflict.status.in_(["PENDING_REVIEW", "COORDINATION_REQUESTED"])
        ).count()
        if other_active_conflicts == 0:
            conflict.proposed_action.status = "APPROVED"
    elif resolution_type == "DISMISS_FALSE_POSITIVE":
        conflict.status = "DISMISSED_FALSE_POSITIVE"
        other_active_conflicts = db.query(ActionConflict).filter(
            ActionConflict.proposed_action_id == conflict.proposed_action_id,
            ActionConflict.id != conflict.id,
            ActionConflict.status.in_(["PENDING_REVIEW", "COORDINATION_REQUESTED"])
        ).count()
        if other_active_conflicts == 0:
            conflict.proposed_action.status = "APPROVED"

    conflict.proposed_action.updated_at = now

    # Record workflow history
    wf = WorkflowHistory(
        institution_id=conflict.institution_id,
        case_id=conflict.proposed_action.case_id,
        action_type=f"CONFLICT_RESOLVED_{resolution_type}",
        previous_value=prev_status,
        new_value=conflict.status,
        remarks=f"{resolution_type}: {resolution_notes}",
        performed_by=reviewer.id,
        created_at=now
    )
    db.add(wf)

    # In-app notification to action creator
    if conflict.proposed_action.created_by_id:
        create_notification(
            db=db,
            notification_type="ACTION_CONFLICT_RESOLVED",
            title=f"Conflict Decision: {resolution_type.replace('_', ' ')}",
            message=f"Action '{conflict.proposed_action.title}' conflict resolved: {resolution_notes}",
            recipient_user_ids=[conflict.proposed_action.created_by_id],
            institution_id=conflict.institution_id,
            case_id=conflict.proposed_action.case_id
        )

    # Log audit event
    log_audit_event(
        db=db,
        action_type="ACTION_CONFLICT_RESOLVED",
        record_type="ActionConflict",
        record_id=str(conflict.id),
        user_id=reviewer.id,
        metadata={
            "resolution_type": resolution_type,
            "resolution_notes": resolution_notes,
            "previous_status": prev_status,
            "new_status": conflict.status
        }
    )

    db.commit()
    db.refresh(conflict)
    return conflict
