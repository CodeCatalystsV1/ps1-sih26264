from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.models.entities import (
    Complaint, Case, ComplaintCaseLink, Institution, Bureau, ComplaintCategory, WorkflowHistory
)
from backend.app.schemas.all_schemas import ComplaintCreate
from backend.app.services.deadline_service import calculate_case_deadline
from backend.app.services.overlap_service import detect_overlaps_for_institution
from backend.app.services.notification_service import notify_bureau_and_admins
from backend.app.services.audit_service import log_audit_event

def generate_complaint_reference(db: Session) -> str:
    year = datetime.now(timezone.utc).year
    prefix = f"CMP-{year}-"
    last_comp = db.query(Complaint).filter(Complaint.complaint_reference.like(f"{prefix}%")).order_by(Complaint.id.desc()).first()
    if last_comp:
        try:
            last_seq = int(last_comp.complaint_reference.split("-")[-1])
            next_seq = last_seq + 1
        except Exception:
            next_seq = last_comp.id + 1
    else:
        next_seq = 1
    return f"{prefix}{next_seq:04d}"

def generate_case_reference(db: Session) -> str:
    year = datetime.now(timezone.utc).year
    prefix = f"CASE-{year}-"
    last_case = db.query(Case).filter(Case.case_reference.like(f"{prefix}%")).order_by(Case.id.desc()).first()
    if last_case:
        try:
            last_seq = int(last_case.case_reference.split("-")[-1])
            next_seq = last_seq + 1
        except Exception:
            next_seq = last_case.id + 1
    else:
        next_seq = 1
    return f"{prefix}{next_seq:04d}"

def create_complaint(
    db: Session,
    comp_in: ComplaintCreate,
    creator_id: Optional[int] = None
) -> Complaint:
    institution = db.query(Institution).filter(Institution.id == comp_in.institution_id).first()
    if not institution:
        raise ValueError(f"Selected institution ID {comp_in.institution_id} does not exist.")

    category = db.query(ComplaintCategory).filter(ComplaintCategory.id == comp_in.category_id).first()
    if not category:
        raise ValueError(f"Complaint category ID {comp_in.category_id} does not exist.")

    # Determine initial bureau assignment
    bureau_id = comp_in.assigned_bureau_id
    if not bureau_id:
        # Default to PGRC if none specified
        pgrc = db.query(Bureau).filter(Bureau.code == "PGRC").first()
        bureau_id = pgrc.id if pgrc else db.query(Bureau).first().id

    reference = generate_complaint_reference(db)
    now = datetime.now(timezone.utc)

    complaint = Complaint(
        complaint_reference=reference,
        title=comp_in.title.strip(),
        description=comp_in.description.strip(),
        complainant_id=creator_id,
        institution_id=institution.id,
        category_id=category.id,
        complainant_type=comp_in.complainant_type,
        source=comp_in.source,
        received_at=now,
        status="REGISTERED",
        sensitivity_classification=comp_in.sensitivity_classification,
        assigned_bureau_id=bureau_id,
        created_by=creator_id
    )
    db.add(complaint)
    db.flush()

    linked_case = None
    if comp_in.create_case_automatically:
        # Calculate deadline if configured
        deadline, deadline_label = calculate_case_deadline(
            db=db,
            bureau_id=bureau_id,
            category_id=category.id,
            from_date=now
        )

        case_ref = generate_case_reference(db)
        case = Case(
            case_reference=case_ref,
            institution_id=institution.id,
            current_bureau_id=bureau_id,
            title=f"Grievance: {complaint.title[:200]}",
            category=category.name,
            status="Received",
            priority=comp_in.priority,
            received_at=now,
            last_action="Complaint registered and official case opened",
            last_action_at=now,
            next_action="Scrutiny and officer assignment",
            applicable_deadline_at=deadline,
            escalation_status="NONE",
            created_by=creator_id,
            updated_by=creator_id
        )
        db.add(case)
        db.flush()

        link = ComplaintCaseLink(
            complaint_id=complaint.id,
            case_id=case.id,
            link_type="PRIMARY",
            created_by=creator_id
        )
        db.add(link)
        complaint.status = "CASE_LINKED"
        db.flush()

        # Workflow History for Case
        wf = WorkflowHistory(
            institution_id=institution.id,
            complaint_id=complaint.id,
            case_id=case.id,
            action_type="CASE_INITIALIZED",
            previous_value=None,
            new_value="Received",
            remarks=f"Initial case created from complaint {complaint.complaint_reference}. Deadline: {deadline_label}",
            performed_by=creator_id,
            created_at=now
        )
        db.add(wf)

        linked_case = case

        # Trigger Deterministic Overlap Check immediately
        detect_overlaps_for_institution(db=db, institution_id=institution.id)

    # Workflow History for Complaint
    wf_comp = WorkflowHistory(
        institution_id=institution.id,
        complaint_id=complaint.id,
        case_id=linked_case.id if linked_case else None,
        action_type="COMPLAINT_REGISTERED",
        previous_value=None,
        new_value="REGISTERED",
        remarks=f"Complaint registered via {comp_in.source}",
        performed_by=creator_id,
        created_at=now
    )
    db.add(wf_comp)

    # Log audit event
    log_audit_event(
        db=db,
        action_type="COMPLAINT_REGISTERED",
        record_type="Complaint",
        record_id=str(complaint.id),
        user_id=creator_id,
        metadata={
            "reference": complaint.complaint_reference,
            "institution_id": institution.id,
            "case_id": linked_case.id if linked_case else None
        }
    )

    db.commit()
    db.refresh(complaint)
    return complaint
