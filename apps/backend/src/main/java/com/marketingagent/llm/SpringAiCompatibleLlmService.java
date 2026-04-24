package com.marketingagent.llm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Service
public class SpringAiCompatibleLlmService implements LlmService {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String model;

    public SpringAiCompatibleLlmService(ObjectMapper objectMapper,
                                        @Value("${app.llm.google-api-key:}") String apiKey,
                                        @Value("${app.llm.google-model:gemini-2.0-flash}") String model) {
        this.restClient = RestClient.builder().baseUrl("https://generativelanguage.googleapis.com").build();
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.model = model;
    }

    @Override
    public String generate(String systemPrompt, String userPrompt) {
        if (apiKey == null || apiKey.isBlank()) {
            return fallback(systemPrompt, userPrompt);
        }

        try {
            Map<String, Object> payload = Map.of(
                    "systemInstruction", Map.of("parts", List.of(Map.of("text", systemPrompt))),
                    "contents", List.of(Map.of(
                            "role", "user",
                            "parts", List.of(Map.of("text", userPrompt))
                    ))
            );

            String body = restClient.post()
                    .uri("/v1beta/models/{model}:generateContent?key={key}", model, apiKey)
                    .body(payload)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(body);
            JsonNode text = root.path("candidates").path(0).path("content").path("parts").path(0).path("text");
            if (text.isMissingNode() || text.asText().isBlank()) {
                return fallback(systemPrompt, userPrompt);
            }
            return text.asText();
        } catch (Exception ex) {
            return fallback(systemPrompt, userPrompt) + " [llm_error=" + ex.getClass().getSimpleName() + "]";
        }
    }

    private String fallback(String systemPrompt, String userPrompt) {
        return "[draft] " + systemPrompt + " | " + userPrompt;
    }
}
