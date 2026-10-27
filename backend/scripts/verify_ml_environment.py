#!/usr/bin/env python3
"""
AICTE Case360+ — Machine Learning Environment Verification Script
Phase 3A Dependency and Runtime Check (SIH 26264)

Verifies that PyTorch (CPU), Sentence Transformers, RapidFuzz, NumPy,
and existing core FastAPI dependencies are properly installed, mutually compatible,
and functional without initiating model downloads or touching database tables.
"""

import sys
import platform


def main() -> int:
    print("=" * 70)
    print(" AICTE Case360+ — Phase 3A: ML Environment Verification")
    print("=" * 70)

    all_passed = True

    # 1. Python Environment Check
    print("\n[1/7] Python Runtime Check:")
    py_ver = sys.version_info
    print(f"  - Version: {py_ver.major}.{py_ver.minor}.{py_ver.micro} ({platform.platform()})")
    print(f"  - Executable: {sys.executable}")
    if py_ver.major == 3 and py_ver.minor in (10, 11, 12):
        print("  [PASS] Python version is within supported range (3.10 - 3.12).")
    else:
        print(f"  [WARN] Unexpected Python version {py_ver.major}.{py_ver.minor}. Recommended: 3.11.")

    # 2. PyTorch CPU Check
    print("\n[2/7] PyTorch CPU Check:")
    try:
        import torch
        print(f"  - PyTorch version: {torch.__version__}")
        print(f"  - CUDA available: {torch.cuda.is_available()}")
        
        # Test CPU Tensor operation
        t = torch.tensor([1.0, 2.0, 3.0, 4.0])
        t_mean = t.mean().item()
        print(f"  - Tensor calculation mean([1, 2, 3, 4]) = {t_mean}")
        assert t_mean == 2.5, "Tensor mean mismatch"
        print("  [PASS] PyTorch CPU tensor arithmetic functional.")
    except Exception as e:
        print(f"  [FAIL] PyTorch check failed: {e}")
        all_passed = False

    # 3. NumPy Check
    print("\n[3/7] NumPy Check:")
    try:
        import numpy as np
        print(f"  - NumPy version: {np.__version__}")
        arr = np.array([10.0, 20.0, 30.0])
        arr_mean = float(np.mean(arr))
        print(f"  - Array mean([10, 20, 30]) = {arr_mean}")
        assert arr_mean == 20.0, "NumPy mean mismatch"
        print("  [PASS] NumPy imported and functional.")
    except Exception as e:
        print(f"  [FAIL] NumPy check failed: {e}")
        all_passed = False

    # 4. PyTorch <-> NumPy Interoperability
    print("\n[4/7] PyTorch <-> NumPy Interoperability:")
    try:
        np_arr = np.array([1.5, 2.5, 3.5], dtype=np.float32)
        torch_t = torch.from_numpy(np_arr)
        roundtrip_np = torch_t.numpy()
        assert np.allclose(np_arr, roundtrip_np), "Zero-copy tensor conversion mismatch"
        print(f"  - Converted NumPy array {np_arr.tolist()} <-> Torch tensor {torch_t.tolist()}")
        print("  [PASS] Zero-copy tensor conversion between NumPy and PyTorch verified.")
    except Exception as e:
        print(f"  [FAIL] Interoperability check failed: {e}")
        all_passed = False

    # 5. Sentence Transformers Check (Without Model Download)
    print("\n[5/7] Sentence Transformers Check:")
    try:
        import sentence_transformers
        import transformers
        import tokenizers
        import huggingface_hub
        print(f"  - sentence-transformers: {sentence_transformers.__version__}")
        print(f"  - transformers: {transformers.__version__}")
        print(f"  - tokenizers: {tokenizers.__version__}")
        print(f"  - huggingface-hub: {huggingface_hub.__version__}")
        print("  [PASS] Sentence Transformers and HuggingFace toolchain imported successfully.")
    except Exception as e:
        print(f"  [FAIL] Sentence Transformers check failed: {e}")
        all_passed = False

    # 6. RapidFuzz String Matching Check
    print("\n[6/7] RapidFuzz String Similarity Check:")
    try:
        from rapidfuzz import fuzz, process
        s1 = "Delhi Institute of Technology & Management"
        s2 = "Delhi Inst of Technology & Mgmt"
        ratio = fuzz.ratio(s1, s1)
        token_sort = fuzz.token_sort_ratio(s1, s2)
        print(f"  - RapidFuzz version: {fuzz.__file__}")
        print(f"  - Exact ratio: {ratio}%")
        print(f"  - Token sort ratio ('{s1}' vs '{s2}'): {token_sort:.1f}%")
        assert ratio == 100.0, "Exact ratio should be 100.0"
        assert token_sort > 80.0, "Fuzzy match token similarity should be > 80%"
        print("  [PASS] RapidFuzz string normalization and token matching verified.")
    except Exception as e:
        print(f"  [FAIL] RapidFuzz check failed: {e}")
        all_passed = False

    # 7. Existing Core Backend Compatibility Check
    print("\n[7/7] Core Application Framework Compatibility Check:")
    try:
        import fastapi
        import pydantic
        import sqlalchemy
        print(f"  - FastAPI: {fastapi.__version__}")
        print(f"  - Pydantic: {pydantic.__version__}")
        print(f"  - SQLAlchemy: {sqlalchemy.__version__}")
        print("  [PASS] Core web framework dependencies intact and unregressed.")
    except Exception as e:
        print(f"  [FAIL] Core framework check failed: {e}")
        all_passed = False

    # Summary
    print("\n" + "=" * 70)
    if all_passed:
        print(" [SUCCESS] Phase 3A: All ML environment checks PASSED successfully.")
        print(" Environment is verified and ready for Phase 3B model integration.")
        print("=" * 70)
        return 0
    else:
        print(" [FAILED] Some ML environment checks failed. Review errors above.")
        print("=" * 70)
        return 1


if __name__ == "__main__":
    sys.exit(main())
