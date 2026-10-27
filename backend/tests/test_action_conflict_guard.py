import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)

def get_auth_token(username: str, password: str) -> str:
    res = client.post("/api/auth/login", json={"username_or_email": username, "password": password})
    assert res.status_code == 200, f"Login failed for {username}: {res.text}"
    return res.json()["access_token"]

# 1. Reject unauthorized action creation (e.g. Complainant role)
def test_reject_unauthorized_action_creation():
    token = get_auth_token("complainant_user", "Citizen@123")
    res = client.post(
        "/api/actions",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "case_id": 1,
            "action_type": "INSPECTION",
            "title": "Unauthorized Complainant Inspection Attempt",
            "description": "Complainant attempting to schedule regulatory inspection",
            "subject_category": "LAB_INFRASTRUCTURE"
        }
    )
    assert res.status_code == 403

# 2. Reject non-existent case
def test_reject_invalid_case():
    token = get_auth_token("admin", "Admin@123")
    res = client.post(
        "/api/actions",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "case_id": 999999,
            "action_type": "INSPECTION",
            "title": "Inspection on invalid case",
            "description": "Valid payload on missing case",
            "subject_category": "LAB_INFRASTRUCTURE"
        }
    )
    assert res.status_code == 404

# 3. Prevent officer from creating action for unrelated bureau case
def test_reject_action_creation_outside_bureau():
    # rb_officer belongs to RB (Bureau 2), Case 1 belongs to PGRC (Bureau 1)
    token = get_auth_token("rb_officer", "Rb@123")
    res = client.post(
        "/api/actions",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "case_id": 1, # PGRC Case
            "action_type": "DOCUMENT_REQUEST",
            "title": "Cross Bureau Trespass Document Request",
            "description": "RB officer attempting to create action under PGRC case",
            "subject_category": "ADMISSION_NORMS"
        }
    )
    assert res.status_code == 403

# 4. Detect same-institution cross-bureau duplicate inspection via validate endpoint
def test_detect_cross_bureau_duplicate_inspection_validation():
    # Case 1 is PGRC at DEMO-AICTE-001; Case 2 is RB at DEMO-AICTE-001 (already has scheduled inspection)
    token = get_auth_token("pgrc_officer", "Pgrc@123")
    now = datetime.now(timezone.utc)
    res = client.post(
        "/api/actions/validate",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "case_id": 1,
            "action_type": "INSPECTION",
            "title": "Testing PGRC Lab Apparatus Inspection",
            "description": "Checking lab equipment under complaint inquiry",
            "subject_category": "LAB_INFRASTRUCTURE",
            "scheduled_date": (now + timedelta(days=13)).isoformat()
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert data["has_conflicts"] is True
    assert data["conflict_count"] >= 1
    assert data["highest_severity"] == "HIGH"
    
    dup_conflict = next((c for c in data["conflicts"] if c["conflict_type"] == "DUPLICATE_INSPECTION"), None)
    assert dup_conflict is not None
    assert dup_conflict["is_cross_bureau"] is True
    assert "Regulation Bureau" in dup_conflict["explanation"]

# 5. Avoid false positive for unrelated subject category
def test_avoid_false_positive_for_unrelated_subject():
    token = get_auth_token("pgrc_officer", "Pgrc@123")
    res = client.post(
        "/api/actions/validate",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "case_id": 1,
            "action_type": "INSPECTION",
            "title": "Canteen Food Safety Inspection",
            "description": "Inspecting mess kitchen for food hygiene",
            "subject_category": "CANTEEN_HYGIENE", # Unrelated to LAB_INFRASTRUCTURE
            "scheduled_date": (datetime.now(timezone.utc) + timedelta(days=12)).isoformat()
        }
    )
    assert res.status_code == 200
    data = res.json()
    # Should not produce HIGH duplicate inspection warning
    high_conflict = next((c for c in data["conflicts"] if c["severity"] == "HIGH"), None)
    assert high_conflict is None

# 6. Ignore cancelled actions
def test_ignore_cancelled_actions_for_conflict():
    token = get_auth_token("pgrc_officer", "Pgrc@123")
    # In seeded data, act5 (FIRE_SAFETY) is CANCELLED at DEMO-AICTE-001
    res = client.post(
        "/api/actions/validate",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "case_id": 1,
            "action_type": "INSPECTION",
            "title": "New Fire Safety Inspection",
            "description": "Inspecting fire safety compliance extinguishers",
            "subject_category": "FIRE_SAFETY"
        }
    )
    assert res.status_code == 200
    data = res.json()
    # Cancelled action must NOT trigger an active conflict
    fire_conflict = next((c for c in data["conflicts"] if c["existing_subject_category"] == "FIRE_SAFETY"), None)
    assert fire_conflict is None

# 7. Action creation with Conflict Guard enforces PENDING_CONFLICT_REVIEW status
def test_action_creation_persists_conflict_and_sets_pending_review():
    token = get_auth_token("pgrc_officer", "Pgrc@123")
    now = datetime.now(timezone.utc)
    res = client.post(
        "/api/actions",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "case_id": 1,
            "action_type": "INSPECTION",
            "title": "On-Site Computer Lab Verification",
            "description": "Checking laboratory servers and networking equipment",
            "subject_category": "LAB_INFRASTRUCTURE",
            "scheduled_date": (now + timedelta(days=14)).isoformat()
        }
    )
    assert res.status_code == 201
    act = res.json()
    assert act["status"] == "PENDING_CONFLICT_REVIEW"
    assert act["active_conflicts_count"] >= 1
    action_id = act["id"]

    # Verify conflict appears in /api/actions/conflicts
    conf_res = client.get(f"/api/actions/conflicts?status=PENDING_REVIEW", headers={"Authorization": f"Bearer {token}"})
    assert conf_res.status_code == 200
    all_confs = conf_res.json()
    matching = [c for c in all_confs if c["proposed_action_id"] == action_id]
    assert len(matching) >= 1

# 8. Ordinary officer cannot authorize supervisor override without supervisor role
def test_ordinary_officer_cannot_override_conflict():
    token_pgrc = get_auth_token("pgrc_officer", "Pgrc@123")
    # Get a pending conflict
    confs = client.get("/api/actions/conflicts?status=PENDING_REVIEW", headers={"Authorization": f"Bearer {token_pgrc}"}).json()
    assert len(confs) >= 1
    conflict_id = confs[0]["id"]

    res = client.post(
        f"/api/actions/conflicts/{conflict_id}/resolve",
        headers={"Authorization": f"Bearer {token_pgrc}"},
        json={
            "resolution_type": "PROCEED_WITH_JUSTIFICATION",
            "resolution_notes": "Attempting override with officer credentials"
        }
    )
    assert res.status_code == 403
    assert "Supervisor-level privileges" in res.json()["detail"]

# 9. Supervisor override requires detailed justification (minimum 10 chars)
def test_supervisor_override_requires_justification():
    token_head = get_auth_token("bureau_head", "Head@123")
    confs = client.get("/api/actions/conflicts?status=PENDING_REVIEW", headers={"Authorization": f"Bearer {token_head}"}).json()
    assert len(confs) >= 1
    conflict_id = confs[0]["id"]

    # Too short justification
    res = client.post(
        f"/api/actions/conflicts/{conflict_id}/resolve",
        headers={"Authorization": f"Bearer {token_head}"},
        json={
            "resolution_type": "PROCEED_WITH_JUSTIFICATION",
            "resolution_notes": "Short"
        }
    )
    assert res.status_code == 400
    assert "minimum 10 characters" in res.json()["detail"]

# 10. Supervisor override successfully resolves conflict and updates action status
def test_supervisor_authorized_override_success():
    token_pgrc = get_auth_token("pgrc_officer", "Pgrc@123")
    token_head = get_auth_token("bureau_head", "Head@123")
    now = datetime.now(timezone.utc)

    # 1. PGRC officer proposes a fresh inspection that conflicts with RB
    fresh_act_res = client.post(
        "/api/actions",
        headers={"Authorization": f"Bearer {token_pgrc}"},
        json={
            "case_id": 1,
            "action_type": "INSPECTION",
            "title": "Dedicated Test Inspection for Supervisor Override",
            "description": "Checking apparatus under supervisory review",
            "subject_category": "LAB_INFRASTRUCTURE",
            "scheduled_date": (now + timedelta(days=12)).isoformat()
        }
    )
    assert fresh_act_res.status_code == 201
    fresh_act_id = fresh_act_res.json()["id"]

    # 2. Retrieve all conflicts specifically for this proposed action
    confs = client.get("/api/actions/conflicts?status=PENDING_REVIEW", headers={"Authorization": f"Bearer {token_head}"}).json()
    action_confs = [c for c in confs if c["proposed_action_id"] == fresh_act_id]
    assert len(action_confs) >= 1

    # 3. Resolve all conflicts with supervisor authorized override
    for c in action_confs:
        res = client.post(
            f"/api/actions/conflicts/{c['id']}/resolve",
            headers={"Authorization": f"Bearer {token_head}"},
            json={
                "resolution_type": "PROCEED_WITH_JUSTIFICATION",
                "resolution_notes": "Executive discretion exercised: inspection terms differ sufficiently from Regulation Bureau docket."
            }
        )
        assert res.status_code == 200
        resolved = res.json()
        assert resolved["status"] == "RESOLVED_AUTHORIZED_OVERRIDE"
        assert resolved["reviewed_by_name"] == "Dr. Vikramaditya Rao (Bureau Head)"

    # 4. Verify proposed action status was updated to APPROVED
    act_res = client.get(f"/api/actions/{fresh_act_id}", headers={"Authorization": f"Bearer {token_head}"})
    assert act_res.status_code == 200
    assert act_res.json()["status"] == "APPROVED"

# 11. Request Coordination updates conflict status to COORDINATION_REQUESTED
def test_request_coordination_updates_state():
    token_pgrc = get_auth_token("pgrc_officer", "Pgrc@123")
    confs = client.get("/api/actions/conflicts?status=PENDING_REVIEW", headers={"Authorization": f"Bearer {token_pgrc}"}).json()
    if confs:
        conflict_id = confs[0]["id"]
        res = client.post(
            f"/api/actions/conflicts/{conflict_id}/resolve",
            headers={"Authorization": f"Bearer {token_pgrc}"},
            json={
                "resolution_type": "REQUEST_COORDINATION",
                "resolution_notes": "Initiating joint committee alignment with Regulation Bureau desk."
            }
        )
        assert res.status_code == 200
        assert res.json()["status"] == "COORDINATION_REQUESTED"
