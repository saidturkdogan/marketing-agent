package com.plinth.controller;

import com.plinth.service.GmailAuthService;
import com.plinth.service.GmailFetchService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.view.RedirectView;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@RestController
@RequestMapping("/api/gmail")
public class GmailController {

    private final GmailAuthService gmailAuthService;
    private final GmailFetchService gmailFetchService;
    private final String frontendRedirect;

    public GmailController(
            GmailAuthService gmailAuthService,
            GmailFetchService gmailFetchService,
            @Value("${app.gmail.frontend-redirect}") String frontendRedirect) {
        this.gmailAuthService = gmailAuthService;
        this.gmailFetchService = gmailFetchService;
        this.frontendRedirect = frontendRedirect;
    }

    @GetMapping("/auth-url")
    public ResponseEntity<Map<String, String>> getAuthUrl(@RequestParam String companyId) {
        String url = gmailAuthService.generateAuthUrl(companyId);
        return ResponseEntity.ok(Map.of("url", url));
    }

    @GetMapping("/callback")
    public RedirectView handleCallback(
            @RequestParam String code,
            @RequestParam("state") String companyId) {
        try {
            String email = gmailAuthService.handleCallback(code, companyId);
            String redirect = frontendRedirect + "?email_connected=true&company_id="
                    + URLEncoder.encode(companyId, StandardCharsets.UTF_8)
                    + "&email=" + URLEncoder.encode(email, StandardCharsets.UTF_8);
            return new RedirectView(redirect);
        } catch (Exception e) {
            String redirect = frontendRedirect + "?email_connected=error&message="
                    + URLEncoder.encode(e.getMessage(), StandardCharsets.UTF_8);
            return new RedirectView(redirect);
        }
    }

    @GetMapping("/status/{companyId}")
    public ResponseEntity<Map<String, Object>> getStatus(@PathVariable String companyId) {
        boolean connected = gmailAuthService.isConnected(companyId);
        return ResponseEntity.ok(Map.of(
                "connected", connected,
                "companyId", companyId
        ));
    }

    @PostMapping("/fetch/{companyId}")
    public ResponseEntity<Map<String, Object>> fetchEmails(@PathVariable String companyId,
                                                            @RequestParam(defaultValue = "20") int maxResults) {
        var messages = gmailFetchService.fetchRecentEmails(companyId, maxResults);
        return ResponseEntity.ok(Map.of(
                "fetched", messages.size(),
                "companyId", companyId
        ));
    }

    @GetMapping("/messages/{companyId}")
    public ResponseEntity<?> getMessages(@PathVariable String companyId) {
        return ResponseEntity.ok(gmailFetchService.getMessages(companyId));
    }
}
