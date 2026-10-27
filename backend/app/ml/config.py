"""
AICTE Case360+ — Machine Learning Configuration
Phase 3: AI Complaint Relationship Intelligence (SIH 26264)
"""

from typing import Final


class MLConfig:
    """
    Centralized configuration for Case360+ ML Engine.
    All thresholds are provisional development baselines; final calibration
    will be conducted in Batch 2 against the benchmark evaluation dataset.
    """

    # Model specifications
    MODEL_NAME: Final[str] = "intfloat/multilingual-e5-small"
    MODEL_REVISION: Final[str] = "main"
    EMBEDDING_DIM: Final[int] = 384
    DEVICE: Final[str] = "cpu"
    MAX_SEQ_LENGTH: Final[int] = 512

    # E5-small Input Prefixes
    QUERY_PREFIX: Final[str] = "query: "
    PASSAGE_PREFIX: Final[str] = "passage: "

    # RapidFuzz Institution Name Matching Thresholds (0.0 - 100.0)
    EXACT_NAME_THRESHOLD: Final[float] = 95.0
    STRONG_NAME_THRESHOLD: Final[float] = 82.0
    AMBIGUOUS_NAME_THRESHOLD: Final[float] = 70.0
    AMBIGUITY_DELTA_THRESHOLD: Final[float] = 5.0  # If top 2 candidates are within 5 points

    # Provisional Semantic Similarity Thresholds (Cosine score 0.0 - 1.0)
    # NOTE: These are uncalibrated development thresholds for Phase 3 Batch 1
    SIMILARITY_HIGH: Final[float] = 0.85
    SIMILARITY_MEDIUM: Final[float] = 0.75
    SIMILARITY_LOW: Final[float] = 0.65

    # Embedding cache size (in-memory LRU)
    EMBEDDING_CACHE_SIZE: Final[int] = 2048

    # Candidate search defaults
    DEFAULT_TOP_K: Final[int] = 10
    MAX_CANDIDATE_SEARCH_LIMIT: Final[int] = 100
