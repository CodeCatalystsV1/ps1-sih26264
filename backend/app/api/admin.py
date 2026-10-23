from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.api.deps import require_admin, get_current_user
from backend.app.core.permissions import RoleCode
from backend.app.core.security import get_password_hash
from backend.app.models.entities import (
    User, Role, Bureau, Region, UserBureauAssignment, SLARule, ApplicationSetting, user_roles
)
from backend.app.schemas.all_schemas import (
    UserOut, UserCreateAdmin, UserUpdateAdmin, RoleOut, BureauSimpleOut, RegionSimpleOut, SLARuleOut
)
from backend.app.services.audit_service import log_audit_event

router = APIRouter(prefix="/admin", tags=["Administration"])

# ----------------- USERS -----------------
@router.get("/users", response_model=List[UserOut])
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    users = db.query(User).offset(skip).limit(limit).all()
    return [UserOut.model_validate(u) for u in users]

@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreateAdmin,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    # Check duplicate email/username
    if db.query(User).filter(User.username == user_in.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="Email already exists")

    hashed_pw = get_password_hash(user_in.password)
    user = User(
        display_name=user_in.display_name,
        email=user_in.email,
        username=user_in.username,
        password_hash=hashed_pw,
        phone=user_in.phone,
        account_status="ACTIVE"
    )

    if user_in.role_ids:
        roles = db.query(Role).filter(Role.id.in_(user_in.role_ids)).all()
        user.roles = roles

    db.add(user)
    db.flush()

    if user_in.bureau_id or user_in.region_id:
        assignment = UserBureauAssignment(
            user_id=user.id,
            bureau_id=user_in.bureau_id,
            region_id=user_in.region_id
        )
        db.add(assignment)

    log_audit_event(
        db=db,
        action_type="USER_CREATED",
        record_type="User",
        record_id=str(user.id),
        user_id=current_user.id,
        metadata={"username": user.username, "roles": [r.code for r in user.roles]}
    )

    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)

@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    user_in: UserUpdateAdmin,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user_in.display_name:
        user.display_name = user_in.display_name
    if user_in.account_status:
        user.account_status = user_in.account_status
    if user_in.phone:
        user.phone = user_in.phone
    if user_in.new_password:
        user.password_hash = get_password_hash(user_in.new_password)

    if user_in.role_ids is not None:
        roles = db.query(Role).filter(Role.id.in_(user_in.role_ids)).all()
        user.roles = roles

    if user_in.bureau_id is not None or user_in.region_id is not None:
        db.query(UserBureauAssignment).filter(UserBureauAssignment.user_id == user.id).delete()
        assignment = UserBureauAssignment(
            user_id=user.id,
            bureau_id=user_in.bureau_id,
            region_id=user_in.region_id
        )
        db.add(assignment)

    log_audit_event(
        db=db,
        action_type="USER_UPDATED",
        record_type="User",
        record_id=str(user.id),
        user_id=current_user.id,
        metadata={"status": user.account_status}
    )

    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)

# ----------------- LOOKUPS -----------------
@router.get("/roles", response_model=List[RoleOut])
def list_roles(db: Session = Depends(get_db)):
    return db.query(Role).all()

@router.get("/bureaus", response_model=List[BureauSimpleOut])
def list_bureaus(db: Session = Depends(get_db)):
    return db.query(Bureau).filter(Bureau.active == True).all()

@router.get("/regions", response_model=List[RegionSimpleOut])
def list_regions(db: Session = Depends(get_db)):
    return db.query(Region).filter(Region.active == True).all()

@router.get("/sla-rules", response_model=List[SLARuleOut])
def list_sla_rules(db: Session = Depends(get_db)):
    rules = db.query(SLARule).all()
    return [
        SLARuleOut(
            id=r.id,
            rule_name=r.rule_name,
            bureau_name=r.bureau.name if r.bureau else "All Bureaus",
            category_name=r.category.name if r.category else "All Categories",
            applicable_status=r.applicable_status or "All Active",
            duration_days=r.duration_days,
            reminder_threshold_days=r.reminder_threshold_days,
            escalation_threshold_days=r.escalation_threshold_days,
            enabled=r.enabled
        ) for r in rules
    ]
