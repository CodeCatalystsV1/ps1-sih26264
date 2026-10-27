#!/usr/bin/env python3
"""
AICTE Case360+ — Multilingual E5-small Real Model Smoke Test Script
Phase 3B Verification

Executes real CPU inference on intfloat/multilingual-e5-small,
evaluating English, Tamil, and cross-subject pairs with timing metrics.

Run from project root:
  & "C:\\project\\sih-1\\AICTE-ICMS\\backend\\venv\\Scripts\\python.exe" backend/scripts/test_multilingual_e5.py
"""

import sys
import time
import numpy as np

# Ensure Windows PowerShell console can output UTF-8 Unicode characters (e.g. Tamil)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def main() -> int:
    print("=" * 75)
    print(" AICTE Case360+ — Multilingual E5-small Real Inference Smoke Test")
    print("=" * 75)

    # 1. Measure model loading time
    print("\n[Step 1] Loading intfloat/multilingual-e5-small onto CPU...")
    start_load = time.perf_counter()
    try:
        from backend.app.ml.embedding_service import EmbeddingService
        from backend.app.ml.text_preprocessor import ComplaintTextPreprocessor
        from backend.app.ml.similarity_engine import SemanticSimilarityEngine

        metadata = EmbeddingService.get_model_metadata()
        load_time = time.perf_counter() - start_load
        print(f"  [SUCCESS] Model loaded in {load_time:.2f} seconds.")
        print(f"  - Model ID: {metadata['model_name']} (Rev: {metadata['revision']})")
        print(f"  - Target Device: {metadata['device']}")
        print(f"  - Vector Dimension: {metadata['embedding_dimension']}")
    except Exception as e:
        print(f"  [FAIL] Could not load model: {e}")
        return 1

    # 2. Benchmark English and Multilingual Embeddings
    print("\n[Step 2] Benchmark Single & Batch Inference:")

    # Fictional test complaints (English & Tamil)
    c1_en = "Students are being forced to pay additional unapproved examination fees before hall ticket issuance."
    c2_en_related = "The technical college is collecting unauthorized semester examination charges from final year batches."
    c3_en_unrelated = "The institution has inadequate computer laboratory networking equipment and outdated servers."
    c4_ta_fees = "மாணவர்களிடமிருந்து கூடுதல் தேர்வு கட்டணம் வசூலிக்கப்படுகிறது."  # "Additional examination fees are being collected from students."
    c5_ta_infra = "கல்லூரியில் போதுமான ஆய்வக உபகரணங்கள் இல்லை."  # "The college does not have sufficient laboratory equipment."

    # Preprocess
    t1 = ComplaintTextPreprocessor.clean_text(c1_en)
    t2 = ComplaintTextPreprocessor.clean_text(c2_en_related)
    t3 = ComplaintTextPreprocessor.clean_text(c3_en_unrelated)
    t4 = ComplaintTextPreprocessor.clean_text(c4_ta_fees)
    t5 = ComplaintTextPreprocessor.clean_text(c5_ta_infra)

    # Single text encode timing
    start_single = time.perf_counter()
    v1 = EmbeddingService.encode_complaint(t1, role="query")
    single_time = (time.perf_counter() - start_single) * 1000.0
    print(f"  - Single complaint encoding time: {single_time:.2f} ms")
    print(f"  - Vector shape: {v1.shape}, dtype: {v1.dtype}")
    norm1 = np.linalg.norm(v1)
    print(f"  - Vector L2 norm: {norm1:.4f} (Expected: ~1.0000)")
    assert abs(norm1 - 1.0) < 1e-3, "Vector is not properly L2-normalized"

    # Batch encode timing
    batch_texts = [t2, t3, t4, t5]
    start_batch = time.perf_counter()
    v_batch = EmbeddingService.encode_batch(batch_texts, role="passage")
    batch_time = (time.perf_counter() - start_batch) * 1000.0
    print(f"  - Batch encoding time ({len(batch_texts)} passages): {batch_time:.2f} ms ({batch_time/len(batch_texts):.2f} ms/item)")
    print(f"  - Batch tensor shape: {v_batch.shape}")
    assert v_batch.shape == (4, 384), f"Unexpected batch shape {v_batch.shape}"

    # 3. Calculate Real Cosine Similarities Across Test Pairs
    print("\n[Step 3] Pairwise Cosine Similarity Measurements:")

    sim_1_2 = EmbeddingService.cosine_similarity(v1, v_batch[0])
    sim_1_3 = EmbeddingService.cosine_similarity(v1, v_batch[1])
    sim_1_4 = EmbeddingService.cosine_similarity(v1, v_batch[2])
    sim_4_2 = EmbeddingService.cosine_similarity(EmbeddingService.encode_complaint(t4, role="query"), v_batch[0])
    sim_4_5 = EmbeddingService.cosine_similarity(EmbeddingService.encode_complaint(t4, role="query"), v_batch[3])

    print(f"  Pair 1: [EN Exam Fees] vs [EN Unauth Exam Charges]:    score = {sim_1_2:.4f} (Related)")
    print(f"  Pair 2: [EN Exam Fees] vs [EN Lab Infra]:             score = {sim_1_3:.4f} (Unrelated)")
    print(f"  Pair 3: [EN Exam Fees] vs [TA Exam Fees]:             score = {sim_1_4:.4f} (Cross-Lingual Related)")
    print(f"  Pair 4: [TA Exam Fees] vs [EN Unauth Exam Charges]:    score = {sim_4_2:.4f} (Cross-Lingual Related)")
    print(f"  Pair 5: [TA Exam Fees] vs [TA Lab Infra]:             score = {sim_4_5:.4f} (Different Subject in Tamil)")

    # Assert model behavioral correctness:
    # Related complaints must score higher than unrelated complaints
    assert sim_1_2 > sim_1_3, f"Expected exam fees ({sim_1_2}) > lab infra ({sim_1_3})"
    assert sim_1_4 > sim_1_3, f"Expected Tamil exam fees ({sim_1_4}) > lab infra ({sim_1_3})"
    assert sim_4_2 > sim_4_5, f"Expected Tamil exam fees vs EN exam charges ({sim_4_2}) > Tamil lab infra ({sim_4_5})"
    print("  [PASS] Semantic ranking verified: Related pairs reliably outrank disjoint topics.")

    # 4. End-to-End Ranking via SemanticSimilarityEngine
    print("\n[Step 4] Candidate Ranking Engine Verification:")
    mock_candidates = [
        {"id": 201, "complaint_reference": "CMP-0201", "text": t3, "title": "Lab Hardware Deficiency", "institution_id": 1, "category_name": "LAB_INFRASTRUCTURE", "bureau_code": "RB", "status": "REGISTERED"},
        {"id": 202, "complaint_reference": "CMP-0202", "text": t2, "title": "Illegal Semester Fees", "institution_id": 1, "category_name": "FEE_RELATED", "bureau_code": "PGRC", "status": "REGISTERED"},
        {"id": 203, "complaint_reference": "CMP-0203", "text": t4, "title": "தேர்வு கட்டணம் (Exam Fees)", "institution_id": 1, "category_name": "FEE_RELATED", "bureau_code": "PGRC", "status": "REGISTERED"},
    ]

    ranking = SemanticSimilarityEngine.rank_candidates(
        source_text=t1,
        candidates=mock_candidates,
        top_k=3,
        source_reference="CMP-0101",
    )

    print(f"  Source: '{t1[:60]}...'")
    print(f"  Ranked Candidates ({len(ranking.ranked_matches)} returned):")
    for rank, m in enumerate(ranking.ranked_matches, 1):
        print(f"    #{rank}: {m.complaint_reference} | Score: {m.similarity_score:.4f} | Title: {m.title}")

    # Top match must be CMP-0202 or CMP-0203 (both exam fee related), NOT CMP-0201 (lab infra)
    top_id = ranking.ranked_matches[0].candidate_id
    assert top_id in (202, 203), f"Top match should be fee-related, got candidate {top_id}"
    assert ranking.ranked_matches[-1].candidate_id == 201, "Lab infra should rank lowest against exam fees"
    print("  [PASS] Top-K ranking accurately placed related complaints above unrelated infrastructure topic.")

    print("\n" + "=" * 75)
    print(" [ALL CHECKS PASSED] Multilingual E5-small is fully verified and functional!")
    print("=" * 75)
    return 0


if __name__ == "__main__":
    sys.exit(main())
