from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import verify_password, create_access_token
from backend.app.core.config import settings
from backend.app.api.deps import get_current_user
from backend.app.models.entities import User, Role
from backend.app.schemas.all_schemas import TokenResponse, LoginRequest, UserOut
from backend.app.services.audit_service import log_audit_event

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(request: Request, login_data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        (User.username == login_data.username_or_email) | (User.email == login_data.username_or_email)
    ).first()

    ip = request.client.host if request.client else "unknown"

    if not user or not verify_password(login_data.password, user.password_hash):
        log_audit_event(
            db=db,
            action_type="LOGIN_FAILED",
            record_type="User",
            record_id=login_data.username_or_email,
            outcome="FAILURE",
            metadata={"reason": "Invalid credentials"},
            ip_address=ip
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.account_status != "ACTIVE":
        log_audit_event(
            db=db,
            action_type="LOGIN_BLOCKED",
            record_type="User",
            record_id=str(user.id),
            user_id=user.id,
            outcome="DENIED",
            metadata={"status": user.account_status},
            ip_address=ip
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account is {user.account_status}. Please contact an administrator."
        )

    # Generate JWT
    roles_list = [r.code for r in user.roles]
    token = create_access_token(
        subject=user.id,
        claims={"roles": roles_list, "username": user.username}
    )

    log_audit_event(
        db=db,
        action_type="LOGIN_SUCCESS",
        record_type="User",
        record_id=str(user.id),
        user_id=user.id,
        outcome="SUCCESS",
        metadata={"username": user.username, "roles": roles_list},
        ip_address=ip
    )
    db.commit()

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )

@router.post("/token", response_model=TokenResponse)
def token_form_login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """OAuth2 compatible token login for FastAPI docs"""
    user = db.query(User).filter(
        (User.username == form_data.username) | (User.email == form_data.username)
    ).first()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(
        subject=user.id,
        claims={"roles": [r.code for r in user.roles], "username": user.username}
    )
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )

@router.get("/me", response_model=UserOut)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    log_audit_event(
        db=db,
        action_type="LOGOUT",
        record_type="User",
        record_id=str(current_user.id),
        user_id=current_user.id,
        outcome="SUCCESS"
    )
    db.commit()
    return {"message": "Successfully logged out"}
