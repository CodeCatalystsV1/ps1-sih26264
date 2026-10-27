"""
AICTE Case360+ — Semantic Similarity Engine
Phase 3E: Cosine Distance Ranking and Vector Search
"""

from dataclasses import dataclass
from typing import List, Dict, Any, Optional
import numpy as np

from .config import MLConfig
from .embedding_service import EmbeddingService


@dataclass
class SemanticMatchItem:
    candidate_id: int
    complaint_reference: str
    similarity_score: float
    title: str
    category_name: Optional[str]
    bureau_code: Optional[str]
    status: str
    institution_id: int


@dataclass
class SemanticRankingResult:
    source_reference: Optional[str]
    total_candidates_compared: int
    ranked_matches: List[SemanticMatchItem]


class SemanticSimilarityEngine:
    """
    Ranks candidate complaints against a source complaint by cosine similarity
    computed over Multilingual E5-small embeddings.
    """

    @classmethod
    def rank_candidates(
        cls,
        source_text: str,
        candidates: List[Dict[str, Any]],
        top_k: int = MLConfig.DEFAULT_TOP_K,
        min_similarity_threshold: float = 0.0,
        source_reference: Optional[str] = None,
    ) -> SemanticRankingResult:
        """
        Calculates similarity between source_text (role='query') and candidate texts (role='passage').
        Candidates list must be dictionaries containing:
        - 'id': int
        - 'text': str (preprocessed complaint text)
        - 'complaint_reference': str
        - 'title': str
        - 'institution_id': int
        - 'category_name': Optional[str]
        - 'bureau_code': Optional[str]
        - 'status': str
        """
        if not candidates or not source_text.strip():
            return SemanticRankingResult(
                source_reference=source_reference,
                total_candidates_compared=len(candidates),
                ranked_matches=[],
            )

        # 1. Encode source text as query
        source_vec = EmbeddingService.encode_complaint(source_text, role="query")

        # 2. Extract candidate texts and encode batch as passage
        candidate_texts = [c.get("text", "") for c in candidates]
        candidate_vectors = EmbeddingService.encode_batch(candidate_texts, role="passage")

        # 3. Compute cosine similarities (dot product with normalized vectors)
        # source_vec: (384,), candidate_vectors: (N, 384) -> scores: (N,)
        if len(candidate_vectors) == 0:
            return SemanticRankingResult(
                source_reference=source_reference,
                total_candidates_compared=0,
                ranked_matches=[],
            )

        dot_scores = np.dot(candidate_vectors, source_vec)
        # Clip to [-1.0, 1.0]
        scores = np.clip(dot_scores, -1.0, 1.0)

        # 4. Assemble candidate items with scores
        scored_items: List[SemanticMatchItem] = []
        for i, cand in enumerate(candidates):
            sim_score = float(round(scores[i], 4))
            if sim_score >= min_similarity_threshold:
                scored_items.append(
                    SemanticMatchItem(
                        candidate_id=cand["id"],
                        complaint_reference=cand.get("complaint_reference", f"CMP-{cand['id']}"),
                        similarity_score=sim_score,
                        title=cand.get("title", ""),
                        category_name=cand.get("category_name"),
                        bureau_code=cand.get("bureau_code"),
                        status=cand.get("status", "REGISTERED"),
                        institution_id=cand["institution_id"],
                    )
                )

        # 5. Deterministic sorting: Descending by similarity_score, then ascending by candidate_id
        scored_items.sort(key=lambda item: (-item.similarity_score, item.candidate_id))

        return SemanticRankingResult(
            source_reference=source_reference,
            total_candidates_compared=len(candidates),
            ranked_matches=scored_items[:top_k],
        )

    @classmethod
    def compute_pair_similarity(cls, text_a: str, text_b: str) -> float:
        """
        Computes symmetric or query-passage similarity between two complaint texts.
        Uses query for text_a and passage for text_b.
        """
        if not text_a or not text_b:
            return 0.0
        vec_a = EmbeddingService.encode_complaint(text_a, role="query")
        vec_b = EmbeddingService.encode_complaint(text_b, role="passage")
        return round(EmbeddingService.cosine_similarity(vec_a, vec_b), 4)
