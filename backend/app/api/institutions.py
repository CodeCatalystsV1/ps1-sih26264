from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.api.deps import get_current_user, require_roles
from backend.app.core.permissions import RoleCode, enforce_user_region_or_admin
from backend.app.models.entities import User, Institution, Complaint, Case, OverlapFlag, Bureau
from backend.app.schemas.all_schemas import (
    InstitutionOut, InstitutionDetailOut, InstitutionCreate, InstitutionUpdate,
    ComplaintSimpleOut, CaseSimpleOut, OverlapFlagSimpleOut
)
from backend.app.services.institution_service import (
    get_institutions_query, calculate_institution_stats, create_institution, update_institution
)

router = APIRouter(prefix="/institutions", tags=["Institutions"])

@router.get("", response_model=List[InstitutionOut])
def list_institutions(
    search: Optional[str] = Query(None, description="Search by name, permanent ID, or city"),
    region_id: Optional[int] = Query(None),
    status: Optional[str] = Query("ACTIVE"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Enforce regional scope if user is restricted to a region
    user_roles = [r.code for r in current_user.roles]
    if RoleCode.REGIONAL_OFFICE in user_roles and RoleCode.ADMIN not in user_roles:
        reg_ids = [ba.region_id for ba in current_user.bureau_assignments if ba.region_id is not None]
        if reg_ids:
            region_id = reg_ids[0]

    query = get_institutions_query(db, search=search, region_id=region_id, record_status=status)
    institutions = query.offset(skip).limit(limit).all()

    result = []
    for inst in institutions:
        stats = calculate_institution_stats(db, inst.id)
        out = InstitutionOut.model_validate(inst)
        out.total_complaints = stats["total_complaints"]
        out.active_cases = stats["active_cases"]
        out.overdue_cases = stats["overdue_cases"]
        out.potential_overlaps = stats["potential_overlaps"]
        out.last_activity = stats["last_activity"]
        result.append(out)

    return result

@router.post("", response_model=InstitutionOut, status_code=status.HTTP_201_CREATED)
def add_institution(
    inst_in: InstitutionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([RoleCode.ADMIN, RoleCode.PGRC_OFFICER, RoleCode.RB_OFFICER, RoleCode.BUREAU_HEAD]))
):
    try:
        inst = create_institution(db, inst_in, creator_id=current_user.id)
        out = InstitutionOut.model_validate(inst)
        return out
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/{identifier}", response_model=InstitutionDetailOut)
def get_institution_profile(
    identifier: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inst = None
    if identifier.isdigit():
        inst = db.query(Institution).filter(Institution.id == int(identifier)).first()
    if not inst:
        inst = db.query(Institution).filter(Institution.permanent_id == identifier).first()
    if not inst:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Institution not found")

    enforce_user_region_or_admin(current_user, inst.region_id)

    stats = calculate_institution_stats(db, inst.id)
    out = InstitutionDetailOut.model_validate(inst)
    out.total_complaints = stats["total_complaints"]
    out.active_cases = stats["active_cases"]
    out.overdue_cases = stats["overdue_cases"]
    out.potential_overlaps = stats["potential_overlaps"]
    out.last_activity = stats["last_activity"]
    out.involved_bureaus = stats["involved_bureaus"]

    # Complaints (exclude confidential if complainant viewing other complaints)
    complaints = db.query(Complaint).filter(Complaint.institution_id == inst.id).order_by(Complaint.created_at.desc()).all()
    out.complaints = [ComplaintSimpleOut.model_validate(c) for c in complaints]

    # Cases
    cases = db.query(Case).filter(Case.institution_id == inst.id).order_by(Case.created_at.desc()).all()
    case_outs = []
    for c in cases:
        c_out = CaseSimpleOut.model_validate(c)
        c_out.current_bureau_name = c.current_bureau.name if c.current_bureau else None
        c_out.assigned_officer_name = c.current_officer.display_name if c.current_officer else "Unassigned"
        case_outs.append(c_out)
    out.cases = case_outs

    # Overlaps
    flags = db.query(OverlapFlag).filter(OverlapFlag.institution_id == inst.id).all()
    flag_outs = []
    for f in flags:
        f_out = OverlapFlagSimpleOut.model_validate(f)
        f_out.institution_name = inst.institution_name
        f_out.permanent_id = inst.permanent_id
        flag_outs.append(f_out)
    out.overlap_flags = flag_outs

    return out

@router.patch("/{institution_id}", response_model=InstitutionOut)
@router.put("/{institution_id}", response_model=InstitutionOut)
def modify_institution(
    institution_id: int,
    inst_in: InstitutionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([RoleCode.ADMIN, RoleCode.BUREAU_HEAD]))
):
    try:
        inst = update_institution(db, institution_id, inst_in, updater_id=current_user.id)
        stats = calculate_institution_stats(db, inst.id)
        out = InstitutionOut.model_validate(inst)
        out.total_complaints = stats["total_complaints"]
        out.active_cases = stats["active_cases"]
        out.overdue_cases = stats["overdue_cases"]
        out.potential_overlaps = stats["potential_overlaps"]
        out.last_activity = stats["last_activity"]
        return out
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
