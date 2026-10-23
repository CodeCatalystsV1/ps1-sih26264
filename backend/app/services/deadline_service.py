from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from backend.app.models.entities import SLARule, Case, Notification
from backend.app.services.notification_service import create_notification

def calculate_case_deadline(
    db: Session,
    bureau_id: int,
    category_id: Optional[int] = None,
    case_status: Optional[str] = None,
    from_date: Optional[datetime] = None
) -> Tuple[Optional[datetime], str]:
    """
    Evaluates configurable SLA rules. If no rule is configured,
    returns (None, 'Deadline not configured') as mandated by Rule 6.
    """
    if from_date is None:
        from_date = datetime.now(timezone.utc)
    
    # Check specific rule: bureau + category
    rule = None
    if category_id:
        rule = db.query(SLARule).filter(
            SLARule.enabled == True,
            SLARule.bureau_id == bureau_id,
            SLARule.category_id == category_id
        ).first()

    # Check bureau-level rule
    if not rule:
        rule = db.query(SLARule).filter(
            SLARule.enabled == True,
            SLARule.bureau_id == bureau_id,
            SLARule.category_id.is_(None)
        ).first()

    # Check global default rule
    if not rule:
        rule = db.query(SLARule).filter(
            SLARule.enabled == True,
            SLARule.bureau_id.is_(None),
            SLARule.category_id.is_(None)
        ).first()

    if not rule:
        return None, "Deadline not configured"

    deadline = from_date + timedelta(days=rule.duration_days)
    return deadline, f"{rule.duration_days} days ({rule.rule_name})"

def evaluate_case_deadlines(db: Session):
    """
    Scheduled task runner to scan active cases, update escalation status,
    and trigger approaching / overdue notifications without sending duplicates.
    """
    now = datetime.now(timezone.utc)
    active_cases = db.query(Case).filter(
        Case.applicable_deadline_at.isnot(None),
        Case.status.notin_(["Disposed", "Closed – Action Taken", "Closed – No Action Required"])
    ).all()

    for case in active_cases:
        deadline = case.applicable_deadline_at
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)

        days_remaining = (deadline - now).days

        if now > deadline:
            # Overdue case
            if case.escalation_status != "OVERDUE":
                case.escalation_status = "OVERDUE"
                # Check if notification already sent in past 24 hours
                existing_notif = db.query(Notification).filter(
                    Notification.case_id == case.id,
                    Notification.notification_type == "OVERDUE"
                ).first()
                if not existing_notif:
                    recipients = [case.current_officer_id] if case.current_officer_id else []
                    create_notification(
                        db=db,
                        notification_type="OVERDUE",
                        title=f"OVERDUE: Case {case.case_reference}",
                        message=f"Case {case.case_reference} regarding {case.institution.institution_name} is overdue past deadline {deadline.strftime('%d-%b-%Y')}.",
                        recipient_user_ids=recipients,
                        institution_id=case.institution_id,
                        case_id=case.id
                    )
        elif 0 <= days_remaining <= 5:
            # Approaching deadline
            if case.escalation_status != "APPROACHING":
                case.escalation_status = "APPROACHING"
                existing_notif = db.query(Notification).filter(
                    Notification.case_id == case.id,
                    Notification.notification_type == "DEADLINE_APPROACHING"
                ).first()
                if not existing_notif:
                    recipients = [case.current_officer_id] if case.current_officer_id else []
                    create_notification(
                        db=db,
                        notification_type="DEADLINE_APPROACHING",
                        title=f"Deadline Approaching: Case {case.case_reference}",
                        message=f"Case {case.case_reference} has {days_remaining} day(s) remaining until deadline.",
                        recipient_user_ids=recipients,
                        institution_id=case.institution_id,
                        case_id=case.id
                    )
    db.commit()
