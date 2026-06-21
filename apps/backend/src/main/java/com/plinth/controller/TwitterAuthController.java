package com.plinth.controller;

import com.plinth.service.TwitterAuthService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.view.RedirectView;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@RestController
@RequestMapping("/api/twitter")
public class TwitterAuthController {

    private final TwitterAuthService authService;
    private final String staticAccessToken;
    private final String staticAccessSecret;

    public TwitterAuthController(TwitterAuthService authService,
            @Value("${app.twitter.access-token:}") String staticAccessToken,
            @Value("${app.twitter.access-secret:}") String staticAccessSecret) {
        this.authService = authService;
        this.staticAccessToken = staticAccessToken;
        this.staticAccessSecret = staticAccessSecret;
    }

    @GetMapping("/auth-url")
    public ResponseEntity<Map<String, Object>> getAuthUrl(@RequestParam String companyId) {
        if (!authService.isConfigured()) {
            return ResponseEntity.ok(Map.of(
                    "url", "",
                    "configured", false,
                    "message", "Twitter API credentials not configured on the server"
            ));
        }
        String url = authService.generateAuthUrl(companyId);
        return ResponseEntity.ok(Map.of("url", url, "configured", true));
    }

    @GetMapping("/callback")
    public RedirectView handleCallback(
            @RequestParam("oauth_token") String oauthToken,
            @RequestParam("oauth_verifier") String oauthVerifier) {
        String frontendRedirect = authService.getFrontendRedirect();
        String base = frontendRedirect.endsWith("/") ? frontendRedirect : frontendRedirect + "/";
        try {
            var result = authService.handleCallback(oauthToken, oauthVerifier);
            String redirect = base + result.companyId()
                    + "?twitter_connected=true"
                    + "&screen_name=" + URLEncoder.encode(result.screenName(), StandardCharsets.UTF_8);
            return new RedirectView(redirect);
        } catch (Exception e) {
            String redirect = base + "?twitter_connected=error&message="
                    + URLEncoder.encode(e.getMessage(), StandardCharsets.UTF_8);
            return new RedirectView(redirect);
        }
    }

    @GetMapping("/status/{companyId}")
    public ResponseEntity<Map<String, Object>> getStatus(@PathVariable String companyId) {
        boolean connected = authService.isConnected(companyId);
        boolean staticConfigured = !staticAccessToken.isBlank() && !staticAccessSecret.isBlank();
        Map<String, Object> body = new java.util.HashMap<>();
        body.put("connected", connected);
        body.put("configured", authService.isConfigured());
        body.put("staticFallback", staticConfigured);
        if (connected) {
            var token = authService.getToken(companyId);
            body.put("screenName", token.getScreenName());
            body.put("twitterUserId", token.getTwitterUserId());
        }
        return ResponseEntity.ok(body);
    }
}
