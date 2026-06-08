package com.plinth.publisher;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Service
public class LinkedInPublisherService {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String accessToken;

    public LinkedInPublisherService(ObjectMapper objectMapper,
                                    @Value("${app.linkedin.access-token:}") String accessToken) {
        this.restClient = RestClient.builder().baseUrl("https://api.linkedin.com").build();
        this.objectMapper = objectMapper;
        this.accessToken = accessToken;
    }

    public PublishResult publishText(String content) {
        if (accessToken == null || accessToken.isBlank()) {
            return new PublishResult("LinkedIn", "skipped", null, null, "LINKEDIN_ACCESS_TOKEN is not configured");
        }

        try {
            String me = restClient.get()
                    .uri("/v2/me")
                    .header("Authorization", "Bearer " + accessToken)
                    .header("X-Restli-Protocol-Version", "2.0.0")
                    .retrieve()
                    .body(String.class);
            JsonNode profile = objectMapper.readTree(me);
            String personId = profile.path("id").asText();
            if (personId.isBlank()) {
                return new PublishResult("LinkedIn", "error", null, null, "Could not resolve LinkedIn person id");
            }

            Map<String, Object> payload = Map.of(
                    "author", "urn:li:person:" + personId,
                    "lifecycleState", "PUBLISHED",
                    "specificContent", Map.of("com.linkedin.ugc.ShareContent", Map.of(
                            "shareCommentary", Map.of("text", content),
                            "shareMediaCategory", "NONE"
                    )),
                    "visibility", Map.of("com.linkedin.ugc.MemberNetworkVisibility", "PUBLIC")
            );

            String post = restClient.post()
                    .uri("/v2/ugcPosts")
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Content-Type", "application/json")
                    .header("X-Restli-Protocol-Version", "2.0.0")
                    .body(payload)
                    .retrieve()
                    .body(String.class);

            JsonNode postJson = objectMapper.readTree(post);
            String postId = postJson.path("id").asText("unknown");
            return new PublishResult("LinkedIn", "published", postId, "https://www.linkedin.com/feed/update/" + postId, "published");
        } catch (Exception ex) {
            return new PublishResult("LinkedIn", "error", null, null, ex.getMessage());
        }
    }
}
