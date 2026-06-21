package com.plinth.service;

import com.github.scribejava.core.builder.ServiceBuilder;
import com.github.scribejava.core.builder.api.DefaultApi10a;
import com.github.scribejava.core.model.OAuth1AccessToken;
import com.github.scribejava.core.model.OAuth1RequestToken;
import com.github.scribejava.core.oauth.OAuth10aService;
import com.plinth.persistence.entity.CompanyEntity;
import com.plinth.persistence.entity.TwitterTokenEntity;
import com.plinth.persistence.repository.CompanyRepository;
import com.plinth.persistence.repository.TwitterTokenRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TwitterAuthService {

    private final TwitterTokenRepository tokenRepository;
    private final CompanyRepository companyRepository;
    private final String apiKey;
    private final String apiSecret;
    private final String callbackUrl;
    private final String frontendRedirect;

    private final Map<String, RequestTokenHolder> pendingTokens = new ConcurrentHashMap<>();

    public TwitterAuthService(
            TwitterTokenRepository tokenRepository,
            CompanyRepository companyRepository,
            @Value("${app.twitter.api-key:}") String apiKey,
            @Value("${app.twitter.api-secret:}") String apiSecret,
            @Value("${app.twitter.callback-url:}") String callbackUrl,
            @Value("${app.twitter.frontend-redirect:}") String frontendRedirect) {
        this.tokenRepository = tokenRepository;
        this.companyRepository = companyRepository;
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.callbackUrl = callbackUrl;
        this.frontendRedirect = frontendRedirect;
    }

    public String getFrontendRedirect() {
        return frontendRedirect;
    }

    public boolean isConfigured() {
        return !apiKey.isBlank() && !apiSecret.isBlank();
    }

    public String generateAuthUrl(String companyId) {
        OAuth10aService service = buildService(callbackUrl);
        try {
            OAuth1RequestToken requestToken = service.getRequestToken();
            pendingTokens.put(requestToken.getToken(), new RequestTokenHolder(requestToken, companyId));
            return service.getAuthorizationUrl(requestToken);
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate Twitter auth URL", e);
        }
    }

    @Transactional
    public CallbackResult handleCallback(String oauthToken, String oauthVerifier) throws Exception {
        RequestTokenHolder holder = pendingTokens.remove(oauthToken);
        if (holder == null) {
            throw new IllegalArgumentException("Unknown or expired request token. Please try connecting again.");
        }

        OAuth10aService service = buildService(callbackUrl);
        OAuth1AccessToken accessToken = service.getAccessToken(holder.requestToken, oauthVerifier);

        String twitterUserId = accessToken.getParameter("user_id");
        String screenName = accessToken.getParameter("screen_name");

        CompanyEntity company = companyRepository.findByCompanyId(holder.companyId)
                .orElseThrow(() -> new IllegalArgumentException("Company not found: " + holder.companyId));

        TwitterTokenEntity existing = tokenRepository.findByCompanyId(holder.companyId).orElse(null);
        if (existing != null) {
            tokenRepository.delete(existing);
        }

        TwitterTokenEntity entity = new TwitterTokenEntity();
        entity.setUserId(company.getUserId());
        entity.setCompanyId(holder.companyId);
        entity.setAccessToken(accessToken.getToken());
        entity.setAccessSecret(accessToken.getTokenSecret());
        entity.setTwitterUserId(twitterUserId);
        entity.setScreenName(screenName);
        tokenRepository.save(entity);

        return new CallbackResult(screenName, holder.companyId);
    }

    public record CallbackResult(String screenName, String companyId) {}

    public boolean isConnected(String companyId) {
        return tokenRepository.findByCompanyId(companyId).isPresent();
    }

    public TwitterTokenEntity getToken(String companyId) {
        return tokenRepository.findByCompanyId(companyId)
                .orElseThrow(() -> new IllegalArgumentException("Twitter not connected for this company"));
    }

    private OAuth10aService buildService(String callback) {
        return new ServiceBuilder(apiKey)
                .apiSecret(apiSecret)
                .callback(callback)
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

    private record RequestTokenHolder(OAuth1RequestToken requestToken, String companyId) {}
}
