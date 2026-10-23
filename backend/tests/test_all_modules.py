import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.overlap_service import REQUIRED_OVERLAP_ALERT_MESSAGE

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "AICTE ICMS" in data["service"]

def test_auth_login_success_and_failure():
    # 1. Invalid credentials
    res_fail = client.post("/api/auth/login", json={
        "username_or_email": "admin",
        "password": "WrongPassword!999"
    })
    assert res_fail.status_code == 401

    # 2. Valid credentials (Admin seeded user)
    res_success = client.post("/api/auth/login", json={
        "username_or_email": "admin",
        "password": "Admin@123"
    })
    assert res_success.status_code == 200
    token_data = res_success.json()
    assert "access_token" in token_data
    assert token_data["user"]["username"] == "admin"

def test_institution_duplicate_permanent_id_rejected():
    login_res = client.post("/api/auth/login", json={
        "username_or_email": "admin",
        "password": "Admin@123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt to create an institution with duplicate Permanent ID "DEMO-AICTE-001"
    dup_res = client.post("/api/institutions", headers=headers, json={
        "permanent_id": "DEMO-AICTE-001",
        "institution_name": "Duplicate Institute Attempt",
        "institution_type": "Engineering & Technology",
        "address": "123 Random Road",
        "city": "Noida",
        "district": "Gautam Buddha Nagar",
        "state": "Uttar Pradesh",
        "region_id": 1,
        "postal_code": "201301"
    })
    assert dup_res.status_code == 400
    assert "already exists" in dup_res.json()["detail"]

def test_institution_search_and_profile():
    login_res = client.post("/api/auth/login", json={
        "username_or_email": "admin",
        "password": "Admin@123"
    })
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # Search by Permanent ID
    search_res = client.get("/api/institutions?search=DEMO-AICTE-001", headers=headers)
    assert search_res.status_code == 200
    data = search_res.json()
    assert len(data) >= 1
    inst = data[0]
    assert inst["permanent_id"] == "DEMO-AICTE-001"
    assert inst["active_cases"] >= 2 # Overlap exists!

    # Retrieve Consolidated Profile
    profile_res = client.get(f"/api/institutions/{inst['id']}", headers=headers)
    assert profile_res.status_code == 200
    profile = profile_res.json()
    assert profile["permanent_id"] == "DEMO-AICTE-001"
    assert len(profile["involved_bureaus"]) >= 2

def test_deterministic_overlap_detection():
    login_res = client.post("/api/auth/login", json={
        "username_or_email": "admin",
        "password": "Admin@123"
    })
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # Query Overlaps
    res = client.get("/api/overlaps", headers=headers)
    assert res.status_code == 200
    overlaps = res.json()
    assert len(overlaps) >= 1

    # Check Demo Institute A overlap details
    inst_a_overlap = next((o for o in overlaps if o["permanent_id"] == "DEMO-AICTE-001"), None)
    assert inst_a_overlap is not None
    assert inst_a_overlap["detection_type"] == "DETERMINISTIC_PERMANENT_ID"
    assert len(inst_a_overlap["involved_cases"]) >= 2
    assert len(inst_a_overlap["involved_bureaus"]) >= 2

    # Test coordination action: REVIEW and CONFIRM_RELATED
    review_res = client.post(
        f"/api/overlaps/{inst_a_overlap['id']}/review",
        headers=headers,
        json={
            "action_type": "REVIEW",
            "remarks": "Joint coordination initiated between PGRC and Regulation Bureau officers."
        }
    )
    assert review_res.status_code == 200
    updated = review_res.json()
    assert updated["relationship_state"] == "UNDER_REVIEW"

def test_case_status_transition_rules():
    login_res = client.post("/api/auth/login", json={
        "username_or_email": "pgrc_officer",
        "password": "Pgrc@123"
    })
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # Create a fresh case in "Received" state
    new_case_res = client.post("/api/cases", headers=headers, json={
        "title": "Fresh Test Case for Status Transitions",
        "institution_id": 1,
        "current_bureau_id": 1,
        "priority": "MEDIUM"
    })
    assert new_case_res.status_code == 201
    case_id = new_case_res.json()["id"]

    # Invalid transition directly to "Action Taken" from "Received"
    res_invalid = client.post(
        f"/api/cases/{case_id}/status",
        headers=headers,
        json={
            "new_status": "Action Taken",
            "remarks": "Invalid jump attempt"
        }
    )
    assert res_invalid.status_code == 400
    assert "Invalid transition" in res_invalid.json()["detail"]

    # Valid transition to "Acknowledged"
    res_valid = client.post(
        f"/api/cases/{case_id}/status",
        headers=headers,
        json={
            "new_status": "Acknowledged",
            "remarks": "Formal acknowledgment sent to complainant",
            "next_action": "Scrutiny of complaint merits"
        }
    )
    assert res_valid.status_code == 200
    assert res_valid.json()["status"] == "Acknowledged"

def test_inter_bureau_transfer_preserves_history():
    login_res = client.post("/api/auth/login", json={
        "username_or_email": "bureau_head",
        "password": "Head@123"
    })
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # Create a dedicated case in Bureau 1 (PGRC)
    new_case_res = client.post("/api/cases", headers=headers, json={
        "title": "Fresh Test Case for Inter-Bureau Transfer",
        "institution_id": 2,
        "current_bureau_id": 1,
        "priority": "HIGH"
    })
    assert new_case_res.status_code == 201
    case_id = new_case_res.json()["id"]

    # Transfer to Bureau 2 (RB)
    transfer_res = client.post(
        f"/api/cases/{case_id}/transfers",
        headers=headers,
        json={
            "to_bureau_id": 2,
            "transfer_reason": "Transferred to Regulation Bureau for statutory audit"
        }
    )
    assert transfer_res.status_code == 200
    t_data = transfer_res.json()
    assert t_data["to_bureau_name"] == "Regulation Bureau"
    assert "Regulation Bureau for statutory audit" in t_data["transfer_reason"]

    # Verify case detail now shows the transfer history without losing previous history
    case_detail_res = client.get(f"/api/cases/{case_id}", headers=headers)
    assert case_detail_res.status_code == 200
    detail = case_detail_res.json()
    assert len(detail["transfers"]) == 1
    assert detail["current_bureau_name"] == "Regulation Bureau"

def test_reports_and_exports():
    login_res = client.post("/api/auth/login", json={
        "username_or_email": "admin",
        "password": "Admin@123"
    })
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # Dashboard metrics
    dash_res = client.get("/api/reports/dashboard", headers=headers)
    assert dash_res.status_code == 200
    metrics = dash_res.json()
    assert metrics["total_complaints"] >= 2
    assert metrics["potential_overlaps"] >= 1

    # Bureau workload
    bw_res = client.get("/api/reports/bureau-workload", headers=headers)
    assert bw_res.status_code == 200
    assert len(bw_res.json()) >= 2

    # CSV Export
    csv_res = client.get("/api/reports/export?format=csv", headers=headers)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "Case Reference" in csv_res.text

    # Excel Export
    excel_res = client.get("/api/reports/export?format=excel", headers=headers)
    assert excel_res.status_code == 200
    assert len(excel_res.content) > 1000

    # PDF Export
    pdf_res = client.get("/api/reports/export?format=pdf", headers=headers)
    assert pdf_res.status_code == 200
    assert b"%PDF" in pdf_res.content[:10]

def test_unauthorized_complainant_cannot_access_audit_or_modify_cases():
    login_res = client.post("/api/auth/login", json={
        "username_or_email": "complainant_user",
        "password": "Citizen@123"
    })
    assert login_res.status_code == 200
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # Complainant attempts to view audit trail
    audit_res = client.get("/api/audit", headers=headers)
    assert audit_res.status_code == 403

    # Complainant attempts to change case status
    status_res = client.post(
        "/api/cases/1/status",
        headers=headers,
        json={"new_status": "Action Taken", "remarks": "Unauthorized attempt"}
    )
    assert status_res.status_code == 403

def test_cross_bureau_case_modification_forbidden():
    # RB officer belongs to Regulation Bureau (bureau 2)
    login_res = client.post("/api/auth/login", json={
        "username_or_email": "rb_officer",
        "password": "Rb@123"
    })
    assert login_res.status_code == 200
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # Find a case currently in PGRC (bureau 1)
    admin_login = client.post("/api/auth/login", json={"username_or_email": "admin", "password": "Admin@123"})
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}
    cases = client.get("/api/cases?bureau_id=1", headers=admin_headers).json()
    assert len(cases) > 0
    pgrc_case_id = cases[0]["id"]

    # RB officer attempts to update status of PGRC case -> 403 Forbidden
    res = client.post(
        f"/api/cases/{pgrc_case_id}/status",
        headers=headers,
        json={"new_status": "Acknowledged", "remarks": "Cross-bureau modification attempt"}
    )
    assert res.status_code == 403
    assert "outside your assigned Bureau" in res.json()["detail"]

def test_production_config_secret_validation():
    from backend.app.core.config import Settings
    import pytest

    # Insecure default secret in production raises RuntimeError
    with pytest.raises(RuntimeError) as exc_info:
        bad_settings = Settings(
            ENVIRONMENT="production",
            SECRET_KEY="aicte_icms_dev_secret_key_change_in_production_min_32_chars_2026"
        )
        bad_settings.validate_production_security()
    assert "CRITICAL SECURITY CONFIGURATION ERROR" in str(exc_info.value)

    # Valid secret in production passes
    good_settings = Settings(
        ENVIRONMENT="production",
        SECRET_KEY="a_very_secure_high_entropy_production_jwt_key_2026_xyz!"
    )
    good_settings.validate_production_security()

def test_institution_update_duplicate_permanent_id_rejected():
    login_res = client.post("/api/auth/login", json={"username_or_email": "admin", "password": "Admin@123"})
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # Attempt to update Institution 2's permanent ID to DEMO-AICTE-001 (which belongs to Institution 1)
    res = client.put(
        "/api/institutions/2",
        headers=headers,
        json={"permanent_id": "DEMO-AICTE-001"}
    )
    assert res.status_code == 400
    assert "already exists" in res.json()["detail"]

