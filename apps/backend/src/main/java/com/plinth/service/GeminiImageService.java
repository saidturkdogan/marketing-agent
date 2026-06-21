package com.plinth.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Image generation via Gemini Nano Banana ({@code gemini-2.5-flash-image}).
 */
@Service
public class GeminiImageService {

    private static final Logger log = LoggerFactory.getLogger(GeminiImageService.class);

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String imageModel;

    public GeminiImageService(ObjectMapper objectMapper,
                              @Value("${app.llm.google-api-key:}") String apiKey,
                              @Value("${app.llm.google-image-model:gemini-2.5-flash-image}") String imageModel) {
        var factory = new JdkClientHttpRequestFactory();
        factory.setReadTimeout(Duration.ofSeconds(120));

        this.restClient = RestClient.builder()
                .baseUrl("https://generativelanguage.googleapis.com")
                .requestFactory(factory)
                .build();
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.imageModel = imageModel;
    }

    public boolean isAvailable() {
        return apiKey != null && !apiKey.isBlank();
    }

    public String modelName() {
        return imageModel;
    }

    /**
     * Generates an image and returns a data URL suitable for {@code <img src="...">}.
     */
    public String generateImageDataUrl(String prompt) {
        if (!isAvailable()) {
            throw new IllegalStateException("GOOGLE_API_KEY not configured");
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("contents", List.of(Map.of(
                "role", "user",
                "parts", List.of(Map.of("text", prompt))
        )));
        payload.put("generationConfig", Map.of(
                "responseModalities", List.of("IMAGE", "TEXT")
        ));

        try {
            String responseBody = restClient.post()
                    .uri("/v1beta/models/{model}:generateContent?key={key}", imageModel, apiKey)
                    .body(payload)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode error = root.path("error");
            if (!error.isMissingNode()) {
                throw new RuntimeException(error.path("message").asText("Gemini image API error"));
            }

            JsonNode parts = root.path("candidates").path(0).path("content").path("parts");
            if (!parts.isArray()) {
                throw new RuntimeException("Gemini returned no image parts");
            }

            for (JsonNode part : parts) {
                JsonNode inline = part.path("inlineData");
                if (inline.isMissingNode()) {
                    inline = part.path("inline_data");
                }
                if (inline.isMissingNode()) {
                    continue;
                }
                String mimeType = inline.path("mimeType").asText(
                        inline.path("mime_type").asText("image/png"));
                String data = inline.path("data").asText(null);
                if (data != null && !data.isBlank()) {
                    log.info("Gemini image generated with model {}", imageModel);
                    return "data:" + mimeType + ";base64," + data;
                }
            }

            throw new RuntimeException("Gemini response contained no image data");
        } catch (RuntimeException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Gemini image generation failed: {}", ex.getMessage(), ex);
            throw new RuntimeException("Gemini image generation failed: " + ex.getMessage(), ex);
        }
    }
}
