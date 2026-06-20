package com.plinth.service;

import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeRequestUrl;
import com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets;
import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.gmail.GmailScopes;
import com.plinth.persistence.entity.CompanyEntity;
import com.plinth.persistence.entity.GmailTokenEntity;
import com.plinth.persistence.repository.CompanyRepository;
import com.plinth.persistence.repository.GmailTokenRepository;
import com.plinth.security.AuthUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Collections;
import java.util.List;

@Service
public class GmailAuthService {

    private static final JsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();
    private static final List<String> SCOPES = Collections.singletonList(GmailScopes.GMAIL_READONLY);

    private final GmailTokenRepository gmailTokenRepository;
    private final CompanyRepository companyRepository;
    private final AuthUtils authUtils;
    private final String clientId;
    private final String clientSecret;
    private final String redirectUri;

    public GmailAuthService(
            GmailTokenRepository gmailTokenRepository,
            CompanyRepository companyRepository,
            AuthUtils authUtils,
            @Value("${app.gmail.client-id}") String clientId,
            @Value("${app.gmail.client-secret}") String clientSecret,
            @Value("${app.gmail.redirect-uri}") String redirectUri) {
        this.gmailTokenRepository = gmailTokenRepository;
        this.companyRepository = companyRepository;
        this.authUtils = authUtils;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUri = redirectUri;
    }

    public String generateAuthUrl(String companyId) {
        GoogleAuthorizationCodeFlow flow = createFlow();
        GoogleAuthorizationCodeRequestUrl url = flow.newAuthorizationUrl()
                .setRedirectUri(redirectUri)
                .setState(companyId)
                .setAccessType("offline")
                .setApprovalPrompt("force");
        return url.build();
    }

    @Transactional
    public String handleCallback(String code, String companyId) throws Exception {
        GoogleAuthorizationCodeFlow flow = createFlow();
        GoogleTokenResponse tokenResponse = flow.newTokenRequest(code)
                .setRedirectUri(redirectUri)
                .execute();

        CompanyEntity company = companyRepository.findByCompanyId(companyId)
                .orElseThrow(() -> new IllegalArgumentException("Company not found: " + companyId));
        Long userId = company.getUserId();
        String email = extractEmail(flow, tokenResponse);

        GmailTokenEntity existing = gmailTokenRepository.findByCompanyId(companyId).orElse(null);
        if (existing != null) {
            gmailTokenRepository.delete(existing);
        }

        GmailTokenEntity entity = new GmailTokenEntity();
        entity.setUserId(userId);
        entity.setCompanyId(companyId);
        entity.setEmail(email);
        entity.setAccessToken(tokenResponse.getAccessToken());
        entity.setRefreshToken(tokenResponse.getRefreshToken());
        if (tokenResponse.getExpiresInSeconds() != null) {
            entity.setTokenExpiry(OffsetDateTime.now(ZoneOffset.UTC)
                    .plusSeconds(tokenResponse.getExpiresInSeconds()));
        }
        gmailTokenRepository.save(entity);

        return email;
    }

    public GmailTokenEntity getToken(String companyId) {
        return gmailTokenRepository.findByCompanyId(companyId)
                .orElseThrow(() -> new IllegalArgumentException("Gmail not connected for this company"));
    }

    public boolean isConnected(String companyId) {
        return gmailTokenRepository.findByCompanyId(companyId).isPresent();
    }

    public Credential loadCredential(GmailTokenEntity token) {
        GoogleClientSecrets.Details details = new GoogleClientSecrets.Details();
        details.setClientId(clientId);
        details.setClientSecret(clientSecret);

        GoogleClientSecrets clientSecrets = new GoogleClientSecrets().setInstalled(details);
        GoogleAuthorizationCodeFlow flow = new GoogleAuthorizationCodeFlow.Builder(
                new NetHttpTransport(), JSON_FACTORY, clientSecrets, SCOPES)
                .setAccessType("offline")
                .build();

        Credential credential = new Credential.Builder(flow.getMethod()).build()
                .setAccessToken(token.getAccessToken())
                .setRefreshToken(token.getRefreshToken());

        if (token.getTokenExpiry() != null
                && token.getTokenExpiry().isBefore(OffsetDateTime.now(ZoneOffset.UTC))
                && credential.getRefreshToken() != null) {
            try {
                credential.refreshToken();
                token.setAccessToken(credential.getAccessToken());
                if (credential.getExpiresInSeconds() != null) {
                    token.setTokenExpiry(OffsetDateTime.now(ZoneOffset.UTC)
                            .plusSeconds(credential.getExpiresInSeconds()));
                }
                gmailTokenRepository.save(token);
            } catch (Exception e) {
                throw new RuntimeException("Failed to refresh Gmail token", e);
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
            var service = new com.google.api.services.gmail.Gmail.Builder(
                    new NetHttpTransport(), JSON_FACTORY, token)
                    .setApplicationName("Plinth")
                    .build();
            var profile = service.users().getProfile("me").execute();
            return profile.getEmailAddress();
        } catch (Exception e) {
            return "";
        }
    }
}
