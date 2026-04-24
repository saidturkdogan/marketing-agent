package com.marketingagent.rag;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.marketingagent.domain.CampaignState;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Service
public class RagService {

    private final RagDocumentRepository repository;
    private final EmbeddingService embeddingService;
    private final ObjectMapper objectMapper;

    public RagService(RagDocumentRepository repository, EmbeddingService embeddingService, ObjectMapper objectMapper) {
        this.repository = repository;
        this.embeddingService = embeddingService;
        this.objectMapper = objectMapper;
    }

    public void storeCampaign(CampaignState state) {
        try {
            RagDocumentEntity doc = new RagDocumentEntity();
            doc.setCampaignId(state.getCampaignId());
            doc.setTopic(state.getTopic());
            doc.setContent(objectMapper.writeValueAsString(Map.of(
                    "topic", state.getTopic(),
                    "plan", state.getPlan(),
                    "assets", state.getAssets(),
                    "score", state.getPerformanceScore()
            )));
            doc.setEmbedding(embeddingService.serialize(embeddingService.embed(doc.getContent())));
            repository.save(doc);
        } catch (Exception ex) {
            throw new IllegalStateException("RAG document storage failed", ex);
        }
    }

    public List<String> retrieveContext(String query, int limit) {
        List<Double> queryVector = embeddingService.embed(query);
        return repository.findAll().stream()
                .filter(doc -> doc.getEmbedding() != null && !doc.getEmbedding().isEmpty())
                .sorted(Comparator.comparingDouble(doc -> -cosine(queryVector, embeddingService.deserialize(doc.getEmbedding()))))
                .limit(limit)
                .map(RagDocumentEntity::getContent)
                .toList();
    }

    private double cosine(List<Double> a, List<Double> b) {
        double dot = 0.0;
        double normA = 0.0;
        double normB = 0.0;
        int size = Math.min(a.size(), b.size());
        for (int i = 0; i < size; i++) {
            dot += a.get(i) * b.get(i);
            normA += a.get(i) * a.get(i);
            normB += b.get(i) * b.get(i);
        }
        if (normA == 0.0 || normB == 0.0) {
            return 0.0;
        }
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}
