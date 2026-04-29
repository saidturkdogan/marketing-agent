-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add a native vector column (4096 dimensions for qwen3-embedding-8b)
ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS embedding_vec vector(4096);

-- NOTE:
-- pgvector HNSW indexes on vector columns are limited to 2000 dimensions.
-- Since this project uses 4096-dim embeddings, we skip ANN index creation here
-- to keep migrations compatible and application startup reliable.
