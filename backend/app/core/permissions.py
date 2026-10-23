from typing import List, Optional
from fastapi import HTTPException, status
from backend.app.models.entities import User

class RoleCode:
    ADMIN = "ROLE_ADMIN"
    PGRC_OFFICER = "ROLE_PGRC_OFFICER"
    RB_OFFICER = "ROLE_RB_OFFICER"
    BUREAU_OFFICER = "ROLE_BUREAU_OFFICER"
    BUREAU_HEAD = "ROLE_BUREAU_HEAD"
    REGIONAL_OFFICE = "ROLE_REGIONAL_OFFICE"
    MANAGEMENT = "ROLE_MANAGEMENT"
    COMPLAINANT = "ROLE_COMPLAINANT"

def user_has_role(user: User, allowed_roles: List[str]) -> bool:
    if not user or not user.roles:
        return False
    user_roles = [r.code for r in user.roles]
    # Admin has superuser access
    if RoleCode.ADMIN in user_roles:
        return True
    return any(r in user_roles for r in allowed_roles)

def get_user_bureau_ids(user: User) -> List[int]:
    return [ba.bureau_id for ba in user.bureau_assignments if ba.bureau_id is not None]

def get_user_region_ids(user: User) -> List[int]:
    return [ba.region_id for ba in user.bureau_assignments if ba.region_id is not None]

def enforce_user_bureau_or_admin(user: User, bureau_id: int):
    user_role_codes = [r.code for r in user.roles]
    if RoleCode.ADMIN in user_role_codes or RoleCode.MANAGEMENT in user_role_codes:
        return True
    bureau_ids = get_user_bureau_ids(user)
    if bureau_id not in bureau_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You are not authorized to view or modify records outside your assigned Bureau."
        )
    return True

def enforce_user_region_or_admin(user: User, region_id: int):
    user_role_codes = [r.code for r in user.roles]
    if RoleCode.ADMIN in user_role_codes or RoleCode.MANAGEMENT in user_role_codes:
        return True
    if RoleCode.REGIONAL_OFFICE in user_role_codes:
        region_ids = get_user_region_ids(user)
        if region_id not in region_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are restricted to records within your assigned Regional Office jurisdiction."
            )
    return True
