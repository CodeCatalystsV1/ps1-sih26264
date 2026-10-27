"""
AICTE Case360+ — Seed Embeddings and SIH Demonstration Scenarios (Phase 3J / Milestone 3)
Computes real multilingual-e5-small embeddings for all database complaints
and seeds SIH Scenarios A, B, C, D, E, F.
"""

import sys
import os
from datetime import datetime, timezone

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

# Reconfigure stdout for Windows console Unicode
sys.stdout.reconfigure(encoding="utf-8")

from backend.app.core.database import SessionLocal
from backend.app.models.entities import (
    Complaint, Institution, ComplaintCategory, Bureau, User,
    AIRelationshipSuggestion, ComplaintEmbedding, AuditLog
)
from backend.app.services.complaint_matching_service import ComplaintMatchingService
from backend.app.ml.config import MLConfig


def seed_sih_demo_complaints(db):
    print("\n--- 1. Ensuring SIH Phase 3 Demonstration Complaints ---")
    inst_1 = db.query(Institution).filter(Institution.permanent_id == "DEMO-AICTE-001").first()
    inst_2 = db.query(Institution).filter(Institution.permanent_id == "DEMO-AICTE-002").first()
    bureau_pgrc = db.query(Bureau).filter(Bureau.code == "PGRC").first()
    bureau_rb = db.query(Bureau).filter(Bureau.code == "RB").first()
    bureau_ab = db.query(Bureau).filter(Bureau.code == "AB").first()
    cat_fee = db.query(ComplaintCategory).filter(ComplaintCategory.code == "CAT_FEE").first()
    cat_infra = db.query(ComplaintCategory).filter(ComplaintCategory.code == "CAT_INFRA").first()
    admin = db.query(User).filter(User.username == "admin").first()

    if not inst_1 or not inst_2 or not bureau_pgrc or not bureau_rb:
        print("Missing core institutions or bureaus. Run scripts/seed_demo_data.py first.")
        return

    now = datetime.now(timezone.utc)

    # Scenario A & D:
    # CMP-2026-AI01 (PGRC): "Students are being forced to pay additional unapproved examination fees before hall ticket issuance."
    # CMP-2026-AI02 (RB): "The institution is collecting unauthorized semester examination charges from students."
    # CMP-2026-AI03 (Tamil, PGRC): "மாணவர்களிடம் கூடுதல் தேர்வுக் கட்டணம் மற்றும் நடைமுறைத் தேர்வுக் கட்டணம் கட்டாயமாக வசூலிக்கப்படுகிறது."
    # CMP-2026-AI04 (Diff Institution, Inst 2): "The institution is collecting unauthorized semester examination charges from students."
    # CMP-2026-AI05 (Infra, Inst 1): "Laboratory computers are broken and chemical fume hoods lack exhaust ventilation."

    demo_complaints = [
        {
            "ref": "CMP-2026-AI01",
            "title": "Forced collection of unapproved examination fees before exam hall ticket distribution",
            "desc": "Students are being forced to pay additional unapproved examination fees of Rs 5000 before hall ticket issuance without receipts.",
            "inst_id": inst_1.id,
            "bureau_id": bureau_pgrc.id,
            "cat_id": cat_fee.id if cat_fee else 1,
            "complainant_type": "STUDENT",
        },
        {
            "ref": "CMP-2026-AI02",
            "title": "Unauthorized semester examination fee collection during scrutiny audit",
            "desc": "The institution is collecting unauthorized semester examination charges from final year engineering students exceeding approved university schedule.",
            "inst_id": inst_1.id,
            "bureau_id": bureau_rb.id,
            "cat_id": cat_fee.id if cat_fee else 1,
            "complainant_type": "STUDENT",
        },
        {
            "ref": "CMP-2026-AI03",
            "title": "மாணவர்களிடம் கூடுதல் தேர்வுக் கட்டணம் வசூலிப்பு",
            "desc": "மாணவர்களிடம் கூடுதல் தேர்வுக் கட்டணம் மற்றும் நடைமுறைத் தேர்வுக் கட்டணம் கட்டாயமாக வசூலிக்கப்படுகிறது. ரசீது தர மறுக்கிறார்கள்.",
            "inst_id": inst_1.id,
            "bureau_id": bureau_pgrc.id,
            "cat_id": cat_fee.id if cat_fee else 1,
            "complainant_type": "STUDENT",
        },
        {
            "ref": "CMP-2026-AI04",
            "title": "Unauthorized semester examination fee collection in regional campus",
            "desc": "The institution is collecting unauthorized semester examination charges from final year engineering students exceeding approved university schedule.",
            "inst_id": inst_2.id,  # DIFFERENT INSTITUTION
            "bureau_id": bureau_rb.id,
            "cat_id": cat_fee.id if cat_fee else 1,
            "complainant_type": "STUDENT",
        },
        {
            "ref": "CMP-2026-AI05",
            "title": "Deficient electronics laboratory equipment and missing fume hoods",
            "desc": "Laboratory computers are broken, oscilloscopes non-functional, and chemistry laboratory lacks safety equipment.",
            "inst_id": inst_1.id,  # SAME INSTITUTION, UNRELATED CATEGORY
            "bureau_id": bureau_ab.id if bureau_ab else bureau_pgrc.id,
            "cat_id": cat_infra.id if cat_infra else 2,
            "complainant_type": "FACULTY",
        },
    ]

    for d in demo_complaints:
        existing = db.query(Complaint).filter(Complaint.complaint_reference == d["ref"]).first()
        if not existing:
            c = Complaint(
                complaint_reference=d["ref"],
                title=d["title"],
                description=d["desc"],
                institution_id=d["inst_id"],
                category_id=d["cat_id"],
                assigned_bureau_id=d["bureau_id"],
                complainant_type=d["complainant_type"],
                source="PORTAL",
                status="REGISTERED",
                sensitivity_classification="NORMAL",
                received_at=now,
                created_at=now,
                updated_at=now,
                created_by=admin.id if admin else None,
            )
            db.add(c)
            db.flush()
            print(f"  [+] Created demo grievance: {d['ref']} - {d['title'][:50]}...")
        else:
            print(f"  [.] Grievance {d['ref']} already exists.")

    db.commit()


def compute_all_embeddings_and_match(db):
    print("\n--- 2. Generating & Persisting Normalized E5-Small Embeddings ---")
    complaints = db.query(Complaint).all()
    print(f"Found {len(complaints)} total complaints in database.")

    for idx, c in enumerate(complaints, 1):
        emb = ComplaintMatchingService.ensure_complaint_embedding(db, c)
        print(f"  [{idx}/{len(complaints)}] Embedding ensured for {c.complaint_reference} (dim=384, hash={emb.content_hash[:8]}...)")

    print("\n--- 3. Running Real Pairwise Hybrid Matching ---")
    total_suggestions = 0
    for c in complaints:
        sugs = ComplaintMatchingService.match_and_persist_suggestions(
            db=db,
            source_complaint_id=c.id,
            top_k=5,
            min_similarity=0.60,
        )
        total_suggestions += len(sugs)

    print(f"Matching complete. Total relationship suggestions recorded: {total_suggestions}")

    # Seed an approval and dismissal for demonstration
    sug_to_approve = (
        db.query(AIRelationshipSuggestion)
        .filter(AIRelationshipSuggestion.status == "PENDING_REVIEW")
        .first()
    )
    if sug_to_approve:
        admin = db.query(User).filter(User.username == "admin").first()
        sug_to_approve.status = "APPROVED_LINK"
        sug_to_approve.reviewed_by_id = admin.id if admin else 1
        sug_to_approve.reviewed_at = datetime.now(timezone.utc)
        sug_to_approve.review_notes = "Verified identical exam fee overcharge grievance across bureaus by Chief Redressal Officer."
        db.commit()
        print(f"[OK] Seeded approved link: Suggestion #{sug_to_approve.id}")


def main():
    print("=" * 70)
    print("AICTE Case360+ — Pre-Inference & Demonstration Seeding (Phase 3J)")
    print("=" * 70)
    db = SessionLocal()
    try:
        seed_sih_demo_complaints(db)
        compute_all_embeddings_and_match(db)
        print("\nAll embeddings, vectors, and SIH demonstration records successfully seeded.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
