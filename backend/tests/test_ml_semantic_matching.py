"""
Unit Tests for Semantic Similarity & Embedding Pipeline (Phase 3E)
AICTE Case360+ (SIH 26264)
"""

import numpy as np
import pytest
from backend.app.ml.text_preprocessor import ComplaintTextPreprocessor
from backend.app.ml.embedding_service import EmbeddingService
from backend.app.ml.similarity_engine import SemanticSimilarityEngine


# 1. Text preprocessor preserves negations and numbers
def test_text_preprocessor_preserves_semantics():
    raw_text = "Students were not allowed to sit for exams without paying extra Rs. 25,000 unapproved fees."
    cleaned = ComplaintTextPreprocessor.clean_text(raw_text)
    assert "not" in cleaned
    assert "without" in cleaned
    assert "25,000" in cleaned or "25000" in cleaned
    assert "unapproved" in cleaned


# 2. Text preprocessor formats category, title, description cleanly
def test_prepare_complaint_text_formatting():
    formatted = ComplaintTextPreprocessor.prepare_complaint_text(
        title="Illegal Fee Demand",
        description="Demand for caution money refund denied.",
        category_name="FEE_RELATED",
    )
    assert formatted.startswith("[FEE_RELATED]")
    assert "Illegal Fee Demand" in formatted
    assert "caution money refund denied" in formatted


# 3. Text preprocessor handles Unicode Tamil/regional script safely
def test_prepare_complaint_text_tamil():
    tamil_title = "தேர்வு கட்டணம் வசூல்"
    tamil_desc = "கூடுதல் கட்டணம் கேட்கப்படுகிறது."
    formatted = ComplaintTextPreprocessor.prepare_complaint_text(
        title=tamil_title,
        description=tamil_desc,
        category_name="கட்டணம்",
    )
    assert "[கட்டணம்]" in formatted
    assert "தேர்வு கட்டணம்" in formatted


# 4. Text preprocessor handles empty or None inputs without crashing
def test_prepare_complaint_text_empty():
    assert ComplaintTextPreprocessor.clean_text(None) == ""
    assert ComplaintTextPreprocessor.clean_text("   \n\t  ") == ""
    assert ComplaintTextPreprocessor.prepare_complaint_text(None, None, None) == ""


# 5. Embedding vector dimensionality and normalization
def test_embedding_vector_dimensions_and_norm():
    text = "Students forced to pay excessive exam fees."
    vec = EmbeddingService.encode_complaint(text, role="passage")
    assert isinstance(vec, np.ndarray)
    assert vec.shape == (384,)
    assert vec.dtype == np.float32
    norm = np.linalg.norm(vec)
    assert abs(norm - 1.0) < 1e-3  # Unit length vector


# 6. Empty text returns zero vector
def test_embedding_empty_text_zero_vector():
    vec = EmbeddingService.encode_complaint("", role="passage")
    assert vec.shape == (384,)
    assert np.all(vec == 0.0)


# 7. Embedding cache hit and cache clear
def test_embedding_cache_hit_and_clear():
    text = "Unique complaint text for cache validation."
    EmbeddingService.clear_cache()
    initial_size = EmbeddingService.get_cache_size()
    assert initial_size == 0

    # First call caches vector
    vec1 = EmbeddingService.encode_complaint(text, role="passage")
    assert EmbeddingService.get_cache_size() == 1

    # Second call retrieves from cache
    vec2 = EmbeddingService.encode_complaint(text, role="passage")
    assert np.array_equal(vec1, vec2)
    assert EmbeddingService.get_cache_size() == 1

    EmbeddingService.clear_cache()
    assert EmbeddingService.get_cache_size() == 0


# 8. Cosine similarity mathematical consistency
def test_cosine_similarity_math():
    v1 = np.array([1.0, 0.0, 0.0], dtype=np.float32)
    v2 = np.array([1.0, 0.0, 0.0], dtype=np.float32)
    v3 = np.array([0.0, 1.0, 0.0], dtype=np.float32)
    v_zero = np.array([0.0, 0.0, 0.0], dtype=np.float32)

    assert EmbeddingService.cosine_similarity(v1, v2) == 1.0
    assert EmbeddingService.cosine_similarity(v1, v3) == 0.0
    assert EmbeddingService.cosine_similarity(v1, v_zero) == 0.0


# 9. Semantic similarity ranking places related candidates higher
def test_semantic_ranking_order():
    src_text = "Unauthorized examination fee collection from engineering students."
    candidates = [
        {
            "id": 10,
            "complaint_reference": "CMP-0010",
            "text": "Inadequate library books and broken reading chairs.",
            "title": "Library Deficiencies",
            "institution_id": 1,
            "category_name": "INFRASTRUCTURE",
            "bureau_code": "RB",
            "status": "REGISTERED",
        },
        {
            "id": 20,
            "complaint_reference": "CMP-0020",
            "text": "Students forced to pay semester examination fee without receipt.",
            "title": "Semester Exam Fee Extortion",
            "institution_id": 1,
            "category_name": "FEE_RELATED",
            "bureau_code": "PGRC",
            "status": "REGISTERED",
        },
    ]

    ranking = SemanticSimilarityEngine.rank_candidates(
        source_text=src_text,
        candidates=candidates,
        top_k=5,
        source_reference="CMP-SOURCE",
    )

    assert len(ranking.ranked_matches) == 2
    # Candidate 20 (fees) must rank above candidate 10 (library)
    assert ranking.ranked_matches[0].candidate_id == 20
    assert ranking.ranked_matches[1].candidate_id == 10
    assert ranking.ranked_matches[0].similarity_score > ranking.ranked_matches[1].similarity_score


# 10. Semantic similarity handles zero candidates gracefully
def test_semantic_ranking_zero_candidates():
    ranking = SemanticSimilarityEngine.rank_candidates(
        source_text="Any text",
        candidates=[],
        top_k=5,
    )
    assert ranking.total_candidates_compared == 0
    assert len(ranking.ranked_matches) == 0
