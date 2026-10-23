# AICTE ICMS — Architecture & Implementation Plan
## Problem Statement SIH PS-264: Integrated Institution Complaint Monitoring and Coordination Platform

**Tagline:** *One Institution. One Coordinated View. Better Grievance Resolution.*

---

## 1. Executive Architecture Summary

The AICTE ICMS platform establishes an **institution-centric grievance coordination and monitoring architecture**. It prevents cross-bureau duplication, enables deterministic overlap detection, tracks multi-stage case workflows with immutable audit trails, and delivers comprehensive real-time dashboards and reports.

```
+---------------------------------------------------------------------------------------+
|                                    REACT FRONTEND                                     |
|  - Tailwind CSS Government Design System (Navy #17365D, Dark Navy #102A43)            |
|  - Role-Aware Navigation & Guards                                                     |
|  - Comprehensive Consolidated Institution Profiles                                    |
|  - Real-time Notifications & Alerts                                                   |
|  - Interactive Recharts Visualizations & Analytics                                    |
+-------------------------------------------+-------------------------------------------+
                                            | REST API (JSON / Multipart / Streams)
+-------------------------------------------v-------------------------------------------+
|                                  FASTAPI BACKEND API                                  |
|  - Core Auth & RBAC Middleware (Argon2 / bcrypt / PyJWT)                              |
|  - Bureau & Regional Scope Enforcers                                                  |
|  - Deterministic Overlap Detection Engine (Permanent ID & Multi-Bureau Matching)      |
|  - SLA & Deadline Calculation Engine                                                  |
|  - Document Management (Safe storage, MIME validation, Record-linked access)          |
|  - Reporting Engine (CSV / XLSX / PDF with ReportLab)                                 |
+-------------------------------------------+-------------------------------------------+
                                            | SQLAlchemy 2.0 ORM / Alembic Migrations
+-------------------------------------------v-------------------------------------------+
|                                  RELATIONAL DATABASE                                  |
|  - PostgreSQL / SQLite (ACID, Foreign Keys, Indexes, Unique Constraints)              |
|  - Normalized Schema: Institutions, Complaints, Cases, Overlaps, Transfers, Audits    |
+---------------------------------------------------------------------------------------+
```

---

## 2. Stage-by-Stage Implementation Checklist

- [x] **Stage 1: Repository Inspection & Foundation**
  - [x] Inspect environment (Python 3.14, Node v26, npm 11.19)
  - [x] Install backend dependencies (`fastapi`, `uvicorn`, `sqlalchemy`, `alembic`, `pydantic-settings`, `pyjwt`, `bcrypt`, `reportlab`, `openpyxl`, `pytest`, `httpx`, `apscheduler`)
  - [x] Initialize Vite + React + TypeScript + Tailwind CSS frontend
  - [x] Establish `.env.example` and base configurations

- [ ] **Stage 2: Database Models & Authentication (RBAC)**
  - [ ] Implement SQLAlchemy models for Users, Roles, Permissions, UserRoles, Bureaus, Regions
  - [ ] JWT token generation, verification, and password hashing with bcrypt
  - [ ] FastAPI dependencies for role, bureau, and region access enforcement
  - [ ] Seed default prototype roles: Complainant, PGRC Officer, Regulation Bureau Officer, Bureau Head, Regional Office User, Management Viewer, System Administrator

- [ ] **Stage 3: Centralized Institution Registry**
  - [ ] Model `Institution` with Permanent ID uniqueness, region, status, contact info
  - [ ] CRUD API with server-side pagination, search by name/Permanent ID, and regional filters
  - [ ] Institution Profile endpoint consolidating complaints, active cases, involved bureaus, and metrics

- [ ] **Stage 4: Complaint Management Module**
  - [ ] Model `Complaint` with auto-generated unique ID (`CMP-YYYY-XXXXX`), sensitivity, category
  - [ ] Registration workflow with transaction safety and audit logging
  - [ ] Attachment metadata handling
  - [ ] Complaint detail view and authorized status timeline

- [ ] **Stage 5: Official Case Management & Workflow Lifecycle**
  - [ ] Model `Case` (`CASE-YYYY-XXXXX`), status transitions, priority, disposal targets
  - [ ] Configurable lifecycle: Received -> Acknowledged -> Under Scrutiny -> Assigned -> Institution Notice Issued -> Awaiting Response -> Under Verification -> Committee Review -> Action Taken -> Disposed / Closed
  - [ ] Complaint-to-case link mapping (1-to-many / many-to-1)
  - [ ] Workflow history tracking every state mutation

- [ ] **Stage 6: Cross-Bureau Overlap Detection Engine**
  - [ ] Deterministic detection: Flag when 2+ active cases for the same verified Permanent ID belong to differing Bureaus/Cells
  - [ ] Exact required alert banner: **`POTENTIAL OVERLAPPING CASES – COORDINATION REQUIRED`**
  - [ ] Coordination decisions workflow: `Review Relationship`, `Confirm Related`, `Mark Not Related`, `Request Coordination`, `Record Joint Action`, `Record Outcome`
  - [ ] Preserving distinct identities (no destructive merging)

- [ ] **Stage 7: Assignment & Transfer Workflows**
  - [ ] Case assignment & reassignment to eligible officers
  - [ ] Inter-bureau transfer workflow capturing source/destination bureau, officers, rationale
  - [ ] Immutable transfer history logs and notifications

- [ ] **Stage 8: Main Executive Dashboard & Real-Time Analytics**
  - [ ] Summary cards: Total Complaints, Pending Cases, Under Process, Disposed, Transferred, Overdue, Potential Overlaps, Active Institutions
  - [ ] Visualizations: Case Status Distribution, Bureau Workload, Regional Distribution, Ageing Analysis (0-7d, 8-30d, 31-60d, 60d+)
  - [ ] Actionable widgets: Overlaps Requiring Review, Approaching Deadlines, Overdue Cases, Recent Activity

- [ ] **Stage 9: Deadlines, SLA Rules & In-App Notification Center**
  - [ ] Configurable SLA rules by bureau/category
  - [ ] Deadline evaluator: calculates approaching deadlines and overdue flags without inventing unconfigured rules
  - [ ] Notification entity and recipient status (read/unread) with mark-as-read endpoints
  - [ ] Background job scheduler (APScheduler) for automated periodic checks

- [ ] **Stage 10: Reports & Multi-Format Exports**
  - [ ] Bureau-wise, Region-wise, Institution History, Ageing, Disposal, and Coordination reports
  - [ ] Backend export generation: CSV, Excel (.xlsx), and PDF (ReportLab formatted)
  - [ ] Immutable system audit trail with search and filtering

- [ ] **Stage 11: Professional Government Administrative UI/UX**
  - [ ] Professional Navy & Slate design theme (`#17365D`, `#102A43`, `#F4F6F9`)
  - [ ] Clear typography, high-contrast badges, compact data tables, breadcrumbs
  - [ ] Modal dialogs with confirmation for sensitive operations
  - [ ] Prototype disclaimer banner and accessibility standards

- [ ] **Stage 12: Demonstration Dataset, Automated Tests & Verification**
  - [ ] Seed fictional institutions: Demo Institute A (`DEMO-AICTE-001`), Demo Institute B (`DEMO-AICTE-002`), etc.
  - [ ] Verified active overlap scenario (PGRC vs. RB for Demo Institute A)
  - [ ] Pytest suite covering authentication, RBAC, institutions, complaints, cases, deterministic overlap logic, and transfer history
  - [ ] Visual browser validation using browser subagent
