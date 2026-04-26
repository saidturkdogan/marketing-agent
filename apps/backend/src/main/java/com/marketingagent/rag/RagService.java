package com.marketingagent.rag;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.marketingagent.domain.CampaignState;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * RAG (Retrieval-Augmented Generation) service.
 *
 * Uses pgvector for semantic similarity search:
 *   - storeCampaign() embeds the campaign content and stores the vector in PostgreSQL
 *   - retrieveContext() embeds the query, then uses pgvector's HNSW index
 *     for fast cosine distance search to find the most relevant past campaigns
 */
@Service
public class RagService {

    private static final Logger log = LoggerFactory.getLogger(RagService.class);

    private final RagDocumentRepository repository;
    private final EmbeddingService embeddingService;
    private final ObjectMapper objectMapper;

    public RagService(RagDocumentRepository repository, EmbeddingService embeddingService, ObjectMapper objectMapper) {
        this.repository = repository;
        this.embeddingService = embeddingService;
        this.objectMapper = objectMapper;
    }

    /**
     * Stores a completed campaign as a RAG document with a pgvector embedding.
     */
    public void storeCampaign(CampaignState state) {
        try {
            String content = objectMapper.writeValueAsString(Map.of(
                    "topic", state.getTopic(),
                    "plan", state.getPlan(),
                    "assets", state.getAssets(),
                    "score", state.getPerformanceScore()
            ));

            float[] vector = embeddingService.embed(content);

            RagDocumentEntity doc = new RagDocumentEntity();
            doc.setCampaignId(state.getCampaignId());
            doc.setTopic(state.getTopic());
            doc.setContent(content);
            doc.setEmbeddingVecFromArray(vector);
            repository.save(doc);

            log.info("Stored RAG document for campaign {} with {}-dim vector",
                    state.getCampaignId(), vector.length);
        } catch (Exception ex) {
            throw new IllegalStateException("RAG document storage failed", ex);
        }
    }

    /**
     * Retrieves the most semantically similar campaign contexts using pgvector
     * cosine distance search.
     *
     * @param query  the search query (will be embedded)
     * @param limit  max number of results
     * @return list of JSON-encoded campaign content strings
     */
    public List<String> retrieveContext(String query, int limit) {
        float[] queryVector = embeddingService.embed(query);
        String queryVecStr = floatArrayToVectorString(queryVector);

        List<RagDocumentEntity> results = repository.findBySimilarity(queryVecStr, limit);

        log.debug("RAG retrieval for '{}' returned {} documents", query, results.size());
        return results.stream()
                .map(RagDocumentEntity::getContent)
                .toList();
    }

    /**
     * Retrieves semantically similar contexts with a similarity threshold.
     * Only returns documents whose cosine distance is below maxDistance.
     *
     * @param query       the search query
     * @param limit       max number of results
     * @param maxDistance  maximum cosine distance (0.0 = identical, 2.0 = opposite)
     * @return list of JSON-encoded campaign content strings
     */
    public List<String> retrieveContextWithThreshold(String query, int limit, double maxDistance) {
        float[] queryVector = embeddingService.embed(query);
        String queryVecStr = floatArrayToVectorString(queryVector);

        List<RagDocumentEntity> results = repository.findBySimilarityWithThreshold(queryVecStr, maxDistance, limit);

        log.debug("RAG retrieval (threshold={}) for '{}' returned {} documents",
                maxDistance, query, results.size());
        return results.stream()
                .map(RagDocumentEntity::getContent)
                .toList();
    }

    /**
     * Converts a float[] to pgvector's string format: "[0.1,0.2,...]"
     */
    private String floatArrayToVectorString(float[] vector) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < vector.length; i++) {
            if (i > 0) sb.append(",");
            sb.append(vector[i]);
        }
        sb.append("]");
        return sb.toString();
    }
}
