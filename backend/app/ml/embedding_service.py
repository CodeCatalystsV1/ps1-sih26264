"""
AICTE Case360+ — Embedding Generation Service
Phase 3E: Multilingual-E5-small Inference, LRU Caching and Cosine Metrics
"""

import hashlib
import threading
from typing import List, Dict, Any, Optional
import numpy as np

from .config import MLConfig


class EmbeddingService:
    """
    Thread-safe lazy-loaded embedding service using intfloat/multilingual-e5-small.
    Enforces E5 prompt prefixes ('passage: ' and 'query: ') and maintains
    an in-memory bounded LRU cache for embedding vectors.
    """

    _model = None
    _model_lock = threading.Lock()
    _cache: Dict[str, np.ndarray] = {}
    _cache_lock = threading.Lock()

    @classmethod
    def get_model(cls):
        """
        Lazily loads SentenceTransformer model once per process.
        """
        if cls._model is None:
            with cls._model_lock:
                if cls._model is None:
                    try:
                        from sentence_transformers import SentenceTransformer
                        # Load model on specified device (default CPU)
                        cls._model = SentenceTransformer(
                            MLConfig.MODEL_NAME,
                            revision=MLConfig.MODEL_REVISION,
                            device=MLConfig.DEVICE,
                        )
                    except Exception as e:
                        raise RuntimeError(
                            f"Failed to load embedding model '{MLConfig.MODEL_NAME}': {e}"
                        ) from e
        return cls._model

    @classmethod
    def _make_cache_key(cls, text: str, role: str) -> str:
        """
        Generates deterministic SHA-256 hash key for caching.
        """
        content = f"{MLConfig.MODEL_NAME}:{MLConfig.MODEL_REVISION}:{role}:{text}"
        return hashlib.sha256(content.encode("utf-8")).hexdigest()

    @classmethod
    def clear_cache(cls) -> None:
        """
        Clears the embedding cache.
        """
        with cls._cache_lock:
            cls._cache.clear()

    @classmethod
    def get_cache_size(cls) -> int:
        with cls._cache_lock:
            return len(cls._cache)

    @classmethod
    def encode_complaint(cls, text: str, role: str = "passage") -> np.ndarray:
        """
        Encodes a single text into a 384-dimensional normalized float32 vector.
        role: 'passage' (stored complaints) or 'query' (search complaint).
        """
        if not text or not text.strip():
            # Return zero vector for empty text
            return np.zeros(MLConfig.EMBEDDING_DIM, dtype=np.float32)

        cache_key = cls._make_cache_key(text, role)
        with cls._cache_lock:
            if cache_key in cls._cache:
                return cls._cache[cache_key].copy()

        # Format input with E5 prefix
        prefix = MLConfig.QUERY_PREFIX if role == "query" else MLConfig.PASSAGE_PREFIX
        formatted_text = f"{prefix}{text.strip()}"

        model = cls.get_model()
        # SentenceTransformer.encode produces normalized vectors when normalize_embeddings=True
        vec = model.encode(
            formatted_text,
            convert_to_numpy=True,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        vec = vec.astype(np.float32)

        # Store in LRU cache
        with cls._cache_lock:
            if len(cls._cache) >= MLConfig.EMBEDDING_CACHE_SIZE:
                # Evict oldest entry (first key in dict)
                oldest_key = next(iter(cls._cache))
                del cls._cache[oldest_key]
            cls._cache[cache_key] = vec

        return vec.copy()

    @classmethod
    def encode_batch(
        cls,
        texts: List[str],
        role: str = "passage",
        batch_size: int = 32,
    ) -> np.ndarray:
        """
        Encodes a list of texts into a 2D numpy array of shape (N, 384).
        Utilizes caching for known texts and batches uncached items.
        """
        if not texts:
            return np.empty((0, MLConfig.EMBEDDING_DIM), dtype=np.float32)

        results = [None] * len(texts)
        uncached_indices = []
        uncached_formatted = []

        prefix = MLConfig.QUERY_PREFIX if role == "query" else MLConfig.PASSAGE_PREFIX

        # Check cache first
        for idx, text in enumerate(texts):
            if not text or not text.strip():
                results[idx] = np.zeros(MLConfig.EMBEDDING_DIM, dtype=np.float32)
                continue

            cache_key = cls._make_cache_key(text, role)
            with cls._cache_lock:
                cached_vec = cls._cache.get(cache_key)

            if cached_vec is not None:
                results[idx] = cached_vec.copy()
            else:
                uncached_indices.append(idx)
                uncached_formatted.append(f"{prefix}{text.strip()}")

        # Batch encode remaining texts
        if uncached_formatted:
            model = cls.get_model()
            batch_vectors = model.encode(
                uncached_formatted,
                batch_size=batch_size,
                convert_to_numpy=True,
                normalize_embeddings=True,
                show_progress_bar=False,
            ).astype(np.float32)

            for i, orig_idx in enumerate(uncached_indices):
                vec = batch_vectors[i]
                results[orig_idx] = vec
                cache_key = cls._make_cache_key(texts[orig_idx], role)
                with cls._cache_lock:
                    if len(cls._cache) >= MLConfig.EMBEDDING_CACHE_SIZE:
                        oldest = next(iter(cls._cache))
                        del cls._cache[oldest]
                    cls._cache[cache_key] = vec

        return np.vstack(results).astype(np.float32)

    @classmethod
    def cosine_similarity(cls, vec1: np.ndarray, vec2: np.ndarray) -> float:
        """
        Calculates cosine similarity between two vectors.
        Since vectors from encode() are already L2-normalized,
        cosine similarity is simply the dot product.
        Clamped to [-1.0, 1.0].
        """
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        if norm1 == 0.0 or norm2 == 0.0:
            return 0.0
        dot = float(np.dot(vec1, vec2) / (norm1 * norm2))
        return float(np.clip(dot, -1.0, 1.0))

    @classmethod
    def get_model_metadata(cls) -> Dict[str, Any]:
        """
        Returns runtime metadata of the active embedding engine.
        """
        return {
            "model_name": MLConfig.MODEL_NAME,
            "revision": MLConfig.MODEL_REVISION,
            "embedding_dimension": MLConfig.EMBEDDING_DIM,
            "device": MLConfig.DEVICE,
            "max_seq_length": MLConfig.MAX_SEQ_LENGTH,
            "query_prefix": MLConfig.QUERY_PREFIX,
            "passage_prefix": MLConfig.PASSAGE_PREFIX,
            "is_model_loaded": cls._model is not None,
            "cached_vectors_count": cls.get_cache_size(),
        }
