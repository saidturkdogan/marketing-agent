package com.plinth.publisher;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.scribejava.core.builder.ServiceBuilder;
import com.github.scribejava.core.builder.api.DefaultApi10a;
import com.github.scribejava.core.model.OAuth1AccessToken;
import com.github.scribejava.core.model.OAuthRequest;
import com.github.scribejava.core.model.Verb;
import com.github.scribejava.core.oauth.OAuth10aService;
import com.plinth.persistence.entity.TwitterTokenEntity;
import com.plinth.persistence.repository.TwitterTokenRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class TwitterPublisherService {

    private static final Logger log = LoggerFactory.getLogger(TwitterPublisherService.class);

    private final ObjectMapper objectMapper;
    private final TwitterTokenRepository twitterTokenRepository;
    private final String apiKey;
    private final String apiSecret;
    private final String staticAccessToken;
    private final String staticAccessSecret;

    public TwitterPublisherService(ObjectMapper objectMapper,
                                    TwitterTokenRepository twitterTokenRepository,
                                    @Value("${app.twitter.api-key:}") String apiKey,
                                    @Value("${app.twitter.api-secret:}") String apiSecret,
                                    @Value("${app.twitter.access-token:}") String staticAccessToken,
                                    @Value("${app.twitter.access-secret:}") String staticAccessSecret) {
        this.objectMapper = objectMapper;
        this.twitterTokenRepository = twitterTokenRepository;
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.staticAccessToken = staticAccessToken;
        this.staticAccessSecret = staticAccessSecret;
    }

    private OAuth1AccessToken resolveToken(String companyId) {
        var tokenOpt = twitterTokenRepository.findByCompanyId(companyId);
        if (tokenOpt.isPresent()) {
            TwitterTokenEntity e = tokenOpt.get();
            return new OAuth1AccessToken(e.getAccessToken(), e.getAccessSecret());
        }
        if (!staticAccessToken.isBlank() && !staticAccessSecret.isBlank()) {
            return new OAuth1AccessToken(staticAccessToken, staticAccessSecret);
        }
        return null;
    }

    public PublishResult publishTweet(String text, String companyId) {
        return publishTweet(text, companyId, null);
    }

    public PublishResult publishTweet(String text, String companyId, String imageUrl) {
        OAuth1AccessToken accessTokenObj = resolveToken(companyId);
        if (accessTokenObj == null) {
            return new PublishResult("Twitter", "skipped", null, null,
                    "Twitter not connected for this company. Connect your Twitter account first.");
        }

        try {
            Map<String, Object> tweetPayload = new LinkedHashMap<>();
            tweetPayload.put("text", text);

            if (imageUrl != null && !imageUrl.isBlank()) {
                String mediaId = uploadMedia(imageUrl, accessTokenObj);
                if (mediaId == null || mediaId.isBlank()) {
                    return new PublishResult("Twitter", "error", null, null,
                            "Failed to upload image to X. Try generating the image again or publish without an image.");
                }
                tweetPayload.put("media", Map.of("media_ids", List.of(mediaId)));
            }

            String payload = objectMapper.writeValueAsString(tweetPayload);

            OAuthRequest request = new OAuthRequest(Verb.POST, "https://api.twitter.com/2/tweets");
            request.addHeader("Content-Type", "application/json");
            request.setPayload(payload);

            OAuth10aService oAuthService = buildOAuthService();
            oAuthService.signRequest(accessTokenObj, request);

            var response = oAuthService.execute(request);
            int code = response.getCode();
            String body = response.getBody();

            if (code != 201) {
                return new PublishResult("Twitter", "error", null, null, formatTwitterError(code, body));
            }

            JsonNode json = objectMapper.readTree(body);
            String tweetId = json.path("data").path("id").asText();
            String screenName = resolveScreenName(companyId);
            String tweetUrl = screenName != null && !screenName.isBlank()
                    ? "https://x.com/" + screenName + "/status/" + tweetId
                    : "https://x.com/i/web/status/" + tweetId;

            boolean withImage = imageUrl != null && !imageUrl.isBlank();
            return new PublishResult("Twitter", "published", tweetId, tweetUrl,
                    withImage ? "published with image" : "published");
        } catch (Exception ex) {
            return new PublishResult("Twitter", "error", null, null, ex.getMessage());
        }
    }

    private String uploadMedia(String imageUrl, OAuth1AccessToken accessToken) {
        try {
            byte[] imageBytes = resolveImageBytes(imageUrl);
            if (imageBytes == null || imageBytes.length == 0) {
                log.warn("Twitter media upload skipped: empty image bytes");
                return null;
            }

            String mediaData = Base64.getEncoder().encodeToString(imageBytes);
            OAuthRequest request = new OAuthRequest(Verb.POST, "https://upload.twitter.com/1.1/media/upload.json");
            request.addBodyParameter("media_data", mediaData);
            request.addBodyParameter("media_category", "tweet_image");

            OAuth10aService oAuthService = buildOAuthService();
            oAuthService.signRequest(accessToken, request);
            var response = oAuthService.execute(request);

            if (response.getCode() != 200) {
                log.warn("Twitter media upload failed: {} {}", response.getCode(), response.getBody());
                return null;
            }

            JsonNode json = objectMapper.readTree(response.getBody());
            return json.path("media_id_string").asText(null);
        } catch (Exception ex) {
            log.warn("Twitter media upload error: {}", ex.getMessage());
            return null;
        }
    }

    private byte[] resolveImageBytes(String imageUrl) throws Exception {
        if (imageUrl.startsWith("data:")) {
            int comma = imageUrl.indexOf(',');
            if (comma < 0) {
                return null;
            }
            return Base64.getDecoder().decode(imageUrl.substring(comma + 1));
        }
        if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
            try (var in = URI.create(imageUrl).toURL().openStream()) {
                return in.readAllBytes();
            }
        }
        return null;
    }

    private OAuth10aService buildOAuthService() {
        return new ServiceBuilder(apiKey)
                .apiSecret(apiSecret)
                .build(new TwitterApi());
    }

    private String resolveScreenName(String companyId) {
        return twitterTokenRepository.findByCompanyId(companyId)
                .map(TwitterTokenEntity::getScreenName)
                .orElse(null);
    }

    private String formatTwitterError(int code, String body) {
        if (code == 402) {
            return "X API posting requires paid credits. Open developer.x.com → your project → Billing, "
                    + "add credits, then try again. OAuth connection is fine; only the write API is paywalled.";
        }
        if (code == 403) {
            return "X API denied this post (403). Check app permissions are Read and Write, "
                    + "and regenerate keys after changing permissions. Details: " + body;
        }
        if (code == 429) {
            return "X API rate limit reached (429). Wait a few minutes and try again.";
        }
        return "Twitter API returned " + code + ": " + body;
    }

    private static class TwitterApi extends DefaultApi10a {
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
