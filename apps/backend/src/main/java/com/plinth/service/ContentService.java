package com.plinth.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plinth.domain.CompanyProfile;
import com.plinth.llm.LlmService;
import com.plinth.guardrail.GuardrailEngine;
import com.plinth.guardrail.GuardrailReport;
import com.plinth.persistence.entity.ContentEntity;
import com.plinth.persistence.repository.ContentRepository;
import com.plinth.persistence.repository.StrategyRepository;
import com.plinth.publisher.PublishResult;
import com.plinth.publisher.PublishService;
import com.plinth.security.AuthUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.*;

@Service
public class ContentService {

    private static final Logger log = LoggerFactory.getLogger(ContentService.class);

    private final ContentRepository contentRepository;
    private final StrategyRepository strategyRepository;
    private final CompanyService companyService;
    private final LlmService llmService;
    private final PublishService publishService;
    private final GoogleCalendarEventService calendarEventService;
    private final GoogleCalendarAuthService calendarAuthService;
    private final AuthUtils authUtils;
    private final GuardrailEngine guardrailEngine;
    private final ApprovalService approvalService;
    private final AgentConfigService agentConfigService;
    private final AgentSchedulePlanner schedulePlanner;
    private final ObjectMapper objectMapper;
    private final RestClient openaiClient;
    private final String openaiApiKey;

    public ContentService(ContentRepository contentRepository,
                          StrategyRepository strategyRepository,
                          CompanyService companyService,
                          LlmService llmService,
                          PublishService publishService,
                          GoogleCalendarEventService calendarEventService,
                          GoogleCalendarAuthService calendarAuthService,
                          AuthUtils authUtils,
                          GuardrailEngine guardrailEngine,
                          ApprovalService approvalService,
                          AgentConfigService agentConfigService,
                          AgentSchedulePlanner schedulePlanner,
                          ObjectMapper objectMapper,
                          @Value("${app.openai.api-key:}") String openaiApiKey) {
        this.contentRepository = contentRepository;
        this.strategyRepository = strategyRepository;
        this.companyService = companyService;
        this.llmService = llmService;
        this.publishService = publishService;
        this.calendarEventService = calendarEventService;
        this.calendarAuthService = calendarAuthService;
        this.authUtils = authUtils;
        this.guardrailEngine = guardrailEngine;
        this.approvalService = approvalService;
        this.agentConfigService = agentConfigService;
        this.schedulePlanner = schedulePlanner;
        this.objectMapper = objectMapper;
        this.openaiApiKey = openaiApiKey;

        var factory = new JdkClientHttpRequestFactory();
        factory.setReadTimeout(Duration.ofSeconds(60));
        this.openaiClient = RestClient.builder()
                .baseUrl("https://api.openai.com")
                .requestFactory(factory)
                .build();
    }

    // ── List ──────────────────────────────────────────────────────

    public List<Map<String, Object>> listContents(String companyId) {
        return contentRepository.findByCompanyIdOrderByCreatedAtDesc(companyId)
                .stream().map(this::toMap).toList();
    }

    public Map<String, Object> getContent(String contentId) {
        return toMap(contentRepository.findByContentId(contentId)
                .orElseThrow(() -> new IllegalArgumentException("Content not found: " + contentId)));
    }

    // ── Create (AI Generate) ─────────────────────────────────────

    @Transactional
    public Map<String, Object> generateContent(String companyId, String type, String topic, String additionalContext) {
        Long userId = authUtils.getCurrentUserId();
        CompanyProfile profile = companyService.getProfile(companyId);

        String systemPrompt = buildContentSystemPrompt(type);
        String userPrompt = buildContentUserPrompt(profile, type, topic, additionalContext);

        String aiResponse = llmService.generate(systemPrompt, userPrompt);

        // Parse AI response
        String title = extractTitle(aiResponse, topic);
        String body = extractBody(aiResponse);
        List<String> hashtags = extractHashtags(aiResponse);

        ContentEntity entity = new ContentEntity();
        entity.setContentId(UUID.randomUUID().toString());
        entity.setCompanyId(companyId);
        entity.setUserId(userId);
        entity.setType(type);
        entity.setTitle(title);
        entity.setBody(body);
        entity.setHashtags(hashtags);
        entity.setStatus("draft");

        contentRepository.save(entity);
        return toMap(entity);
    }

    @Transactional
    public ContentEntity generateContentForAgent(String companyId, Long userId, String type,
                                                  String topic, String additionalContext) {
        CompanyProfile profile = companyService.getProfileInternal(companyId);
        String systemPrompt = buildContentSystemPrompt(type);
        String userPrompt = buildContentUserPrompt(profile, type, topic, additionalContext);
        String aiResponse = llmService.generate(systemPrompt, userPrompt);

        ContentEntity entity = new ContentEntity();
        entity.setContentId(UUID.randomUUID().toString());
        entity.setCompanyId(companyId);
        entity.setUserId(userId);
        entity.setType(type);
        entity.setTitle(extractTitle(aiResponse, topic));
        entity.setBody(extractBody(aiResponse));
        entity.setHashtags(extractHashtags(aiResponse));
        entity.setStatus("draft");
        entity.setApprovalStatus("none");
        contentRepository.save(entity);
        return entity;
    }

    // ── Update ───────────────────────────────────────────────────

    @Transactional
    public Map<String, Object> updateContent(String contentId, Map<String, Object> updates) {
        ContentEntity entity = contentRepository.findByContentId(contentId)
                .orElseThrow(() -> new IllegalArgumentException("Content not found: " + contentId));

        if (updates.containsKey("title")) entity.setTitle((String) updates.get("title"));
        if (updates.containsKey("body")) entity.setBody((String) updates.get("body"));
        if (updates.containsKey("imageUrl")) entity.setImageUrl((String) updates.get("imageUrl"));
        if (updates.containsKey("hashtags") && updates.get("hashtags") instanceof List<?> tags) {
            entity.setHashtags(tags.stream().map(Object::toString).toList());
        }

        contentRepository.save(entity);
        return toMap(entity);
    }

    // ── Delete ───────────────────────────────────────────────────

    @Transactional
    public void deleteContent(String contentId) {
        ContentEntity entity = contentRepository.findByContentId(contentId)
                .orElseThrow(() -> new IllegalArgumentException("Content not found: " + contentId));
        contentRepository.delete(entity);
    }

    // ── Generate Image (DALL-E 3) ────────────────────────────────

    @Transactional
    public Map<String, Object> generateImage(String contentId, String imagePrompt) {
        ContentEntity entity = contentRepository.findByContentId(contentId)
                .orElseThrow(() -> new IllegalArgumentException("Content not found: " + contentId));

        if (openaiApiKey == null || openaiApiKey.isBlank()) {
            throw new IllegalStateException("OpenAI API key not configured. Set OPENAI_API_KEY in .env");
        }

        try {
            Map<String, Object> payload = Map.of(
                    "model", "dall-e-3",
                    "prompt", imagePrompt,
                    "n", 1,
                    "size", "1024x1024",
                    "quality", "standard"
            );

            String responseBody = openaiClient.post()
                    .uri("/v1/images/generations")
                    .header("Authorization", "Bearer " + openaiApiKey)
                    .header("Content-Type", "application/json")
                    .body(payload)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(responseBody);
            String imageUrl = root.path("data").path(0).path("url").asText();

            if (imageUrl != null && !imageUrl.isBlank()) {
                entity.setImageUrl(imageUrl);
                contentRepository.save(entity);
            }

            return Map.of("contentId", contentId, "imageUrl", imageUrl != null ? imageUrl : "");
        } catch (Exception ex) {
            log.error("DALL-E image generation failed: {}", ex.getMessage(), ex);
            throw new RuntimeException("Image generation failed: " + ex.getMessage());
        }
    }

    // ── Publish (Twitter/X) ──────────────────────────────────────

    @Transactional
    public Map<String, Object> publishContent(String contentId) {
        ContentEntity entity = contentRepository.findByContentId(contentId)
                .orElseThrow(() -> new IllegalArgumentException("Content not found: " + contentId));

        ensurePublishAllowed(entity);

        return doPublish(entity);
    }

    @Transactional
    public Map<String, Object> publishScheduledContent(String contentId) {
        ContentEntity entity = contentRepository.findByContentId(contentId)
                .orElseThrow(() -> new IllegalArgumentException("Content not found: " + contentId));

        if (!"scheduled".equals(entity.getStatus())) {
            throw new IllegalStateException("Content is not scheduled: " + contentId);
        }

        ensurePublishAllowed(entity);
        return doPublish(entity);
    }

    private void ensurePublishAllowed(ContentEntity entity) {
        if ("pending_approval".equals(entity.getStatus())) {
            if (!approvalService.isContentApproved(entity.getContentId())) {
                throw new IllegalStateException("Content requires approval before publishing");
            }
        }

        String text = buildPublishText(entity);
        GuardrailReport report = guardrailEngine.checkContent(
                entity.getContentId(), text, entity.getCompanyId());

        if (report.isBlocked()) {
            throw new IllegalStateException("Content blocked by guardrails: " + report.summary());
        }
        if (report.requiresApproval() && !approvalService.isContentApproved(entity.getContentId())) {
            entity.setStatus("pending_approval");
            entity.setApprovalStatus("pending");
            contentRepository.save(entity);
            approvalService.requestContentApproval(entity.getCompanyId(), entity.getContentId(), report);
            throw new IllegalStateException("Content requires approval: " + report.summary());
        }
    }

    private Map<String, Object> doPublish(ContentEntity entity) {
        String text = buildPublishText(entity);

        PublishResult result = publishService.publishTwitter(text, entity.getCompanyId());

        if ("published".equals(result.status())) {
            entity.setStatus("published");
            entity.setPublishedAt(OffsetDateTime.now());
            if (result.externalId() != null) entity.setPlatformPostId(result.externalId());
            if (result.url() != null) entity.setPlatformUrl(result.url());
        } else {
            entity.setStatus("failed");
        }
        contentRepository.save(entity);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("contentId", entity.getContentId());
        response.put("platform", result.platform());
        response.put("status", result.status());
        response.put("externalId", result.externalId());
        response.put("url", result.url());
        response.put("message", result.message());
        return response;
    }

    @Transactional
    public Map<String, Object> approveAndSchedule(String contentId) {
        ContentEntity entity = contentRepository.findByContentId(contentId)
                .orElseThrow(() -> new IllegalArgumentException("Content not found: " + contentId));
        entity.setApprovalStatus("approved");
        contentRepository.save(entity);
        var config = agentConfigService.getOrCreate(entity.getCompanyId());
        var strategy = strategyRepository.findTopByCompanyIdOrderByCreatedAtDesc(entity.getCompanyId()).orElse(null);
        var slot = schedulePlanner.nextAvailableSlot(config, strategy);
        return scheduleContentInternal(contentId, slot.scheduledAt());
    }

    private String buildPublishText(ContentEntity entity) {
        String text = entity.getBody();
        if (entity.getHashtags() != null && !entity.getHashtags().isEmpty()) {
            text += "\n\n" + String.join(" ", entity.getHashtags().stream().map(t -> "#" + t).toList());
        }
        if (text != null && text.length() > 280) {
            text = text.substring(0, 277) + "...";
        }
        return text != null ? text : "";
    }

    // ── Schedule + Calendar ──────────────────────────────────────

    @Transactional
    public Map<String, Object> scheduleContent(String contentId, String scheduledAt) {
        return scheduleContentInternal(contentId, OffsetDateTime.parse(scheduledAt));
    }

    @Transactional
    public Map<String, Object> scheduleContentInternal(String contentId, OffsetDateTime scheduleTime) {
        ContentEntity entity = contentRepository.findByContentId(contentId)
                .orElseThrow(() -> new IllegalArgumentException("Content not found: " + contentId));

        entity.setScheduledAt(scheduleTime);
        entity.setStatus("scheduled");
        contentRepository.save(entity);

        var config = agentConfigService.getOrCreate(entity.getCompanyId());
        String timezone = config.getTimezone();

        String calendarEventId = entity.getCalendarEventId();
        try {
            if (calendarAuthService.isConnected(entity.getCompanyId())) {
                String title = buildCalendarTitle(entity);
                String description = buildCalendarDescription(entity);
                calendarEventId = calendarEventService.createContentEvent(
                        entity.getCompanyId(),
                        title,
                        description,
                        scheduleTime,
                        timezone
                );
                entity.setCalendarEventId(calendarEventId);
                contentRepository.save(entity);
            }
        } catch (Exception ex) {
            log.warn("Failed to create calendar event for content {}: {}", contentId, ex.getMessage());
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("contentId", contentId);
        response.put("status", "scheduled");
        response.put("scheduledAt", scheduleTime.toString());
        response.put("calendarEventCreated", calendarEventId != null);
        if (calendarEventId != null) {
            response.put("calendarEventId", calendarEventId);
        }
        return response;
    }

    private String buildCalendarTitle(ContentEntity entity) {
        String platform = entity.getType() != null ? entity.getType() : "post";
        String label = switch (platform.toLowerCase(Locale.ROOT)) {
            case "tweet" -> "Twitter/X";
            default -> platform;
        };
        String title = entity.getTitle();
        if (title == null || title.isBlank()) {
            title = entity.getBody() != null && entity.getBody().length() > 40
                    ? entity.getBody().substring(0, 40) + "..."
                    : "Scheduled post";
        }
        return label + ": " + title;
    }

    private String buildCalendarDescription(ContentEntity entity) {
        StringBuilder sb = new StringBuilder();
        sb.append("Scheduled by Plinth Agent\n");
        sb.append("Platform: ").append(entity.getType() != null ? entity.getType() : "unknown").append("\n\n");
        if (entity.getBody() != null) {
            sb.append(entity.getBody(), 0, Math.min(entity.getBody().length(), 500));
        }
        if (entity.getHashtags() != null && !entity.getHashtags().isEmpty()) {
            sb.append("\n\n").append(String.join(" ", entity.getHashtags().stream().map(t -> "#" + t).toList()));
        }
        return sb.toString();
    }

    // ── AI Prompt Building ───────────────────────────────────────

    private String buildContentSystemPrompt(String type) {
        return switch (type.toLowerCase()) {
            case "tweet" -> """
                    You are a professional social media content creator specializing in Twitter/X posts.
                    Create engaging, viral-worthy tweets that drive engagement.
                    
                    Rules:
                    - Maximum 280 characters for the main tweet text
                    - Use 2-3 relevant hashtags
                    - Include a compelling hook in the first line
                    - Use emojis strategically (1-3 max)
                    - Make it shareable and conversation-starting
                    
                    Respond in this exact format:
                    TITLE: [A short title for internal reference]
                    BODY: [The actual tweet text, under 280 chars]
                    HASHTAGS: [comma-separated hashtags without #]
                    """;
            case "linkedin_post" -> """
                    You are a professional LinkedIn content creator.
                    Create thought leadership posts that drive professional engagement.
                    
                    Rules:
                    - Start with a powerful hook (first 2 lines are most important)
                    - Use line breaks for readability
                    - Include a call-to-action at the end
                    - 3-5 relevant hashtags
                    - 150-300 words ideal length
                    
                    Respond in this exact format:
                    TITLE: [A short title for internal reference]
                    BODY: [The full LinkedIn post]
                    HASHTAGS: [comma-separated hashtags without #]
                    """;
            case "blog" -> """
                    You are a professional blog content writer.
                    Create SEO-optimized, engaging blog post outlines with introductions.
                    
                    Respond in this exact format:
                    TITLE: [SEO-optimized blog title]
                    BODY: [Full blog post or detailed outline with intro]
                    HASHTAGS: [comma-separated topic tags without #]
                    """;
            default -> """
                    You are a professional content creator.
                    Create engaging, platform-appropriate content.
                    
                    Respond in this exact format:
                    TITLE: [A short title]
                    BODY: [The content]
                    HASHTAGS: [comma-separated tags without #]
                    """;
        };
    }

    private String buildContentUserPrompt(CompanyProfile profile, String type, String topic, String additionalContext) {
        StringBuilder sb = new StringBuilder();
        sb.append("=== BRAND CONTEXT ===\n");
        sb.append(profile.toPromptContext());
        sb.append("\n\n=== CONTENT REQUEST ===\n");
        sb.append("Content Type: ").append(type).append("\n");
        sb.append("Topic: ").append(topic).append("\n");
        if (additionalContext != null && !additionalContext.isBlank()) {
            sb.append("Additional Context: ").append(additionalContext).append("\n");
        }
        sb.append("\nCreate the content now. Make it authentic to the brand voice and target audience described above.");
        return sb.toString();
    }

    // ── Response Parsing ─────────────────────────────────────────

    private String extractTitle(String response, String fallback) {
        for (String line : response.split("\n")) {
            if (line.startsWith("TITLE:")) {
                return line.substring(6).trim();
            }
        }
        return fallback;
    }

    private String extractBody(String response) {
        StringBuilder body = new StringBuilder();
        boolean inBody = false;
        for (String line : response.split("\n")) {
            if (line.startsWith("BODY:")) {
                body.append(line.substring(5).trim());
                inBody = true;
            } else if (line.startsWith("HASHTAGS:")) {
                inBody = false;
            } else if (inBody) {
                body.append("\n").append(line);
            }
        }
        return body.toString().trim();
    }

    private List<String> extractHashtags(String response) {
        for (String line : response.split("\n")) {
            if (line.startsWith("HASHTAGS:")) {
                String raw = line.substring(9).trim();
                return Arrays.stream(raw.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isBlank())
                        .map(s -> s.startsWith("#") ? s.substring(1) : s)
                        .toList();
            }
        }
        return List.of();
    }

    // ── Entity to Map ────────────────────────────────────────────

    private Map<String, Object> toMap(ContentEntity e) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("contentId", e.getContentId());
        map.put("companyId", e.getCompanyId());
        map.put("type", e.getType());
        map.put("title", e.getTitle());
        map.put("body", e.getBody());
        map.put("hashtags", e.getHashtags() != null ? e.getHashtags() : List.of());
        map.put("imageUrl", e.getImageUrl());
        map.put("status", e.getStatus());
        map.put("approvalStatus", e.getApprovalStatus());
        map.put("platformPostId", e.getPlatformPostId());
        map.put("platformUrl", e.getPlatformUrl());
        map.put("scheduledAt", e.getScheduledAt() != null ? e.getScheduledAt().toString() : null);
        map.put("publishedAt", e.getPublishedAt() != null ? e.getPublishedAt().toString() : null);
        map.put("createdAt", e.getCreatedAt() != null ? e.getCreatedAt().toString() : null);
        map.put("updatedAt", e.getUpdatedAt() != null ? e.getUpdatedAt().toString() : null);
        return map;
    }
}
