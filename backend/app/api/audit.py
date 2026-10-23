from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.api.deps import require_roles
from backend.app.core.permissions import RoleCode
from backend.app.models.entities import User, AuditLog
from backend.app.schemas.all_schemas import AuditLogOut

router = APIRouter(prefix="/audit", tags=["Audit Trail"])

@router.get("", response_model=List[AuditLogOut])
def get_audit_trail(
    action_type: Optional[str] = Query(None),
    record_type: Optional[str] = Query(None),
    outcome: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([RoleCode.ADMIN, RoleCode.MANAGEMENT]))
):
    query = db.query(AuditLog)
    if action_type and action_type != "ALL":
        query = query.filter(AuditLog.action_type == action_type)
    if record_type and record_type != "ALL":
        query = query.filter(AuditLog.record_type == record_type)
    if outcome and outcome != "ALL":
        query = query.filter(AuditLog.outcome == outcome)

    logs = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()

    return [
        AuditLogOut(
            id=l.id,
            user_name=l.user.display_name if l.user else "System / Anonymous",
            action_type=l.action_type,
            record_type=l.record_type,
            record_id=l.record_id,
            outcome=l.outcome,
            metadata_json=l.metadata_json,
            ip_address=l.ip_address,
            created_at=l.created_at
        ) for l in logs
    ]
