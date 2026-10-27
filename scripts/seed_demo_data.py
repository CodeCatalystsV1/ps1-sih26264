import sys
import os
from datetime import datetime, timedelta, timezone

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.core.database import SessionLocal, engine, Base
import backend.app.models # Discover models
from backend.app.models.entities import (
    Role, Permission, Bureau, Region, User, UserBureauAssignment,
    Institution, ComplaintCategory, CaseStatus, CaseTransition,
    Complaint, Case, ComplaintCaseLink, Assignment, Transfer,
    WorkflowHistory, SLARule, Notification, NotificationRecipient,
    OverlapFlag, CaseRelationship, CoordinationDecision,
    RegulatoryAction, ActionConflict
)
from backend.app.core.security import get_password_hash
from backend.app.services.overlap_service import detect_overlaps_for_institution

def seed_database():
    print("Initializing Database schema for AICTE Case360+ (PS 26264)...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        now = datetime.now(timezone.utc)

        # 1. Seed Roles
        roles_data = [
            ("ROLE_ADMIN", "System Administrator", "Full administrative control and user management"),
            ("ROLE_PGRC_OFFICER", "PGRC Officer", "Processes grievances within Public Grievance Redressal Cell"),
            ("ROLE_RB_OFFICER", "Regulation Bureau Officer", "Processes compliance cases within Regulation Bureau"),
            ("ROLE_BUREAU_HEAD", "Bureau Head / Supervisor", "Supervises bureau workload, reassignments, and transfers"),
            ("ROLE_REGIONAL_OFFICE", "Regional Office User", "Monitors institutions and cases within assigned region"),
            ("ROLE_MANAGEMENT", "Competent Authority / Management", "Monitors high-level consolidated executive dashboards"),
            ("ROLE_COMPLAINANT", "Complainant", "Submits and tracks permitted grievance status"),
        ]
        roles_map = {}
        for code, name, desc in roles_data:
            role = db.query(Role).filter(Role.code == code).first()
            if not role:
                role = Role(code=code, name=name, description=desc)
                db.add(role)
                db.flush()
            roles_map[code] = role
        print("[OK] Roles seeded.")

        # 2. Seed Bureaus
        bureaus_data = [
            ("PGRC", "Public Grievance Redressal Cell", "Dedicated cell for public and stakeholder grievances"),
            ("RB", "Regulation Bureau", "Oversees statutory compliance, regulations, and norms"),
            ("AB", "Approval Bureau", "Processes institutional extension of approvals and accreditations"),
            ("FB", "Finance Bureau", "Handles scholarships, grants, and financial grievance inquiries")
        ]
        bureaus_map = {}
        for code, name, desc in bureaus_data:
            bureau = db.query(Bureau).filter(Bureau.code == code).first()
            if not bureau:
                bureau = Bureau(code=code, name=name, description=desc, active=True)
                db.add(bureau)
                db.flush()
            bureaus_map[code] = bureau
        print("[OK] Bureaus seeded.")

        # 3. Seed Regions
        regions_data = [
            ("NRO", "Northern Region", "Kanpur", True),
            ("WRO", "Western Region", "Mumbai", True),
            ("SRO", "Southern Region", "Chennai", True),
            ("ERO", "Eastern Region", "Kolkata", True),
        ]
        regions_map = {}
        for code, name, office, active in regions_data:
            region = db.query(Region).filter(Region.code == code).first()
            if not region:
                region = Region(code=code, name=name, regional_office=office, active=active)
                db.add(region)
                db.flush()
            regions_map[code] = region
        print("[OK] Regions seeded.")

        # 4. Seed Users
        users_data = [
            ("admin", "admin@aicte.gov.in.demo", "Admin@123", "Dr. Rajesh Kumar (Admin)", "ROLE_ADMIN", None, None),
            ("pgrc_officer", "pgrc.officer@aicte.gov.in.demo", "Pgrc@123", "Shri Arvind Sharma (PGRC)", "ROLE_PGRC_OFFICER", "PGRC", None),
            ("rb_officer", "rb.officer@aicte.gov.in.demo", "Rb@123", "Smt. Sunita Verma (RB)", "ROLE_RB_OFFICER", "RB", None),
            ("bureau_head", "bureau.head@aicte.gov.in.demo", "Head@123", "Dr. Vikramaditya Rao (Bureau Head)", "ROLE_BUREAU_HEAD", "PGRC", None),
            ("ro_northern", "ro.kanpur@aicte.gov.in.demo", "Ro@123", "Shri R. K. Mishra (RO Kanpur)", "ROLE_REGIONAL_OFFICE", None, "NRO"),
            ("competent_authority", "authority@aicte.gov.in.demo", "Auth@123", "Member Secretary (Competent Authority)", "ROLE_MANAGEMENT", None, None),
            ("complainant_user", "citizen@example.com.demo", "Citizen@123", "Aakash Patel (Student/Citizen)", "ROLE_COMPLAINANT", None, None),
        ]
        users_map = {}
        for username, email, pwd, display, role_code, b_code, r_code in users_data:
            user = db.query(User).filter(User.username == username).first()
            if not user:
                user = User(
                    username=username,
                    email=email,
                    display_name=display,
                    password_hash=get_password_hash(pwd),
                    account_status="ACTIVE",
                    phone="9876543210"
                )
                user.roles.append(roles_map[role_code])
                db.add(user)
                db.flush()

                if b_code or r_code:
                    ba = UserBureauAssignment(
                        user_id=user.id,
                        bureau_id=bureaus_map[b_code].id if b_code else None,
                        region_id=regions_map[r_code].id if r_code else None
                    )
                    db.add(ba)
                    db.flush()
            users_map[username] = user
        print("[OK] Demo Users seeded.")

        # 5. Seed Complaint Categories
        cats_data = [
            ("Academic & Regulatory Matters", "CAT_ACAD", "Curriculum, exams, faculty recruitment, regulatory violations"),
            ("Institutional Compliance & Approvals", "CAT_COMPL", "Building norms, lab facilities, unauthorized admissions"),
            ("Student Welfare & Fee Disputes", "CAT_STUDENT", "Capitation fees, withholding certificates, harassment"),
            ("Faculty & Staff Grievances", "CAT_FACULTY", "Pay scale discrepancies, irregular termination, PF non-deposit"),
            ("Infrastructure & Laboratory Facilities", "CAT_INFRA", "Deficient computing facilities, fire safety, library books"),
        ]
        cats_map = {}
        for name, code, desc in cats_data:
            cat = db.query(ComplaintCategory).filter(ComplaintCategory.code == code).first()
            if not cat:
                cat = ComplaintCategory(name=name, code=code, description=desc, active=True)
                db.add(cat)
                db.flush()
            cats_map[code] = cat
        print("[OK] Complaint Categories seeded.")

        # 6. Seed Configurable SLA Rules
        sla_data = [
            ("PGRC Standard Grievance Resolution", "PGRC", "CAT_STUDENT", 30, 5, 2),
            ("Regulation Bureau Statutory Compliance Notice", "RB", "CAT_COMPL", 21, 4, 2),
            ("Faculty Pay & Service Verification", "PGRC", "CAT_FACULTY", 45, 7, 3),
            ("General Institutional Scrutiny Default", None, None, 30, 5, 2),
        ]
        for r_name, b_code, c_code, dur, rem, esc in sla_data:
            existing_rule = db.query(SLARule).filter(SLARule.rule_name == r_name).first()
            if not existing_rule:
                rule = SLARule(
                    rule_name=r_name,
                    bureau_id=bureaus_map[b_code].id if b_code else None,
                    category_id=cats_map[c_code].id if c_code else None,
                    duration_days=dur,
                    reminder_threshold_days=rem,
                    escalation_threshold_days=esc,
                    enabled=True,
                    effective_from=now
                )
                db.add(rule)
        db.flush()
        print("[OK] SLA Rules seeded.")

        # 7. Seed Fictional Demonstration Institutions (10 Total)
        # All institutions explicitly labelled as Fictional SIH Demonstration Entities
        institutions_data = [
            ("DEMO-AICTE-001", "Demo Institute A — Technology & Science", "Engineering & Technology", "Knowledge City, Sector 62", "Noida", "Gautam Buddha Nagar", "Uttar Pradesh", "NRO", "Kanpur", "201301", "contact@demo-inst-a.ac.in", "VERIFIED"),
            ("DEMO-AICTE-002", "Demo Institute B — College of Engineering", "Engineering & Technology", "University Road, Shivaji Nagar", "Pune", "Pune", "Maharashtra", "WRO", "Mumbai", "411005", "info@demo-inst-b.edu.in", "VERIFIED"),
            ("DEMO-AICTE-003", "Demo Institute C — Institute of Management & Technology", "Management", "Old Mahabalipuram Road", "Chennai", "Chennai", "Tamil Nadu", "SRO", "Chennai", "600096", "registrar@demo-inst-c.ac.in", "VERIFIED"),
            ("DEMO-AICTE-004", "Demo Institute D — Polytechnic & Technical Studies", "Polytechnic", "Bidhannagar Sector V", "Kolkata", "North 24 Parganas", "West Bengal", "ERO", "Kolkata", "700091", "admin@demo-inst-d.org", "VERIFIED"),
            ("DEMO-AICTE-005", "Demo Institute E — Global College of Pharmacy", "Pharmacy", "Malviya Nagar Extension", "Jaipur", "Jaipur", "Rajasthan", "NRO", "Kanpur", "302017", "pharmacy@demo-inst-e.ac.in", "VERIFIED"),
            ("DEMO-AICTE-006", "Demo Institute F — Apex Institute of Technology", "Engineering & Technology", "Electronic City Phase 1", "Bengaluru", "Bengaluru Urban", "Karnataka", "SRO", "Chennai", "560100", "principal@demo-inst-f.ac.in", "VERIFIED"),
            ("DEMO-AICTE-007", "Demo Institute G — National Institute of Applied Sciences", "Applied Sciences", "Gachibowli Tech Zone", "Hyderabad", "Rangareddy", "Telangana", "SRO", "Chennai", "500032", "contact@demo-inst-g.edu.in", "VERIFIED"),
            ("DEMO-AICTE-008", "Demo Institute H — Metropolitan School of Architecture", "Architecture & Planning", "Vasant Kunj Institutional Area", "New Delhi", "South West Delhi", "Delhi", "NRO", "Kanpur", "110070", "admin@demo-inst-h.ac.in", "VERIFIED"),
            ("DEMO-AICTE-009", "Demo Institute I — Vidya College of Technical Education", "Polytechnic", "Sitabuldi Main Road", "Nagpur", "Nagpur", "Maharashtra", "WRO", "Mumbai", "440012", "info@demo-inst-i.ac.in", "VERIFIED"),
            ("DEMO-AICTE-010", "Demo Institute J — Premier Institute of Hotel Management", "Hotel Management", "Salt Lake Sector II", "Kolkata", "Kolkata", "West Bengal", "ERO", "Kolkata", "700064", "office@demo-inst-j.org", "VERIFIED"),
        ]
        insts_map = {}
        for perm_id, name, itype, addr, city, dist, state, r_code, roffice, pin, mail, v_status in institutions_data:
            inst = db.query(Institution).filter(Institution.permanent_id == perm_id).first()
            if not inst:
                inst = Institution(
                    permanent_id=perm_id,
                    institution_name=name,
                    institution_type=itype,
                    address=addr,
                    city=city,
                    district=dist,
                    state=state,
                    region_id=regions_map[r_code].id,
                    regional_office=roffice,
                    postal_code=pin,
                    contact_email=mail,
                    contact_phone="011-23456789",
                    verification_status=v_status,
                    record_status="ACTIVE",
                    created_by=users_map["admin"].id
                )
                db.add(inst)
                db.flush()
            insts_map[perm_id] = inst
        print(f"[OK] {len(institutions_data)} Fictional Demonstration Institutions seeded.")

        # =========================================================================
        # SEED SIH PS 26264 DEMO SCENARIOS
        # =========================================================================

        # SCENARIO A: Two Related Complaints across PGRC and RB (DEMO-AICTE-001)
        # Capitation Fee & Roster Deficiencies under separate investigation
        inst_a = insts_map["DEMO-AICTE-001"]

        c1 = db.query(Complaint).filter(Complaint.complaint_reference == "CMP-2026-0001").first()
        if not c1:
            c1 = Complaint(
                complaint_reference="CMP-2026-0001",
                title="Allegation of capitation fee collection during B.Tech admissions",
                description="Complainant alleges that the institution requested an unreceipted development fee of Rs. 1,50,000 in cash during document verification.",
                complainant_id=users_map["complainant_user"].id,
                institution_id=inst_a.id,
                category_id=cats_map["CAT_STUDENT"].id,
                complainant_type="STUDENT",
                source="PORTAL",
                received_at=now - timedelta(days=12),
                status="CASE_LINKED",
                sensitivity_classification="NORMAL",
                assigned_bureau_id=bureaus_map["PGRC"].id,
                created_by=users_map["complainant_user"].id
            )
            db.add(c1)
            db.flush()

        case1 = db.query(Case).filter(Case.case_reference == "CASE-2026-0001").first()
        if not case1:
            case1 = Case(
                case_reference="CASE-2026-0001",
                institution_id=inst_a.id,
                current_bureau_id=bureaus_map["PGRC"].id,
                current_officer_id=users_map["pgrc_officer"].id,
                title="Grievance: Capitation Fee Dispute (B.Tech Admissions)",
                category="Student Welfare & Fee Disputes",
                status="Under Verification",
                priority="HIGH",
                received_at=now - timedelta(days=12),
                last_action="Institution reply received; seeking bank transaction proof from complainant",
                last_action_at=now - timedelta(days=2),
                next_action="Reconciliation of fee accounts by scrutiny committee",
                applicable_deadline_at=now + timedelta(days=18),
                created_by=users_map["pgrc_officer"].id
            )
            db.add(case1)
            db.flush()

            link1 = ComplaintCaseLink(complaint_id=c1.id, case_id=case1.id, link_type="PRIMARY", created_by=users_map["admin"].id)
            db.add(link1)

            assign1 = Assignment(
                case_id=case1.id,
                bureau_id=bureaus_map["PGRC"].id,
                officer_id=users_map["pgrc_officer"].id,
                assigned_by=users_map["bureau_head"].id,
                assigned_at=now - timedelta(days=11),
                reason="Assigned to senior grievance officer for financial compliance review",
                assignment_status="ACTIVE"
            )
            db.add(assign1)

            wf1 = WorkflowHistory(
                institution_id=inst_a.id,
                case_id=case1.id,
                action_type="STATUS_CHANGE",
                previous_value="Assigned",
                new_value="Under Verification",
                remarks="Institution provided initial audited statements; under officer verification",
                performed_by=users_map["pgrc_officer"].id,
                created_at=now - timedelta(days=2)
            )
            db.add(wf1)

        c2 = db.query(Complaint).filter(Complaint.complaint_reference == "CMP-2026-0002").first()
        if not c2:
            c2 = Complaint(
                complaint_reference="CMP-2026-0002",
                title="Inspection report discrepancy regarding mandatory laboratory equipment & cadre ratio",
                description="Regulatory inspection indicates artificial faculty roster presentation and deficient lab equipment in Electronics department.",
                complainant_id=None,
                institution_id=inst_a.id,
                category_id=cats_map["CAT_COMPL"].id,
                complainant_type="STAFF",
                source="CPGRAMS",
                received_at=now - timedelta(days=8),
                status="CASE_LINKED",
                sensitivity_classification="HIGH_PRIORITY",
                assigned_bureau_id=bureaus_map["RB"].id,
                created_by=users_map["admin"].id
            )
            db.add(c2)
            db.flush()

        case2 = db.query(Case).filter(Case.case_reference == "CASE-2026-0002").first()
        if not case2:
            case2 = Case(
                case_reference="CASE-2026-0002",
                institution_id=inst_a.id,
                current_bureau_id=bureaus_map["RB"].id,
                current_officer_id=users_map["rb_officer"].id,
                title="Regulatory Compliance Scrutiny: Faculty Cadre Ratio & Lab Facilities",
                category="Institutional Compliance & Approvals",
                status="Under Scrutiny",
                priority="URGENT",
                received_at=now - timedelta(days=8),
                last_action="Show-cause notice drafted for missing laboratory apparatus",
                last_action_at=now - timedelta(days=1),
                next_action="Issue formal notice under AICTE Approval Process Handbook regulations",
                applicable_deadline_at=now + timedelta(days=13),
                created_by=users_map["rb_officer"].id
            )
            db.add(case2)
            db.flush()

            link2 = ComplaintCaseLink(complaint_id=c2.id, case_id=case2.id, link_type="PRIMARY", created_by=users_map["admin"].id)
            db.add(link2)

            assign2 = Assignment(
                case_id=case2.id,
                bureau_id=bureaus_map["RB"].id,
                officer_id=users_map["rb_officer"].id,
                assigned_by=users_map["admin"].id,
                assigned_at=now - timedelta(days=7),
                reason="Allocated to Regulation Bureau compliance desk",
                assignment_status="ACTIVE"
            )
            db.add(assign2)

            wf2 = WorkflowHistory(
                institution_id=inst_a.id,
                case_id=case2.id,
                action_type="STATUS_CHANGE",
                previous_value="Received",
                new_value="Under Scrutiny",
                remarks="Case registered and assigned for regulatory scrutiny",
                performed_by=users_map["rb_officer"].id,
                created_at=now - timedelta(days=1)
            )
            db.add(wf2)

        # SCENARIO B: Two Unrelated Complaints on Same Institution (DEMO-AICTE-006)
        # One regarding Hostel Wi-Fi (Student Welfare) and one regarding Library books (Infrastructure)
        inst_f = insts_map["DEMO-AICTE-006"]
        c3 = db.query(Complaint).filter(Complaint.complaint_reference == "CMP-2026-0003").first()
        if not c3:
            c3 = Complaint(
                complaint_reference="CMP-2026-0003",
                title="Hostel Internet Bandwidth and Mess Sanitation Deficiency",
                description="Hostel residents report frequent disconnection of academic research portals and unhygienic mess dining conditions.",
                complainant_id=users_map["complainant_user"].id,
                institution_id=inst_f.id,
                category_id=cats_map["CAT_STUDENT"].id,
                complainant_type="STUDENT",
                source="PORTAL",
                received_at=now - timedelta(days=5),
                status="REGISTERED",
                sensitivity_classification="NORMAL",
                assigned_bureau_id=bureaus_map["PGRC"].id,
                created_by=users_map["complainant_user"].id
            )
            db.add(c3)
            db.flush()

        c4 = db.query(Complaint).filter(Complaint.complaint_reference == "CMP-2026-0004").first()
        if not c4:
            c4 = Complaint(
                complaint_reference="CMP-2026-0004",
                title="Shortage of Mandatory Digital Library Subscriptions (IEEE/ACM)",
                description="Faculty grievance asserting lack of required e-journal packages mandated in Appendix 10 of AICTE Approval Handbook.",
                complainant_id=None,
                institution_id=inst_f.id,
                category_id=cats_map["CAT_INFRA"].id,
                complainant_type="FACULTY",
                source="EMAIL",
                received_at=now - timedelta(days=3),
                status="REGISTERED",
                sensitivity_classification="NORMAL",
                assigned_bureau_id=bureaus_map["PGRC"].id,
                created_by=users_map["admin"].id
            )
            db.add(c4)
            db.flush()

        # SCENARIO C: Cases Involving Distinct Institutions (DEMO-AICTE-007 and DEMO-AICTE-008)
        inst_g = insts_map["DEMO-AICTE-007"]
        case_g = db.query(Case).filter(Case.case_reference == "CASE-2026-0007").first()
        if not case_g:
            case_g = Case(
                case_reference="CASE-2026-0007",
                institution_id=inst_g.id,
                current_bureau_id=bureaus_map["AB"].id,
                current_officer_id=users_map["admin"].id,
                title="Annual Extension of Approval (EoA) Verification: New Specialization Addition",
                category="Institutional Compliance & Approvals",
                status="Under Scrutiny",
                priority="MEDIUM",
                received_at=now - timedelta(days=14),
                last_action="Scrutiny committee verifying land-use conversion documents",
                last_action_at=now - timedelta(days=3),
                applicable_deadline_at=now + timedelta(days=16),
                created_by=users_map["admin"].id
            )
            db.add(case_g)
            db.flush()

        # SCENARIO D: A Pending Cross-Bureau Coordination Request (DEMO-AICTE-002)
        # PGRC case and Regulation Bureau inquiry pending joint committee review
        inst_b = insts_map["DEMO-AICTE-002"]
        case3 = db.query(Case).filter(Case.case_reference == "CASE-2026-0003").first()
        if not case3:
            case3 = Case(
                case_reference="CASE-2026-0003",
                institution_id=inst_b.id,
                current_bureau_id=bureaus_map["PGRC"].id,
                current_officer_id=users_map["pgrc_officer"].id,
                title="Non-refund of caution deposit to graduated students",
                category="Student Welfare & Fee Disputes",
                status="Awaiting Response",
                priority="HIGH",
                received_at=now - timedelta(days=40),
                last_action="Reminder letter sent to registrar regarding deposit refund",
                last_action_at=now - timedelta(days=15),
                next_action="Issue final directive before withholding approval extension",
                applicable_deadline_at=now - timedelta(days=5), # OVERDUE!
                escalation_status="OVERDUE",
                created_by=users_map["admin"].id
            )
            db.add(case3)
            db.flush()

        case_b_rb = db.query(Case).filter(Case.case_reference == "CASE-2026-0006").first()
        if not case_b_rb:
            case_b_rb = Case(
                case_reference="CASE-2026-0006",
                institution_id=inst_b.id,
                current_bureau_id=bureaus_map["RB"].id,
                current_officer_id=users_map["rb_officer"].id,
                title="Institutional Governance Audit: Financial Irregularities & Student Accounts",
                category="Institutional Compliance & Approvals",
                status="Under Verification",
                priority="HIGH",
                received_at=now - timedelta(days=15),
                last_action="Special inquiry committee recommended cross-bureau review",
                last_action_at=now - timedelta(days=2),
                applicable_deadline_at=now + timedelta(days=10),
                created_by=users_map["rb_officer"].id
            )
            db.add(case_b_rb)
            db.flush()

        # SCENARIO E: Overdue Case Requiring Supervisor Attention (Already present on DEMO-AICTE-002, CASE-2026-0003)
        # Additional Disposed Case demonstration on DEMO-AICTE-003
        inst_c = insts_map["DEMO-AICTE-003"]
        case4 = db.query(Case).filter(Case.case_reference == "CASE-2026-0004").first()
        if not case4:
            case4 = Case(
                case_reference="CASE-2026-0004",
                institution_id=inst_c.id,
                current_bureau_id=bureaus_map["PGRC"].id,
                current_officer_id=users_map["pgrc_officer"].id,
                title="Delay in release of AICTE PG scholarship disbursal",
                category="Academic & Regulatory Matters",
                status="Disposed",
                priority="LOW",
                received_at=now - timedelta(days=25),
                last_action="Scholarship DBT processed; complainant confirmed receipt in bank account",
                last_action_at=now - timedelta(days=3),
                next_action=None,
                applicable_deadline_at=now + timedelta(days=5),
                created_by=users_map["admin"].id
            )
            db.add(case4)
            db.flush()

        # Inst D: Transferred case demonstration
        inst_d = insts_map["DEMO-AICTE-004"]
        case5 = db.query(Case).filter(Case.case_reference == "CASE-2026-0005").first()
        if not case5:
            case5 = Case(
                case_reference="CASE-2026-0005",
                institution_id=inst_d.id,
                current_bureau_id=bureaus_map["RB"].id,
                current_officer_id=users_map["rb_officer"].id,
                title="Irregular intake expansion beyond approved AICTE sanction",
                category="Institutional Compliance & Approvals",
                status="Transferred",
                priority="HIGH",
                received_at=now - timedelta(days=18),
                last_action="Transferred from PGRC to Regulation Bureau due to statutory jurisdiction",
                last_action_at=now - timedelta(days=4),
                next_action="Re-verification of seat matrix",
                applicable_deadline_at=now + timedelta(days=10),
                created_by=users_map["pgrc_officer"].id
            )
            db.add(case5)
            db.flush()

            trans1 = Transfer(
                case_id=case5.id,
                from_bureau_id=bureaus_map["PGRC"].id,
                to_bureau_id=bureaus_map["RB"].id,
                from_officer_id=users_map["pgrc_officer"].id,
                to_officer_id=users_map["rb_officer"].id,
                initiated_by=users_map["bureau_head"].id,
                transfer_reason="Matter involves statutory sanction limits governed under Regulation Bureau charter rather than individual grievance.",
                transferred_at=now - timedelta(days=4),
                receiving_status="ACCEPTED",
                receiving_remarks="Accepted by Regulation Bureau desk for regulatory audit"
            )
            db.add(trans1)

        # =========================================================================
        # SEED PHASE 2: REGULATORY ACTION CONFLICT SCENARIOS (A through F)
        # =========================================================================
        print("Seeding synthetic Regulatory Actions and Action Conflict scenarios...")

        # Action 1 (Scenario A / Existing): RB laboratory infrastructure inspection at DEMO-AICTE-001
        act1 = db.query(RegulatoryAction).filter(RegulatoryAction.title == "Expert Committee Physical Inspection of Engineering Laboratories").first()
        if not act1:
            act1 = RegulatoryAction(
                case_id=case2.id, # RB Case CASE-2026-0002
                institution_id=inst_a.id,
                bureau_id=bureaus_map["RB"].id,
                created_by_id=users_map["rb_officer"].id,
                action_type="INSPECTION",
                title="Expert Committee Physical Inspection of Engineering Laboratories",
                description="On-site physical verification of computing machinery, AI/ML laboratories, and electronics hardware apparatus against APH 2026 norms.",
                subject_category="LAB_INFRASTRUCTURE",
                scheduled_date=now + timedelta(days=12),
                status="SCHEDULED",
                created_at=now - timedelta(days=2),
                updated_at=now - timedelta(days=2)
            )
            db.add(act1)
            db.flush()

        # Action 2 (Scenario A / Proposed): PGRC laboratory infrastructure inspection at DEMO-AICTE-001 -> HIGH CONFLICT!
        act2 = db.query(RegulatoryAction).filter(RegulatoryAction.title == "Grievance On-Site Fact-Finding: Laboratory Facilities").first()
        if not act2:
            act2 = RegulatoryAction(
                case_id=case1.id, # PGRC Case CASE-2026-0001
                institution_id=inst_a.id,
                bureau_id=bureaus_map["PGRC"].id,
                created_by_id=users_map["pgrc_officer"].id,
                action_type="INSPECTION",
                title="Grievance On-Site Fact-Finding: Laboratory Facilities",
                description="Investigating student grievance regarding missing lab apparatus and locked computing facilities.",
                subject_category="LAB_INFRASTRUCTURE",
                scheduled_date=now + timedelta(days=14),
                status="PENDING_CONFLICT_REVIEW",
                created_at=now - timedelta(days=1),
                updated_at=now - timedelta(days=1)
            )
            db.add(act2)
            db.flush()

            # Seed Detected Action Conflict between Action 2 and Action 1
            conf1 = ActionConflict(
                proposed_action_id=act2.id,
                existing_action_id=act1.id,
                institution_id=inst_a.id,
                conflict_type="DUPLICATE_INSPECTION",
                severity="HIGH",
                explanation=f"Potential duplicate inspection (within 2 days): Regulation Bureau has already scheduled a '{act1.title}' covering subject 'LAB_INFRASTRUCTURE' for {inst_a.institution_name} under case {case2.case_reference}.",
                status="PENDING_REVIEW",
                detected_at=now - timedelta(days=1)
            )
            db.add(conf1)

        # Action 3 (Scenario D / Existing): RB requests admission records at DEMO-AICTE-002
        act3 = db.query(RegulatoryAction).filter(RegulatoryAction.title == "Requisition of Verified Admission Registers and Fee Ledgers").first()
        if not act3:
            act3 = RegulatoryAction(
                case_id=case_b_rb.id, # RB Case CASE-2026-0006
                institution_id=inst_b.id,
                bureau_id=bureaus_map["RB"].id,
                created_by_id=users_map["rb_officer"].id,
                action_type="DOCUMENT_REQUEST",
                title="Requisition of Verified Admission Registers and Fee Ledgers",
                description="Submission of certified admission registers, bank account fee ledgers, and audited statements for AY 2025-26.",
                subject_category="ADMISSION_NORMS",
                scheduled_date=now + timedelta(days=7),
                status="SCHEDULED",
                created_at=now - timedelta(days=3),
                updated_at=now - timedelta(days=3)
            )
            db.add(act3)
            db.flush()

        # Action 4 (Scenario D / Proposed): PGRC requests same category documents at DEMO-AICTE-002 -> REDUNDANT_DOCUMENT_REQUEST
        act4 = db.query(RegulatoryAction).filter(RegulatoryAction.title == "Directive to Furnish Student Caution Deposit Records").first()
        if not act4:
            act4 = RegulatoryAction(
                case_id=case3.id, # PGRC Case CASE-2026-0003
                institution_id=inst_b.id,
                bureau_id=bureaus_map["PGRC"].id,
                created_by_id=users_map["pgrc_officer"].id,
                action_type="DOCUMENT_REQUEST",
                title="Directive to Furnish Student Caution Deposit Records",
                description="Submit verified ledgers and caution deposit receipts collected during student intake.",
                subject_category="ADMISSION_NORMS",
                scheduled_date=now + timedelta(days=9),
                status="PENDING_CONFLICT_REVIEW",
                created_at=now - timedelta(days=1),
                updated_at=now - timedelta(days=1)
            )
            db.add(act4)
            db.flush()

            conf2 = ActionConflict(
                proposed_action_id=act4.id,
                existing_action_id=act3.id,
                institution_id=inst_b.id,
                conflict_type="REDUNDANT_DOCUMENT_REQUEST",
                severity="HIGH",
                explanation=f"Redundant document demand: Regulation Bureau has already issued document requisition '{act3.title}' for category 'ADMISSION_NORMS' under case {case_b_rb.case_reference}. Consolidate requests to prevent repetitive compliance burdens.",
                status="COORDINATION_REQUESTED",
                detected_at=now - timedelta(days=1)
            )
            db.add(conf2)

        # Action 5 (Scenario E / Cancelled): Cancelled infrastructure inspection
        act5 = db.query(RegulatoryAction).filter(RegulatoryAction.title == "Cancelled Routine Inspection of Building Safety").first()
        if not act5:
            act5 = RegulatoryAction(
                case_id=case1.id,
                institution_id=inst_a.id,
                bureau_id=bureaus_map["PGRC"].id,
                created_by_id=users_map["pgrc_officer"].id,
                action_type="INSPECTION",
                title="Cancelled Routine Inspection of Building Safety",
                description="Routine inspection cancelled due to institutional administrative holiday.",
                subject_category="FIRE_SAFETY",
                scheduled_date=now - timedelta(days=10),
                status="CANCELLED",
                created_at=now - timedelta(days=15),
                updated_at=now - timedelta(days=10)
            )
            db.add(act5)
            db.flush()

        # Action 6 (Scenario B / Unrelated): Faculty compliance review at DEMO-AICTE-006 (No conflict)
        act6 = db.query(RegulatoryAction).filter(RegulatoryAction.title == "Verification of Doctoral Faculty Rosters").first()
        if not act6:
            act6 = RegulatoryAction(
                case_id=case_g.id,
                institution_id=inst_f.id,
                bureau_id=bureaus_map["AB"].id,
                created_by_id=users_map["admin"].id,
                action_type="COMPLIANCE_REVIEW",
                title="Verification of Doctoral Faculty Rosters",
                description="Reviewing doctoral cadre ratios for newly proposed computer science courses.",
                subject_category="FACULTY_QUALIFICATION",
                scheduled_date=now + timedelta(days=20),
                status="APPROVED",
                created_at=now - timedelta(days=2),
                updated_at=now - timedelta(days=2)
            )
            db.add(act6)
            db.flush()

        db.commit()

        # Execute Overlap Detection Engine across all institutions
        print("Executing deterministic cross-bureau overlap detection engine...")
        for inst in db.query(Institution).all():
            flag = detect_overlaps_for_institution(db, inst.id)
            if flag and inst.permanent_id == "DEMO-AICTE-002":
                flag.relationship_state = "COORDINATION_REQUESTED"
                flag.coordination_owner_id = users_map["bureau_head"].id
        db.commit()

        print("\n=======================================================")
        print("[OK] AICTE Case360+ Database seeding completed successfully!")
        print("=======================================================")
        print("Fictional Demonstration Accounts:")
        print("1. System Administrator:    admin               / Admin@123")
        print("2. PGRC Officer:            pgrc_officer        / Pgrc@123")
        print("3. Regulation Bureau Off:   rb_officer          / Rb@123")
        print("4. Bureau Head/Supervisor:  bureau_head         / Head@123")
        print("5. Regional User (Kanpur):  ro_northern         / Ro@123")
        print("6. Competent Authority:     competent_authority / Auth@123")
        print("7. Complainant (Citizen):   complainant_user    / Citizen@123")
        print("=======================================================\n")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
