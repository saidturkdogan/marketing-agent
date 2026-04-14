-- Migration: 001_add_pgvector.sql
-- Purpose: Enable pgvector extension and create campaign embeddings table
-- Run: Automatically executed on first PostgreSQL initialization

-- Step 1: Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Create campaign embeddings table
CREATE TABLE IF NOT EXISTS campaign_embeddings (
    id SERIAL PRIMARY KEY,
    campaign_uuid VARCHAR(64) NOT NULL,
    embedding vector(384),  -- sentence-transformers all-MiniLM-L6-v2 (384 dimensions)
    content_type VARCHAR(64) NOT NULL DEFAULT 'campaign',  -- 'campaign', 'strategy', 'research', 'analytics'
    content_text TEXT NOT NULL,
    topic VARCHAR(512),
    platforms JSONB,
    performance_score FLOAT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Foreign key reference (if campaigns table exists)
    CONSTRAINT fk_campaign 
        FOREIGN KEY (campaign_uuid) 
        REFERENCES campaigns(campaign_uuid) 
        ON DELETE CASCADE
);

-- Step 3: Create HNSW index for fast similarity search
CREATE INDEX IF NOT EXISTS idx_campaign_embedding_hnsw 
    ON campaign_embeddings 
    USING hnsw (embedding vector_cosine_ops);

-- Step 4: Create B-tree indexes for metadata filtering
CREATE INDEX IF NOT EXISTS idx_campaign_uuid 
    ON campaign_embeddings (campaign_uuid);

CREATE INDEX IF NOT EXISTS idx_content_type 
    ON campaign_embeddings (content_type);

CREATE INDEX IF NOT EXISTS idx_created_at 
    ON campaign_embeddings (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_performance_score 
    ON campaign_embeddings (performance_score) 
    WHERE performance_score IS NOT NULL;

-- Step 5: Add helpful comments
COMMENT ON TABLE campaign_embeddings IS 'Vector embeddings for campaign content (RAG)';
COMMENT ON COLUMN campaign_embeddings.embedding IS '384-dim vector from sentence-transformers/all-MiniLM-L6-v2';
COMMENT ON COLUMN campaign_embeddings.content_type IS 'Type: campaign, strategy, research, analytics, brand_example';
COMMENT ON COLUMN campaign_embeddings.performance_score IS 'Campaign performance score (0.0-1.0)';

-- Verification query (optional)
-- SELECT * FROM campaign_embeddings LIMIT 1;
