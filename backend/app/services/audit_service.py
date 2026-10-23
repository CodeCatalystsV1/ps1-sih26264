import json
from datetime import datetime, timezone
from typing import Optional, Any
from sqlalchemy.orm import Session
from backend.app.models.entities import AuditLog

def log_audit_event(
    db: Session,
    action_type: str,
    record_type: str,
    record_id: Optional[str] = None,
    user_id: Optional[int] = None,
    outcome: str = "SUCCESS",
    metadata: Optional[dict] = None,
    ip_address: Optional[str] = None
):
    try:
        audit = AuditLog(
            user_id=user_id,
            action_type=action_type,
            record_type=record_type,
            record_id=str(record_id) if record_id is not None else None,
            outcome=outcome,
            metadata_json=json.dumps(metadata) if metadata else None,
            ip_address=ip_address,
            created_at=datetime.now(timezone.utc)
        )
        db.add(audit)
        db.flush()
    except Exception as e:
        # Never break main transaction due to audit logging failure
        print(f"Audit log error: {e}")
