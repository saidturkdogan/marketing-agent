package com.marketingagent.rag;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface RagDocumentRepository extends JpaRepository<RagDocumentEntity, Long> {

    /**
     * Stores a RAG document with explicit PostgreSQL vector casting.
     *
     * Hibernate sees embedding_vec as a String field and sends it as varchar when
     * using repository.save(...). Native SQL keeps pgvector typing explicit.
     */
    @Modifying
    @Transactional
    @Query(value = """
            INSERT INTO rag_documents (campaign_id, topic, content, embedding_vec, created_at)
            VALUES (:campaignId, :topic, :content, cast(:embeddingVec as vector), now())
            """, nativeQuery = true)
    void insertDocument(@Param("campaignId") String campaignId,
                        @Param("topic") String topic,
                        @Param("content") String content,
                        @Param("embeddingVec") String embeddingVec);

    /**
     * Semantic similarity search using pgvector's cosine distance operator (<=>).
     * Returns the top-N most similar documents to the given embedding vector.
     *
     * The cast(... as vector) handles the String → vector conversion in PostgreSQL.
     * Results are ordered by ascending distance (most similar first).
     */
    @Query(value = """
            SELECT * FROM rag_documents
            WHERE embedding_vec IS NOT NULL
            ORDER BY embedding_vec <=> cast(:queryVec as vector)
            LIMIT :limit
            """, nativeQuery = true)
    List<RagDocumentEntity> findBySimilarity(@Param("queryVec") String queryVec,
                                              @Param("limit") int limit);

    /**
     * Semantic similarity search with a minimum similarity threshold.
     * Cosine distance ranges from 0 (identical) to 2 (opposite).
     * A threshold of 0.5 means only reasonably similar documents are returned.
     */
    @Query(value = """
            SELECT * FROM rag_documents
            WHERE embedding_vec IS NOT NULL
              AND (embedding_vec <=> cast(:queryVec as vector)) < :maxDistance
            ORDER BY embedding_vec <=> cast(:queryVec as vector)
            LIMIT :limit
            """, nativeQuery = true)
    List<RagDocumentEntity> findBySimilarityWithThreshold(@Param("queryVec") String queryVec,
                                                          @Param("maxDistance") double maxDistance,
                                                          @Param("limit") int limit);
}
