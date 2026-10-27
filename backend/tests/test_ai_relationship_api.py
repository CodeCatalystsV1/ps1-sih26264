"""
AICTE Case360+ — Automated Tests for AI Complaint Relationship API & Review Workflow
Phase 3H: Testing API endpoints, real E5-small inference, persistence, officer review, and audit trail.
"""

import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.core.database import SessionLocal
from backend.app.models.entities import Complaint, AIRelationshipSuggestion, AuditLog

client = TestClient(app)


def get_auth_token(username: str, password: str) -> str:
    res = client.post("/api/auth/login", json={"username_or_email": username, "password": password})
    assert res.status_code == 200, f"Login failed for {username}: {res.text}"
    return res.json()["access_token"]


def test_ai_stats_unauthorized():
    res = client.get("/api/ai/stats")
    assert res.status_code == 401


def test_ai_stats_authorized():
    token = get_auth_token("admin", "Admin@123")
    res = client.get("/api/ai/stats", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert "pending_suggestions_count" in data
    assert "approved_links_count" in data
    assert "dismissed_suggestions_count" in data
    assert "model_identifier" in data
    assert data["model_identifier"] == "intfloat/multilingual-e5-small"


def test_match_complaint_invalid_id():
    token = get_auth_token("admin", "Admin@123")
    res = client.post(
        "/api/ai/match-complaint",
        headers={"Authorization": f"Bearer {token}"},
        json={"complaint_id": 999999, "top_k": 3},
    )
    assert res.status_code == 404


def test_match_complaint_real_inference_and_persistence():
    token = get_auth_token("pgrc_officer", "Pgrc@123")
    db = SessionLocal()
    first_complaint = db.query(Complaint).first()
    db.close()

    assert first_complaint is not None, "No complaints found in test database"

    res = client.post(
        "/api/ai/match-complaint",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "complaint_id": first_complaint.id,
            "top_k": 5,
            "min_similarity": 0.50,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["source_complaint_id"] == first_complaint.id
    assert "total_candidates_analyzed" in data
    assert "suggestions" in data
    assert isinstance(data["suggestions"], list)

    if len(data["suggestions"]) > 0:
        first_sug = data["suggestions"][0]
        assert "semantic_similarity" in first_sug
        assert 0.0 <= first_sug["semantic_similarity"] <= 1.0
        assert "match_classification" in first_sug
        assert first_sug["match_classification"] in (
            "POSSIBLY_RELATED", "NEEDS_REVIEW", "DIFFERENT_ISSUE", "INSTITUTION_UNCONFIRMED"
        )
        assert "explanation" in first_sug
        assert isinstance(first_sug["explanation"], list)


def test_list_ai_relationships():
    token = get_auth_token("admin", "Admin@123")
    res = client.get("/api/ai/relationships", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_officer_review_requires_notes():
    token = get_auth_token("pgrc_officer", "Pgrc@123")
    db = SessionLocal()
    sug = db.query(AIRelationshipSuggestion).first()
    db.close()

    if not sug:
        # Trigger matching first to ensure at least one suggestion
        test_match_complaint_real_inference_and_persistence()
        db = SessionLocal()
        sug = db.query(AIRelationshipSuggestion).first()
        db.close()

    assert sug is not None

    res = client.post(
        f"/api/ai/relationships/{sug.id}/review",
        headers={"Authorization": f"Bearer {token}"},
        json={"decision": "APPROVE_LINK", "review_notes": ""},  # Empty notes
    )
    assert res.status_code == 400
    assert "notes are mandatory" in res.json()["detail"].lower()


def test_officer_review_approve_and_audit():
    token = get_auth_token("pgrc_officer", "Pgrc@123")
    db = SessionLocal()
    sug = db.query(AIRelationshipSuggestion).first()
    db.close()
    assert sug is not None

    notes_text = "Verified identical exam fee overcharge grievance across bureaus."
    res = client.post(
        f"/api/ai/relationships/{sug.id}/review",
        headers={"Authorization": f"Bearer {token}"},
        json={"decision": "APPROVE_LINK", "review_notes": notes_text},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "APPROVED_LINK"
    assert data["review_notes"] == notes_text
    assert data["reviewed_by_name"] is not None

    # Verify AuditLog entry was written
    db = SessionLocal()
    audit_entry = (
        db.query(AuditLog)
        .filter(
            AuditLog.record_type == "AIRelationshipSuggestion",
            AuditLog.record_id == str(sug.id),
            AuditLog.action_type == "AI_RELATIONSHIP_APPROVE_LINK",
        )
        .first()
    )
    db.close()
    assert audit_entry is not None
    assert "APPROVED_LINK" in audit_entry.metadata_json


def test_officer_review_dismiss():
    token = get_auth_token("pgrc_officer", "Pgrc@123")
    db = SessionLocal()
    sug = db.query(AIRelationshipSuggestion).first()
    db.close()
    assert sug is not None

    dismiss_notes = "Dismissed: Complaints describe distinct semester fee categories."
    res = client.post(
        f"/api/ai/relationships/{sug.id}/review",
        headers={"Authorization": f"Bearer {token}"},
        json={"decision": "DISMISS", "review_notes": dismiss_notes},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "DISMISSED"
    assert data["review_notes"] == dismiss_notes
