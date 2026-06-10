package com.plinth.llm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
public class SpringAiCompatibleLlmService implements LlmService {

    private static final Logger log = LoggerFactory.getLogger(SpringAiCompatibleLlmService.class);
    private static final int MAX_RETRIES = 3;
    private static final Duration RETRY_DELAY = Duration.ofSeconds(2);
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(60);

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String model;

    public SpringAiCompatibleLlmService(ObjectMapper objectMapper,
                                        @Value("${app.llm.google-api-key:}") String apiKey,
                                        @Value("${app.llm.google-model:gemini-2.5-flash}") String model) {
        var requestFactory = new JdkClientHttpRequestFactory();
        requestFactory.setReadTimeout(REQUEST_TIMEOUT);

        this.restClient = RestClient.builder()
                .baseUrl("https://generativelanguage.googleapis.com")
                .requestFactory(requestFactory)
                .build();
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.model = model;
    }

    @Override
    public String generate(String systemPrompt, String userPrompt) {
        if (apiKey == null || apiKey.isBlank()) {
            return fallback(systemPrompt, userPrompt);
        }

        Map<String, Object> payload = Map.of(
                "systemInstruction", Map.of("parts", List.of(Map.of("text", systemPrompt))),
                "contents", List.of(Map.of(
                        "role", "user",
                        "parts", List.of(Map.of("text", userPrompt))
                ))
        );

        Exception lastException = null;
        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                String body = restClient.post()
                        .uri("/v1beta/models/{model}:generateContent?key={key}", model, apiKey)
                        .body(payload)
                        .retrieve()
                        .body(String.class);

                JsonNode root = objectMapper.readTree(body);
                JsonNode text = root.path("candidates").path(0).path("content").path("parts").path(0).path("text");
                if (text.isMissingNode() || text.asText().isBlank()) {
                    String finishReason = root.path("candidates").path(0).path("finishReason").asText();
                    log.warn("LLM returned empty response, finishReason={}, attempt={}/{}", finishReason, attempt, MAX_RETRIES);
                    if (attempt < MAX_RETRIES) {
                        sleepBeforeRetry(attempt);
                    }
                    continue;
                }
                return text.asText();
            } catch (Exception ex) {
                lastException = ex;
                if (isRetryable(ex) && attempt < MAX_RETRIES) {
                    log.warn("LLM request failed (attempt={}/{}): {}", attempt, MAX_RETRIES, ex.getMessage());
                    sleepBeforeRetry(attempt);
                } else {
                    break;
                }
            }
        }

        log.error("All {} LLM retries exhausted. Last error: {}", MAX_RETRIES,
                lastException != null ? lastException.getMessage() : "empty response");
        return fallback(systemPrompt, userPrompt) + " [llm_error="
                + (lastException != null ? lastException.getClass().getSimpleName() : "empty_response") + "]";
    }

    private boolean isRetryable(Exception ex) {
        String message = ex.getMessage();
        if (message == null) return true;
        // Don't retry on auth errors or bad requests
        return !message.contains("401") && !message.contains("403") && !message.contains("400");
    }

    private void sleepBeforeRetry(int attempt) {
        try {
            Thread.sleep(RETRY_DELAY.toMillis() * attempt);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
        }
    }

    private String fallback(String systemPrompt, String userPrompt) {
        return "[draft] " + systemPrompt + " | " + userPrompt;
    }
}