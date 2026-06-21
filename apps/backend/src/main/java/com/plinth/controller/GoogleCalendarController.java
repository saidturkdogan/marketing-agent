package com.plinth.controller;

import com.plinth.service.ContentService;
import com.plinth.service.GoogleCalendarAuthService;
import com.plinth.service.GoogleCalendarEventService;
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
@RequestMapping("/api/calendar")
public class GoogleCalendarController {

    private final GoogleCalendarAuthService authService;
    private final GoogleCalendarEventService eventService;
    private final ContentService contentService;
    private final String frontendRedirect;

    public GoogleCalendarController(
            GoogleCalendarAuthService authService,
            GoogleCalendarEventService eventService,
            ContentService contentService,
            @Value("${app.google-calendar.frontend-redirect}") String frontendRedirect) {
        this.authService = authService;
        this.eventService = eventService;
        this.contentService = contentService;
        this.frontendRedirect = frontendRedirect;
    }

    @GetMapping("/auth-url")
    public ResponseEntity<Map<String, String>> getAuthUrl(@RequestParam String companyId) {
        String url = authService.generateAuthUrl(companyId);
        return ResponseEntity.ok(Map.of("url", url));
    }

    @GetMapping("/callback")
    public RedirectView handleCallback(
            @RequestParam String code,
            @RequestParam("state") String companyId) {
        try {
            String email = authService.handleCallback(code, companyId);
            try {
                contentService.syncScheduledPostsToCalendar(companyId);
            } catch (Exception syncEx) {
                // OAuth succeeded; sync can be retried from dashboard
            }
            String base = frontendRedirect.endsWith("/") ? frontendRedirect : frontendRedirect + "/";
            String redirect = base + companyId
                    + "?calendar_connected=true"
                    + "&email=" + URLEncoder.encode(email, StandardCharsets.UTF_8);
            return new RedirectView(redirect);
        } catch (Exception e) {
            String base = frontendRedirect.endsWith("/") ? frontendRedirect : frontendRedirect + "/";
            String redirect = base + companyId
                    + "?calendar_connected=error&message="
                    + URLEncoder.encode(e.getMessage(), StandardCharsets.UTF_8);
            return new RedirectView(redirect);
        }
    }

    @GetMapping("/status/{companyId}")
    public ResponseEntity<Map<String, Object>> getStatus(@PathVariable String companyId) {
        Map<String, Object> body = new java.util.HashMap<>(authService.getConnectionStatus(companyId));
        body.put("companyId", companyId);
        if (Boolean.TRUE.equals(body.get("connected"))) {
            body.put("unsyncedScheduled", contentService.countUnsyncedScheduled(companyId));
        }
        return ResponseEntity.ok(body);
    }

    @GetMapping("/events/{companyId}")
    public ResponseEntity<Map<String, Object>> getEvents(
            @PathVariable String companyId,
            @RequestParam(defaultValue = "7") int days) {
        if (!authService.isConnected(companyId)) {
            return ResponseEntity.ok(Map.of(
                    "connected", false,
                    "companyId", companyId,
                    "events", java.util.List.of()
            ));
        }
        return ResponseEntity.ok(eventService.getUpcomingEvents(companyId, days));
    }

    @PostMapping("/sync-scheduled/{companyId}")
    public ResponseEntity<Map<String, Object>> syncScheduledPosts(@PathVariable String companyId) {
        return ResponseEntity.ok(contentService.syncScheduledPostsToCalendar(companyId));
    }
}
