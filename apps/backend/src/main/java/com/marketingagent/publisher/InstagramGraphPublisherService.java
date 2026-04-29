package com.marketingagent.publisher;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class InstagramGraphPublisherService {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String igUserId;
    private final String accessToken;
    private final String graphVersion;

    public InstagramGraphPublisherService(
            ObjectMapper objectMapper,
            @Value("${app.meta.instagram.ig-user-id:}") String igUserId,
            @Value("${app.meta.instagram.access-token:}") String accessToken,
            @Value("${app.meta.graph-version:v25.0}") String graphVersion
    ) {
        this.restClient = RestClient.builder().baseUrl("https://graph.facebook.com").build();
        this.objectMapper = objectMapper;
        this.igUserId = igUserId;
        this.accessToken = accessToken;
        this.graphVersion = graphVersion;
    }

    public PublishResult publishImage(String imageUrl, String caption) {
        if (accessToken == null || accessToken.isBlank() || igUserId == null || igUserId.isBlank()) {
            return new PublishResult(
                    "Instagram",
                    "skipped",
                    null,
                    null,
                    "INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_IG_USER_ID is not configured"
            );
        }
        if (imageUrl == null || imageUrl.isBlank()) {
            return new PublishResult("Instagram", "error", null, null, "imageUrl is required for Instagram publishing");
        }

        try {
            String containerResponse = restClient.post()
                    .uri(uriBuilder -> uriBuilder
                            .path("/{version}/{igUserId}/media")
                            .queryParam("image_url", imageUrl)
                            .queryParam("caption", caption == null ? "" : caption)
                            .queryParam("access_token", accessToken)
                            .build(graphVersion, igUserId))
                    .retrieve()
                    .body(String.class);
            String creationId = objectMapper.readTree(containerResponse).path("id").asText();
            if (creationId.isBlank()) {
                return new PublishResult("Instagram", "error", null, null, "Failed to create Instagram media container");
            }

            String containerStatus = waitUntilContainerReady(creationId);
            if (!"FINISHED".equalsIgnoreCase(containerStatus) && !"PUBLISHED".equalsIgnoreCase(containerStatus)) {
                return new PublishResult(
                        "Instagram",
                        "error",
                        creationId,
                        null,
                        "Container is not publishable. status_code=" + containerStatus
                );
            }

            String publishResponse = restClient.post()
                    .uri(uriBuilder -> uriBuilder
                            .path("/{version}/{igUserId}/media_publish")
                            .queryParam("creation_id", creationId)
                            .queryParam("access_token", accessToken)
                            .build(graphVersion, igUserId))
                    .retrieve()
                    .body(String.class);
            JsonNode publishJson = objectMapper.readTree(publishResponse);
            String mediaId = publishJson.path("id").asText();
            if (mediaId.isBlank()) {
                return new PublishResult("Instagram", "error", creationId, null, "media_publish did not return media id");
            }

            String permalink = resolvePermalink(mediaId);
            return new PublishResult("Instagram", "published", mediaId, permalink, "published");
        } catch (Exception ex) {
            return new PublishResult("Instagram", "error", null, null, ex.getMessage());
        }
    }

    private String waitUntilContainerReady(String creationId) throws Exception {
        String lastStatus = "IN_PROGRESS";
        for (int attempt = 0; attempt < 12; attempt++) {
            String statusResponse = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/{version}/{creationId}")
                            .queryParam("fields", "status_code")
                            .queryParam("access_token", accessToken)
                            .build(graphVersion, creationId))
                    .retrieve()
                    .body(String.class);
            lastStatus = objectMapper.readTree(statusResponse).path("status_code").asText("IN_PROGRESS");
            if ("FINISHED".equalsIgnoreCase(lastStatus) || "PUBLISHED".equalsIgnoreCase(lastStatus)) {
                return lastStatus;
            }
            if ("ERROR".equalsIgnoreCase(lastStatus) || "EXPIRED".equalsIgnoreCase(lastStatus)) {
                return lastStatus;
            }
            Thread.sleep(2000);
        }
        return lastStatus;
    }

    private String resolvePermalink(String mediaId) {
        try {
            String mediaResponse = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/{version}/{mediaId}")
                            .queryParam("fields", "permalink")
                            .queryParam("access_token", accessToken)
                            .build(graphVersion, mediaId))
                    .retrieve()
                    .body(String.class);
            return objectMapper.readTree(mediaResponse).path("permalink").asText(null);
        } catch (Exception ignored) {
            return null;
        }
    }
}
