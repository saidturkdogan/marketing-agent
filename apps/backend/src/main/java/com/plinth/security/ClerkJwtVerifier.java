package com.plinth.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigInteger;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.spec.RSAPublicKeySpec;
import java.time.Duration;
import java.util.Base64;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Component
public class ClerkJwtVerifier {

    private static final Logger log = LoggerFactory.getLogger(ClerkJwtVerifier.class);

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String jwksUrl;
    private final String issuer;
    private final ConcurrentMap<String, PublicKey> keyCache = new ConcurrentHashMap<>();
    private volatile long lastFetchMs = 0;

    public ClerkJwtVerifier(ObjectMapper objectMapper,
                            @Value("${app.clerk.jwks-url:}") String jwksUrl,
                            @Value("${app.clerk.issuer:}") String issuer) {
        this.objectMapper = objectMapper;
        this.jwksUrl = jwksUrl;
        this.issuer = issuer;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public Claims verifyAndParse(String token) {
        if (jwksUrl == null || jwksUrl.isBlank()) {
            throw new IllegalStateException("Clerk JWKS URL not configured");
        }

        var unsignedClaims = parseUnsigned(token);
        var keyId = (String) unsignedClaims.get("kid");
        if (keyId == null) {
            throw new IllegalArgumentException("Token missing 'kid' header");
        }

        var publicKey = keyCache.computeIfAbsent(keyId, this::fetchKey);

        return Jwts.parser()
                .verifyWith(publicKey)
                .requireIssuer(issuer)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private PublicKey fetchKey(String keyId) {
        refreshKeyCache();
        var key = keyCache.get(keyId);
        if (key == null) {
            throw new IllegalStateException("Key not found in Clerk JWKS: " + keyId);
        }
        return key;
    }

    private void refreshKeyCache() {
        if (System.currentTimeMillis() - lastFetchMs < 300_000 && !keyCache.isEmpty()) {
            return;
        }
        synchronized (this) {
            if (System.currentTimeMillis() - lastFetchMs < 300_000 && !keyCache.isEmpty()) {
                return;
            }
            try {
                var request = HttpRequest.newBuilder()
                        .uri(URI.create(jwksUrl))
                        .timeout(Duration.ofSeconds(10))
                        .GET()
                        .build();
                var response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                var root = objectMapper.readTree(response.body());
                var keys = root.path("keys");
                for (var keyNode : keys) {
                    var kid = keyNode.path("kid").asText();
                    var n = keyNode.path("n").asText();
                    var e = keyNode.path("e").asText();
                    var keySpec = new RSAPublicKeySpec(
                            new BigInteger(1, Base64.getUrlDecoder().decode(n)),
                            new BigInteger(1, Base64.getUrlDecoder().decode(e)));
                    var publicKey = KeyFactory.getInstance("RSA").generatePublic(keySpec);
                    keyCache.put(kid, publicKey);
                }
                lastFetchMs = System.currentTimeMillis();
                log.info("Refreshed Clerk JWKS: {} keys loaded", keys.size());
            } catch (Exception ex) {
                log.error("Failed to fetch Clerk JWKS: {}", ex.getMessage());
                if (keyCache.isEmpty()) {
                    throw new IllegalStateException("Cannot fetch Clerk JWKS and cache is empty", ex);
                }
            }
        }
    }

    private Claims parseUnsigned(String token) {
        var parts = token.split("\\.");
        if (parts.length < 2) {
            throw new IllegalArgumentException("Invalid JWT format");
        }
        try {
            var headerJson = new String(Base64.getUrlDecoder().decode(parts[0]));
            var headerNode = objectMapper.readTree(headerJson);
            return Jwts.claims()
                    .add("kid", headerNode.path("kid").asText())
                    .build();
        } catch (Exception ex) {
            throw new IllegalArgumentException("Failed to parse JWT header", ex);
        }
    }
}
