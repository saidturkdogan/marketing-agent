package com.plinth.controller;

import com.plinth.service.ContentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/content")
public class ContentController {

    private final ContentService contentService;

    public ContentController(ContentService contentService) {
        this.contentService = contentService;
    }

    /** List all content for a company */
    @GetMapping("/{companyId}")
    public ResponseEntity<List<Map<String, Object>>> listContents(@PathVariable String companyId) {
        return ResponseEntity.ok(contentService.listContents(companyId));
    }

    /** Metrics for the most recently published post */
    @GetMapping("/{companyId}/metrics/last")
    public ResponseEntity<Map<String, Object>> getLastPostMetrics(@PathVariable String companyId) {
        return ResponseEntity.ok(contentService.getLastPostMetrics(companyId));
    }

    /** Get a single content item */
    @GetMapping("/{companyId}/{contentId}")
    public ResponseEntity<Map<String, Object>> getContent(
            @PathVariable String companyId,
            @PathVariable String contentId) {
        return ResponseEntity.ok(contentService.getContent(contentId));
    }

    /** Generate new content with AI */
    @PostMapping("/{companyId}/generate")
    public ResponseEntity<Map<String, Object>> generateContent(
            @PathVariable String companyId,
            @RequestBody Map<String, String> body) {
        String type = body.getOrDefault("type", "tweet");
        String topic = body.getOrDefault("topic", "");
        String additionalContext = body.getOrDefault("additionalContext", "");
        return ResponseEntity.ok(contentService.generateContent(companyId, type, topic, additionalContext));
    }

    /** Update content (edit text, hashtags, etc.) */
    @PutMapping("/{companyId}/{contentId}")
    public ResponseEntity<Map<String, Object>> updateContent(
            @PathVariable String companyId,
            @PathVariable String contentId,
            @RequestBody Map<String, Object> updates) {
        return ResponseEntity.ok(contentService.updateContent(contentId, updates));
    }

    /** Delete content */
    @DeleteMapping("/{companyId}/{contentId}")
    public ResponseEntity<Map<String, String>> deleteContent(
            @PathVariable String companyId,
            @PathVariable String contentId) {
        contentService.deleteContent(contentId);
        return ResponseEntity.ok(Map.of("status", "deleted", "contentId", contentId));
    }

    /** Generate image with DALL-E 3 */
    @PostMapping("/{companyId}/{contentId}/generate-image")
    public ResponseEntity<Map<String, Object>> generateImage(
            @PathVariable String companyId,
            @PathVariable String contentId,
            @RequestBody Map<String, String> body) {
        String prompt = body.getOrDefault("prompt", "");
        return ResponseEntity.ok(contentService.generateImage(contentId, prompt));
    }

    /** Publish content to Twitter/X */
    @PostMapping("/{companyId}/{contentId}/publish")
    public ResponseEntity<Map<String, Object>> publishContent(
            @PathVariable String companyId,
            @PathVariable String contentId) {
        return ResponseEntity.ok(contentService.publishContent(contentId));
    }

    /** Schedule content for future publishing */
    @PostMapping("/{companyId}/{contentId}/schedule")
    public ResponseEntity<Map<String, Object>> scheduleContent(
            @PathVariable String companyId,
            @PathVariable String contentId,
            @RequestBody Map<String, String> body) {
        String scheduledAt = body.getOrDefault("scheduledAt", "");
        return ResponseEntity.ok(contentService.scheduleContent(contentId, scheduledAt));
    }
}
