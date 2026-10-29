from datetime import datetime, timezone
import json
from sqlalchemy import (
    Column, Integer, Float, String, Text, Boolean, DateTime, ForeignKey, Index, UniqueConstraint, Table
)
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def utcnow():
    return datetime.now(timezone.utc)

# Association table for User <-> Role
user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
)

# Association table for Role <-> Permission
role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", Integer, ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
)

class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False) # e.g. "PGRC Officer", "System Administrator"
    code = Column(String(50), unique=True, nullable=False, index=True) # e.g. "ROLE_PGRC_OFFICER", "ROLE_ADMIN"
    description = Column(String(255), nullable=True)

    users = relationship("User", secondary=user_roles, back_populates="roles")
    permissions = relationship("Permission", secondary=role_permissions, back_populates="roles")

class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    permission_key = Column(String(100), unique=True, nullable=False, index=True) # e.g. "complaint:create", "overlap:review"
    description = Column(String(255), nullable=True)

    roles = relationship("Role", secondary=role_permissions, back_populates="permissions")

class Bureau(Base):
    __tablename__ = "bureaus"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), unique=True, nullable=False) # e.g. "Public Grievance Redressal Cell (PGRC)", "Regulation Bureau (RB)"
    code = Column(String(20), unique=True, nullable=False, index=True) # e.g. "PGRC", "RB", "APPROVAL", "FINANCE"
    description = Column(Text, nullable=True)
    active = Column(Boolean, default=True, nullable=False)

    users = relationship("UserBureauAssignment", back_populates="bureau")
    cases = relationship("Case", back_populates="current_bureau")

class Region(Base):
    __tablename__ = "regions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False) # e.g. "Northern Region", "Western Region", "Southern Region"
    code = Column(String(20), unique=True, nullable=False, index=True) # e.g. "NRO", "WRO", "SRO"
    regional_office = Column(String(150), nullable=True) # e.g. "Kanpur", "Mumbai", "Chennai"
    active = Column(Boolean, default=True, nullable=False)

    institutions = relationship("Institution", back_populates="region")
    users = relationship("UserBureauAssignment", back_populates="region")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    display_name = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    account_status = Column(String(30), default="ACTIVE", nullable=False) # "ACTIVE", "INACTIVE", "SUSPENDED"
    phone = Column(String(30), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    roles = relationship("Role", secondary=user_roles, back_populates="users", lazy="joined")
    bureau_assignments = relationship("UserBureauAssignment", back_populates="user", cascade="all, delete-orphan", lazy="joined")
    assigned_cases = relationship("Case", foreign_keys="Case.current_officer_id", back_populates="current_officer")
    notifications = relationship("NotificationRecipient", back_populates="user", cascade="all, delete-orphan")

class UserBureauAssignment(Base):
    __tablename__ = "user_bureau_assignments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    bureau_id = Column(Integer, ForeignKey("bureaus.id", ondelete="SET NULL"), nullable=True)
    region_id = Column(Integer, ForeignKey("regions.id", ondelete="SET NULL"), nullable=True)

    user = relationship("User", back_populates="bureau_assignments")
    bureau = relationship("Bureau", back_populates="users")
    region = relationship("Region", back_populates="users")

class Institution(Base):
    __tablename__ = "institutions"

    id = Column(Integer, primary_key=True, index=True)
    permanent_id = Column(String(50), unique=True, nullable=False, index=True) # AICTE Permanent ID e.g. "1-44642766198"
    institution_name = Column(String(255), nullable=False, index=True)
    institution_type = Column(String(100), nullable=False) # "Engineering & Technology", "Management", "Pharmacy", "Polytechnic", etc.
    address = Column(Text, nullable=False)
    city = Column(String(100), nullable=False)
    district = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False, index=True)
    region_id = Column(Integer, ForeignKey("regions.id", ondelete="RESTRICT"), nullable=False)
    regional_office = Column(String(100), nullable=True)
    postal_code = Column(String(20), nullable=False)
    contact_email = Column(String(150), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    verification_status = Column(String(30), default="VERIFIED", nullable=False) # "VERIFIED", "UNVERIFIED"
    record_status = Column(String(30), default="ACTIVE", nullable=False) # "ACTIVE", "ARCHIVED"
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    region = relationship("Region", back_populates="institutions")
    complaints = relationship("Complaint", back_populates="institution", cascade="all, delete-orphan")
    cases = relationship("Case", back_populates="institution", cascade="all, delete-orphan")
    overlap_flags = relationship("OverlapFlag", back_populates="institution", cascade="all, delete-orphan")

class ComplaintCategory(Base):
    __tablename__ = "complaint_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), unique=True, nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    active = Column(Boolean, default=True, nullable=False)

    complaints = relationship("Complaint", back_populates="category")

class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    complaint_reference = Column(String(50), unique=True, nullable=False, index=True) # e.g. "CMP-2026-0001"
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    complainant_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="RESTRICT"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("complaint_categories.id", ondelete="RESTRICT"), nullable=False)
    complainant_type = Column(String(50), nullable=False) # "STUDENT", "FACULTY", "PARENT", "STAFF", "CITIZEN", "ANONYMOUS"
    source = Column(String(50), default="PORTAL", nullable=False) # "PORTAL", "EMAIL", "PHYSICAL", "CPGRAMS", "MEDIA"
    received_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    status = Column(String(50), default="REGISTERED", nullable=False, index=True) # "REGISTERED", "CASE_LINKED", "DISPOSED", "REJECTED"
    sensitivity_classification = Column(String(30), default="NORMAL", nullable=False) # "NORMAL", "CONFIDENTIAL", "HIGH_PRIORITY"
    assigned_bureau_id = Column(Integer, ForeignKey("bureaus.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    institution = relationship("Institution", back_populates="complaints")
    category = relationship("ComplaintCategory", back_populates="complaints")
    complainant = relationship("User", foreign_keys=[complainant_id])
    assigned_bureau = relationship("Bureau")
    case_links = relationship("ComplaintCaseLink", back_populates="complaint", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="complaint")

class CaseStatus(Base):
    __tablename__ = "case_statuses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False) # "Received", "Acknowledged", "Under Scrutiny", etc.
    code = Column(String(50), unique=True, nullable=False, index=True) # e.g. "UNDER_PROCESS", "DISPOSED"
    description = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False) # Whether case is actively being worked on
    is_pending = Column(Boolean, default=False, nullable=False) # Counted as pending in SLA/ageing
    is_disposed = Column(Boolean, default=False, nullable=False) # Counted as disposed/resolved
    is_terminal = Column(Boolean, default=False, nullable=False) # Terminal lifecycle state
    display_order = Column(Integer, default=0, nullable=False)

class CaseTransition(Base):
    __tablename__ = "case_transitions"

    id = Column(Integer, primary_key=True, index=True)
    from_status = Column(String(50), nullable=False)
    to_status = Column(String(50), nullable=False)
    permitted_role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), nullable=True)

class Case(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    case_reference = Column(String(50), unique=True, nullable=False, index=True) # e.g. "CASE-2026-0001"
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="RESTRICT"), nullable=False, index=True)
    current_bureau_id = Column(Integer, ForeignKey("bureaus.id", ondelete="RESTRICT"), nullable=False, index=True)
    current_officer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    category = Column(String(100), nullable=True)
    status = Column(String(50), default="Received", nullable=False, index=True)
    priority = Column(String(20), default="MEDIUM", nullable=False) # "LOW", "MEDIUM", "HIGH", "URGENT"
    received_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    last_action = Column(String(255), default="Case initiated", nullable=True)
    last_action_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    next_action = Column(String(255), nullable=True)
    expected_disposal_at = Column(DateTime(timezone=True), nullable=True)
    applicable_deadline_at = Column(DateTime(timezone=True), nullable=True)
    escalation_status = Column(String(30), default="NONE", nullable=False) # "NONE", "APPROACHING", "ESCALATED_L1", "ESCALATED_L2"
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    institution = relationship("Institution", back_populates="cases")
    current_bureau = relationship("Bureau", back_populates="cases")
    current_officer = relationship("User", foreign_keys=[current_officer_id], back_populates="assigned_cases")
    complaint_links = relationship("ComplaintCaseLink", back_populates="case", cascade="all, delete-orphan")
    assignments = relationship("Assignment", back_populates="case", cascade="all, delete-orphan", order_by="desc(Assignment.assigned_at)")
    transfers = relationship("Transfer", back_populates="case", cascade="all, delete-orphan", order_by="desc(Transfer.transferred_at)")
    workflow_history = relationship("WorkflowHistory", back_populates="case", cascade="all, delete-orphan", order_by="desc(WorkflowHistory.created_at)")
    documents = relationship("Document", back_populates="case")

class ComplaintCaseLink(Base):
    __tablename__ = "complaint_case_links"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    link_type = Column(String(50), default="PRIMARY", nullable=False) # "PRIMARY", "SECONDARY", "REFERENCE"
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    complaint = relationship("Complaint", back_populates="case_links")
    case = relationship("Case", back_populates="complaint_links")

    __table_args__ = (UniqueConstraint("complaint_id", "case_id", name="uq_complaint_case"),)

class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    bureau_id = Column(Integer, ForeignKey("bureaus.id", ondelete="RESTRICT"), nullable=False)
    officer_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    assigned_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assigned_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    reason = Column(Text, nullable=False)
    assignment_status = Column(String(30), default="ACTIVE", nullable=False) # "ACTIVE", "REASSIGNED", "TRANSFERRED"

    case = relationship("Case", back_populates="assignments")
    bureau = relationship("Bureau")
    officer = relationship("User", foreign_keys=[officer_id])
    assigner = relationship("User", foreign_keys=[assigned_by])

class Transfer(Base):
    __tablename__ = "transfers"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    from_bureau_id = Column(Integer, ForeignKey("bureaus.id", ondelete="RESTRICT"), nullable=False)
    to_bureau_id = Column(Integer, ForeignKey("bureaus.id", ondelete="RESTRICT"), nullable=False)
    from_officer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    to_officer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    initiated_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    transfer_reason = Column(Text, nullable=False)
    transferred_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    receiving_status = Column(String(50), default="PENDING_ACCEPTANCE", nullable=False) # "PENDING_ACCEPTANCE", "ACCEPTED", "RETURNED"
    receiving_remarks = Column(Text, nullable=True)

    case = relationship("Case", back_populates="transfers")
    from_bureau = relationship("Bureau", foreign_keys=[from_bureau_id])
    to_bureau = relationship("Bureau", foreign_keys=[to_bureau_id])
    from_officer = relationship("User", foreign_keys=[from_officer_id])
    to_officer = relationship("User", foreign_keys=[to_officer_id])
    initiator = relationship("User", foreign_keys=[initiated_by])

class WorkflowHistory(Base):
    __tablename__ = "workflow_history"

    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="SET NULL"), nullable=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id", ondelete="SET NULL"), nullable=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="SET NULL"), nullable=True)
    action_type = Column(String(100), nullable=False) # e.g. "STATUS_CHANGE", "ASSIGNMENT", "TRANSFER", "COORDINATION_DECISION"
    previous_value = Column(String(255), nullable=True)
    new_value = Column(String(255), nullable=True)
    remarks = Column(Text, nullable=True)
    performed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    case = relationship("Case", back_populates="workflow_history")
    actor = relationship("User", foreign_keys=[performed_by])

class OverlapFlag(Base):
    __tablename__ = "overlap_flags"

    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False)
    detection_type = Column(String(50), default="DETERMINISTIC_PERMANENT_ID", nullable=False)
    detection_reason = Column(Text, nullable=False)
    relationship_state = Column(String(50), default="POTENTIAL_OVERLAP", nullable=False, index=True)
    # States: "POTENTIAL_OVERLAP", "UNDER_REVIEW", "COORDINATION_REQUESTED", "CONFIRMED_RELATED", "NOT_RELATED", "JOINT_ACTION_IN_PROGRESS", "COORDINATION_COMPLETED", "ESCALATED"
    first_detected_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    last_checked_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    coordination_owner_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    institution = relationship("Institution", back_populates="overlap_flags")
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    coordination_owner = relationship("User", foreign_keys=[coordination_owner_id])
    relationships = relationship("CaseRelationship", back_populates="overlap_flag", cascade="all, delete-orphan")
    decisions = relationship("CoordinationDecision", back_populates="overlap_flag", cascade="all, delete-orphan", order_by="desc(CoordinationDecision.created_at)")

class CaseRelationship(Base):
    __tablename__ = "case_relationships"

    id = Column(Integer, primary_key=True, index=True)
    source_case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    related_case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    overlap_flag_id = Column(Integer, ForeignKey("overlap_flags.id", ondelete="CASCADE"), nullable=True)
    relationship_type = Column(String(50), default="CROSS_BUREAU_OVERLAP", nullable=False)
    relationship_state = Column(String(50), default="POTENTIAL_OVERLAP", nullable=False) # Synchronized with OverlapFlag
    reason = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    source_case = relationship("Case", foreign_keys=[source_case_id])
    related_case = relationship("Case", foreign_keys=[related_case_id])
    overlap_flag = relationship("OverlapFlag", back_populates="relationships")

    __table_args__ = (UniqueConstraint("source_case_id", "related_case_id", name="uq_case_relationship"),)

class CoordinationDecision(Base):
    __tablename__ = "coordination_decisions"

    id = Column(Integer, primary_key=True, index=True)
    overlap_flag_id = Column(Integer, ForeignKey("overlap_flags.id", ondelete="CASCADE"), nullable=False)
    action_type = Column(String(50), nullable=False) # "REVIEW", "CONFIRM_RELATED", "MARK_NOT_RELATED", "REQUEST_COORDINATION", "RECORD_JOINT_ACTION", "ESCALATE", "COMPLETE"
    remarks = Column(Text, nullable=False)
    performed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    overlap_flag = relationship("OverlapFlag", back_populates="decisions")
    actor = relationship("User", foreign_keys=[performed_by])

class SLARule(Base):
    __tablename__ = "sla_rules"

    id = Column(Integer, primary_key=True, index=True)
    rule_name = Column(String(150), nullable=False)
    bureau_id = Column(Integer, ForeignKey("bureaus.id", ondelete="SET NULL"), nullable=True)
    category_id = Column(Integer, ForeignKey("complaint_categories.id", ondelete="SET NULL"), nullable=True)
    applicable_status = Column(String(50), nullable=True)
    duration_days = Column(Integer, default=30, nullable=False)
    reminder_threshold_days = Column(Integer, default=5, nullable=False) # Trigger reminder 5 days before deadline
    escalation_threshold_days = Column(Integer, default=2, nullable=False) # Escalate if overdue by 2 days
    enabled = Column(Boolean, default=True, nullable=False)
    effective_from = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    effective_until = Column(DateTime(timezone=True), nullable=True)

    bureau = relationship("Bureau")
    category = relationship("ComplaintCategory")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    notification_type = Column(String(50), nullable=False) # "OVERLAP_DETECTED", "NEW_ASSIGNMENT", "TRANSFER", "DEADLINE_APPROACHING", "OVERDUE", "COORDINATION_REQUEST"
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id", ondelete="CASCADE"), nullable=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=True)
    overlap_flag_id = Column(Integer, ForeignKey("overlap_flags.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    recipients = relationship("NotificationRecipient", back_populates="notification", cascade="all, delete-orphan")

class NotificationRecipient(Base):
    __tablename__ = "notification_recipients"

    id = Column(Integer, primary_key=True, index=True)
    notification_id = Column(Integer, ForeignKey("notifications.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    delivery_status = Column(String(30), default="DELIVERED", nullable=False)

    notification = relationship("Notification", back_populates="recipients")
    user = relationship("User", back_populates="notifications")

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    original_filename = Column(String(255), nullable=False)
    safe_storage_key = Column(String(255), unique=True, nullable=False)
    file_path = Column(String(500), nullable=False)
    content_type = Column(String(100), nullable=False)
    file_size = Column(Integer, nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id", ondelete="CASCADE"), nullable=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    complaint = relationship("Complaint", back_populates="documents")
    case = relationship("Case", back_populates="documents")
    uploader = relationship("User", foreign_keys=[uploaded_by])

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action_type = Column(String(100), nullable=False, index=True) # "LOGIN", "CREATE_COMPLAINT", "UPDATE_CASE", "TRANSFER_CASE", "REVIEW_OVERLAP", "EXPORT_REPORT"
    record_type = Column(String(100), nullable=False, index=True) # "Institution", "Complaint", "Case", "OverlapFlag", "Transfer"
    record_id = Column(String(100), nullable=True, index=True)
    outcome = Column(String(30), default="SUCCESS", nullable=False) # "SUCCESS", "FAILURE", "DENIED"
    metadata_json = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    user = relationship("User")

class ApplicationSetting(Base):
    __tablename__ = "application_settings"

    id = Column(Integer, primary_key=True, index=True)
    setting_key = Column(String(100), unique=True, nullable=False, index=True)
    setting_value = Column(Text, nullable=False)
    description = Column(String(255), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

class RegulatoryAction(Base):
    __tablename__ = "regulatory_actions"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    bureau_id = Column(Integer, ForeignKey("bureaus.id", ondelete="RESTRICT"), nullable=False, index=True)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Types: INSPECTION, SHOW_CAUSE_NOTICE, DOCUMENT_REQUEST, COMPLIANCE_REVIEW, HEARING, OTHER
    action_type = Column(String(50), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    
    # Standardized regulatory subject categories:
    # LAB_INFRASTRUCTURE, FACULTY_QUALIFICATION, ADMISSION_NORMS, FEE_REGULATION,
    # FIRE_SAFETY, AFFILIATION_CONDITIONS, ACADEMIC_CURRICULUM, GOVERNANCE_DISPUTE, OTHER
    subject_category = Column(String(100), nullable=False, index=True)
    scheduled_date = Column(DateTime(timezone=True), nullable=True)
    
    # Statuses: DRAFT, PROPOSED, PENDING_CONFLICT_REVIEW, APPROVED, SCHEDULED, COMPLETED, CANCELLED
    status = Column(String(50), default="PROPOSED", nullable=False, index=True)
    
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    case = relationship("Case")
    institution = relationship("Institution")
    bureau = relationship("Bureau")
    creator = relationship("User", foreign_keys=[created_by_id])

    # Conflicts where this action is proposed
    detected_conflicts = relationship(
        "ActionConflict",
        foreign_keys="ActionConflict.proposed_action_id",
        back_populates="proposed_action",
        cascade="all, delete-orphan"
    )
    # Conflicts where this action is the existing obstacle
    conflicting_with = relationship(
        "ActionConflict",
        foreign_keys="ActionConflict.existing_action_id",
        back_populates="existing_action",
        cascade="all, delete-orphan"
    )

class ActionConflict(Base):
    __tablename__ = "action_conflicts"

    id = Column(Integer, primary_key=True, index=True)
    proposed_action_id = Column(Integer, ForeignKey("regulatory_actions.id", ondelete="CASCADE"), nullable=False, index=True)
    existing_action_id = Column(Integer, ForeignKey("regulatory_actions.id", ondelete="CASCADE"), nullable=False, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Conflict classifications:
    # DUPLICATE_INSPECTION, REDUNDANT_DOCUMENT_REQUEST, RELATED_NOTICE,
    # POSSIBLE_CONTRADICTORY_DIRECTION, OVERLAPPING_COMPLIANCE_REVIEW
    conflict_type = Column(String(80), nullable=False, index=True)
    
    # Severity: HIGH, MEDIUM, LOW
    severity = Column(String(20), default="MEDIUM", nullable=False, index=True)
    explanation = Column(Text, nullable=False)
    
    # Statuses: PENDING_REVIEW, COORDINATION_REQUESTED, RESOLVED_COORDINATED,
    # RESOLVED_REVISED, RESOLVED_AUTHORIZED_OVERRIDE, DISMISSED_FALSE_POSITIVE
    status = Column(String(50), default="PENDING_REVIEW", nullable=False, index=True)
    
    detected_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    reviewed_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Resolution decision: REQUEST_COORDINATION, REVISE_ACTION, PROCEED_WITH_JUSTIFICATION, DISMISS_FALSE_POSITIVE
    resolution_type = Column(String(50), nullable=True)
    resolution_notes = Column(Text, nullable=True)

    proposed_action = relationship("RegulatoryAction", foreign_keys=[proposed_action_id], back_populates="detected_conflicts")
    existing_action = relationship("RegulatoryAction", foreign_keys=[existing_action_id], back_populates="conflicting_with")
    institution = relationship("Institution")
    reviewer = relationship("User", foreign_keys=[reviewed_by_id])


class AIRelationshipSuggestion(Base):
    __tablename__ = "ai_relationship_suggestions"

    id = Column(Integer, primary_key=True, index=True)
    source_complaint_id = Column(Integer, ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False, index=True)
    candidate_complaint_id = Column(Integer, ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="SET NULL"), nullable=True, index=True)
    semantic_similarity = Column(Float, nullable=False)
    match_classification = Column(String(50), nullable=False, index=True) # POSSIBLY_RELATED, NEEDS_REVIEW, DIFFERENT_ISSUE, INSTITUTION_UNCONFIRMED
    explanation = Column(Text, nullable=True) # JSON-serialized list of explanatory bullet points
    model_identifier = Column(String(100), default="intfloat/multilingual-e5-small", nullable=False)
    model_revision = Column(String(50), default="main", nullable=False)
    status = Column(String(50), default="PENDING_REVIEW", nullable=False, index=True) # PENDING_REVIEW, APPROVED_LINK, DISMISSED, SUPERSEDED
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
    reviewed_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    review_notes = Column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("source_complaint_id", "candidate_complaint_id", name="uq_ai_relationship_pair"),
    )

    source_complaint = relationship("Complaint", foreign_keys=[source_complaint_id])
    candidate_complaint = relationship("Complaint", foreign_keys=[candidate_complaint_id])
    institution = relationship("Institution")
    reviewer = relationship("User", foreign_keys=[reviewed_by_id])


class ComplaintEmbedding(Base):
    __tablename__ = "complaint_embeddings"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    embedding_blob = Column(Text, nullable=False) # JSON-serialized 384-dimensional float vector
    model_identifier = Column(String(100), default="intfloat/multilingual-e5-small", nullable=False)
    model_revision = Column(String(50), default="main", nullable=False)
    preprocessing_version = Column(String(20), default="v1.0", nullable=False)
    content_hash = Column(String(64), nullable=False, index=True)
    generated_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    complaint = relationship("Complaint")

