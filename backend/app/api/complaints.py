import os
import shutil
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.api.deps import get_current_user, require_roles
from backend.app.core.permissions import RoleCode, user_has_role
from backend.app.core.config import settings
from backend.app.models.entities import (
    User, Complaint, Institution, ComplaintCategory, Bureau, Document, ComplaintCaseLink, WorkflowHistory
)
from backend.app.schemas.all_schemas import (
    ComplaintOut, ComplaintCreate, ComplaintCategoryOut, DocumentOut
)
from backend.app.services.complaint_service import create_complaint
from backend.app.services.audit_service import log_audit_event

router = APIRouter(prefix="/complaints", tags=["Complaints"])

@router.get("/categories", response_model=List[ComplaintCategoryOut])
def get_complaint_categories(db: Session = Depends(get_db)):
    return db.query(ComplaintCategory).filter(ComplaintCategory.active == True).all()

@router.get("", response_model=List[ComplaintOut])
def list_complaints(
    search: Optional[str] = Query(None),
    institution_id: Optional[int] = Query(None),
    category_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    bureau_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Complaint)

    # Restrict Complainant to own records
    user_roles = [r.code for r in current_user.roles]
    if RoleCode.COMPLAINANT in user_roles and RoleCode.ADMIN not in user_roles and len(user_roles) == 1:
        query = query.filter(Complaint.complainant_id == current_user.id)

    if institution_id:
        query = query.filter(Complaint.institution_id == institution_id)
    if category_id:
        query = query.filter(Complaint.category_id == category_id)
    if status and status != "ALL":
        query = query.filter(Complaint.status == status)
    if bureau_id:
        query = query.filter(Complaint.assigned_bureau_id == bureau_id)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            (Complaint.title.ilike(term)) |
            (Complaint.complaint_reference.ilike(term)) |
            (Complaint.description.ilike(term))
        )

    complaints = query.order_by(Complaint.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for c in complaints:
        out = ComplaintOut.model_validate(c)
        out.institution_name = c.institution.institution_name if c.institution else None
        out.permanent_id = c.institution.permanent_id if c.institution else None
        out.category_name = c.category.name if c.category else None
        out.assigned_bureau_name = c.assigned_bureau.name if c.assigned_bureau else None
        if c.case_links:
            out.linked_case_reference = c.case_links[0].case.case_reference if c.case_links[0].case else None
        result.append(out)

    return result

@router.post("", response_model=ComplaintOut, status_code=status.HTTP_201_CREATED)
def register_complaint(
    comp_in: ComplaintCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        complaint = create_complaint(db, comp_in, creator_id=current_user.id)
        out = ComplaintOut.model_validate(complaint)
        out.institution_name = complaint.institution.institution_name
        out.permanent_id = complaint.institution.permanent_id
        out.category_name = complaint.category.name
        out.assigned_bureau_name = complaint.assigned_bureau.name if complaint.assigned_bureau else None
        if complaint.case_links:
            out.linked_case_reference = complaint.case_links[0].case.case_reference
        return out
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/{complaint_id}", response_model=ComplaintOut)
def get_complaint(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")

    user_roles = [r.code for r in current_user.roles]
    if RoleCode.COMPLAINANT in user_roles and RoleCode.ADMIN not in user_roles and len(user_roles) == 1:
        if complaint.complainant_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    out = ComplaintOut.model_validate(complaint)
    out.institution_name = complaint.institution.institution_name
    out.permanent_id = complaint.institution.permanent_id
    out.category_name = complaint.category.name
    out.assigned_bureau_name = complaint.assigned_bureau.name if complaint.assigned_bureau else None
    if complaint.case_links:
        out.linked_case_reference = complaint.case_links[0].case.case_reference
    out.documents = [DocumentOut.model_validate(d) for d in complaint.documents]
    return out

@router.post("/{complaint_id}/documents", response_model=DocumentOut)
def upload_complaint_document(
    complaint_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")

    user_roles = [r.code for r in current_user.roles]
    if RoleCode.COMPLAINANT in user_roles and RoleCode.ADMIN not in user_roles and len(user_roles) == 1:
        if complaint.complainant_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # Validate file type
    allowed_types = ["application/pdf", "image/jpeg", "image/png", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unsupported file format '{file.content_type}'. Allowed: PDF, JPG, PNG, DOCX.")

    # Sanitize filename
    clean_name = os.path.basename(file.filename or "upload.pdf")
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    safe_key = f"doc_{uuid.uuid4().hex[:12]}_{clean_name}"
    file_path = os.path.join(settings.UPLOAD_DIR, safe_key)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        file_size = os.path.getsize(file_path)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to store file: {str(e)}")

    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if file_size > max_bytes:
        try:
            os.remove(file_path)
        except OSError:
            pass
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum permitted size of {settings.MAX_UPLOAD_SIZE_MB} MB."
        )

    doc = Document(
        original_filename=clean_name,
        safe_storage_key=safe_key,
        file_path=file_path,
        content_type=file.content_type,
        file_size=file_size,
        uploaded_by=current_user.id,
        complaint_id=complaint.id
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    log_audit_event(
        db=db,
        action_type="DOCUMENT_UPLOADED",
        record_type="Complaint",
        record_id=str(complaint.id),
        user_id=current_user.id,
        metadata={"filename": clean_name, "size": file_size}
    )

    return DocumentOut.model_validate(doc)
