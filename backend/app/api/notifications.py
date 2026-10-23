from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.api.deps import get_current_user
from backend.app.models.entities import User, Notification, NotificationRecipient
from backend.app.schemas.all_schemas import NotificationOut

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=List[NotificationOut])
def list_user_notifications(
    is_read: Optional[bool] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(NotificationRecipient).join(Notification).filter(
        NotificationRecipient.user_id == current_user.id
    )
    if is_read is not None:
        query = query.filter(NotificationRecipient.is_read == is_read)

    recipients = query.order_by(Notification.created_at.desc()).limit(limit).all()

    results = []
    for r in recipients:
        n = r.notification
        out = NotificationOut(
            id=r.id,
            notification_type=n.notification_type,
            title=n.title,
            message=n.message,
            institution_id=n.institution_id,
            case_id=n.case_id,
            overlap_flag_id=n.overlap_flag_id,
            created_at=n.created_at,
            is_read=r.is_read,
            read_at=r.read_at
        )
        results.append(out)
    return results

@router.patch("/{recipient_id}/read", response_model=NotificationOut)
def mark_notification_as_read(
    recipient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    rec = db.query(NotificationRecipient).filter(
        NotificationRecipient.id == recipient_id,
        NotificationRecipient.user_id == current_user.id
    ).first()
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    rec.is_read = True
    rec.read_at = datetime.now(timezone.utc)
    db.commit()

    n = rec.notification
    return NotificationOut(
        id=rec.id,
        notification_type=n.notification_type,
        title=n.title,
        message=n.message,
        institution_id=n.institution_id,
        case_id=n.case_id,
        overlap_flag_id=n.overlap_flag_id,
        created_at=n.created_at,
        is_read=rec.is_read,
        read_at=rec.read_at
    )

@router.post("/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    db.query(NotificationRecipient).filter(
        NotificationRecipient.user_id == current_user.id,
        NotificationRecipient.is_read == False
    ).update({"is_read": True, "read_at": now})
    db.commit()
    return {"message": "All notifications marked as read"}
