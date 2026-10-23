from datetime import datetime, timezone
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from backend.app.models.entities import (
    Institution, Complaint, Case, OverlapFlag, Bureau, Region, WorkflowHistory
)
from backend.app.schemas.all_schemas import InstitutionCreate, InstitutionUpdate
from backend.app.services.audit_service import log_audit_event

def get_institutions_query(
    db: Session,
    search: Optional[str] = None,
    region_id: Optional[int] = None,
    record_status: Optional[str] = "ACTIVE",
    verification_status: Optional[str] = None
):
    query = db.query(Institution)

    if record_status and record_status != "ALL":
        query = query.filter(Institution.record_status == record_status)

    if verification_status and verification_status != "ALL":
        query = query.filter(Institution.verification_status == verification_status)

    if region_id:
        query = query.filter(Institution.region_id == region_id)

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Institution.institution_name.ilike(term),
                Institution.permanent_id.ilike(term),
                Institution.city.ilike(term),
                Institution.state.ilike(term)
            )
        )

    return query

def calculate_institution_stats(db: Session, institution_id: int) -> Dict[str, Any]:
    total_complaints = db.query(Complaint).filter(Complaint.institution_id == institution_id).count()
    
    active_cases = db.query(Case).filter(
        Case.institution_id == institution_id,
        Case.status.notin_(["Disposed", "Closed – Action Taken", "Closed – No Action Required"])
    ).count()

    now = datetime.now(timezone.utc)
    overdue_cases = db.query(Case).filter(
        Case.institution_id == institution_id,
        Case.status.notin_(["Disposed", "Closed – Action Taken", "Closed – No Action Required"]),
        Case.applicable_deadline_at.isnot(None),
        Case.applicable_deadline_at < now
    ).count()

    potential_overlaps = db.query(OverlapFlag).filter(
        OverlapFlag.institution_id == institution_id,
        OverlapFlag.relationship_state.in_(["POTENTIAL_OVERLAP", "UNDER_REVIEW", "COORDINATION_REQUESTED", "JOINT_ACTION_IN_PROGRESS", "ESCALATED"])
    ).count()

    last_case = db.query(Case).filter(Case.institution_id == institution_id).order_by(Case.last_action_at.desc()).first()
    last_activity = last_case.last_action_at if last_case else None

    # Get distinct involved bureaus
    bureau_names = [
        b[0] for b in db.query(Bureau.name)
        .join(Case, Case.current_bureau_id == Bureau.id)
        .filter(Case.institution_id == institution_id)
        .distinct()
        .all()
    ]

    return {
        "total_complaints": total_complaints,
        "active_cases": active_cases,
        "overdue_cases": overdue_cases,
        "potential_overlaps": potential_overlaps,
        "last_activity": last_activity,
        "involved_bureaus": bureau_names
    }

def create_institution(db: Session, inst_in: InstitutionCreate, creator_id: Optional[int] = None) -> Institution:
    # Check Permanent ID uniqueness
    existing = db.query(Institution).filter(Institution.permanent_id == inst_in.permanent_id.strip()).first()
    if existing:
        raise ValueError(f"An institution with AICTE Permanent ID '{inst_in.permanent_id}' already exists.")

    inst = Institution(
        permanent_id=inst_in.permanent_id.strip(),
        institution_name=inst_in.institution_name.strip(),
        institution_type=inst_in.institution_type,
        address=inst_in.address,
        city=inst_in.city,
        district=inst_in.district,
        state=inst_in.state,
        region_id=inst_in.region_id,
        regional_office=inst_in.regional_office,
        postal_code=inst_in.postal_code,
        contact_email=inst_in.contact_email,
        contact_phone=inst_in.contact_phone,
        verification_status=inst_in.verification_status,
        record_status=inst_in.record_status,
        created_by=creator_id,
        updated_by=creator_id
    )
    db.add(inst)
    db.flush()

    log_audit_event(
        db=db,
        action_type="INSTITUTION_CREATED",
        record_type="Institution",
        record_id=str(inst.id),
        user_id=creator_id,
        metadata={"permanent_id": inst.permanent_id, "name": inst.institution_name}
    )
    db.commit()
    db.refresh(inst)
    return inst

def update_institution(db: Session, inst_id: int, inst_in: InstitutionUpdate, updater_id: Optional[int] = None) -> Institution:
    inst = db.query(Institution).filter(Institution.id == inst_id).first()
    if not inst:
        raise ValueError(f"Institution {inst_id} not found.")

    update_data = inst_in.model_dump(exclude_unset=True)
    if "permanent_id" in update_data and update_data["permanent_id"]:
        new_pid = update_data["permanent_id"].strip()
        existing = db.query(Institution).filter(
            Institution.permanent_id == new_pid,
            Institution.id != inst_id
        ).first()
        if existing:
            raise ValueError(f"An institution with AICTE Permanent ID '{new_pid}' already exists.")
        update_data["permanent_id"] = new_pid

    for field, value in update_data.items():
        setattr(inst, field, value)

    inst.updated_by = updater_id
    inst.updated_at = datetime.now(timezone.utc)
    db.flush()

    log_audit_event(
        db=db,
        action_type="INSTITUTION_UPDATED",
        record_type="Institution",
        record_id=str(inst.id),
        user_id=updater_id,
        metadata=update_data
    )
    db.commit()
    db.refresh(inst)
    return inst
