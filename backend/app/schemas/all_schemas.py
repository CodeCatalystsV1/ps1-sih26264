from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr, Field

# ----------------- AUTH SCHEMAS -----------------
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"

class LoginRequest(BaseModel):
    username_or_email: str
    password: str

class RoleOut(BaseModel):
    id: int
    name: str
    code: str
    description: Optional[str] = None

    class Config:
        from_attributes = True

class BureauSimpleOut(BaseModel):
    id: int
    name: str
    code: str
    active: bool

    class Config:
        from_attributes = True

class RegionSimpleOut(BaseModel):
    id: int
    name: str
    code: str
    regional_office: Optional[str] = None
    active: bool

    class Config:
        from_attributes = True

class UserBureauAssignmentOut(BaseModel):
    bureau: Optional[BureauSimpleOut] = None
    region: Optional[RegionSimpleOut] = None

    class Config:
        from_attributes = True

class UserOut(BaseModel):
    id: int
    display_name: str
    email: str
    username: str
    account_status: str
    phone: Optional[str] = None
    roles: List[RoleOut] = []
    bureau_assignments: List[UserBureauAssignmentOut] = []
    created_at: datetime

    class Config:
        from_attributes = True

TokenResponse.model_rebuild()

class UserCreateAdmin(BaseModel):
    display_name: str
    email: EmailStr
    username: str
    password: str
    phone: Optional[str] = None
    role_ids: List[int] = []
    bureau_id: Optional[int] = None
    region_id: Optional[int] = None

class UserUpdateAdmin(BaseModel):
    display_name: Optional[str] = None
    account_status: Optional[str] = None
    phone: Optional[str] = None
    role_ids: Optional[List[int]] = None
    bureau_id: Optional[int] = None
    region_id: Optional[int] = None
    new_password: Optional[str] = None

# ----------------- INSTITUTION SCHEMAS -----------------
class InstitutionBase(BaseModel):
    permanent_id: str = Field(..., description="Unique AICTE Permanent ID")
    institution_name: str
    institution_type: str
    address: str
    city: str
    district: str
    state: str
    region_id: int
    regional_office: Optional[str] = None
    postal_code: str
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    verification_status: str = "VERIFIED"
    record_status: str = "ACTIVE"

class InstitutionCreate(InstitutionBase):
    pass

class InstitutionUpdate(BaseModel):
    permanent_id: Optional[str] = None
    institution_name: Optional[str] = None
    institution_type: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    region_id: Optional[int] = None
    regional_office: Optional[str] = None
    postal_code: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    verification_status: Optional[str] = None
    record_status: Optional[str] = None

class InstitutionOut(InstitutionBase):
    id: int
    created_at: datetime
    updated_at: datetime
    region: Optional[RegionSimpleOut] = None
    total_complaints: int = 0
    active_cases: int = 0
    overdue_cases: int = 0
    potential_overlaps: int = 0
    last_activity: Optional[datetime] = None

    class Config:
        from_attributes = True

class InstitutionDetailOut(InstitutionOut):
    complaints: List["ComplaintSimpleOut"] = []
    cases: List["CaseSimpleOut"] = []
    involved_bureaus: List[str] = []
    overlap_flags: List["OverlapFlagSimpleOut"] = []

# ----------------- COMPLAINT SCHEMAS -----------------
class ComplaintCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=10)
    institution_id: int
    category_id: int
    complainant_type: str = "CITIZEN" # "STUDENT", "FACULTY", "PARENT", "STAFF", "CITIZEN", "ANONYMOUS"
    source: str = "PORTAL"
    sensitivity_classification: str = "NORMAL" # "NORMAL", "CONFIDENTIAL", "HIGH_PRIORITY"
    assigned_bureau_id: Optional[int] = None
    create_case_automatically: bool = True
    priority: str = "MEDIUM"

class ComplaintCategoryOut(BaseModel):
    id: int
    name: str
    code: str
    description: Optional[str] = None
    active: bool

    class Config:
        from_attributes = True

class DocumentOut(BaseModel):
    id: int
    original_filename: str
    content_type: str
    file_size: int
    created_at: datetime
    safe_storage_key: str

    class Config:
        from_attributes = True

class ComplaintSimpleOut(BaseModel):
    id: int
    complaint_reference: str
    title: str
    complainant_type: str
    source: str
    status: str
    sensitivity_classification: str
    received_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True

class ComplaintOut(BaseModel):
    id: int
    complaint_reference: str
    title: str
    description: str
    complainant_id: Optional[int] = None
    institution_id: int
    institution_name: Optional[str] = None
    permanent_id: Optional[str] = None
    category_id: int
    category_name: Optional[str] = None
    complainant_type: str
    source: str
    received_at: datetime
    status: str
    sensitivity_classification: str
    assigned_bureau_id: Optional[int] = None
    assigned_bureau_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    linked_case_reference: Optional[str] = None
    documents: List[DocumentOut] = []

    class Config:
        from_attributes = True

# ----------------- CASE SCHEMAS -----------------
class CaseCreate(BaseModel):
    title: str
    institution_id: int
    current_bureau_id: int
    current_officer_id: Optional[int] = None
    complaint_ids: List[int] = []
    category: Optional[str] = None
    priority: str = "MEDIUM"
    next_action: Optional[str] = None
    expected_disposal_at: Optional[datetime] = None

class CaseStatusUpdate(BaseModel):
    new_status: str
    remarks: str
    next_action: Optional[str] = None

class CaseActionCreate(BaseModel):
    action_type: str
    action_details: str
    next_action: Optional[str] = None

class AssignmentCreate(BaseModel):
    officer_id: int
    bureau_id: Optional[int] = None
    reason: str

class TransferCreate(BaseModel):
    to_bureau_id: int
    to_officer_id: Optional[int] = None
    transfer_reason: str

class WorkflowHistoryOut(BaseModel):
    id: int
    action_type: str
    previous_value: Optional[str] = None
    new_value: Optional[str] = None
    remarks: Optional[str] = None
    performed_by_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AssignmentOut(BaseModel):
    id: int
    bureau_name: str
    officer_name: str
    assigned_by_name: Optional[str] = None
    assigned_at: datetime
    reason: str
    assignment_status: str

    class Config:
        from_attributes = True

class TransferOut(BaseModel):
    id: int
    from_bureau_name: str
    to_bureau_name: str
    from_officer_name: Optional[str] = None
    to_officer_name: Optional[str] = None
    initiated_by_name: Optional[str] = None
    transfer_reason: str
    transferred_at: datetime
    receiving_status: str
    receiving_remarks: Optional[str] = None

    class Config:
        from_attributes = True

class CaseSimpleOut(BaseModel):
    id: int
    case_reference: str
    title: str
    status: str
    priority: str
    current_bureau_name: Optional[str] = None
    assigned_officer_name: Optional[str] = None
    received_at: datetime
    last_action: Optional[str] = None
    last_action_at: datetime
    applicable_deadline_at: Optional[datetime] = None
    is_overdue: bool = False

    class Config:
        from_attributes = True

class CaseOut(BaseModel):
    id: int
    case_reference: str
    institution_id: int
    institution_name: Optional[str] = "N/A"
    permanent_id: Optional[str] = "N/A"
    institution_region: Optional[str] = None
    current_bureau_id: int
    current_bureau_name: Optional[str] = "N/A"
    current_bureau_code: Optional[str] = "N/A"
    current_officer_id: Optional[int] = None
    current_officer_name: Optional[str] = None
    title: str
    category: Optional[str] = None
    status: str
    priority: str
    received_at: datetime
    last_action: Optional[str] = None
    last_action_at: datetime
    next_action: Optional[str] = None
    expected_disposal_at: Optional[datetime] = None
    applicable_deadline_at: Optional[datetime] = None
    deadline_status_label: str = "Deadline not configured"
    is_overdue: bool = False
    days_remaining: Optional[int] = None
    escalation_status: str = "NONE"
    has_potential_overlap: bool = False
    linked_complaint_ids: List[int] = []
    linked_complaint_refs: List[str] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CaseDetailOut(CaseOut):
    workflow_history: List[WorkflowHistoryOut] = []
    assignments: List[AssignmentOut] = []
    transfers: List[TransferOut] = []
    documents: List[DocumentOut] = []
    related_cases: List[CaseSimpleOut] = []

# ----------------- OVERLAP & COORDINATION SCHEMAS -----------------
class OverlapReviewRequest(BaseModel):
    action_type: str = Field(..., description="REVIEW, CONFIRM_RELATED, MARK_NOT_RELATED, REQUEST_COORDINATION, RECORD_JOINT_ACTION, ESCALATE, COMPLETE")
    remarks: str
    coordination_owner_id: Optional[int] = None

class CoordinationDecisionOut(BaseModel):
    id: int
    action_type: str
    remarks: str
    performed_by_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class OverlapFlagSimpleOut(BaseModel):
    id: int
    institution_id: int
    institution_name: Optional[str] = None
    permanent_id: Optional[str] = None
    detection_type: str
    detection_reason: str
    relationship_state: str
    first_detected_at: datetime
    last_checked_at: datetime

    class Config:
        from_attributes = True

class OverlapFlagOut(BaseModel):
    id: int
    institution_id: int
    institution_name: str
    permanent_id: str
    institution_state: str
    institution_region: str
    detection_type: str
    detection_reason: str
    relationship_state: str
    first_detected_at: datetime
    last_checked_at: datetime
    reviewed_by_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    coordination_owner_name: Optional[str] = None
    involved_cases: List[CaseSimpleOut] = []
    involved_bureaus: List[str] = []
    decisions: List[CoordinationDecisionOut] = []

    class Config:
        from_attributes = True

# ----------------- NOTIFICATION SCHEMAS -----------------
class NotificationOut(BaseModel):
    id: int
    notification_type: str
    title: str
    message: str
    institution_id: Optional[int] = None
    case_id: Optional[int] = None
    overlap_flag_id: Optional[int] = None
    created_at: datetime
    is_read: bool = False
    read_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# ----------------- REPORT & DASHBOARD SCHEMAS -----------------
class DashboardMetricsOut(BaseModel):
    total_complaints: int
    pending_cases: int
    cases_under_process: int
    disposed_cases: int
    transferred_cases: int
    overdue_cases: int
    potential_overlaps: int
    institutions_with_active_cases: int

class AgeingBand(BaseModel):
    band: str # "0-7 days", "8-30 days", "31-60 days", "60+ days"
    count: int

class BureauWorkload(BaseModel):
    bureau_id: int
    bureau_name: str
    bureau_code: str
    total_assigned: int
    pending_count: int
    under_process_count: int
    disposed_count: int
    overdue_count: int

class RegionWorkload(BaseModel):
    region_id: int
    region_name: str
    region_code: str
    institution_count: int
    complaint_count: int
    case_count: int
    pending_count: int
    disposed_count: int
    overdue_count: int

class StatusDistribution(BaseModel):
    status: str
    count: int

class AuditLogOut(BaseModel):
    id: int
    user_name: Optional[str] = None
    action_type: str
    record_type: str
    record_id: Optional[str] = None
    outcome: str
    metadata_json: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class SLARuleOut(BaseModel):
    id: int
    rule_name: str
    bureau_name: Optional[str] = None
    category_name: Optional[str] = None
    applicable_status: Optional[str] = None
    duration_days: int
    reminder_threshold_days: int
    escalation_threshold_days: int
    enabled: bool

    class Config:
        from_attributes = True

InstitutionDetailOut.model_rebuild()
