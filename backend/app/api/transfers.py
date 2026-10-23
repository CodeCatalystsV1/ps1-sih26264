from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.api.deps import require_roles
from backend.app.core.permissions import RoleCode, enforce_user_bureau_or_admin, enforce_user_region_or_admin
from backend.app.models.entities import User, Assignment, Transfer, Case
from backend.app.schemas.all_schemas import (
    AssignmentCreate, AssignmentOut, TransferCreate, TransferOut
)
from backend.app.services.transfer_service import assign_case_to_officer, transfer_case

router = APIRouter(prefix="/cases", tags=["Assignments & Transfers"])

@router.post("/{case_id}/assignments", response_model=AssignmentOut)
def assign_case(
    case_id: int,
    assign_in: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([RoleCode.ADMIN, RoleCode.BUREAU_HEAD, RoleCode.PGRC_OFFICER, RoleCode.RB_OFFICER]))
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    enforce_user_bureau_or_admin(current_user, case.current_bureau_id)
    if case.institution:
        enforce_user_region_or_admin(current_user, case.institution.region_id)

    try:
        assign = assign_case_to_officer(
            db=db,
            case_id=case.id,
            officer_id=assign_in.officer_id,
            reason=assign_in.reason,
            actor_id=current_user.id,
            bureau_id=assign_in.bureau_id
        )
        return AssignmentOut(
            id=assign.id,
            bureau_name=assign.bureau.name if assign.bureau else "",
            officer_name=assign.officer.display_name if assign.officer else "Unknown",
            assigned_by_name=current_user.display_name,
            assigned_at=assign.assigned_at,
            reason=assign.reason,
            assignment_status=assign.assignment_status
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/{case_id}/transfers", response_model=TransferOut)
def transfer_case_endpoint(
    case_id: int,
    transfer_in: TransferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([RoleCode.ADMIN, RoleCode.BUREAU_HEAD, RoleCode.PGRC_OFFICER, RoleCode.RB_OFFICER]))
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    enforce_user_bureau_or_admin(current_user, case.current_bureau_id)
    if case.institution:
        enforce_user_region_or_admin(current_user, case.institution.region_id)

    try:
        trans = transfer_case(
            db=db,
            case_id=case.id,
            to_bureau_id=transfer_in.to_bureau_id,
            transfer_reason=transfer_in.transfer_reason,
            actor_id=current_user.id,
            to_officer_id=transfer_in.to_officer_id
        )
        return TransferOut(
            id=trans.id,
            from_bureau_name=trans.from_bureau.name if trans.from_bureau else "",
            to_bureau_name=trans.to_bureau.name if trans.to_bureau else "",
            from_officer_name=trans.from_officer.display_name if trans.from_officer else None,
            to_officer_name=trans.to_officer.display_name if trans.to_officer else None,
            initiated_by_name=current_user.display_name,
            transfer_reason=trans.transfer_reason,
            transferred_at=trans.transferred_at,
            receiving_status=trans.receiving_status,
            receiving_remarks=trans.receiving_remarks
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

