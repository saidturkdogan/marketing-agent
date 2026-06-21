package com.plinth.service;

import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.auth.oauth2.ClientParametersAuthentication;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeRequestUrl;
import com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets;
import com.google.api.client.googleapis.auth.oauth2.GoogleOAuthConstants;
import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import com.google.api.client.http.GenericUrl;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.gson.GsonFactory;
import com.plinth.persistence.entity.CompanyEntity;
import com.plinth.persistence.entity.GmailTokenEntity;
import com.plinth.persistence.entity.GoogleCalendarTokenEntity;
import com.plinth.persistence.repository.CompanyRepository;
import com.plinth.persistence.repository.GmailTokenRepository;
import com.plinth.persistence.repository.GoogleCalendarTokenRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class GoogleCalendarAuthService {

    private static final JsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();
    private static final List<String> SCOPES = List.of(
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/calendar.events",
            "https://www.googleapis.com/auth/userinfo.email"
    );

    private final GoogleCalendarTokenRepository tokenRepository;
    private final GmailTokenRepository gmailTokenRepository;
    private final CompanyRepository companyRepository;
    private final String clientId;
    private final String clientSecret;
    private final String redirectUri;

    public GoogleCalendarAuthService(
            GoogleCalendarTokenRepository tokenRepository,
            GmailTokenRepository gmailTokenRepository,
            CompanyRepository companyRepository,
            @Value("${app.google-calendar.client-id}") String clientId,
            @Value("${app.google-calendar.client-secret}") String clientSecret,
            @Value("${app.google-calendar.redirect-uri}") String redirectUri) {
        this.tokenRepository = tokenRepository;
        this.gmailTokenRepository = gmailTokenRepository;
        this.companyRepository = companyRepository;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUri = redirectUri;
    }

    public String generateAuthUrl(String companyId) {
        GoogleAuthorizationCodeFlow flow = createFlow();
        return flow.newAuthorizationUrl()
                .setRedirectUri(redirectUri)
                .setState(companyId)
                .setAccessType("offline")
                .setApprovalPrompt("force")
                .build();
    }

    @Transactional
    public String handleCallback(String code, String companyId) throws Exception {
        GoogleAuthorizationCodeFlow flow = createFlow();
        GoogleTokenResponse tokenResponse = flow.newTokenRequest(code)
                .setRedirectUri(redirectUri)
                .execute();

        CompanyEntity company = companyRepository.findByCompanyId(companyId)
                .orElseThrow(() -> new IllegalArgumentException("Company not found: " + companyId));
        String email = extractEmail(flow, tokenResponse);

        // Save Calendar Token
        GoogleCalendarTokenEntity entity = tokenRepository.findByCompanyId(companyId)
                .orElseGet(GoogleCalendarTokenEntity::new);
        entity.setUserId(company.getUserId());
        entity.setCompanyId(companyId);
        entity.setEmail(email);
        entity.setAccessToken(tokenResponse.getAccessToken());
        if (tokenResponse.getRefreshToken() != null) {
            entity.setRefreshToken(tokenResponse.getRefreshToken());
        }
        if (tokenResponse.getExpiresInSeconds() != null) {
            entity.setTokenExpiry(OffsetDateTime.now(ZoneOffset.UTC)
                    .plusSeconds(tokenResponse.getExpiresInSeconds()));
        }
        tokenRepository.save(entity);

        // Save Gmail Token automatically with the same credentials and scopes
        GmailTokenEntity gmailEntity = gmailTokenRepository.findByCompanyId(companyId)
                .orElseGet(GmailTokenEntity::new);
        gmailEntity.setUserId(company.getUserId());
        gmailEntity.setCompanyId(companyId);
        gmailEntity.setEmail(email);
        gmailEntity.setAccessToken(tokenResponse.getAccessToken());
        if (tokenResponse.getRefreshToken() != null) {
            gmailEntity.setRefreshToken(tokenResponse.getRefreshToken());
        }
        if (tokenResponse.getExpiresInSeconds() != null) {
            gmailEntity.setTokenExpiry(OffsetDateTime.now(ZoneOffset.UTC)
                    .plusSeconds(tokenResponse.getExpiresInSeconds()));
        }
        gmailTokenRepository.save(gmailEntity);

        return email;
    }

    public GoogleCalendarTokenEntity getToken(String companyId) {
        return tokenRepository.findByCompanyId(companyId)
                .orElseThrow(() -> new IllegalArgumentException("Google Calendar not connected for this company"));
    }

    @Transactional
    public boolean isConnected(String companyId) {
        return tokenRepository.findByCompanyId(companyId).isPresent();
    }

    public Map<String, Object> getConnectionStatus(String companyId) {
        Map<String, Object> status = new HashMap<>();
        Optional<GoogleCalendarTokenEntity> tokenOpt = tokenRepository.findByCompanyId(companyId);
        if (tokenOpt.isEmpty()) {
            status.put("connected", false);
            status.put("writeAccess", false);
            status.put("needsReconnect", true);
            return status;
        }

        GoogleCalendarTokenEntity token = tokenOpt.get();
        boolean writeAccess = hasCalendarWriteAccess(token);
        status.put("connected", true);
        status.put("email", token.getEmail());
        status.put("writeAccess", writeAccess);
        status.put("needsReconnect", !writeAccess);
        return status;
    }

    public boolean hasCalendarWriteAccess(String companyId) {
        return tokenRepository.findByCompanyId(companyId)
                .map(this::hasCalendarWriteAccess)
                .orElse(false);
    }

    private boolean hasCalendarWriteAccess(GoogleCalendarTokenEntity token) {
        try {
            Credential credential = loadCredential(token);
            String accessToken = credential.getAccessToken();
            if (accessToken == null || accessToken.isBlank()) {
                return false;
            }

            var request = new NetHttpTransport().createRequestFactory()
                    .buildGetRequest(new GenericUrl(
                            "https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=" + accessToken));
            var response = request.execute();
            var json = JSON_FACTORY.fromInputStream(response.getContent(), Object.class);
            if (json instanceof Map<?, ?> map && map.get("scope") != null) {
                String scope = map.get("scope").toString();
                return scope.contains("calendar.events");
            }
        } catch (Exception ignored) {
            // fall through
        }
        return false;
    }

    public Credential loadCredential(GoogleCalendarTokenEntity token) {
        GoogleAuthorizationCodeFlow flow = createFlow();
        NetHttpTransport transport = new NetHttpTransport();
        Credential credential = new Credential.Builder(flow.getMethod())
                .setTransport(transport)
                .setJsonFactory(JSON_FACTORY)
                .setClientAuthentication(new ClientParametersAuthentication(clientId, clientSecret))
                .setTokenServerUrl(new GenericUrl(GoogleOAuthConstants.TOKEN_SERVER_URL))
                .build()
                .setAccessToken(token.getAccessToken())
                .setRefreshToken(token.getRefreshToken());

        if (token.getTokenExpiry() != null) {
            credential.setExpirationTimeMilliseconds(
                    token.getTokenExpiry().toInstant().toEpochMilli());
        }

        Long expiresIn = credential.getExpiresInSeconds();
        if (expiresIn != null && expiresIn <= 60 && credential.getRefreshToken() != null) {
            try {
                credential.refreshToken();
                token.setAccessToken(credential.getAccessToken());
                if (credential.getExpiresInSeconds() != null) {
                    token.setTokenExpiry(OffsetDateTime.now(ZoneOffset.UTC)
                            .plusSeconds(credential.getExpiresInSeconds()));
                }
                tokenRepository.save(token);
            } catch (Exception e) {
                throw new RuntimeException("Failed to refresh Google Calendar token", e);
            }
        }

        return credential;
    }

    private GoogleAuthorizationCodeFlow createFlow() {
        GoogleClientSecrets.Details details = new GoogleClientSecrets.Details();
        details.setClientId(clientId);
        details.setClientSecret(clientSecret);

        GoogleClientSecrets clientSecrets = new GoogleClientSecrets().setInstalled(details);
        return new GoogleAuthorizationCodeFlow.Builder(
                new NetHttpTransport(), JSON_FACTORY, clientSecrets, SCOPES)
                .setAccessType("offline")
                .build();
    }

    private String extractEmail(GoogleAuthorizationCodeFlow flow, GoogleTokenResponse tokenResponse) {
        try {
            var token = flow.createAndStoreCredential(tokenResponse, null);
            var request = new NetHttpTransport().createRequestFactory(token)
                    .buildGetRequest(new com.google.api.client.http.GenericUrl(
                            "https://www.googleapis.com/oauth2/v2/userinfo"));
            var response = request.execute();
            var json = JSON_FACTORY.fromInputStream(response.getContent(), Object.class);
            if (json instanceof java.util.Map<?, ?> map && map.get("email") != null) {
                return map.get("email").toString();
            }
        } catch (Exception ignored) {
            // optional
        }
        return "";
    }
}
