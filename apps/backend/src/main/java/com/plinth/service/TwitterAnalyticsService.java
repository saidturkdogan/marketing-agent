package com.plinth.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.scribejava.core.builder.ServiceBuilder;
import com.github.scribejava.core.builder.api.DefaultApi10a;
import com.github.scribejava.core.model.OAuth1AccessToken;
import com.github.scribejava.core.model.OAuthRequest;
import com.github.scribejava.core.model.Response;
import com.github.scribejava.core.model.Verb;
import com.github.scribejava.core.oauth.OAuth10aService;
import com.plinth.persistence.entity.TwitterTokenEntity;
import com.plinth.persistence.repository.TwitterTokenRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class TwitterAnalyticsService {

    private static final Logger log = LoggerFactory.getLogger(TwitterAnalyticsService.class);

    private final ObjectMapper objectMapper;
    private final TwitterTokenRepository twitterTokenRepository;
    private final String apiKey;
    private final String apiSecret;
    private final String staticAccessToken;
    private final String staticAccessSecret;

    public TwitterAnalyticsService(ObjectMapper objectMapper,
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

    public boolean isConnected(String companyId) {
        return resolveToken(companyId) != null;
    }

    public Map<String, Object> fetchRecentMetrics(String companyId) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("source", "twitter_api");
        result.put("connected", false);

        OAuth1AccessToken token = resolveToken(companyId);
        if (token == null || apiKey.isBlank() || apiSecret.isBlank()) {
            result.put("message", "Twitter not connected or API keys missing");
            return result;
        }

        try {
            String userId = resolveTwitterUserId(companyId, token);
            if (userId == null || userId.isBlank()) {
                result.put("message", "Could not resolve Twitter user id");
                return result;
            }

            OAuthRequest request = new OAuthRequest(Verb.GET,
                    "https://api.twitter.com/2/users/" + userId + "/tweets"
                            + "?max_results=10&tweet.fields=public_metrics,created_at,text");
            OAuth10aService oAuthService = buildOAuthService();
            oAuthService.signRequest(token, request);
            Response response = oAuthService.execute(request);

            if (response.getCode() != 200) {
                result.put("message", "Twitter API " + response.getCode() + ": " + response.getBody());
                return result;
            }

            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode data = root.path("data");
            List<Map<String, Object>> tweets = new ArrayList<>();
            int totalLikes = 0;
            int totalRetweets = 0;
            int totalReplies = 0;
            int totalImpressions = 0;

            if (data.isArray()) {
                for (JsonNode tweet : data) {
                    JsonNode metrics = tweet.path("public_metrics");
                    int likes = metrics.path("like_count").asInt(0);
                    int retweets = metrics.path("retweet_count").asInt(0);
                    int replies = metrics.path("reply_count").asInt(0);
                    int impressions = metrics.path("impression_count").asInt(0);

                    totalLikes += likes;
                    totalRetweets += retweets;
                    totalReplies += replies;
                    totalImpressions += impressions;

                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", tweet.path("id").asText());
                    item.put("text", tweet.path("text").asText("").substring(0, Math.min(120, tweet.path("text").asText("").length())));
                    item.put("likes", likes);
                    item.put("retweets", retweets);
                    item.put("replies", replies);
                    item.put("impressions", impressions);
                    item.put("engagement", likes + retweets + replies);
                    tweets.add(item);
                }
            }

            result.put("connected", true);
            result.put("tweets", tweets);
            result.put("aggregate", Map.of(
                    "total_likes", totalLikes,
                    "total_retweets", totalRetweets,
                    "total_replies", totalReplies,
                    "total_impressions", totalImpressions,
                    "avg_engagement", tweets.isEmpty() ? 0 : (totalLikes + totalRetweets + totalReplies) / tweets.size()
            ));
            result.put("top_performer", tweets.stream()
                    .max(java.util.Comparator.comparingInt(t -> (Integer) t.getOrDefault("engagement", 0)))
                    .orElse(null));
        } catch (Exception ex) {
            log.warn("Twitter metrics fetch failed for {}: {}", companyId, ex.getMessage());
            result.put("message", ex.getMessage());
        }
        return result;
    }

    private String resolveTwitterUserId(String companyId, OAuth1AccessToken token) throws Exception {
        return twitterTokenRepository.findByCompanyId(companyId)
                .map(TwitterTokenEntity::getTwitterUserId)
                .filter(id -> id != null && !id.isBlank())
                .orElseGet(() -> {
                    try {
                        OAuthRequest me = new OAuthRequest(Verb.GET, "https://api.twitter.com/2/users/me");
                        OAuth10aService svc = buildOAuthService();
                        svc.signRequest(token, me);
                        Response resp = svc.execute(me);
                        if (resp.getCode() == 200) {
                            JsonNode json = objectMapper.readTree(resp.getBody());
                            return json.path("data").path("id").asText(null);
                        }
                    } catch (Exception ex) {
                        log.debug("users/me failed: {}", ex.getMessage());
                    }
                    return null;
                });
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

    private OAuth10aService buildOAuthService() {
        return new ServiceBuilder(apiKey)
                .apiSecret(apiSecret)
                .build(new TwitterApi());
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
