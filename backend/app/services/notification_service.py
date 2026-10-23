from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.models.entities import Notification, NotificationRecipient, User, UserBureauAssignment, Role, user_roles

def create_notification(
    db: Session,
    notification_type: str,
    title: str,
    message: str,
    recipient_user_ids: List[int],
    institution_id: Optional[int] = None,
    complaint_id: Optional[int] = None,
    case_id: Optional[int] = None,
    overlap_flag_id: Optional[int] = None
) -> Optional[Notification]:
    if not recipient_user_ids:
        return None
    
    # Deduplicate recipient IDs
    unique_user_ids = list(set(recipient_user_ids))
    
    notification = Notification(
        notification_type=notification_type,
        title=title,
        message=message,
        institution_id=institution_id,
        complaint_id=complaint_id,
        case_id=case_id,
        overlap_flag_id=overlap_flag_id,
        created_at=datetime.now(timezone.utc)
    )
    db.add(notification)
    db.flush()

    for uid in unique_user_ids:
        recipient = NotificationRecipient(
            notification_id=notification.id,
            user_id=uid,
            is_read=False,
            delivery_status="DELIVERED"
        )
        db.add(recipient)
    
    db.flush()
    return notification

def notify_bureau_and_admins(
    db: Session,
    notification_type: str,
    title: str,
    message: str,
    bureau_ids: List[int],
    institution_id: Optional[int] = None,
    case_id: Optional[int] = None,
    overlap_flag_id: Optional[int] = None
):
    # Find all users assigned to these bureaus or having ADMIN role
    user_ids = []
    # Bureau users
    bureau_assignments = db.query(UserBureauAssignment).filter(
        UserBureauAssignment.bureau_id.in_(bureau_ids)
    ).all()
    user_ids.extend([ba.user_id for ba in bureau_assignments])

    # Admin users
    admin_role = db.query(Role).filter(Role.code == "ROLE_ADMIN").first()
    if admin_role:
        admins = db.query(User).join(User.roles).filter(Role.id == admin_role.id).all()
        user_ids.extend([a.id for a in admins])

    if user_ids:
        create_notification(
            db=db,
            notification_type=notification_type,
            title=title,
            message=message,
            recipient_user_ids=user_ids,
            institution_id=institution_id,
            case_id=case_id,
            overlap_flag_id=overlap_flag_id
        )
