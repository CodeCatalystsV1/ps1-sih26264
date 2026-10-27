"""
Unit Tests for Institution Matching Engine (Phase 3D)
AICTE Case360+ (SIH 26264)
"""

import pytest
from backend.app.ml.institution_matcher import (
    InstitutionMatcher,
    InstitutionCandidate,
    InstitutionMatchResult,
)


@pytest.fixture
def mock_institution_pool():
    return [
        {
            "id": 1,
            "permanent_id": "DEMO-AICTE-001",
            "institution_name": "Delhi Institute of Technology & Management",
        },
        {
            "id": 2,
            "permanent_id": "DEMO-AICTE-002",
            "institution_name": "Maharashtra College of Engineering & Research",
        },
        {
            "id": 3,
            "permanent_id": "DEMO-AICTE-003",
            "institution_name": "Karnataka Institute of Business Management",
        },
        {
            "id": 4,
            "permanent_id": "DEMO-AICTE-004",
            "institution_name": "Tamil Nadu Technical Academy",
        },
        {
            "id": 5,
            "permanent_id": "DEMO-AICTE-005",
            "institution_name": "Delhi Institute of Science & Technology",
        },
        {
            "id": 6,
            "permanent_id": "DEMO-AICTE-006",
            "institution_name": "National College of Engineering",
        },
        {
            "id": 7,
            "permanent_id": "DEMO-AICTE-007",
            "institution_name": "National Institute of Engineering",
        },
    ]


# 1. Exact verified Permanent ID match
def test_exact_permanent_id_match(mock_institution_pool):
    res = InstitutionMatcher.match(
        query_permanent_id="DEMO-AICTE-001",
        query_name=None,
        institutions_pool=mock_institution_pool,
    )
    assert res.matched is True
    assert res.institution_id == 1
    assert res.matching_method == "EXACT_PERMANENT_ID"
    assert res.confidence_band == "EXACT_VERIFIED_MATCH"
    assert res.score == 100.0
    assert res.requires_human_confirmation is False


# 2. Permanent ID normalization (case and spacing variations)
def test_permanent_id_normalization_variations(mock_institution_pool):
    res = InstitutionMatcher.match(
        query_permanent_id="  demo - aicte - 002  ",
        query_name=None,
        institutions_pool=mock_institution_pool,
    )
    assert res.matched is True
    assert res.institution_id == 2
    assert res.permanent_id == "DEMO-AICTE-002"


# 3. Missing Permanent ID falls back to RapidFuzz name matching
def test_name_fallback_when_no_permanent_id(mock_institution_pool):
    res = InstitutionMatcher.match(
        query_permanent_id=None,
        query_name="Delhi Institute of Technology & Management",
        institutions_pool=mock_institution_pool,
    )
    assert res.matched is True
    assert res.institution_id == 1
    assert res.matching_method == "FUZZY_NAME_MATCH"
    assert res.score >= 95.0


# 4. Institution abbreviations normalization (INST, TECH, MGMT)
def test_abbreviation_expansion_and_matching(mock_institution_pool):
    res = InstitutionMatcher.match(
        query_permanent_id=None,
        query_name="Delhi Inst. of Tech. & Mgmt.",
        institutions_pool=mock_institution_pool,
    )
    assert res.matched is True
    assert res.institution_id == 1
    assert res.score >= 82.0


# 5. Word order variations handled by token sort
def test_word_order_variations(mock_institution_pool):
    res = InstitutionMatcher.match(
        query_permanent_id=None,
        query_name="Technology & Management Delhi Institute",
        institutions_pool=mock_institution_pool,
    )
    assert res.matched is True
    assert res.institution_id == 1
    assert res.score >= 82.0


# 6. Ambiguity protection when multiple candidates have close scores
def test_ambiguity_protection_triggers_confirmation(mock_institution_pool):
    # 'National College of Engineering' (id=6) vs 'National Institute of Engineering' (id=7)
    res = InstitutionMatcher.match(
        query_permanent_id=None,
        query_name="National Engineering",
        institutions_pool=mock_institution_pool,
    )
    # Because college of engg and institute of engg are close scores, requires human confirmation
    assert res.requires_human_confirmation is True
    assert res.confidence_band == "AMBIGUOUS_NAME_CANDIDATE"
    assert "Ambiguity detected" in res.reason


# 7. Conflicting Permanent IDs rejected even if name matches
def test_conflicting_permanent_id_rejected(mock_institution_pool):
    # Query has PID for #2, but name for #1
    res = InstitutionMatcher.match(
        query_permanent_id="DEMO-AICTE-099",  # Unregistered / differing ID
        query_name="Delhi Institute of Technology & Management",
        institutions_pool=mock_institution_pool,
    )
    assert res.matched is False
    assert res.matching_method == "CONFLICTING_IDENTIFIERS"
    assert res.requires_human_confirmation is True


# 8. Unknown institution name scoring below minimum threshold
def test_unknown_institution_no_reliable_match(mock_institution_pool):
    res = InstitutionMatcher.match(
        query_permanent_id=None,
        query_name="Totally Unrelated Himalayan Culinary Academy",
        institutions_pool=mock_institution_pool,
    )
    assert res.matched is False
    assert res.confidence_band == "NO_RELIABLE_MATCH"
    assert res.institution_id is None


# 9. Empty or whitespace-only input
def test_empty_or_whitespace_input(mock_institution_pool):
    res = InstitutionMatcher.match(
        query_permanent_id="   ",
        query_name="",
        institutions_pool=mock_institution_pool,
    )
    assert res.matched is False
    assert res.matching_method == "NONE"
    assert res.institution_id is None
