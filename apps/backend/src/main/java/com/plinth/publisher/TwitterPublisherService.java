package com.plinth.publisher;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.scribejava.core.builder.ServiceBuilder;
import com.github.scribejava.core.model.OAuth1AccessToken;
import com.github.scribejava.core.model.OAuthRequest;
import com.github.scribejava.core.model.Verb;
import com.github.scribejava.core.oauth.OAuth10aService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

@Service
public class TwitterPublisherService {

    private final OAuth10aService oAuthService;
    private final OAuth1AccessToken accessTokenObj;
    private final ObjectMapper objectMapper;
    private final boolean configured;

    public TwitterPublisherService(ObjectMapper objectMapper,
                                    @Value("${app.twitter.api-key:}") String apiKey,
                                    @Value("${app.twitter.api-secret:}") String apiSecret,
                                    @Value("${app.twitter.access-token:}") String accessToken,
                                    @Value("${app.twitter.access-secret:}") String accessSecret) {
        this.objectMapper = objectMapper;
        boolean hasCreds = !apiKey.isBlank() && !apiSecret.isBlank() && !accessToken.isBlank() && !accessSecret.isBlank();
        this.configured = hasCreds;
        if (hasCreds) {
            this.oAuthService = new ServiceBuilder(apiKey)
                    .apiSecret(apiSecret)
                    .build(new TwitterApi());
            this.accessTokenObj = new OAuth1AccessToken(accessToken, accessSecret);
        } else {
            this.oAuthService = null;
            this.accessTokenObj = null;
        }
    }

    public PublishResult publishTweet(String text) {
        if (!configured) {
            return new PublishResult("Twitter", "skipped", null, null, "Twitter credentials not configured");
        }

        try {
            var payload = objectMapper.writeValueAsString(java.util.Map.of("text", text));

            OAuthRequest request = new OAuthRequest(Verb.POST, "https://api.twitter.com/2/tweets");
            request.addHeader("Content-Type", "application/json");
            request.setPayload(payload);

            oAuthService.signRequest(accessTokenObj, request);

            var response = oAuthService.execute(request);
            int code = response.getCode();
            String body = response.getBody();

            if (code != 201) {
                return new PublishResult("Twitter", "error", null, null,
                        "Twitter API returned " + code + ": " + body);
            }

            JsonNode json = objectMapper.readTree(body);
            String tweetId = json.path("data").path("id").asText();
            String tweetUrl = "https://x.com/user/status/" + tweetId;

            return new PublishResult("Twitter", "published", tweetId, tweetUrl, "published");
        } catch (Exception ex) {
            return new PublishResult("Twitter", "error", null, null, ex.getMessage());
        }
    }

    private static class TwitterApi extends com.github.scribejava.core.builder.api.DefaultApi10a {
        @Override
        public String getRequestTokenEndpoint() {
            return "https://api.twitter.com/oauth/request_token";
        }

        @Override
        public String getAccessTokenEndpoint() {
            return "https://api.twitter.com/oauth/access_token";
        }

        @Override
        protected String getAuthorizationBaseUrl() {
            return "https://api.twitter.com/oauth/authorize";
        }
    }
}
