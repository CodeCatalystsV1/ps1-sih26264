"""
AICTE Case360+ — Complaint Matching Service
Phase 3F: Business Service Orchestrating Hybrid ML Relationship Pipeline
"""

import json
import hashlib
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_

from ..models.entities import (
    Complaint, Institution, ComplaintCategory, Bureau,
    AIRelationshipSuggestion, ComplaintEmbedding
)
from ..ml.config import MLConfig
from ..ml.institution_matcher import InstitutionMatcher, InstitutionMatchResult
from ..ml.text_preprocessor import ComplaintTextPreprocessor
from ..ml.embedding_service import EmbeddingService
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

    @classmethod
    def ensure_complaint_embedding(cls, db: Session, complaint: Complaint) -> ComplaintEmbedding:
        """
        Retrieves or generates normalized 384-dimensional vector embedding for a complaint.
        Validates content hash so updated texts trigger re-embedding.
        """
        cat_name = complaint.category.name if complaint.category else None
        clean_text = ComplaintTextPreprocessor.prepare_complaint_text(
            title=complaint.title,
            description=complaint.description,
            category_name=cat_name,
        )
        content_hash = hashlib.sha256(
            f"{MLConfig.MODEL_NAME}:{MLConfig.MODEL_REVISION}:{clean_text}".encode("utf-8")
        ).hexdigest()

        existing = (
            db.query(ComplaintEmbedding)
            .filter(ComplaintEmbedding.complaint_id == complaint.id)
            .first()
        )

        if existing and existing.content_hash == content_hash:
            return existing

        # Compute new vector
        vector = EmbeddingService.encode_complaint(clean_text, role="passage")
        vector_json = json.dumps(vector.tolist())

        now = datetime.now(timezone.utc)
        if existing:
            existing.embedding_blob = vector_json
            existing.content_hash = content_hash
            existing.model_identifier = MLConfig.MODEL_NAME
            existing.model_revision = MLConfig.MODEL_REVISION
            existing.generated_at = now
            db.commit()
            db.refresh(existing)
            return existing
        else:
            new_emb = ComplaintEmbedding(
                complaint_id=complaint.id,
                embedding_blob=vector_json,
                model_identifier=MLConfig.MODEL_NAME,
                model_revision=MLConfig.MODEL_REVISION,
                preprocessing_version="v1.0",
                content_hash=content_hash,
                generated_at=now,
            )
            db.add(new_emb)
            db.commit()
            db.refresh(new_emb)
            return new_emb

    @classmethod
    def match_and_persist_suggestions(
        cls,
        db: Session,
        source_complaint_id: int,
        top_k: int = MLConfig.DEFAULT_TOP_K,
        min_similarity: float = 0.65,
        same_institution_only: bool = False,
    ) -> List[AIRelationshipSuggestion]:
        """
        Runs ML matching pipeline for the complaint, persists/updates suggestions,
        and returns the persisted suggestion database records.
        Preserves existing approved/dismissed review decisions.
        """
        source = db.query(Complaint).filter(Complaint.id == source_complaint_id).first()
        if not source:
            return []

        # Ensure source embedding exists
        cls.ensure_complaint_embedding(db, source)

        # Get hybrid recommendations
        recommendations = cls.find_related_complaints_for_complaint(
            db=db,
            source_complaint_id=source_complaint_id,
            top_k=top_k,
            same_institution_only=same_institution_only,
        )

        persisted: List[AIRelationshipSuggestion] = []
        now = datetime.now(timezone.utc)

        for rec in recommendations:
            if rec.semantic_similarity < min_similarity:
                continue

            # Ensure candidate embedding is also saved
            cand_comp = db.query(Complaint).filter(Complaint.id == rec.candidate_complaint_id).first()
            if cand_comp:
                cls.ensure_complaint_embedding(db, cand_comp)

            # Unordered pair query to prevent duplication
            existing_sug = (
                db.query(AIRelationshipSuggestion)
                .filter(
                    or_(
                        (AIRelationshipSuggestion.source_complaint_id == rec.source_complaint_id)
                        & (AIRelationshipSuggestion.candidate_complaint_id == rec.candidate_complaint_id),
                        (AIRelationshipSuggestion.source_complaint_id == rec.candidate_complaint_id)
                        & (AIRelationshipSuggestion.candidate_complaint_id == rec.source_complaint_id),
                    )
                )
                .first()
            )

            explanation_json = json.dumps(rec.explanation)

            if existing_sug:
                # If still pending review, update similarity, classification, and explanation
                if existing_sug.status == "PENDING_REVIEW":
                    existing_sug.semantic_similarity = rec.semantic_similarity
                    existing_sug.match_classification = rec.relationship_classification
                    existing_sug.explanation = explanation_json
                    existing_sug.updated_at = now
                    db.commit()
                    db.refresh(existing_sug)
                persisted.append(existing_sug)
            else:
                new_sug = AIRelationshipSuggestion(
                    source_complaint_id=rec.source_complaint_id,
                    candidate_complaint_id=rec.candidate_complaint_id,
                    institution_id=rec.institution_match.get("institution_id") or source.institution_id,
                    semantic_similarity=rec.semantic_similarity,
                    match_classification=rec.relationship_classification,
                    explanation=explanation_json,
                    model_identifier=MLConfig.MODEL_NAME,
                    model_revision=MLConfig.MODEL_REVISION,
                    status="PENDING_REVIEW",
                    created_at=now,
                    updated_at=now,
                )
                db.add(new_sug)
                db.commit()
                db.refresh(new_sug)
                persisted.append(new_sug)

        return persisted

