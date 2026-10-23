export interface Role {
  id: number;
  name: string;
  code: string;
  description?: string;
}

export interface Bureau {
  id: number;
  name: string;
  code: string;
  active: boolean;
}

export interface Region {
  id: number;
  name: string;
  code: string;
  regional_office?: string;
  active: boolean;
}

export interface UserBureauAssignment {
  bureau?: Bureau;
  region?: Region;
}

export interface User {
  id: number;
  display_name: string;
  email: string;
  username: string;
  account_status: string;
  phone?: string;
  roles: Role[];
  bureau_assignments: UserBureauAssignment[];
  created_at: string;
}

export interface Institution {
  id: number;
  permanent_id: string;
  institution_name: string;
  institution_type: string;
  address: string;
  city: string;
  district: string;
  state: string;
  region_id: number;
  regional_office?: string;
  postal_code: string;
  contact_email?: string;
  contact_phone?: string;
  verification_status: string;
  record_status: string;
  region?: Region;
  created_at: string;
  updated_at: string;
  total_complaints: number;
  active_cases: number;
  overdue_cases: number;
  potential_overlaps: number;
  last_activity?: string;
}

export interface InstitutionDetail extends Institution {
  complaints: ComplaintSimple[];
  cases: CaseSimple[];
  involved_bureaus: string[];
  overlap_flags: OverlapFlagSimple[];
}

export interface ComplaintCategory {
  id: number;
  name: string;
  code: string;
  description?: string;
  active: boolean;
}

export interface Document {
  id: number;
  original_filename: string;
  content_type: string;
  file_size: number;
  created_at: string;
  safe_storage_key: string;
}

export interface ComplaintSimple {
  id: number;
  complaint_reference: string;
  title: string;
  complainant_type: string;
  source: string;
  status: string;
  sensitivity_classification: string;
  received_at: string;
  created_at: string;
}

export interface Complaint {
  id: number;
  complaint_reference: string;
  title: string;
  description: string;
  complainant_id?: number;
  institution_id: number;
  institution_name?: string;
  permanent_id?: string;
  category_id: number;
  category_name?: string;
  complainant_type: string;
  source: string;
  received_at: string;
  status: string;
  sensitivity_classification: string;
  assigned_bureau_id?: number;
  assigned_bureau_name?: string;
  created_at: string;
  updated_at: string;
  linked_case_reference?: string;
  documents: Document[];
}

export interface WorkflowHistory {
  id: number;
  action_type: string;
  previous_value?: string;
  new_value?: string;
  remarks?: string;
  performed_by_name?: string;
  created_at: string;
}

export interface Assignment {
  id: number;
  bureau_name: string;
  officer_name: string;
  assigned_by_name?: string;
  assigned_at: string;
  reason: string;
  assignment_status: string;
}

export interface Transfer {
  id: number;
  from_bureau_name: string;
  to_bureau_name: string;
  from_officer_name?: string;
  to_officer_name?: string;
  initiated_by_name?: string;
  transfer_reason: string;
  transferred_at: string;
  receiving_status: string;
  receiving_remarks?: string;
}

export interface CaseSimple {
  id: number;
  case_reference: string;
  title: string;
  status: string;
  priority: string;
  current_bureau_name?: string;
  assigned_officer_name?: string;
  received_at: string;
  last_action?: string;
  last_action_at: string;
  applicable_deadline_at?: string;
  is_overdue: boolean;
}

export interface Case {
  id: number;
  case_reference: string;
  institution_id: number;
  institution_name: string;
  permanent_id: string;
  institution_region?: string;
  current_bureau_id: number;
  current_bureau_name: string;
  current_bureau_code: string;
  current_officer_id?: number;
  current_officer_name?: string;
  title: string;
  category?: string;
  status: string;
  priority: string;
  received_at: string;
  last_action?: string;
  last_action_at: string;
  next_action?: string;
  expected_disposal_at?: string;
  applicable_deadline_at?: string;
  deadline_status_label: string;
  is_overdue: boolean;
  days_remaining?: number;
  escalation_status: string;
  has_potential_overlap: boolean;
  linked_complaint_ids: number[];
  linked_complaint_refs: string[];
  created_at: string;
  updated_at: string;
}

export interface CaseDetail extends Case {
  workflow_history: WorkflowHistory[];
  assignments: Assignment[];
  transfers: Transfer[];
  documents: Document[];
  related_cases: CaseSimple[];
}

export interface CoordinationDecision {
  id: number;
  action_type: string;
  remarks: string;
  performed_by_name?: string;
  created_at: string;
}

export interface OverlapFlagSimple {
  id: number;
  institution_id: number;
  institution_name?: string;
  permanent_id?: string;
  detection_type: string;
  detection_reason: string;
  relationship_state: string;
  first_detected_at: string;
  last_checked_at: string;
}

export interface OverlapFlag {
  id: number;
  institution_id: number;
  institution_name: string;
  permanent_id: string;
  institution_state: string;
  institution_region: string;
  detection_type: string;
  detection_reason: string;
  relationship_state: string;
  first_detected_at: string;
  last_checked_at: string;
  reviewed_by_name?: string;
  reviewed_at?: string;
  coordination_owner_name?: string;
  involved_cases: CaseSimple[];
  involved_bureaus: string[];
  decisions: CoordinationDecision[];
}

export interface DashboardMetrics {
  total_complaints: number;
  pending_cases: number;
  cases_under_process: number;
  disposed_cases: number;
  transferred_cases: number;
  overdue_cases: number;
  potential_overlaps: number;
  institutions_with_active_cases: number;
}

export interface StatusDistribution {
  status: string;
  count: number;
}

export interface BureauWorkload {
  bureau_id: number;
  bureau_name: string;
  bureau_code: string;
  total_assigned: number;
  pending_count: number;
  under_process_count: number;
  disposed_count: number;
  overdue_count: number;
}

export interface RegionWorkload {
  region_id: number;
  region_name: string;
  region_code: string;
  institution_count: number;
  complaint_count: number;
  case_count: number;
  pending_count: number;
  disposed_count: number;
  overdue_count: number;
}

export interface AgeingBand {
  band: string;
  count: number;
}

export interface AppNotification {
  id: number;
  notification_type: string;
  title: string;
  message: string;
  institution_id?: number;
  case_id?: number;
  overlap_flag_id?: number;
  created_at: string;
  is_read: boolean;
  read_at?: string;
}

export interface AuditLog {
  id: number;
  user_name?: string;
  action_type: string;
  record_type: string;
  record_id?: string;
  outcome: string;
  metadata_json?: string;
  ip_address?: string;
  created_at: string;
}

export interface SLARule {
  id: number;
  rule_name: string;
  bureau_name?: string;
  category_name?: string;
  applicable_status?: string;
  duration_days: number;
  reminder_threshold_days: number;
  escalation_threshold_days: number;
  enabled: boolean;
}
