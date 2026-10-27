"""
Unit Tests for Hybrid Relationship Scorer (Phase 3F)
AICTE Case360+ (SIH 26264)
"""

import pytest
from backend.app.ml.relationship_scorer import (
    HybridRelationshipScorer,
    RelationshipRecommendation,
)


@pytest.fixture
def base_source_complaint():
    return {
        "id": 101,
        "complaint_reference": "CMP-2026-0101",
        "title": "Unauthorized Examination Fee",
        "description": "Students forced to pay Rs 5000 examination charges without receipt.",
        "institution_id": 1,
        "institution_permanent_id": "DEMO-AICTE-001",
        "category_code": "FEE_RELATED",
        "category_name": "Fee Related",
        "bureau_code": "PGRC",
        "status": "REGISTERED",
    }


# 1. Same institution + high semantic similarity -> POSSIBLY_RELATED
def test_same_institution_high_similarity(base_source_complaint):
    candidate = {
        "id": 201,
        "complaint_reference": "CMP-2026-0201",
        "title": "Illegal Exam Charges",
        "description": "Excess exam fee collected illegally.",
        "institution_id": 1,
        "institution_permanent_id": "DEMO-AICTE-001",
        "category_code": "FEE_RELATED",
        "bureau_code": "RB",
        "status": "REGISTERED",
    }
    inst_info = {
        "matched": True,
        "method": "EXACT_PERMANENT_ID",
        "permanent_id": "DEMO-AICTE-001",
        "requires_human_confirmation": False,
    }

    rec = HybridRelationshipScorer.score_relationship(
        source_complaint=base_source_complaint,
        candidate_complaint=candidate,
        semantic_similarity=0.88,
        institution_match_info=inst_info,
    )

    assert rec.relationship_classification == "POSSIBLY_RELATED"
    assert rec.bureau_relationship == "CROSS_BUREAU"
    assert rec.requires_human_review is True
    assert rec.suggested_action == "COORDINATE"
    assert any("verified AICTE institution" in e for e in rec.explanation)


# 2. Same institution + moderate similarity + compatible category -> POSSIBLY_RELATED
def test_same_institution_compatible_category(base_source_complaint):
    candidate = {
        "id": 202,
        "complaint_reference": "CMP-2026-0202",
        "title": "Capitation during admissions",
        "description": "Demanding cash for admission forms.",
        "institution_id": 1,
        "institution_permanent_id": "DEMO-AICTE-001",
        "category_code": "ADMISSION_NORMS",  # Compatible with FEE_RELATED
        "bureau_code": "PGRC",
        "status": "REGISTERED",
    }
    inst_info = {
        "matched": True,
        "method": "EXACT_PERMANENT_ID",
        "permanent_id": "DEMO-AICTE-001",
        "requires_human_confirmation": False,
    }

    rec = HybridRelationshipScorer.score_relationship(
        source_complaint=base_source_complaint,
        candidate_complaint=candidate,
        semantic_similarity=0.76,
        institution_match_info=inst_info,
    )

    assert rec.relationship_classification == "POSSIBLY_RELATED"
    assert rec.category_relationship == "COMPATIBLE_CATEGORY"
    assert rec.requires_human_review is True


# 3. Same institution + low similarity -> DIFFERENT_ISSUE
def test_same_institution_low_similarity(base_source_complaint):
    candidate = {
        "id": 203,
        "complaint_reference": "CMP-2026-0203",
        "title": "Computer Laboratory Network Outage",
        "description": "Ethernet cables and switches not functioning in IT lab.",
        "institution_id": 1,
        "institution_permanent_id": "DEMO-AICTE-001",
        "category_code": "LAB_INFRASTRUCTURE",
        "bureau_code": "RB",
        "status": "REGISTERED",
    }
    inst_info = {
        "matched": True,
        "method": "EXACT_PERMANENT_ID",
        "permanent_id": "DEMO-AICTE-001",
        "requires_human_confirmation": False,
    }

    rec = HybridRelationshipScorer.score_relationship(
        source_complaint=base_source_complaint,
        candidate_complaint=candidate,
        semantic_similarity=0.55,
        institution_match_info=inst_info,
    )

    assert rec.relationship_classification == "DIFFERENT_ISSUE"
    assert rec.suggested_action == "NO_ACTION"


# 4. Different verified institutions -> DIFFERENT_ISSUE even if similarity is high
def test_different_verified_institutions_not_related(base_source_complaint):
    candidate = {
        "id": 204,
        "complaint_reference": "CMP-2026-0204",
        "title": "Examination Fee Issue",
        "description": "Students charged extra examination fees.",
        "institution_id": 99,  # Different institution
        "institution_permanent_id": "DEMO-AICTE-099",
        "category_code": "FEE_RELATED",
        "bureau_code": "PGRC",
        "status": "REGISTERED",
    }
    inst_info = {
        "matched": False,
        "method": "DIFFERENT_INSTITUTION",
        "permanent_id": "DEMO-AICTE-099",
        "requires_human_confirmation": False,
    }

    rec = HybridRelationshipScorer.score_relationship(
        source_complaint=base_source_complaint,
        candidate_complaint=candidate,
        semantic_similarity=0.92,  # High text similarity across different colleges
        institution_match_info=inst_info,
    )

    # Must NOT be marked as POSSIBLY_RELATED for the same institution
    assert rec.relationship_classification == "DIFFERENT_ISSUE"
    assert rec.suggested_action == "NO_ACTION"
    assert any("different or unconfirmed" in e for e in rec.explanation)


# 5. Ambiguous institution identity -> INSTITUTION_UNCONFIRMED
def test_ambiguous_institution_unconfirmed(base_source_complaint):
    candidate = {
        "id": 205,
        "complaint_reference": "CMP-2026-0205",
        "title": "Semester Fee Demand",
        "description": "Excess caution money charged.",
        "institution_id": 2,
        "institution_permanent_id": "DEMO-AICTE-002",
        "category_code": "FEE_RELATED",
        "bureau_code": "PGRC",
        "status": "REGISTERED",
    }
    inst_info = {
        "matched": False,
        "method": "FUZZY_NAME_MATCH",
        "requires_human_confirmation": True,  # Ambiguity detected
    }

    rec = HybridRelationshipScorer.score_relationship(
        source_complaint=base_source_complaint,
        candidate_complaint=candidate,
        semantic_similarity=0.85,
        institution_match_info=inst_info,
    )

    assert rec.relationship_classification == "INSTITUTION_UNCONFIRMED"
    assert rec.suggested_action == "VERIFY_INSTITUTION"


# 6. Active vs Closed Lifecycle Context
def test_active_vs_historical_lifecycle(base_source_complaint):
    candidate = {
        "id": 206,
        "complaint_reference": "CMP-2026-0206",
        "title": "Past Caution Money Grievance",
        "description": "Fee resolved last year.",
        "institution_id": 1,
        "institution_permanent_id": "DEMO-AICTE-001",
        "category_code": "FEE_RELATED",
        "bureau_code": "PGRC",
        "status": "DISPOSED",  # Closed / Disposed
    }
    inst_info = {
        "matched": True,
        "method": "EXACT_PERMANENT_ID",
        "permanent_id": "DEMO-AICTE-001",
        "requires_human_confirmation": False,
    }

    rec = HybridRelationshipScorer.score_relationship(
        source_complaint=base_source_complaint,
        candidate_complaint=candidate,
        semantic_similarity=0.86,
        institution_match_info=inst_info,
    )

    assert rec.status_context == "ACTIVE_VS_HISTORICAL"
    assert any("Historical context" in e for e in rec.explanation)
