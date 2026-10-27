-- AICTE Case360+ — PostgreSQL + pgvector Extension & Schema Setup (Phase 3J)
-- Problem Statement: SIH 26264
-- Vector Model: intfloat/multilingual-e5-small (384 dimensions)

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create complaint_embeddings table for PostgreSQL
CREATE TABLE IF NOT EXISTS complaint_embeddings (
    id SERIAL PRIMARY KEY,
    complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    embedding vector(384) NOT NULL,
    model_identifier VARCHAR(100) NOT NULL DEFAULT 'intfloat/multilingual-e5-small',
    model_revision VARCHAR(50) NOT NULL DEFAULT 'main',
    preprocessing_version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
    content_hash VARCHAR(64) NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_complaint_embedding_complaint_id UNIQUE (complaint_id)
);

-- 3. Create HNSW (Hierarchical Navigable Small World) index for fast approximate nearest neighbor (ANN) cosine similarity search
CREATE INDEX IF NOT EXISTS idx_complaint_embeddings_hnsw 
ON complaint_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 4. Create index on content_hash for fast invalidation checking
CREATE INDEX IF NOT EXISTS idx_complaint_embeddings_content_hash 
ON complaint_embeddings (content_hash);

-- 5. Create ai_relationship_suggestions table for PostgreSQL
CREATE TABLE IF NOT EXISTS ai_relationship_suggestions (
    id SERIAL PRIMARY KEY,
    source_complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    candidate_complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    institution_id INTEGER REFERENCES institutions(id) ON DELETE SET NULL,
    semantic_similarity DOUBLE PRECISION NOT NULL,
    match_classification VARCHAR(50) NOT NULL,
    explanation TEXT,
    model_identifier VARCHAR(100) NOT NULL DEFAULT 'intfloat/multilingual-e5-small',
    model_revision VARCHAR(50) NOT NULL DEFAULT 'main',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING_REVIEW',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT
);

-- 6. Enforce unordered complaint pair uniqueness (prevents A-B and B-A duplicate pairs)
CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_relationship_pair 
ON ai_relationship_suggestions (
    LEAST(source_complaint_id, candidate_complaint_id), 
    GREATEST(source_complaint_id, candidate_complaint_id)
);

-- 7. Indexes for fast dashboard filtering
CREATE INDEX IF NOT EXISTS idx_ai_relationship_status ON ai_relationship_suggestions (status);
CREATE INDEX IF NOT EXISTS idx_ai_relationship_inst ON ai_relationship_suggestions (institution_id);
CREATE INDEX IF NOT EXISTS idx_ai_relationship_class ON ai_relationship_suggestions (match_classification);

-- 8. Sample Query for pgvector cosine similarity candidate retrieval
-- Given a normalized 384-dim query vector :query_vector, retrieves top-K candidates:
-- SELECT 
--     ce.complaint_id,
--     c.complaint_reference,
--     c.title,
--     1 - (ce.embedding <=> :query_vector) AS cosine_similarity
-- FROM complaint_embeddings ce
-- JOIN complaints c ON c.id = ce.complaint_id
-- WHERE ce.complaint_id != :source_complaint_id
--   AND (:institution_id IS NULL OR c.institution_id = :institution_id)
-- ORDER BY ce.embedding <=> :query_vector ASC
-- LIMIT :top_k;
