"""
AICTE Case360+ — Hybrid Relationship Scorer
Phase 3F: Multi-Factor Decision Rules and Explainable AI Recommendations (SIH 26264)
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

from .config import MLConfig


@dataclass
class RelationshipRecommendation:
    source_complaint_id: int
    source_reference: str
    candidate_complaint_id: int
    candidate_reference: str
    semantic_similarity: float
    relationship_classification: str  # POSSIBLY_RELATED, NEEDS_REVIEW, DIFFERENT_ISSUE, INSTITUTION_UNCONFIRMED
    institution_match: Dict[str, Any]
    category_relationship: str  # SAME_CATEGORY, COMPATIBLE_CATEGORY, DIFFERENT_CATEGORY, UNKNOWN
    bureau_relationship: str    # CROSS_BUREAU, SAME_BUREAU, UNALLOCATED
    status_context: str         # BOTH_ACTIVE, ACTIVE_VS_HISTORICAL, BOTH_CLOSED
    explanation: List[str]
    requires_human_review: bool = True
    suggested_action: str = "OFFICER_REVIEW"  # COORDINATE, REVIEW_RECORDS, NO_ACTION


class HybridRelationshipScorer:
    """
    Combines semantic similarity from Multilingual E5-small with deterministic
    administrative criteria (verified institution identity, complaint categories,
    bureau assignment, and active status) to generate explainable relationship recommendations.
    """

    # Category compatibility graph for Indian regulatory grievance redressal
    COMPATIBLE_CATEGORIES: Dict[str, List[str]] = {
        "FEE_RELATED": ["FINANCIAL", "ADMISSION_NORMS", "CORRUPTION", "ACCOUNTS"],
        "ADMISSION_NORMS": ["FEE_RELATED", "AFFILIATION", "SEAT_ALLOCATION", "ELIGIBILITY"],
        "LAB_INFRASTRUCTURE": ["CAMPUS_FACILITIES", "SAFETY_NORMS", "EQUIPMENT", "LIBRARY"],
        "FACULTY_QUALIFICATION": ["STAFF_RECRUITMENT", "SALARY_PAYMENT", "TEACHING_STANDARDS"],
        "SALARY_PAYMENT": ["FACULTY_QUALIFICATION", "FINANCIAL", "CORRUPTION"],
        "RAGGING": ["DISCIPLINE", "STUDENT_SAFETY", "HARASSMENT", "HOSTEL"],
        "HARASSMENT": ["RAGGING", "DISCIPLINE", "INTERNAL_COMPLAINTS_COMMITTEE"],
    }

    @classmethod
    def evaluate_category_relationship(
        cls,
        cat_a: Optional[str],
        cat_b: Optional[str],
    ) -> str:
        """
        Determines whether two categories are identical, compatible, or distinct.
        """
        if not cat_a or not cat_b:
            return "UNKNOWN"
        code_a = cat_a.strip().upper().replace(" ", "_")
        code_b = cat_b.strip().upper().replace(" ", "_")

        if code_a == code_b:
            return "SAME_CATEGORY"

        # Check directional compatibility
        compat_a = cls.COMPATIBLE_CATEGORIES.get(code_a, [])
        compat_b = cls.COMPATIBLE_CATEGORIES.get(code_b, [])

        if code_b in compat_a or code_a in compat_b:
            return "COMPATIBLE_CATEGORY"

        return "DIFFERENT_CATEGORY"

    @classmethod
    def score_relationship(
        cls,
        source_complaint: Dict[str, Any],
        candidate_complaint: Dict[str, Any],
        semantic_similarity: float,
        institution_match_info: Dict[str, Any],
    ) -> RelationshipRecommendation:
        """
        Evaluates pair relationship combining semantic, institutional, and administrative factors.
        """
        src_id = source_complaint["id"]
        src_ref = source_complaint.get("complaint_reference", f"CMP-{src_id}")
        cand_id = candidate_complaint["id"]
        cand_ref = candidate_complaint.get("complaint_reference", f"CMP-{cand_id}")

        explanation: List[str] = []

        # -------------------------------------------------------------
        # Factor 1: Institution Match Context
        # -------------------------------------------------------------
        same_inst = institution_match_info.get("matched", False)
        inst_method = institution_match_info.get("method", "NONE")
        inst_name = institution_match_info.get("institution_name", "Specified Institution")
        inst_ambiguous = institution_match_info.get("requires_human_confirmation", False)

        if same_inst:
            if inst_method == "EXACT_PERMANENT_ID":
                explanation.append(
                    f"Both grievances pertain to the same verified AICTE institution ({institution_match_info.get('permanent_id')})."
                )
            else:
                explanation.append(
                    f"Institution name match suggested ({inst_name}) via fuzzy resolution."
                )
        else:
            explanation.append(
                "Complaints belong to different or unconfirmed institutions."
            )

        # -------------------------------------------------------------
        # Factor 2: Category Relationship
        # -------------------------------------------------------------
        src_cat = source_complaint.get("category_code") or source_complaint.get("category_name")
        cand_cat = candidate_complaint.get("category_code") or candidate_complaint.get("category_name")
        category_rel = cls.evaluate_category_relationship(src_cat, cand_cat)

        if category_rel == "SAME_CATEGORY":
            explanation.append(f"Identical regulatory subject category: '{src_cat}'.")
        elif category_rel == "COMPATIBLE_CATEGORY":
            explanation.append(
                f"Related regulatory categories: '{src_cat}' is functionally compatible with '{cand_cat}'."
            )
        elif category_rel == "DIFFERENT_CATEGORY":
            explanation.append(
                f"Differing administrative categories: '{src_cat}' vs '{cand_cat}'."
            )

        # -------------------------------------------------------------
        # Factor 3: Bureau Context
        # -------------------------------------------------------------
        src_bureau = source_complaint.get("bureau_code")
        cand_bureau = candidate_complaint.get("bureau_code")

        if src_bureau and cand_bureau:
            if src_bureau != cand_bureau:
                bureau_rel = "CROSS_BUREAU"
                explanation.append(
                    f"Cross-Bureau overlap: {src_bureau} docket compared against {cand_bureau} docket."
                )
            else:
                bureau_rel = "SAME_BUREAU"
                explanation.append(f"Internal bureau tracking: Both logged under {src_bureau}.")
        else:
            bureau_rel = "UNALLOCATED"

        # -------------------------------------------------------------
        # Factor 4: Case & Lifecycle Status
        # -------------------------------------------------------------
        src_status = source_complaint.get("status", "REGISTERED")
        cand_status = candidate_complaint.get("status", "REGISTERED")

        closed_statuses = {"DISPOSED", "REJECTED", "CLOSED"}
        src_is_active = src_status not in closed_statuses
        cand_is_active = cand_status not in closed_statuses

        if src_is_active and cand_is_active:
            status_context = "BOTH_ACTIVE"
            explanation.append("Both matters are actively open and pending resolution.")
        elif src_is_active != cand_is_active:
            status_context = "ACTIVE_VS_HISTORICAL"
            explanation.append("Historical context: One active matter compared against a closed precedent.")
        else:
            status_context = "BOTH_CLOSED"
            explanation.append("Both complaints have concluded administrative lifecycle.")

        # -------------------------------------------------------------
        # Factor 5: Semantic Narrative Correlation
        # -------------------------------------------------------------
        if semantic_similarity >= MLConfig.SIMILARITY_HIGH:
            explanation.append(
                f"High narrative semantic alignment (cosine score: {semantic_similarity:.2f})."
            )
        elif semantic_similarity >= MLConfig.SIMILARITY_MEDIUM:
            explanation.append(
                f"Moderate narrative correlation (cosine score: {semantic_similarity:.2f})."
            )
        else:
            explanation.append(
                f"Low narrative semantic correlation (cosine score: {semantic_similarity:.2f})."
            )

        # -------------------------------------------------------------
        # Classification Decision Logic
        # -------------------------------------------------------------
        if not same_inst:
            if inst_ambiguous:
                classification = "INSTITUTION_UNCONFIRMED"
                suggested_action = "VERIFY_INSTITUTION"
            else:
                classification = "DIFFERENT_ISSUE"
                suggested_action = "NO_ACTION"
        elif inst_ambiguous:
            classification = "INSTITUTION_UNCONFIRMED"
            suggested_action = "VERIFY_INSTITUTION"
        elif semantic_similarity >= MLConfig.SIMILARITY_HIGH:
            classification = "POSSIBLY_RELATED"
            suggested_action = "COORDINATE" if bureau_rel == "CROSS_BUREAU" else "OFFICER_REVIEW"
        elif semantic_similarity >= MLConfig.SIMILARITY_MEDIUM and category_rel in ("SAME_CATEGORY", "COMPATIBLE_CATEGORY"):
            classification = "POSSIBLY_RELATED"
            suggested_action = "COORDINATE" if bureau_rel == "CROSS_BUREAU" else "OFFICER_REVIEW"
        elif semantic_similarity >= MLConfig.SIMILARITY_MEDIUM:
            classification = "NEEDS_REVIEW"
            suggested_action = "OFFICER_REVIEW"
        elif semantic_similarity >= MLConfig.SIMILARITY_LOW and category_rel == "SAME_CATEGORY":
            classification = "NEEDS_REVIEW"
            suggested_action = "OFFICER_REVIEW"
        else:
            classification = "DIFFERENT_ISSUE"
            suggested_action = "NO_ACTION"

        return RelationshipRecommendation(
            source_complaint_id=src_id,
            source_reference=src_ref,
            candidate_complaint_id=cand_id,
            candidate_reference=cand_ref,
            semantic_similarity=semantic_similarity,
            relationship_classification=classification,
            institution_match=institution_match_info,
            category_relationship=category_rel,
            bureau_relationship=bureau_rel,
            status_context=status_context,
            explanation=explanation,
            requires_human_review=True,
            suggested_action=suggested_action,
        )
