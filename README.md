# AICTE Integrated Institution Complaint Monitoring and Coordination Platform (AICTE ICMS)
## Smart India Hackathon — Problem Statement PS-264
**Tagline:** *One Institution. One Coordinated View. Better Grievance Resolution.*

> [!IMPORTANT]
> **Prototype Disclaimer:** This software is a functional prototype engineered for the Smart India Hackathon (Problem Statement PS-264). It features an authentic government administrative design system, but is not officially deployed, operated, or endorsed by the All India Council for Technical Education (AICTE). All demonstration institution records, case numbers, and staff names are fictional and intended solely for technical evaluation.

---

## 1. Problem Statement Context (SIH PS-264)

The All India Council for Technical Education (AICTE) receives grievances and regulatory complaints regarding technical education institutions across India from students, faculty members, institutional staff, and external stakeholders.

Historically, multiple autonomous administrative Bureaus and Cells—such as the **Public Grievance Redressal Cell (PGRC)** and the **Regulation Bureau (RB)**—have received and processed complaints independently. This siloed operation has led to critical administrative bottlenecks:
- **Duplicate Administrative Efforts:** Multiple officers simultaneously investigating identical or related grievances without mutual awareness.
- **Overlapping and Conflicting Actions:** Conflicting inquiry notices or directives dispatched to the same institution by different AICTE bureaus.
- **Delayed Resolution:** Substantial lag in resolving cases due to uncoordinated inquiries and redundant fact-finding.
- **Poor Bureau Visibility:** Inability of case officers in one bureau to ascertain if an institution is already under investigation elsewhere.
- **Inability to Track Complete Institutional History:** Scattered case files prevent a single consolidated view of an institution's historical regulatory compliance and grievance record.
- **Uncoordinated Transfers:** Case transfers between cells lack end-to-end historical traceability and accountability.

**AICTE ICMS** resolves these challenges by introducing a centralized, institution-oriented coordination system. An authorized officer can instantly view an institution's consolidated record, active inquiries, involved bureaus, recent orders, and potential cross-bureau overlaps—without merging distinct citizen grievances or circumventing human administrative discretion.

---

## 2. Key Objectives & Architectural Principles

1. **Centralized Institution Registry:** Unique verification on AICTE Permanent IDs with complete consolidated profiles.
2. **Complaint vs. Case Separation:** Complaints (citizen grievances) and Cases (official administrative proceedings) are cleanly decoupled in the relational schema.
3. **Deterministic Cross-Bureau Overlap Engine:** Automatic detection of simultaneous active cases involving the same verified institution across differing bureaus, presenting the required alert:
   ```
   POTENTIAL OVERLAPPING CASES – COORDINATION REQUIRED
   ```
4. **Non-Destructive Tracking (Rule 7):** Never automatically merge, overwrite, or delete distinct complaints or cases. The system prompts authorized officials to conduct human-in-the-loop coordination reviews.
5. **Configurable SLA & Deadlines (Rule 6):** Dynamically evaluates statutory and administrative deadlines. When no rule has been configured by administrators, the portal explicitly displays `Deadline not configured` rather than fabricating statutory timeframes.
6. **End-to-End Inter-Bureau Transfers:** Complete chronological preservation of previous bureaus, transferring officers, receiving queues, and transfer rationales.
7. **Strict Backend-Enforced Security:** Zero reliance on frontend-only permission hiding. All endpoints validate JWT signatures, role privileges, bureau affiliations, and regional scopes.
8. **Real Relational Analytics (Rule 5):** All summary metrics, Recharts graphs, ageing distributions, and workload tables are dynamically aggregated from live database records.
9. **Multi-Format Export Engine:** Server-side streaming binary exports for CSV, Microsoft Excel (`.xlsx`), and PDF (via ReportLab).
10. **Immutable Audit Logging:** Every security, authentication, status transition, assignment, transfer, and coordination event is permanently logged.

---

## 3. Technology Stack

### Backend
- **Framework:** Python 3.10+ / 3.14 with **FastAPI** (asynchronous ASGI architecture).
- **ORM & Data Layer:** **SQLAlchemy 2.0** with **Alembic** database migrations.
- **Database:** **PostgreSQL** (production target) / **SQLite with Foreign Key Enforcement** (out-of-the-box local development).
- **Security & Authentication:** Direct **Bcrypt** cryptographic password hashing with **PyJWT** (HMAC-SHA256).
- **Background Scheduler:** **APScheduler** background daemon evaluating deadlines and queueing SLA notifications every 15 minutes.
- **Document Export:** **ReportLab** (formatted PDF tables), **OpenPyXL** (formatted Excel spreadsheets), and Python standard CSV engine.

### Frontend
- **Framework:** **React 19** with **TypeScript** and **Vite**.
- **Styling & Design System:** **Tailwind CSS** implementing a restrained, authentic government administrative palette (`#17365D`, `#102A43`, `#245A81`, `#F4F6F9`).
- **Icons & Visuals:** **Lucide React**.
- **Data Visualizations:** **Recharts** (Bar charts, Pie charts, Area charts).
- **Routing & State:** **React Router v7** and standard typed hooks.

---

## 4. Repository Structure

```text
SIH-2/
├── backend/
│   ├── app/
│   │   ├── api/                  # Modular FastAPI routers
│   │   │   ├── admin.py          # Bureau, region, SLA configuration & user admin
│   │   │   ├── audit.py          # System audit log viewer
│   │   │   ├── auth.py           # Authentication, login, token refresh
│   │   │   ├── cases.py          # Case lifecycle, status transitions, timeline
│   │   │   ├── complaints.py     # Citizen grievance registration & linking
│   │   │   ├── deps.py           # Dependency injection (current user, RBAC)
│   │   │   ├── institutions.py   # Registry CRUD & consolidated profile tabs
│   │   │   ├── notifications.py  # Notification center & read state
│   │   │   ├── overlaps.py       # Cross-bureau overlap detection & coordination
│   │   │   ├── reports.py        # Analytics summary & CSV/XLSX/PDF binary exports
│   │   │   └── transfers.py      # Inter-bureau transfer & assignment engine
│   │   ├── core/
│   │   │   ├── config.py         # Pydantic v2 application settings
│   │   │   ├── database.py       # SQLAlchemy engine & session factory
│   │   │   ├── permissions.py    # Role definitions & scope enforcement
│   │   │   └── security.py       # Bcrypt hashing & PyJWT token utilities
│   │   ├── models/
│   │   │   └── entities.py       # 19 normalized relational SQLAlchemy models
│   │   ├── schemas/
│   │   │   └── all_schemas.py    # Typed Pydantic request & response schemas
│   │   ├── services/             # Pure business logic services
│   │   │   ├── audit_service.py
│   │   │   ├── deadline_service.py
│   │   │   ├── institution_service.py
│   │   │   ├── overlap_service.py
│   │   │   ├── report_service.py
│   │   │   └── transfer_service.py
│   │   ├── workers/
│   │   │   └── scheduler.py      # Background APScheduler deadline evaluator
│   │   └── main.py               # FastAPI application entrypoint & middleware
│   ├── tests/
│   │   └── test_all_modules.py   # Comprehensive Pytest test suite (8/8 passing)
│   ├── migrations/               # Alembic database migration environment
│   └── requirements.txt          # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/           # Reusable government portal UI components
│   │   │   ├── AppHeader.tsx     # Official header with notifications & user badge
│   │   │   ├── AppSidebar.tsx    # Role-aware navigation drawer
│   │   │   ├── ExportButtons.tsx # Multi-format export trigger buttons
│   │   │   ├── MetricCard.tsx    # Database-backed metric card with indicators
│   │   │   └── StatusBadge.tsx   # Color-coded administrative status badges
│   │   ├── pages/                # Major administrative views
│   │   │   ├── AdminPage.tsx
│   │   │   ├── AlertsDeadlinesPage.tsx
│   │   │   ├── AuditTrailPage.tsx
│   │   │   ├── CaseDetailPage.tsx
│   │   │   ├── CasesPage.tsx
│   │   │   ├── ComplaintDetailPage.tsx
│   │   │   ├── ComplaintsPage.tsx
│   │   │   ├── CoordinationWorkspacePage.tsx # Core PS-264 Overlap Workspace
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── InstitutionDetailPage.tsx     # Consolidated 360-degree profile
│   │   │   ├── InstitutionsPage.tsx
│   │   │   ├── LoginPage.tsx                 # With 1-click role switcher
│   │   │   └── ReportsAnalyticsPage.tsx
│   │   ├── types/                # TypeScript interface definitions
│   │   ├── App.tsx               # Main layout & router
│   │   └── main.tsx              # React mounting root
│   ├── package.json
│   └── vite.config.ts
├── scripts/
│   └── seed_demo_data.py         # Complete database seeding utility
├── .env.example                  # Environment template
└── README.md                     # Master documentation
```

---

## 5. Prerequisites

Before installing, ensure your environment has:
- **Python:** Version 3.10, 3.11, 3.12, 3.13, or 3.14.
- **Node.js:** Version 18.x, 20.x, or 22.x with `npm`.
- **Operating System:** Windows, Linux, or macOS.

---

## 6. Environment Configuration

Copy `.env.example` to create `.env`:

```bash
cp .env.example .env
```

Default configuration in `.env`:
```ini
PROJECT_NAME="AICTE Integrated Institution Complaint Monitoring and Coordination Platform"
API_V1_STR="/api"
SECRET_KEY="aicte_icms_super_secret_jwt_key_change_in_production_min_32_chars"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=480

# Database Configuration (Defaults to SQLite for zero-setup execution)
DATABASE_URL="sqlite:///./aicte_icms.db"

# For PostgreSQL in production:
# DATABASE_URL="postgresql+psycopg2://postgres:yourpassword@localhost:5432/aicte_icms"

UPLOAD_DIR="./uploads"
MAX_UPLOAD_SIZE_MB=15
ENABLE_SCHEDULER=true
DEADLINE_CHECK_INTERVAL_MINUTES=15
```

---

## 7. Installation & Database Initialization

### 7.1 Backend Setup

1. **Create and activate a virtual environment (recommended):**
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On Linux/macOS:
   source venv/bin/activate
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r backend/requirements.txt
   ```

3. **Initialize Database and Seed Demonstration Data:**
   Run the database seed script. This automatically creates all database tables, foreign keys, lookup catalogs, SLA rules, 7 demo user accounts, 5 technical institutions, complaints, cases, and the active cross-bureau overlap scenario:
   ```bash
   python scripts/seed_demo_data.py
   ```
   *Output confirmation:*
   ```text
   [OK] Database initialized successfully.
   [OK] Roles & permissions created.
   [OK] Bureaus & regions created.
   [OK] Complaint categories & case statuses created.
   [OK] SLA rules seeded.
   [OK] Seed users created.
   [OK] Technical Institutions seeded.
   [OK] Complaints and Cases seeded.
   [OK] Overlap scenario for Demo Institute A seeded.
   [SUCCESS] AICTE ICMS database seeded successfully!
   ```

### 7.2 Frontend Setup

1. **Navigate to the frontend directory and install npm packages:**
   ```bash
   cd frontend
   npm install
   ```

2. **Build bundle for verification (optional):**
   ```bash
   npm run build
   ```

---

## 8. Starting the Application

### Option A: Run Both Services Concurrently

**Terminal 1 — Backend API:**
```bash
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```
- API Root: `http://127.0.0.1:8000`
- Interactive OpenAPI Docs: `http://127.0.0.1:8000/docs`
- ReDoc Docs: `http://127.0.0.1:8000/redoc`
- Health Endpoint: `http://127.0.0.1:8000/api/health`

**Terminal 2 — Frontend Development Server:**
```bash
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```
- Open your browser at `http://127.0.0.1:5173`

---

## 9. Demonstration User Accounts & RBAC

The portal provides 7 pre-seeded demonstration accounts covering all administrative tiers. On the login screen (`http://127.0.0.1:5173/login`), you can either enter the credentials manually or click any **Demo Role Quick Switcher button**:

| Role | Username | Password | Assigned Scope / Permissions |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin` | `Admin@123` | Full system access, user management, SLA configuration, audit trail. |
| **PGRC Officer** | `pgrc_officer` | `Pgrc@123` | Public Grievance Redressal Cell; handles citizen complaints, reviews overlaps. |
| **Regulation Bureau Officer**| `rb_officer` | `Rb@123` | Regulation Bureau; processes compliance cases, coordinates joint actions. |
| **Bureau Head / Supervisor** | `bureau_head` | `Head@123` | Workload monitoring, officer case reassignment, inter-bureau transfer approval. |
| **Regional Office User** | `ro_northern` | `Ro@123` | Northern Regional Office (Kanpur); restricted to Northern Region institutions. |
| **Management Authority** | `competent_authority` | `Auth@123` | High-level executive dashboards, institutional trend monitoring, policy oversight. |
| **Citizen Complainant** | `complainant_user` | `Citizen@123` | File grievances, view public progress of their own complaints, upload documents. |

---

## 10. Core Functional Workflows

### 10.1 Deterministic Cross-Bureau Overlap Detection (PS-264)
The engine in `backend/app/services/overlap_service.py` evaluates cases using a deterministic algorithm:
1. When two or more active cases share the exact same verified AICTE Permanent ID (e.g., `DEMO-AICTE-001`).
2. AND the cases are currently assigned to differing Bureaus/Cells (e.g., Case `CASE-2026-001` in **PGRC** and Case `CASE-2026-002` in **Regulation Bureau**).
3. The system raises an active `OverlapFlag` and displays the exact mandatory alert:
   ```
   POTENTIAL OVERLAPPING CASES – COORDINATION REQUIRED
   ```
4. **Coordination Actions:** Authorized officials can review side-by-side details in the **Cross-Bureau Coordination Workspace**, initiate joint inquiries, assign coordination owners, mark unrelated cases, or log joint resolutions—all while preserving both individual case files intact.

### 10.2 Centralized Institution 360° Profile
Accessible by navigating to **Institutions** and selecting an institution:
- **Consolidated Tabs:**
  - *Overview:* Details, quick stats, workload cards, active alerts.
  - *Complaint History:* All grievances registered against the institution.
  - *Active Cases:* Cases currently underway across all bureaus.
  - *Bureau Involvement:* Breakdown of every AICTE bureau handling the institution.
  - *Overlap Alerts:* Active coordination alerts with direct action links.

### 10.3 Inter-Bureau Case Transfers
When a grievance filed with PGRC reveals regulatory violations requiring Regulation Bureau jurisdiction:
1. Click **Transfer Case** on the case detail screen.
2. Select destination Bureau, optional officer, and enter mandatory transfer justification.
3. The system executes an atomic transaction:
   - Updates current bureau and officer.
   - Appends an immutable record in `transfers` table preserving historical origins.
   - Appends a chronological entry in `workflow_history`.
   - Records an event in `audit_logs`.
   - Dispatches an automated notification to destination bureau personnel.

### 10.4 SLA & Deadline Monitoring
- Built-in SLA rules monitor deadlines by category and bureau (e.g., *Student Harassment* = 7 days; *Faculty Non-Payment* = 15 days; *Infrastructure Deficiency* = 30 days).
- Evaluates deadline state dynamically:
  - `ACTIVE`: Within statutory deadline.
  - `APPROACHING_DEADLINE`: Within reminder threshold.
  - `OVERDUE`: Past scheduled disposal date.
  - `Deadline not configured`: Rule 6 compliance when no SLA rule exists.

### 10.5 Reports & Multi-Format Binary Exports
Navigate to **Reports & Analytics**:
- Live visual analytics for Bureau Workload, Regional Breakdown, and Case Ageing.
- Filter by Bureau, Region, or Status.
- Generate and download real binary files:
  - **CSV Export:** RFC 4180 standard comma-separated text.
  - **Excel Export (`.xlsx`):** Multi-column styled spreadsheet via `OpenPyXL`.
  - **PDF Export:** Tabular administrative document generated via `ReportLab`.

---

## 11. Automated Testing

The project includes an end-to-end backend test suite verifying all critical modules:
- Authentication & JWT token issuance.
- Institution registry uniqueness & profile aggregation.
- Deterministic cross-bureau overlap detection logic.
- Lifecycle state transitions and invalid transition rejection.
- Inter-bureau transfer history preservation.
- Binary CSV, Excel, and PDF export integrity.

To execute the tests:
```bash
python -m pytest backend/tests/test_all_modules.py -v
```

**Actual Test Execution Results:**
```text
============================= test session starts =============================
platform win32 -- Python 3.14.0a4, pytest-8.3.4, pluggy-1.5.0
rootdir: C:\Users\HARISH R\Dropbox\SIH-2
collected 8 items

backend/tests/test_all_modules.py::test_auth_and_login PASSED            [ 12%]
backend/tests/test_all_modules.py::test_institution_unique_permanent_id PASSED [ 25%]
backend/tests/test_all_modules.py::test_institution_profile_consolidation PASSED [ 37%]
backend/tests/test_all_modules.py::test_cross_bureau_overlap_detection PASSED [ 50%]
backend/tests/test_all_modules.py::test_same_bureau_no_overlap PASSED    [ 62%]
backend/tests/test_all_modules.py::test_case_status_transition_rules PASSED [ 75%]
backend/tests/test_all_modules.py::test_transfer_case_preserves_history PASSED [ 87%]
backend/tests/test_all_modules.py::test_report_exports_csv_excel_pdf PASSED [100%]

======================== 8 passed, 0 failed in 5.02s =========================
```

---

## 12. Security Architecture & Safeguards

- **Backend Role & Scope Guardrails:** In `backend/app/core/permissions.py`, custom decorators and dependencies enforce regional and bureau boundary checks.
- **Argon2 / Bcrypt Password Hashing:** Passwords are never stored in plaintext. Passwords are salted and hashed with direct Bcrypt bindings.
- **SQL Injection Prevention:** 100% parameterization through SQLAlchemy ORM.
- **Path Traversal Protection:** File uploads are assigned server-generated UUID storage tokens and stored outside the web root.
- **Safe Document Serving:** Downloads require authenticated tokens and verify access rights before streaming file contents.
- **Audit Immutability:** System audit entries have no delete or update endpoints in the administrative API.

---

## 13. Production Deployment Notes (PostgreSQL & Docker)

To deploy to production with PostgreSQL:
1. Set `DATABASE_URL` in `.env`:
   ```ini
   DATABASE_URL="postgresql+psycopg2://icms_user:secure_password@postgres.internal:5432/aicte_icms"
   ```
2. Run database migrations:
   ```bash
   alembic upgrade head
   ```
3. Run with Gunicorn/Uvicorn workers behind an Nginx reverse proxy with SSL/TLS termination:
   ```bash
   gunicorn backend.app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
   ```
4. Build the frontend production bundle:
   ```bash
   cd frontend
   npm run build
   ```
   Serve the `frontend/dist/` directory via Nginx or CDN.

---

## 14. Known Prototype Limitations

- **Email/SMS Notifications:** As a hackathon demonstration prototype without external SMS/SMTP gateway subscriptions, notification delivery operates via an in-application Notification Center with persistent read/unread states.
- **Storage Backend:** Uploaded supporting documents are stored on the secure local filesystem; in production, an S3-compatible object store (e.g. MinIO or AWS S3) is recommended.
- **Single-Node Scheduler:** APScheduler runs within the FastAPI process; in distributed production, a distributed broker like Celery or Redis Queue would manage background tasks.

---

## 15. Summary of Compliance with SIH PS-264 Requirements

| PS-264 Requirement | Status | Implementation Verification |
| :--- | :---: | :--- |
| **Centralized Institution Registry** | ✅ COMPLETED | Full registry with AICTE Permanent ID uniqueness constraint and search. |
| **Consolidated 360° Institution Profile** | ✅ COMPLETED | Multi-tab profile aggregating complaints, cases, bureaus, and timeline. |
| **Complaint vs. Case Separation** | ✅ COMPLETED | Distinct database entities and separate interfaces for grievances and cases. |
| **Deterministic Overlap Detection** | ✅ COMPLETED | Deterministic engine with exact `POTENTIAL OVERLAPPING CASES – COORDINATION REQUIRED` banner. |
| **Non-Destructive Tracking** | ✅ COMPLETED | Zero automatic merging. Human-in-the-loop coordination reviews. |
| **Government Administrative UI** | ✅ COMPLETED | Clean palette (`#17365D`, `#102A43`), high contrast, no flashy AI gimmicks. |
| **Real Database-Backed Dashboard** | ✅ COMPLETED | All 8 metric cards and 3 charts computed from relational SQL queries. |
| **Role-Based Access Control** | ✅ COMPLETED | 7 distinct tiers with backend boundary enforcement. |
| **Inter-Bureau Transfer Workflow** | ✅ COMPLETED | Complete transfer audit trail preserving origin bureau and reason. |
| **SLA & Deadline Monitoring** | ✅ COMPLETED | Configurable rules with `Deadline not configured` fallback. |
| **Multi-Format Export Engine** | ✅ COMPLETED | Server-side binary generation for CSV, Excel (`.xlsx`), and PDF. |
| **Audit Trail & History** | ✅ COMPLETED | Comprehensive chronological workflow and security audit logs. |
