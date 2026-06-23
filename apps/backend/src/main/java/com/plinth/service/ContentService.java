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
import java.util.regex.Pattern;

@Service
public class ContentService {

    private static final Logger log = LoggerFactory.getLogger(ContentService.class);
    private static final int CONTENT_GENERATION_MAX_ATTEMPTS = 3;
    private static final Pattern PLACEHOLDER_PATTERN = Pattern.compile(
            "\\[(?:the actual tweet text|comma-separated hashtags|a short title|full linkedin post|seo-optimized|the content)[^\\]]*\\]",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern JSON_BLOCK_PATTERN = Pattern.compile("```(?:json)?\\s*([\\s\\S]*?)```", Pattern.CASE_INSENSITIVE);
    private static final List<String> PROMPT_EXAMPLE_MARKERS = List.of(
            "smarter way to plan campaigns",
            "biggest marketing bottleneck",
            "most teams confuse activity with progress",
            "what actually moved the needle for us",
            "how to improve campaign roi",
            "introduction paragraph..."
    );
    private static final int MAX_HASHTAG_LENGTH = 25;
    private static final int MAX_TWEET_HASHTAGS = 3;
    private static final int MAX_LINKEDIN_HASHTAGS = 5;
    private static final Set<String> HASHTAG_STOP_WORDS = Set.of(
            "a", "an", "the", "and", "or", "for", "with", "how", "why", "what", "when", "where",
            "this", "that", "these", "those", "your", "our", "their", "from", "into", "about",
            "are", "was", "were", "is", "be", "been", "have", "has", "had", "will", "would",
            "tweet", "thread", "post", "email", "blog", "content", "update", "news", "tips"
    );
    private static final List<String> EMBEDDED_HASHTAG_KEYWORDS = List.of(
            "pcos", "ovura", "health", "femtech", "wellness", "women", "womenshealth", "tracking",
            "calendar", "algorithm", "startup", "marketing", "fertility", "hormone", "cycle"
    );
    private static final String JSON_OUTPUT_INSTRUCTION = """
            Respond with ONLY valid JSON (no markdown fences, no commentary) using this schema:
            {"title":"<short internal label>","body":"<publishable text>","hashtags":["pcos","womenshealth","ovura"]}
            Hashtag rules: 2-3 short tags only; each tag max 20 characters; 1-2 words; no sentences; no full tweet text; no # prefix.
            Replace every value with original copy for the requested brand and topic. Do NOT reuse phrasing from these instructions.
            """;

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
    private final AgentBudgetService agentBudgetService;
    private final GeminiImageService geminiImageService;
    private final TwitterAnalyticsService twitterAnalyticsService;
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
                          AgentBudgetService agentBudgetService,
                          GeminiImageService geminiImageService,
                          TwitterAnalyticsService twitterAnalyticsService,
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
        this.agentBudgetService = agentBudgetService;
        this.geminiImageService = geminiImageService;
        this.twitterAnalyticsService = twitterAnalyticsService;
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
        companyService.requireOwnedCompany(companyId);
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

        ParsedContent parsed = generateParsedContent(profile, type, topic, additionalContext, null, List.of());

        ContentEntity entity = new ContentEntity();
        entity.setContentId(UUID.randomUUID().toString());
        entity.setCompanyId(companyId);
        entity.setUserId(userId);
        entity.setType(type);
        entity.setTitle(parsed.title());
        entity.setBody(parsed.body());
        entity.setHashtags(parsed.hashtags());
        entity.setStatus("draft");

        contentRepository.save(entity);
        return toMap(entity);
    }

    @Transactional
    public ContentEntity generateContentForAgent(String companyId, Long userId, String type,
                                                  String topic, String additionalContext) {
        return generateContentForAgent(companyId, userId, type, topic, additionalContext, List.of());
    }

    @Transactional
    public ContentEntity generateContentForAgent(String companyId, Long userId, String type,
                                                  String topic, String additionalContext,
                                                  List<String> distinctFromBodies) {
        CompanyProfile profile = companyService.getProfileInternal(companyId);
        ParsedContent parsed = generateParsedContent(
                profile, type, topic, additionalContext, null, distinctFromBodies);

        ContentEntity entity = new ContentEntity();
        entity.setContentId(UUID.randomUUID().toString());
        entity.setCompanyId(companyId);
        entity.setUserId(userId);
        entity.setType(type);
        entity.setTitle(parsed.title());
        entity.setBody(parsed.body());
        entity.setHashtags(parsed.hashtags());
        entity.setStatus("draft");
        entity.setApprovalStatus("none");
        contentRepository.save(entity);
        return entity;
    }

    @Transactional
    public ContentEntity reviseContentForAgent(String contentId, String topic,
                                               String additionalContext, String revisionFeedback) {
        ContentEntity entity = contentRepository.findByContentId(contentId)
                .orElseThrow(() -> new IllegalArgumentException("Content not found: " + contentId));

        CompanyProfile profile = companyService.getProfileInternal(entity.getCompanyId());
        ParsedContent parsed = generateParsedContent(
                profile,
                entity.getType(),
                topic,
                additionalContext,
                revisionFeedback,
                List.of());

        entity.setTitle(parsed.title());
        entity.setBody(parsed.body());
        entity.setHashtags(parsed.hashtags());
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

    // ── Generate Image (Gemini Nano Banana / DALL-E fallback) ────

    @Transactional
    public Map<String, Object> generateImage(String contentId, String imagePrompt) {
        ContentEntity entity = contentRepository.findByContentId(contentId)
                .orElseThrow(() -> new IllegalArgumentException("Content not found: " + contentId));

        String prompt = (imagePrompt != null && !imagePrompt.isBlank())
                ? imagePrompt.trim()
                : buildImagePrompt(entity);

        try {
            String imageUrl;
            String provider;

            if (geminiImageService.isAvailable()) {
                imageUrl = geminiImageService.generateImageDataUrl(prompt);
                provider = "gemini:" + geminiImageService.modelName();
            } else if (openaiApiKey != null && !openaiApiKey.isBlank()) {
                imageUrl = generateDalleImageUrl(prompt);
                provider = "dall-e-3";
            } else {
                throw new IllegalStateException(
                        "No image provider configured. Set GOOGLE_API_KEY for Gemini Nano Banana or OPENAI_API_KEY for DALL-E.");
            }

            if (imageUrl != null && !imageUrl.isBlank()) {
                entity.setImageUrl(imageUrl);
                contentRepository.save(entity);
            }

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("contentId", contentId);
            result.put("imageUrl", imageUrl != null ? imageUrl : "");
            result.put("prompt", prompt);
            result.put("provider", provider);
            return result;
        } catch (Exception ex) {
            log.error("Image generation failed: {}", ex.getMessage(), ex);
            throw new RuntimeException("Image generation failed: " + ex.getMessage());
        }
    }

    private String generateDalleImageUrl(String prompt) throws Exception {
        Map<String, Object> payload = Map.of(
                "model", "dall-e-3",
                "prompt", prompt,
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
        return root.path("data").path(0).path("url").asText();
    }

    private String buildImagePrompt(ContentEntity entity) {
        String title = entity.getTitle() != null ? entity.getTitle().trim() : "";
        String body = entity.getBody() != null ? entity.getBody().trim() : "";
        String type = entity.getType() != null ? entity.getType() : "post";

        String topic = !title.isBlank() ? title : body;
        if (topic.length() > 180) {
            topic = topic.substring(0, 177) + "...";
        }

        String context = body;
        if (context.length() > 320) {
            context = context.substring(0, 317) + "...";
        }
        if (context.isBlank()) {
            context = topic;
        }

        String style = switch (type.toLowerCase(Locale.ROOT)) {
            case "tweet" -> "Engaging Twitter/X social media illustration";
            case "linkedin_post" -> "Professional LinkedIn marketing visual";
            case "newsletter" -> "Clean newsletter header illustration";
            case "blog" -> "Blog article hero image";
            default -> "Modern marketing visual";
        };

        return style + " about: " + topic + ". Content context: " + context
                + ". Vibrant, professional, photorealistic or polished digital art. No text, logos, or watermarks in the image.";
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
        if (!agentBudgetService.canSpendXApi(entity.getCompanyId())) {
            throw new IllegalStateException("X API credit budget exhausted for this week");
        }

        String text = buildPublishText(entity);
        PublishResult result = publishService.publishTwitter(text, entity.getCompanyId(), entity.getImageUrl());

        if ("published".equals(result.status())) {
            agentBudgetService.recordXApiCredit(entity.getCompanyId());
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

        OffsetDateTime normalized = ensureFutureScheduleTime(scheduleTime);
        entity.setScheduledAt(normalized);
        entity.setStatus("scheduled");
        contentRepository.save(entity);

        var config = agentConfigService.getOrCreate(entity.getCompanyId());
        String timezone = config.getTimezone();

        String calendarEventId = entity.getCalendarEventId();
        boolean calendarConnected = calendarAuthService.isConnected(entity.getCompanyId());
        boolean calendarWriteAccess = calendarConnected && calendarAuthService.hasCalendarWriteAccess(entity.getCompanyId());
        String calendarError = null;
        try {
            if (calendarConnected && calendarWriteAccess) {
                String title = buildCalendarTitle(entity);
                String description = buildCalendarDescription(entity);
                calendarEventId = calendarEventService.upsertContentEvent(
                        entity.getCompanyId(),
                        calendarEventId,
                        title,
                        description,
                        normalized,
                        timezone
                );
                entity.setCalendarEventId(calendarEventId);
                contentRepository.save(entity);
            }
        } catch (Exception ex) {
            calendarError = ex.getMessage();
            log.warn("Failed to create calendar event for content {}: {}", contentId, ex.getMessage());
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("contentId", contentId);
        response.put("status", "scheduled");
        response.put("scheduledAt", normalized.toString());
        response.put("calendarConnected", calendarConnected);
        response.put("calendarWriteAccess", calendarWriteAccess);
        response.put("calendarEventCreated", calendarEventId != null && calendarWriteAccess);
        if (calendarEventId != null) {
            response.put("calendarEventId", calendarEventId);
        }
        if (calendarError != null) {
            response.put("calendarError", calendarError);
        }
        if (calendarConnected && calendarEventId == null && calendarError == null) {
            response.put("calendarError", "Could not create Google Calendar event");
        }
        if (!calendarConnected) {
            response.put("calendarHint", "Connect Google Calendar to see this tweet on your phone");
        } else if (!calendarWriteAccess) {
            response.put("calendarHint", "Reconnect Google Calendar to grant calendar write permission");
        }
        return response;
    }

    public long countUnsyncedScheduled(String companyId) {
        OffsetDateTime now = OffsetDateTime.now();
        return contentRepository.findByCompanyIdAndStatusOrderByCreatedAtDesc(companyId, "scheduled")
                .stream()
                .filter(e -> e.getScheduledAt() != null && e.getScheduledAt().isAfter(now))
                .filter(e -> e.getCalendarEventId() == null || e.getCalendarEventId().isBlank())
                .count();
    }

    @Transactional
    public Map<String, Object> syncScheduledPostsToCalendar(String companyId) {
        if (!calendarAuthService.isConnected(companyId)) {
            throw new IllegalStateException("Google Calendar not connected. Connect it from Dashboard first.");
        }
        if (!calendarAuthService.hasCalendarWriteAccess(companyId)) {
            throw new IllegalStateException(
                    "Google Calendar is connected but missing write permission. Click Connect calendar again to re-authorize.");
        }

        var config = agentConfigService.getOrCreate(companyId);
        String timezone = config.getTimezone();
        OffsetDateTime now = OffsetDateTime.now();

        int synced = 0;
        int skipped = 0;
        int failed = 0;
        List<Map<String, String>> failures = new ArrayList<>();

        List<ContentEntity> scheduled = contentRepository
                .findByCompanyIdAndStatusOrderByCreatedAtDesc(companyId, "scheduled");

        for (ContentEntity entity : scheduled) {
            if (entity.getScheduledAt() == null || !entity.getScheduledAt().isAfter(now)) {
                skipped++;
                continue;
            }
            if (entity.getCalendarEventId() != null && !entity.getCalendarEventId().isBlank()) {
                skipped++;
                continue;
            }
            try {
                String eventId = calendarEventService.upsertContentEvent(
                        companyId,
                        null,
                        buildCalendarTitle(entity),
                        buildCalendarDescription(entity),
                        entity.getScheduledAt(),
                        timezone
                );
                entity.setCalendarEventId(eventId);
                contentRepository.save(entity);
                synced++;
            } catch (Exception ex) {
                failed++;
                failures.add(Map.of(
                        "contentId", entity.getContentId(),
                        "error", ex.getMessage() != null ? ex.getMessage() : "unknown"
                ));
                log.warn("Calendar sync failed for {}: {}", entity.getContentId(), ex.getMessage());
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("synced", synced);
        result.put("skipped", skipped);
        result.put("failed", failed);
        result.put("failures", failures);
        return result;
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

    private OffsetDateTime ensureFutureScheduleTime(OffsetDateTime scheduleTime) {
        OffsetDateTime minAllowed = OffsetDateTime.now().plusMinutes(5);
        if (scheduleTime.isBefore(minAllowed)) {
            throw new IllegalArgumentException("Schedule time must be at least 5 minutes in the future");
        }
        return scheduleTime;
    }

    // ── AI Prompt Building ───────────────────────────────────────

    private String buildContentSystemPrompt(String type) {
        return switch (type.toLowerCase()) {
            case "tweet" -> """
                    You are a professional social media content creator specializing in Twitter/X posts.
                    Create engaging, viral-worthy tweets that drive engagement.
                    
                    Rules:
                    - Maximum 280 characters for body
                    - Use 2-3 relevant hashtags (without # prefix)
                    - Each hashtag must be 1-2 words and under 20 characters (e.g. pcos, womenshealth, ovura)
                    - Never put the full tweet topic or sentence into a single hashtag
                    - Include a compelling hook in the first line
                    - Use emojis strategically (1-3 max)
                    - Make it shareable and conversation-starting
                    - Write about the user's brand and topic only
                    - Never output template placeholders, bracketed instructions, or generic SaaS marketing copy unrelated to the brand
                    
                    """ + JSON_OUTPUT_INSTRUCTION;
            case "linkedin_post" -> """
                    You are a professional LinkedIn content creator.
                    Create thought leadership posts that drive professional engagement.
                    
                    Rules:
                    - Start with a powerful hook (first 2 lines are most important)
                    - Use line breaks for readability
                    - Include a call-to-action at the end
                    - 3-5 relevant hashtags (without # prefix)
                    - 150-300 words ideal length
                    - Write about the user's brand and topic only
                    - Never output template placeholders, bracketed instructions, or unrelated generic examples
                    
                    """ + JSON_OUTPUT_INSTRUCTION;
            case "blog" -> """
                    You are a professional blog content writer.
                    Create SEO-optimized, engaging blog post outlines with introductions.
                    Write about the user's brand and topic only.
                    Never output template placeholders, bracketed instructions, or unrelated generic examples.
                    
                    """ + JSON_OUTPUT_INSTRUCTION;
            default -> """
                    You are a professional content creator.
                    Create engaging, platform-appropriate content for the user's brand and topic.
                    Never output template placeholders, bracketed instructions, or unrelated generic examples.
                    
                    """ + JSON_OUTPUT_INSTRUCTION;
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
        sb.append("\nCRITICAL REQUIREMENTS:\n");
        sb.append("- The body must be specifically about the topic: \"").append(topic).append("\"\n");
        sb.append("- Reflect the company name, industry, audience, and value proposition from BRAND CONTEXT\n");
        sb.append("- Do NOT output generic startup/SaaS/marketing tweets unless the brand is actually a marketing product\n");
        sb.append("- Hashtags must match the topic and brand, not generic tags like marketing/startup/growth unless relevant\n");
        sb.append("- Each hashtag must be short (max 20 chars), 1-2 words, never a full sentence or tweet topic\n");
        sb.append("\nCreate the content now. Make it authentic to the brand voice and target audience described above.");
        sb.append("\nReturn only JSON with keys title, body, hashtags.");
        return sb.toString();
    }

    private ParsedContent generateParsedContent(CompanyProfile profile, String type, String topic,
                                                String additionalContext, String revisionFeedback,
                                                List<String> distinctFromBodies) {
        String systemPrompt = buildContentSystemPrompt(type);
        String userPrompt = buildContentUserPrompt(profile, type, topic, additionalContext);
        if (revisionFeedback != null && !revisionFeedback.isBlank()) {
            userPrompt += "\n\n=== REVISION REQUIRED ===\n"
                    + "Previous draft failed review. Apply these fixes:\n"
                    + revisionFeedback
                    + "\n\nReturn only improved JSON with keys title, body, hashtags.";
        }

        String retryHint = "";
        for (int attempt = 1; attempt <= CONTENT_GENERATION_MAX_ATTEMPTS; attempt++) {
            String aiResponse = llmService.generate(systemPrompt, userPrompt + retryHint);
            Optional<ParsedContent> parsed = parseContentResponse(aiResponse, topic, type);
            if (parsed.isPresent()) {
                ParsedContent normalized = normalizeParsedContent(parsed.get(), type, profile, topic);
                if (isValidParsedContent(normalized, type, topic, profile)
                        && !isTooSimilarToExisting(normalized.body(), distinctFromBodies)) {
                    return normalized;
                }
            }

            log.warn("Content generation attempt {}/{} produced invalid or duplicate output for type={}, topic='{}'",
                    attempt, CONTENT_GENERATION_MAX_ATTEMPTS, type, topic);
            retryHint = "\n\nIMPORTANT: Your previous response was rejected because it copied example phrasing, "
                    + "ignored the topic, duplicated an existing draft, or used invalid hashtags. "
                    + "Use 2-3 SHORT hashtags (max 20 chars each, e.g. pcos, womenshealth, ovura). "
                    + "Write original copy specifically about \""
                    + topic + "\" for " + profile.name() + " with a fresh angle. Output only JSON with real title, body, and hashtags.";
        }

        log.error("Content generation failed after {} attempts for type={}, topic='{}' — using fallback draft",
                CONTENT_GENERATION_MAX_ATTEMPTS, type, topic);
        ParsedContent fallback = buildFallbackContent(profile, type, topic);
        fallback = normalizeParsedContent(fallback, type, profile, topic);
        if (isTooSimilarToExisting(fallback.body(), distinctFromBodies)) {
            fallback = new ParsedContent(
                    fallback.title(),
                    truncateTweetBody(fallback.body() + " What would you add?"),
                    fallback.hashtags());
        }
        return fallback;
    }

    private Optional<ParsedContent> parseContentResponse(String response, String fallbackTitle, String type) {
        if (response == null || response.isBlank()) {
            return Optional.empty();
        }

        Optional<ParsedContent> jsonParsed = parseJsonContentResponse(response, fallbackTitle);
        if (jsonParsed.isPresent()) {
            return jsonParsed;
        }

        String title = extractTitle(response, fallbackTitle);
        String body = extractBody(response);
        List<String> hashtags = extractHashtags(response);
        if (body.isBlank()) {
            return Optional.empty();
        }
        return Optional.of(new ParsedContent(title, body, hashtags));
    }

    private Optional<ParsedContent> parseJsonContentResponse(String response, String fallbackTitle) {
        for (String candidate : extractJsonCandidates(response)) {
            try {
                JsonNode root = objectMapper.readTree(candidate);
                String title = root.path("title").asText("").trim();
                String body = root.path("body").asText("").trim();
                List<String> hashtags = new ArrayList<>();

                JsonNode tagsNode = root.path("hashtags");
                if (tagsNode.isArray()) {
                    for (JsonNode tag : tagsNode) {
                        String value = tag.asText("").trim();
                        if (!value.isBlank()) {
                            hashtags.add(value.startsWith("#") ? value.substring(1) : value);
                        }
                    }
                } else if (tagsNode.isTextual()) {
                    hashtags = Arrays.stream(tagsNode.asText("").split(","))
                            .map(String::trim)
                            .filter(s -> !s.isBlank())
                            .map(s -> s.startsWith("#") ? s.substring(1) : s)
                            .toList();
                }

                if (title.isBlank()) {
                    title = fallbackTitle;
                }
                if (body.isBlank()) {
                    continue;
                }
                ParsedContent parsed = new ParsedContent(title, body, hashtags);
                return Optional.of(parsed);
            } catch (Exception ex) {
                log.debug("Failed to parse content JSON candidate: {}", ex.getMessage());
            }
        }
        return Optional.empty();
    }

    private List<String> extractJsonCandidates(String response) {
        List<String> candidates = new ArrayList<>();
        var matcher = JSON_BLOCK_PATTERN.matcher(response);
        while (matcher.find()) {
            candidates.add(matcher.group(1).trim());
        }

        String trimmed = response.trim();
        candidates.add(trimmed);

        int start = trimmed.indexOf('{');
        int end = trimmed.lastIndexOf('}');
        if (start >= 0 && end > start) {
            candidates.add(trimmed.substring(start, end + 1));
        }
        return candidates;
    }

    private boolean isTooSimilarToExisting(String body, List<String> existingBodies) {
        if (body == null || body.isBlank() || existingBodies == null || existingBodies.isEmpty()) {
            return false;
        }
        String normalized = normalizeComparableText(body);
        for (String existing : existingBodies) {
            if (existing == null || existing.isBlank()) {
                continue;
            }
            String other = normalizeComparableText(existing);
            if (normalized.equals(other)) {
                return true;
            }
            if (normalized.length() > 30 && other.length() > 30
                    && (normalized.contains(other) || other.contains(normalized))) {
                return true;
            }
        }
        return false;
    }

    private String normalizeComparableText(String value) {
        return value.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9\\s]+", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private boolean isValidParsedContent(ParsedContent content, String type, String topic, CompanyProfile profile) {
        if (content.body() == null || content.body().isBlank()) {
            return false;
        }
        if (looksLikePlaceholder(content.title()) || looksLikePlaceholder(content.body())) {
            return false;
        }
        if (content.hashtags().stream().anyMatch(this::looksLikePlaceholder)) {
            return false;
        }
        if (content.hashtags().stream().anyMatch(tag -> !isValidHashtagToken(tag))) {
            return false;
        }
        if (looksLikePromptExample(content)) {
            return false;
        }
        if (!reflectsTopicOrBrand(content, topic, profile)) {
            return false;
        }
        if ("tweet".equalsIgnoreCase(type) && content.body().length() > 280) {
            return false;
        }
        return true;
    }

    private boolean looksLikePromptExample(ParsedContent content) {
        String combined = (content.title() + " " + content.body() + " "
                + String.join(" ", content.hashtags())).toLowerCase(Locale.ROOT);
        for (String marker : PROMPT_EXAMPLE_MARKERS) {
            if (combined.contains(marker)) {
                return true;
            }
        }
        List<String> tags = content.hashtags().stream()
                .map(tag -> tag.toLowerCase(Locale.ROOT))
                .sorted()
                .toList();
        return tags.equals(List.of("growth", "marketing", "startup"))
                && combined.contains("plan campaigns");
    }

    private boolean reflectsTopicOrBrand(ParsedContent content, String topic, CompanyProfile profile) {
        String haystack = (content.title() + " " + content.body() + " "
                + String.join(" ", content.hashtags())).toLowerCase(Locale.ROOT);

        if (profile.name() != null && !profile.name().isBlank()) {
            String companyToken = profile.name().toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", " ").trim();
            for (String token : companyToken.split("\\s+")) {
                if (token.length() >= 3 && haystack.contains(token)) {
                    return true;
                }
            }
        }

        if (profile.productName() != null && !profile.productName().isBlank()) {
            String productToken = profile.productName().toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", " ").trim();
            for (String token : productToken.split("\\s+")) {
                if (token.length() >= 3 && haystack.contains(token)) {
                    return true;
                }
            }
        }

        if (topic == null || topic.isBlank()) {
            return true;
        }

        for (String token : topic.toLowerCase(Locale.ROOT).split("[^a-z0-9]+")) {
            if (token.length() >= 3 && haystack.contains(token)) {
                return true;
            }
        }
        return false;
    }

    private boolean looksLikePlaceholder(String value) {
        if (value == null || value.isBlank()) {
            return false;
        }
        String normalized = value.trim();
        if (PLACEHOLDER_PATTERN.matcher(normalized).find()) {
            return true;
        }
        if (normalized.startsWith("[") && normalized.endsWith("]")) {
            return true;
        }
        String lower = normalized.toLowerCase(Locale.ROOT);
        return lower.contains("internal reference")
                || lower.contains("comma-separated hashtags")
                || lower.contains("the actual tweet text");
    }

    private ParsedContent buildFallbackContent(CompanyProfile profile, String type, String topic) {
        String company = profile.name() != null && !profile.name().isBlank() ? profile.name() : "our brand";
        String safeTopic = topic != null && !topic.isBlank() ? topic : "our latest update";

        if ("tweet".equalsIgnoreCase(type)) {
            String body = truncateTweetBody(String.format(
                    "%s — sharing thoughts on %s. What would you add?",
                    company,
                    safeTopic));
            List<String> hashtags = buildFallbackHashtags(company, safeTopic);
            return new ParsedContent(safeTopic, body, hashtags);
        }

        String body = String.format("%s is exploring %s. More details coming soon.", company, safeTopic);
        return new ParsedContent(safeTopic, body, buildFallbackHashtags(company, safeTopic));
    }

    private ParsedContent normalizeParsedContent(ParsedContent parsed, String type,
                                                 CompanyProfile profile, String topic) {
        List<String> tags = normalizeHashtags(parsed.hashtags(), type, profile, topic);
        return new ParsedContent(parsed.title(), parsed.body(), tags);
    }

    private List<String> normalizeHashtags(List<String> raw, String type,
                                           CompanyProfile profile, String topic) {
        int maxTags = maxHashtagsForType(type);
        LinkedHashSet<String> result = new LinkedHashSet<>();

        if (raw != null) {
            for (String tag : raw) {
                if (result.size() >= maxTags) {
                    break;
                }
                for (String candidate : expandHashtagCandidates(tag)) {
                    if (result.size() >= maxTags) {
                        break;
                    }
                    if (isValidHashtagToken(candidate)) {
                        result.add(normalizeHashtagToken(candidate));
                    }
                }
            }
        }

        if (result.size() < 2) {
            addHashtagKeywords(result, profile.name(), maxTags);
            addHashtagKeywords(result, profile.productName(), maxTags);
            addHashtagKeywords(result, topic, maxTags);
            addHashtagKeywords(result, profile.industry(), maxTags);
            if (profile.productsOrServices() != null) {
                for (String product : profile.productsOrServices()) {
                    addHashtagKeywords(result, product, maxTags);
                    if (result.size() >= maxTags) {
                        break;
                    }
                }
            }
        }

        if (result.isEmpty()) {
            result.add("update");
        }
        return result.stream().limit(maxTags).toList();
    }

    private int maxHashtagsForType(String type) {
        return "linkedin_post".equalsIgnoreCase(type) ? MAX_LINKEDIN_HASHTAGS : MAX_TWEET_HASHTAGS;
    }

    private List<String> expandHashtagCandidates(String tag) {
        if (tag == null || tag.isBlank()) {
            return List.of();
        }

        String cleaned = tag.trim().replaceFirst("^#+", "");
        if (cleaned.isBlank()) {
            return List.of();
        }

        if (cleaned.contains(" ") || cleaned.contains(",") || cleaned.contains(";")
                || cleaned.contains("|") || cleaned.contains("_")) {
            return Arrays.stream(cleaned.split("[\\s,;|_]+"))
                    .map(this::normalizeHashtagToken)
                    .filter(token -> !token.isBlank())
                    .toList();
        }

        if (cleaned.matches(".*[a-z][A-Z].*")) {
            return Arrays.stream(cleaned.split("(?=[A-Z])"))
                    .map(this::normalizeHashtagToken)
                    .filter(token -> !token.isBlank())
                    .toList();
        }

        if (cleaned.length() > MAX_HASHTAG_LENGTH) {
            List<String> embedded = extractEmbeddedKeywords(cleaned);
            if (!embedded.isEmpty()) {
                return embedded;
            }
            return extractKeywordTokens(cleaned);
        }

        return List.of(normalizeHashtagToken(cleaned));
    }

    private List<String> extractEmbeddedKeywords(String blob) {
        String lower = blob.toLowerCase(Locale.ROOT);
        List<String> found = new ArrayList<>();
        for (String keyword : EMBEDDED_HASHTAG_KEYWORDS) {
            if (lower.contains(keyword)) {
                found.add(keyword);
            }
        }
        return found;
    }

    private void addHashtagKeywords(Set<String> tags, String text, int maxTags) {
        if (text == null || text.isBlank() || tags.size() >= maxTags) {
            return;
        }
        for (String token : extractKeywordTokens(text)) {
            if (tags.size() >= maxTags) {
                break;
            }
            if (isValidHashtagToken(token)) {
                tags.add(normalizeHashtagToken(token));
            }
        }
    }

    private List<String> extractKeywordTokens(String text) {
        if (text == null || text.isBlank()) {
            return List.of();
        }

        LinkedHashSet<String> tokens = new LinkedHashSet<>();
        for (String part : text.split("[^a-zA-Z0-9]+")) {
            String token = normalizeHashtagToken(part);
            if (isValidHashtagToken(token)) {
                tokens.add(token);
            }
        }

        if (tokens.isEmpty() && text.length() > MAX_HASHTAG_LENGTH) {
            tokens.addAll(extractEmbeddedKeywords(text));
        }
        return new ArrayList<>(tokens);
    }

    private String normalizeHashtagToken(String raw) {
        if (raw == null) {
            return "";
        }
        return raw.toLowerCase(Locale.ROOT)
                .replaceAll("^#+", "")
                .replaceAll("[^a-z0-9]+", "")
                .trim();
    }

    private boolean isValidHashtagToken(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }
        String normalized = normalizeHashtagToken(token);
        if (normalized.length() < 3 || normalized.length() > MAX_HASHTAG_LENGTH) {
            return false;
        }
        if (HASHTAG_STOP_WORDS.contains(normalized)) {
            return false;
        }
        return normalized.chars().anyMatch(Character::isLetter);
    }

    private List<String> buildFallbackHashtags(String company, String topic) {
        LinkedHashSet<String> tags = new LinkedHashSet<>();
        addHashtagKeywords(tags, company, MAX_TWEET_HASHTAGS);
        addHashtagKeywords(tags, topic, MAX_TWEET_HASHTAGS);
        if (tags.isEmpty()) {
            tags.add("update");
        }
        return tags.stream().limit(MAX_TWEET_HASHTAGS).toList();
    }

    private String truncateTweetBody(String body) {
        if (body.length() <= 280) {
            return body;
        }
        return body.substring(0, 277).trim() + "...";
    }

    private record ParsedContent(String title, String body, List<String> hashtags) {}

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

    // ── Last post metrics ────────────────────────────────────────

    public Map<String, Object> getLastPostMetrics(String companyId) {
        companyService.requireOwnedCompany(companyId);
        Map<String, Object> result = new LinkedHashMap<>();

        Optional<ContentEntity> latestOpt = contentRepository.findByCompanyIdOrderByCreatedAtDesc(companyId)
                .stream()
                .filter(c -> "published".equals(c.getStatus()))
                .max(Comparator.comparing(
                        (ContentEntity c) -> c.getPublishedAt() != null ? c.getPublishedAt() : c.getCreatedAt(),
                        Comparator.nullsLast(Comparator.naturalOrder())
                ));

        if (latestOpt.isEmpty()) {
            result.put("hasPost", false);
            result.put("message", "No published posts yet");
            return result;
        }

        ContentEntity post = latestOpt.get();
        result.put("hasPost", true);
        result.put("contentId", post.getContentId());
        result.put("title", post.getTitle());
        result.put("body", post.getBody());
        result.put("type", post.getType());
        result.put("publishedAt", post.getPublishedAt() != null ? post.getPublishedAt().toString() : null);
        result.put("platformUrl", post.getPlatformUrl());
        result.put("platformPostId", post.getPlatformPostId());

        String tweetId = post.getPlatformPostId();
        Map<String, Object> metricsResult = null;
        if (tweetId != null && !tweetId.isBlank()) {
            metricsResult = twitterAnalyticsService.fetchTweetMetrics(companyId, tweetId);
        }

        if (metricsResult != null && Boolean.TRUE.equals(metricsResult.get("connected"))) {
            result.put("metricsAvailable", true);
            result.put("twitterConnected", true);
            result.put("metrics", Map.of(
                    "impressions", metricsResult.get("impressions"),
                    "likes", metricsResult.get("likes"),
                    "retweets", metricsResult.get("retweets"),
                    "replies", metricsResult.get("replies"),
                    "engagement", metricsResult.get("engagement")
            ));
            return result;
        }

        Map<String, Object> recent = twitterAnalyticsService.fetchRecentMetrics(companyId);
        boolean connected = Boolean.TRUE.equals(recent.get("connected"));
        result.put("twitterConnected", connected);
        result.put("metricsAvailable", false);

        if (connected && tweetId != null && !tweetId.isBlank()) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> tweets = (List<Map<String, Object>>) recent.get("tweets");
            if (tweets != null) {
                for (Map<String, Object> tweet : tweets) {
                    if (tweetId.equals(tweet.get("id"))) {
                        Map<String, Object> metrics = new LinkedHashMap<>();
                        metrics.put("impressions", tweet.get("impressions"));
                        metrics.put("likes", tweet.get("likes"));
                        metrics.put("retweets", tweet.get("retweets"));
                        metrics.put("replies", tweet.get("replies"));
                        metrics.put("engagement", tweet.get("engagement"));
                        result.put("metricsAvailable", true);
                        result.put("metrics", metrics);
                        break;
                    }
                }
            }
        }

        if (!Boolean.TRUE.equals(result.get("metricsAvailable"))) {
            if (metricsResult != null && metricsResult.get("message") != null) {
                result.put("metricsMessage", metricsResult.get("message"));
            } else if (!connected) {
                result.put("metricsMessage", recent.getOrDefault("message", "Connect X to see live metrics"));
            } else {
                result.put("metricsMessage", "Live metrics unavailable for this post");
            }
        }

        return result;
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
        map.put("calendarEventId", e.getCalendarEventId());
        map.put("publishedAt", e.getPublishedAt() != null ? e.getPublishedAt().toString() : null);
        map.put("createdAt", e.getCreatedAt() != null ? e.getCreatedAt().toString() : null);
        map.put("updatedAt", e.getUpdatedAt() != null ? e.getUpdatedAt().toString() : null);
        return map;
    }
}
