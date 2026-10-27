"""
AICTE Case360+ — Institution Matching Engine
Phase 3D: Deterministic Permanent ID and RapidFuzz Fuzzy Name Matching
"""

import re
from dataclasses import dataclass, field
from typing import List, Optional, Tuple, Dict, Any
from rapidfuzz import fuzz

from .config import MLConfig


@dataclass
class InstitutionCandidate:
    institution_id: int
    institution_name: str
    permanent_id: str
    fuzzy_score: float
    confidence_band: str  # EXACT_VERIFIED_MATCH, STRONG_NAME_CANDIDATE, AMBIGUOUS_NAME_CANDIDATE, NO_RELIABLE_MATCH
    matching_method: str  # EXACT_PERMANENT_ID, FUZZY_NAME_MATCH, NONE
    reason: str
    requires_human_confirmation: bool = False


@dataclass
class InstitutionMatchResult:
    matched: bool
    institution_id: Optional[int]
    permanent_id: Optional[str]
    institution_name: Optional[str]
    confidence_band: str
    matching_method: str
    score: float
    reason: str
    candidates: List[InstitutionCandidate] = field(default_factory=list)
    requires_human_confirmation: bool = False


class InstitutionMatcher:
    """
    Two-stage institution resolution engine:
    1. Exact AICTE Permanent ID match with normalization.
    2. RapidFuzz multi-metric name comparison with ambiguity detection.
    """

    # Common Indian educational abbreviations mapping for canonical normalization
    ABBREVIATION_MAP: Dict[str, str] = {
        "INST": "INSTITUTE",
        "INST.": "INSTITUTE",
        "INSTN": "INSTITUTION",
        "TECH": "TECHNOLOGY",
        "TECH.": "TECHNOLOGY",
        "MGMT": "MANAGEMENT",
        "MGMT.": "MANAGEMENT",
        "COLL": "COLLEGE",
        "COLL.": "COLLEGE",
        "ENGG": "ENGINEERING",
        "ENGG.": "ENGINEERING",
        "ENG": "ENGINEERING",
        "UNIV": "UNIVERSITY",
        "UNIV.": "UNIVERSITY",
        "POLY": "POLYTECHNIC",
        "POLY.": "POLYTECHNIC",
        "DEPT": "DEPARTMENT",
        "DEPT.": "DEPARTMENT",
        "SCI": "SCIENCE",
        "SCI.": "SCIENCE",
        "NATL": "NATIONAL",
        "NATL.": "NATIONAL",
        "GOVT": "GOVERNMENT",
        "GOVT.": "GOVERNMENT",
        "PVT": "PRIVATE",
        "PVT.": "PRIVATE",
    }

    @classmethod
    def normalize_permanent_id(cls, raw_id: Optional[str]) -> str:
        """
        Normalizes Permanent ID by stripping whitespace, uppercase,
        and standardizing separator formatting.
        e.g., ' demo - aicte - 001 ' -> 'DEMO-AICTE-001'
              '1-102938475' -> '1-102938475'
        """
        if not raw_id:
            return ""
        s = raw_id.strip().upper()
        # Remove internal multiple spaces around hyphens
        s = re.sub(r"\s*-\s*", "-", s)
        s = re.sub(r"\s+", "", s)
        return s

    @classmethod
    def normalize_name(cls, raw_name: Optional[str]) -> str:
        """
        Normalizes institution name for fuzzy comparison:
        - Uppercase
        - Remove punctuation and special symbols
        - Expand common Indian technical education abbreviations
        - Collapse whitespace
        """
        if not raw_name:
            return ""
        # Remove punctuation except whitespace
        clean = re.sub(r"[^\w\s]", " ", raw_name.upper())
        tokens = clean.split()
        normalized_tokens = [cls.ABBREVIATION_MAP.get(tok, tok) for tok in tokens]
        return " ".join(normalized_tokens)

    @classmethod
    def match_by_permanent_id(
        cls,
        query_permanent_id: str,
        institutions_pool: List[Dict[str, Any]],
    ) -> Optional[InstitutionMatchResult]:
        """
        Attempts exact verified Permanent ID lookup in the pool.
        Each institution dict in pool must have: 'id', 'permanent_id', 'institution_name'.
        """
        norm_query_id = cls.normalize_permanent_id(query_permanent_id)
        if not norm_query_id:
            return None

        for inst in institutions_pool:
            inst_pid = cls.normalize_permanent_id(inst.get("permanent_id", ""))
            if inst_pid and inst_pid == norm_query_id:
                candidate = InstitutionCandidate(
                    institution_id=inst["id"],
                    institution_name=inst["institution_name"],
                    permanent_id=inst.get("permanent_id", ""),
                    fuzzy_score=100.0,
                    confidence_band="EXACT_VERIFIED_MATCH",
                    matching_method="EXACT_PERMANENT_ID",
                    reason=f"Exact verified AICTE Permanent ID match ({norm_query_id}).",
                    requires_human_confirmation=False,
                )
                return InstitutionMatchResult(
                    matched=True,
                    institution_id=inst["id"],
                    permanent_id=inst.get("permanent_id", ""),
                    institution_name=inst["institution_name"],
                    confidence_band="EXACT_VERIFIED_MATCH",
                    matching_method="EXACT_PERMANENT_ID",
                    score=100.0,
                    reason=f"Exact verified AICTE Permanent ID match ({norm_query_id}).",
                    candidates=[candidate],
                    requires_human_confirmation=False,
                )
        return None

    @classmethod
    def match_by_name(
        cls,
        query_name: str,
        institutions_pool: List[Dict[str, Any]],
        top_k: int = 5,
    ) -> InstitutionMatchResult:
        """
        Performs RapidFuzz token matching against institution pool.
        Combines token_sort_ratio (60%) and token_set_ratio (40%) to handle
        word-order differences and campus/trust prefix variations.
        """
        norm_query = cls.normalize_name(query_name)
        if not norm_query:
            return InstitutionMatchResult(
                matched=False,
                institution_id=None,
                permanent_id=None,
                institution_name=None,
                confidence_band="NO_RELIABLE_MATCH",
                matching_method="NONE",
                score=0.0,
                reason="Institution query name is empty or contains no valid characters.",
                candidates=[],
                requires_human_confirmation=False,
            )

        scored_candidates: List[Tuple[float, Dict[str, Any]]] = []

        for inst in institutions_pool:
            target_norm = cls.normalize_name(inst.get("institution_name", ""))
            if not target_norm:
                continue

            sort_score = fuzz.token_sort_ratio(norm_query, target_norm)
            set_score = fuzz.token_set_ratio(norm_query, target_norm)
            ratio_score = fuzz.ratio(norm_query, target_norm)

            # Combined weighted score favoring token arrangement while rewarding exact containment
            final_score = (sort_score * 0.50) + (set_score * 0.30) + (ratio_score * 0.20)
            scored_candidates.append((final_score, inst))

        # Sort descending by score
        scored_candidates.sort(key=lambda x: x[0], reverse=True)

        candidates: List[InstitutionCandidate] = []
        for score, inst in scored_candidates[:top_k]:
            if score >= MLConfig.EXACT_NAME_THRESHOLD:
                band = "EXACT_VERIFIED_MATCH"
            elif score >= MLConfig.STRONG_NAME_THRESHOLD:
                band = "STRONG_NAME_CANDIDATE"
            elif score >= MLConfig.AMBIGUOUS_NAME_THRESHOLD:
                band = "AMBIGUOUS_NAME_CANDIDATE"
            else:
                band = "NO_RELIABLE_MATCH"

            candidates.append(
                InstitutionCandidate(
                    institution_id=inst["id"],
                    institution_name=inst["institution_name"],
                    permanent_id=inst.get("permanent_id", ""),
                    fuzzy_score=round(score, 1),
                    confidence_band=band,
                    matching_method="FUZZY_NAME_MATCH",
                    reason=f"Fuzzy token similarity score: {score:.1f}%",
                    requires_human_confirmation=(band != "EXACT_VERIFIED_MATCH"),
                )
            )

        if not candidates or candidates[0].fuzzy_score < MLConfig.AMBIGUOUS_NAME_THRESHOLD:
            top_score = candidates[0].fuzzy_score if candidates else 0.0
            return InstitutionMatchResult(
                matched=False,
                institution_id=None,
                permanent_id=None,
                institution_name=None,
                confidence_band="NO_RELIABLE_MATCH",
                matching_method="FUZZY_NAME_MATCH",
                score=top_score,
                reason=f"Top candidate score ({top_score:.1f}%) is below minimum threshold ({MLConfig.AMBIGUOUS_NAME_THRESHOLD}%).",
                candidates=candidates,
                requires_human_confirmation=False,
            )

        best = candidates[0]

        # Check Ambiguity Protection: If top 2 candidates are very close
        is_ambiguous = False
        if len(candidates) > 1:
            score_diff = best.fuzzy_score - candidates[1].fuzzy_score
            if score_diff < MLConfig.AMBIGUITY_DELTA_THRESHOLD and best.confidence_band != "EXACT_VERIFIED_MATCH":
                is_ambiguous = True

        if is_ambiguous:
            return InstitutionMatchResult(
                matched=False,  # Unconfirmed due to close multiple candidates
                institution_id=best.institution_id,
                permanent_id=best.permanent_id,
                institution_name=best.institution_name,
                confidence_band="AMBIGUOUS_NAME_CANDIDATE",
                matching_method="FUZZY_NAME_MATCH",
                score=best.fuzzy_score,
                reason=(
                    f"Ambiguity detected: '{best.institution_name}' ({best.fuzzy_score:.1f}%) and "
                    f"'{candidates[1].institution_name}' ({candidates[1].fuzzy_score:.1f}%) have similar names. "
                    "Human officer confirmation required."
                ),
                candidates=candidates,
                requires_human_confirmation=True,
            )

        matched_flag = best.confidence_band in ("EXACT_VERIFIED_MATCH", "STRONG_NAME_CANDIDATE")
        return InstitutionMatchResult(
            matched=matched_flag,
            institution_id=best.institution_id if matched_flag else None,
            permanent_id=best.permanent_id if matched_flag else None,
            institution_name=best.institution_name if matched_flag else None,
            confidence_band=best.confidence_band,
            matching_method="FUZZY_NAME_MATCH",
            score=best.fuzzy_score,
            reason=f"Fuzzy name match recommended: {best.confidence_band} ({best.fuzzy_score:.1f}%).",
            candidates=candidates,
            requires_human_confirmation=(best.confidence_band != "EXACT_VERIFIED_MATCH"),
        )

    @classmethod
    def match(
        cls,
        query_permanent_id: Optional[str],
        query_name: Optional[str],
        institutions_pool: List[Dict[str, Any]],
    ) -> InstitutionMatchResult:
        """
        Unified matching method:
        Tries Permanent ID first; falls back to fuzzy name matching if Permanent ID is missing.
        Rejects conflicting Permanent IDs.
        """
        if query_permanent_id:
            pid_result = cls.match_by_permanent_id(query_permanent_id, institutions_pool)
            if pid_result:
                return pid_result

        # If Permanent ID is provided but not found, check if query_name exists
        if query_name:
            name_result = cls.match_by_name(query_name, institutions_pool)
            # If query_permanent_id was provided but conflicted with matched candidate's ID
            if query_permanent_id and name_result.matched and name_result.permanent_id:
                norm_q = cls.normalize_permanent_id(query_permanent_id)
                norm_cand = cls.normalize_permanent_id(name_result.permanent_id)
                if norm_q != norm_cand:
                    return InstitutionMatchResult(
                        matched=False,
                        institution_id=None,
                        permanent_id=None,
                        institution_name=None,
                        confidence_band="NO_RELIABLE_MATCH",
                        matching_method="CONFLICTING_IDENTIFIERS",
                        score=name_result.score,
                        reason=(
                            f"Conflicting identifiers detected: Provided Permanent ID '{query_permanent_id}' "
                            f"conflicts with candidate Permanent ID '{name_result.permanent_id}'."
                        ),
                        candidates=name_result.candidates,
                        requires_human_confirmation=True,
                    )
            return name_result

        return InstitutionMatchResult(
            matched=False,
            institution_id=None,
            permanent_id=None,
            institution_name=None,
            confidence_band="NO_RELIABLE_MATCH",
            matching_method="NONE",
            score=0.0,
            reason="Neither Permanent ID nor Institution Name was provided.",
            candidates=[],
            requires_human_confirmation=False,
        )
