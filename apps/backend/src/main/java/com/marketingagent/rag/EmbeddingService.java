package com.marketingagent.rag;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Generates text embeddings using OpenAI-compatible API (e.g. for qwen3-embedding-8b).
 * Falls back to a zero-vector when the API key is not configured.
 */
@Service
public class EmbeddingService {

    private static final Logger log = LoggerFactory.getLogger(EmbeddingService.class);
    public static final int DIMENSIONS = 4096;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String model;

    public EmbeddingService(ObjectMapper objectMapper,
                            @Value("${app.embedding.api-key:}") String apiKey,
                            @Value("${app.embedding.model:qwen3-embedding-8b}") String model,
                            @Value("${app.embedding.base-url:https://api.openai.com/v1}") String baseUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .build();
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.model = model;
    }

    /**
     * Generates a 4096-dimensional embedding vector for the given text.
     */
    public float[] embed(String text) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("Embedding API key not configured — returning zero vector for embedding");
            return new float[DIMENSIONS];
        }

        try {
            Map<String, Object> payload = Map.of(
                    "model", model,
                    "input", text == null ? "" : text
            );

            String body = restClient.post()
                    .uri("/embeddings")
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .body(payload)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(body);
            JsonNode data = root.path("data");

            if (data.isMissingNode() || !data.isArray() || data.isEmpty()) {
                log.warn("Empty embedding response from API — returning zero vector");
                return new float[DIMENSIONS];
            }

            JsonNode embeddingNode = data.get(0).path("embedding");
            float[] vector = new float[embeddingNode.size()];
            for (int i = 0; i < embeddingNode.size(); i++) {
                vector[i] = (float) embeddingNode.get(i).asDouble();
            }
            return vector;
        } catch (Exception ex) {
            log.error("Embedding API call failed: {} — returning zero vector", ex.getMessage());
            return new float[DIMENSIONS];
        }
    }

    /**
     * Batch embed multiple texts in a single API call.
     */
    public List<float[]> embedBatch(List<String> texts) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("Embedding API key not configured — returning zero vectors for batch embedding");
            return texts.stream().map(t -> new float[DIMENSIONS]).toList();
        }

        try {
            Map<String, Object> payload = Map.of(
                    "model", model,
                    "input", texts.stream().map(t -> t == null ? "" : t).toList()
            );

            String body = restClient.post()
                    .uri("/embeddings")
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .body(payload)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(body);
            JsonNode data = root.path("data");

            List<float[]> result = new ArrayList<>();
            for (JsonNode item : data) {
                JsonNode embeddingNode = item.path("embedding");
                float[] vector = new float[embeddingNode.size()];
                for (int i = 0; i < embeddingNode.size(); i++) {
                    vector[i] = (float) embeddingNode.get(i).asDouble();
                }
                result.add(vector);
            }
            return result;
        } catch (Exception ex) {
            log.error("Batch embedding API call failed: {} — returning zero vectors", ex.getMessage());
            return texts.stream().map(t -> new float[DIMENSIONS]).toList();
        }
    }
}
