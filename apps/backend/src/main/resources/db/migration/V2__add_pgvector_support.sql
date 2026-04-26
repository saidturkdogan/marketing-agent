-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add a native vector column (4096 dimensions for qwen3-embedding-8b)
ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS embedding_vec vector(4096);

-- Create an HNSW index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS idx_rag_documents_embedding_vec
    ON rag_documents USING hnsw (embedding_vec vector_cosine_ops);
