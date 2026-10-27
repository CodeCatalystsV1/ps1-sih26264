"""
AICTE Case360+ — Complaint Matching Service
Phase 3F: Business Service Orchestrating Hybrid ML Relationship Pipeline (SIH 26264)
"""

from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session, joinedload

from ..models.entities import Complaint, Institution, ComplaintCategory, Bureau
from ..ml.config import MLConfig
from ..ml.institution_matcher import InstitutionMatcher, InstitutionMatchResult
from ..ml.text_preprocessor import ComplaintTextPreprocessor
from ..ml.similarity_engine import SemanticSimilarityEngine
from ..ml.relationship_scorer import HybridRelationshipScorer, RelationshipRecommendation


class ComplaintMatchingService:
    """
    High-level business service connecting the database layer to the ML pipeline.
    Preserves existing complaint models and never modifies official complaint status.
    """

    @classmethod
    def resolve_institution(
        cls,
        db: Session,
        query_permanent_id: Optional[str] = None,
        query_name: Optional[str] = None,
    ) -> InstitutionMatchResult:
        """
        Loads registered institutions from database and executes two-stage matching.
        """
        institutions = db.query(Institution).filter(Institution.record_status == "ACTIVE").all()
        pool = [
            {
                "id": inst.id,
                "permanent_id": inst.permanent_id,
                "institution_name": inst.institution_name,
            }
            for inst in institutions
        ]

        return InstitutionMatcher.match(
            query_permanent_id=query_permanent_id,
            query_name=query_name,
            institutions_pool=pool,
        )

    @classmethod
    def _complaint_to_dict(cls, c: Complaint) -> Dict[str, Any]:
        """
        Converts SQLAlchemy Complaint entity into dict for ML pipeline.
        """
        cat_name = c.category.name if c.category else None
        cat_code = c.category.code if c.category else None
        bureau_code = c.assigned_bureau.code if c.assigned_bureau else None
        inst_pid = c.institution.permanent_id if c.institution else None
        inst_name = c.institution.institution_name if c.institution else None

        text = ComplaintTextPreprocessor.prepare_complaint_text(
            title=c.title,
            description=c.description,
            category_name=cat_name,
        )

        return {
            "id": c.id,
            "complaint_reference": c.complaint_reference,
            "title": c.title,
            "description": c.description,
            "text": text,
            "institution_id": c.institution_id,
            "institution_permanent_id": inst_pid,
            "institution_name": inst_name,
            "category_name": cat_name,
            "category_code": cat_code,
            "bureau_code": bureau_code,
            "status": c.status,
            "sensitivity_classification": c.sensitivity_classification,
        }

    @classmethod
    def find_related_complaints_for_complaint(
        cls,
        db: Session,
        source_complaint_id: int,
        top_k: int = MLConfig.DEFAULT_TOP_K,
        candidate_limit: int = MLConfig.MAX_CANDIDATE_SEARCH_LIMIT,
        same_institution_only: bool = False,
    ) -> List[RelationshipRecommendation]:
        """
        Identifies and ranks potentially related complaints across bureaus.
        """
        source = (
            db.query(Complaint)
            .options(
                joinedload(Complaint.institution),
                joinedload(Complaint.category),
                joinedload(Complaint.assigned_bureau),
            )
            .filter(Complaint.id == source_complaint_id)
            .first()
        )
        if not source:
            return []

        source_dict = cls._complaint_to_dict(source)

        # Build candidate query
        cand_query = (
            db.query(Complaint)
            .options(
                joinedload(Complaint.institution),
                joinedload(Complaint.category),
                joinedload(Complaint.assigned_bureau),
            )
            .filter(Complaint.id != source_complaint_id)
        )

        if same_institution_only:
            cand_query = cand_query.filter(Complaint.institution_id == source.institution_id)

        candidates_entities = cand_query.limit(candidate_limit).all()
        if not candidates_entities:
            return []

        candidates = [cls._complaint_to_dict(c) for c in candidates_entities]

        # Semantic ranking
        ranking_result = SemanticSimilarityEngine.rank_candidates(
            source_text=source_dict["text"],
            candidates=candidates,
            top_k=top_k,
            source_reference=source_dict["complaint_reference"],
        )

        # Candidate lookup map
        cand_map = {c["id"]: c for c in candidates}

        recommendations: List[RelationshipRecommendation] = []
        for match in ranking_result.ranked_matches:
            cand = cand_map.get(match.candidate_id)
            if not cand:
                continue

            # Institution match metadata
            is_same_inst = source_dict["institution_id"] == cand["institution_id"]
            inst_info = {
                "matched": is_same_inst,
                "method": "VERIFIED_PERMANENT_ID" if is_same_inst else "DIFFERENT_INSTITUTION",
                "institution_id": cand["institution_id"],
                "permanent_id": cand.get("institution_permanent_id"),
                "institution_name": cand.get("institution_name"),
                "requires_human_confirmation": False,
            }

            rec = HybridRelationshipScorer.score_relationship(
                source_complaint=source_dict,
                candidate_complaint=cand,
                semantic_similarity=match.similarity_score,
                institution_match_info=inst_info,
            )
            recommendations.append(rec)

        return recommendations

    @classmethod
    def compare_complaint_pair(
        cls,
        db: Session,
        complaint_id_1: int,
        complaint_id_2: int,
    ) -> Optional[RelationshipRecommendation]:
        """
        Direct pairwise evaluation between two complaints.
        """
        c1 = (
            db.query(Complaint)
            .options(
                joinedload(Complaint.institution),
                joinedload(Complaint.category),
                joinedload(Complaint.assigned_bureau),
            )
            .filter(Complaint.id == complaint_id_1)
            .first()
        )
        c2 = (
            db.query(Complaint)
            .options(
                joinedload(Complaint.institution),
                joinedload(Complaint.category),
                joinedload(Complaint.assigned_bureau),
            )
            .filter(Complaint.id == complaint_id_2)
            .first()
        )
        if not c1 or not c2:
            return None

        d1 = cls._complaint_to_dict(c1)
        d2 = cls._complaint_to_dict(c2)

        sim_score = SemanticSimilarityEngine.compute_pair_similarity(d1["text"], d2["text"])

        is_same_inst = d1["institution_id"] == d2["institution_id"]
        inst_info = {
            "matched": is_same_inst,
            "method": "VERIFIED_PERMANENT_ID" if is_same_inst else "DIFFERENT_INSTITUTION",
            "institution_id": d2["institution_id"],
            "permanent_id": d2.get("institution_permanent_id"),
            "institution_name": d2.get("institution_name"),
            "requires_human_confirmation": False,
        }

        return HybridRelationshipScorer.score_relationship(
            source_complaint=d1,
            candidate_complaint=d2,
            semantic_similarity=sim_score,
            institution_match_info=inst_info,
        )
