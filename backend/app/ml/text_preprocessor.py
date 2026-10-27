"""
AICTE Case360+ — Complaint Text Preprocessing Engine
Phase 3E: Normalization, Multilingual Script Preservation, and Negation-Safe Cleaning
"""

import re
import unicodedata
from typing import Optional, Dict, Any


class ComplaintTextPreprocessor:
    """
    Careful preprocessing for multilingual complaint text.
    - Preserves negations (e.g. 'not', 'never', 'no', 'without', 'unauthorized')
    - Preserves numerical values (fees, amounts, percentages, years)
    - Preserves native non-Latin scripts (Tamil, Hindi, Devanagari, Telugu, etc.)
    - Performs NFKC Unicode normalization and control-character filtering
    - Implements bounded truncation to respect model context window
    """

    MAX_CHAR_LENGTH: int = 2000  # ~400-500 tokens for E5-small 512 token budget

    @classmethod
    def clean_text(cls, text: Optional[str]) -> str:
        """
        Cleans text while preserving semantics and scripts:
        1. Handle None / empty
        2. Unicode normalization (NFKC)
        3. Remove non-printable control characters (except standard whitespace)
        4. Normalize multiple spaces / newlines
        """
        if not text:
            return ""

        # Unicode NFKC normalization decomposes compatibility characters and composes canonical ones
        normalized = unicodedata.normalize("NFKC", str(text))

        # Remove control characters (category 'C' except newlines and tabs)
        cleaned_chars = []
        for ch in normalized:
            cat = unicodedata.category(ch)
            if cat.startswith("C") and ch not in ("\n", "\r", "\t"):
                continue
            cleaned_chars.append(ch)
        cleaned = "".join(cleaned_chars)

        # Collapse whitespace into single spaces
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        return cleaned

    @classmethod
    def prepare_complaint_text(
        cls,
        title: Optional[str],
        description: Optional[str],
        category_name: Optional[str] = None,
    ) -> str:
        """
        Combines title, category, and description into a structured text representation
        suitable for semantic embedding.
        Format: "[Category] Title. Description"
        """
        clean_title = cls.clean_text(title)
        clean_desc = cls.clean_text(description)
        clean_cat = cls.clean_text(category_name)

        parts = []
        if clean_cat:
            parts.append(f"[{clean_cat}]")
        if clean_title:
            parts.append(clean_title)
        if clean_desc and clean_desc != clean_title:
            parts.append(clean_desc)

        full_text = " ".join(parts).strip()

        # If after cleaning nothing remains, return a fallback empty string
        if not full_text:
            return ""

        # Safe bounded truncation at word boundary
        if len(full_text) > cls.MAX_CHAR_LENGTH:
            truncated = full_text[: cls.MAX_CHAR_LENGTH]
            # Try to cut at the last space to avoid breaking a word
            last_space = truncated.rfind(" ")
            if last_space > cls.MAX_CHAR_LENGTH // 2:
                truncated = truncated[:last_space]
            full_text = truncated + "..."

        return full_text

    @classmethod
    def prepare_from_entity(cls, complaint: Any) -> str:
        """
        Extracts and formats text directly from a Complaint SQLAlchemy or dict entity.
        """
        if isinstance(complaint, dict):
            title = complaint.get("title", "")
            description = complaint.get("description", "")
            category_name = complaint.get("category_name")
            if not category_name and isinstance(complaint.get("category"), dict):
                category_name = complaint["category"].get("name")
        else:
            title = getattr(complaint, "title", "")
            description = getattr(complaint, "description", "")
            category = getattr(complaint, "category", None)
            category_name = getattr(category, "name", None) if category else None

        return cls.prepare_complaint_text(title, description, category_name)
