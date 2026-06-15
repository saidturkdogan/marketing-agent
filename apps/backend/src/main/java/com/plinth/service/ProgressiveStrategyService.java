package com.plinth.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.plinth.domain.StrategyReport;
import com.plinth.dto.response.ProgressiveResponse;
import com.plinth.llm.LlmService;
import com.plinth.persistence.entity.StrategyEntity;
import com.plinth.persistence.repository.StrategyRepository;
import com.plinth.prompt.StrategyPrompts;
import com.plinth.publisher.LinkedInPublisherService;
import com.plinth.publisher.PublishResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ProgressiveStrategyService {

    private static final Logger log = LoggerFactory.getLogger(ProgressiveStrategyService.class);

    private final StrategyService strategyService;
    private final CompanyService companyService;
    private final StrategyRepository strategyRepository;
    private final LlmService llmService;
    private final StrategyPrompts prompts;
    private final ObjectMapper objectMapper;
    private final LinkedInPublisherService linkedInPublisherService;

    public ProgressiveStrategyService(StrategyService strategyService,
                                       CompanyService companyService,
                                       StrategyRepository strategyRepository,
                                       LlmService llmService,
                                       StrategyPrompts prompts,
                                       ObjectMapper objectMapper,
                                       LinkedInPublisherService linkedInPublisherService) {
        this.strategyService = strategyService;
        this.companyService = companyService;
        this.strategyRepository = strategyRepository;
        this.llmService = llmService;
        this.prompts = prompts;
        this.objectMapper = objectMapper;
        this.linkedInPublisherService = linkedInPublisherService;
    }

    @Transactional
    public ProgressiveResponse runResearch(String companyId, String websiteUrl, String goal,
                                            String companyName, String industry,
                                            String productDescription, String targetAudience) {
        log.info("[Progressive] Stage 1/4 Research — company: {}", companyId);

        Map<String, Object> websiteAnalysis = strategyService.analyzeWebsite(websiteUrl);

        List<Map<String, Object>> competitors = strategyService.discoverCompetitors(
                companyName, industry, productDescription, null);

        List<String> competitorUrls = competitors.stream()
                .filter(c -> !c.containsKey("error"))
                .map(c -> (String) c.getOrDefault("url", ""))
                .filter(url -> url != null && !url.isBlank())
                .toList();

        Map<String, Object> competitorAnalysis = competitorUrls.isEmpty()
                ? Map.of("note", "No competitors discovered")
                : strategyService.analyzeCompetitors(companyName, competitorUrls, industry);

        Map<String, Object> contentGaps = strategyService.findContentGaps(
                companyName, industry, competitorAnalysis, goal);

        String strategyId = UUID.randomUUID().toString();

        StrategyEntity entity = new StrategyEntity();
        entity.setStrategyId(strategyId);
        entity.setCompanyId(companyId);
        entity.setBusinessType(websiteAnalysis.getOrDefault("business_model", "").toString());
        entity.setGoal(goal);
        entity.setWebsiteAnalysis(websiteAnalysis);
        entity.setCompetitorAnalysis(competitorAnalysis);
        entity.setCompetitorUrls(competitorUrls);
        entity.setContentGaps(contentGaps);
        strategyRepository.save(entity);

        int contentOpps = contentGaps.containsKey("topic_gaps")
                ? ((List<?>) contentGaps.get("topic_gaps")).size()
                : 0;
        int competitorCount = competitorUrls.size();
        int weakCount = 0;
        if (competitorAnalysis.containsKey("competitors")) {
            for (Object c : (List<?>) competitorAnalysis.get("competitors")) {
                if (c instanceof Map<?, ?> m && m.containsKey("weaknesses")) {
                    weakCount += ((List<?>) m.get("weaknesses")).size();
                }
            }
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("stage", "research");
        data.put("websiteScore", websiteAnalysis.getOrDefault("overall_website_score", "?"));
        data.put("websiteStrengths", websiteAnalysis.getOrDefault("content_strengths", List.of()));
        data.put("websiteWeaknesses", websiteAnalysis.getOrDefault("content_weaknesses", List.of()));
        data.put("keyTakeaways", websiteAnalysis.getOrDefault("key_takeaways", List.of()));
        data.put("competitors", competitorAnalysis.getOrDefault("competitors", List.of()));
        data.put("competitorCount", competitorCount);
        data.put("competitorWeaknesses", weakCount);
        data.put("contentOpportunities", contentOpps);
        data.put("copyThese", competitorAnalysis.getOrDefault("copy_these", List.of()));
        data.put("doDifferently", competitorAnalysis.getOrDefault("do_differently", List.of()));
        data.put("exploitThese", competitorAnalysis.getOrDefault("exploit_these", List.of()));
        data.put("contentGaps", contentGaps);

        return new ProgressiveResponse(strategyId, companyId, "research", "strategy", true, data,
                "Website analyzed, " + competitorCount + " competitors found, " + contentOpps + " content gaps identified.");
    }

    @Transactional
    public ProgressiveResponse runStrategy(String strategyId) {
        log.info("[Progressive] Stage 2/4 Strategy — strategy: {}", strategyId);

        StrategyEntity entity = strategyRepository.findByStrategyId(strategyId)
                .orElseThrow(() -> new IllegalArgumentException("Strategy not found: " + strategyId));

        var report = new StrategyReport()
                .strategyId(strategyId)
                .companyId(entity.getCompanyId())
                .businessType(entity.getBusinessType())
                .targetCountry(entity.getTargetCountry())
                .productDescription(entity.getProductDescription())
                .goal(entity.getGoal())
                .websiteAnalysis(entity.getWebsiteAnalysis())
                .competitorAnalysis(entity.getCompetitorAnalysis())
                .contentGaps(entity.getContentGaps());

        Map<String, Object> strategy = strategyService.generateStrategy(report);
        entity.setStrategy(strategy);
        strategyRepository.save(entity);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> pillars = (List<Map<String, Object>>) strategy.getOrDefault("strategic_pillars", List.of());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> channels = (List<Map<String, Object>>) strategy.getOrDefault("channel_strategy", List.of());

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("stage", "strategy");
        data.put("executiveSummary", strategy.get("executive_summary"));
        data.put("strategicPillars", pillars);
        data.put("channelStrategy", channels);
        data.put("targetAudience", strategy.get("target_audience"));
        data.put("brandPositioning", strategy.get("brand_positioning"));
        data.put("messagingFramework", strategy.get("messaging_framework"));
        data.put("contentStrategy", strategy.get("content_strategy"));
        data.put("kpis", strategy.get("kpis"));
        data.put("roadmap", strategy.get("roadmap_90_days"));

        return new ProgressiveResponse(strategyId, entity.getCompanyId(), "strategy", "plan", true, data,
                "Strategy created with " + pillars.size() + " strategic pillars and " + channels.size() + " channels.");
    }

    @Transactional
    public ProgressiveResponse runPlan(String strategyId) {
        log.info("[Progressive] Stage 3/4 Plan — strategy: {}", strategyId);

        StrategyEntity entity = strategyRepository.findByStrategyId(strategyId)
                .orElseThrow(() -> new IllegalArgumentException("Strategy not found: " + strategyId));

        var report = new StrategyReport()
                .companyId(entity.getCompanyId())
                .businessType(entity.getBusinessType())
                .targetCountry(entity.getTargetCountry())
                .goal(entity.getGoal())
                .strategy(entity.getStrategy());

        Map<String, Object> calendar = strategyService.generateCalendar(entity.getCompanyId(), report);

        String briefContentTitle = "Weekly content based on strategy";
        Map<String, Object> brief1 = strategyService.generateBrief(
                entity.getCompanyId(), strategyId,
                "First week featured content", "blog", entity.getGoal(), "");
        Map<String, Object> brief2 = strategyService.generateBrief(
                entity.getCompanyId(), strategyId,
                "Second week thought leadership", "linkedin", entity.getGoal(), "");

        entity.setCalendar(calendar);
        strategyRepository.save(entity);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("stage", "plan");
        data.put("calendar", calendar);
        data.put("briefs", List.of(brief1, brief2));

        int totalItems = 0;
        if (calendar.containsKey("days")) {
            totalItems = ((List<?>) calendar.get("days")).size();
        } else if (calendar.containsKey("weeks")) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> weeks = (List<Map<String, Object>>) calendar.get("weeks");
            for (Map<String, Object> w : weeks) {
                if (w.containsKey("days")) {
                    totalItems += ((List<?>) w.get("days")).size();
                }
            }
        }

        return new ProgressiveResponse(strategyId, entity.getCompanyId(), "plan", "assets", true, data,
                "30-day calendar created with " + totalItems + " content pieces and 2 briefs ready.");
    }

    @Transactional
    public ProgressiveResponse runAssets(String strategyId) {
        log.info("[Progressive] Stage 4/4 Assets — strategy: {}", strategyId);

        StrategyEntity entity = strategyRepository.findByStrategyId(strategyId)
                .orElseThrow(() -> new IllegalArgumentException("Strategy not found: " + strategyId));

        Map<String, Object> calendar = entity.getCalendar();
        Map<String, Object> strategy = entity.getStrategy();

        String goal = entity.getGoal() != null ? entity.getGoal() : "brand-awareness";
        Map<String, Object> socialContext = new LinkedHashMap<>();
        socialContext.put("goal", goal);
        socialContext.put("strategy", strategy);
        socialContext.put("calendar", calendar);

        try {
            String contextJson = objectMapper.writeValueAsString(socialContext);
            String systemPrompt = """
                    You are a senior social media content creator. Given a marketing strategy and content calendar,
                    generate high-converting social media content. Return ONLY valid JSON.
                    """;

            String linkedinPostsPrompt = "Based on this strategy and calendar, generate 3 LinkedIn posts. "
                    + "Make them professional, insight-driven, and suitable for B2B audiences. "
                    + "Return as JSON: {\"posts\": [{\"title\": \"\", \"body\": \"\", \"hashtags\": [\"\"]}]}\n\n"
                    + "Context: " + contextJson;

            Map<String, Object> linkedinPosts = parseJson(
                    llmService.generate(systemPrompt, linkedinPostsPrompt));

            String newsletterPrompt = "Generate a newsletter draft from this strategy. "
                    + "Include: subject line, intro, 3 main sections with insights, CTA. "
                    + "Return as JSON: {\"subject\": \"\", \"intro\": \"\", \"sections\": [{\"heading\": \"\", \"body\": \"\"}], \"cta\": \"\"}\n\n"
                    + "Context: " + contextJson;

            Map<String, Object> newsletter = parseJson(
                    llmService.generate(systemPrompt, newsletterPrompt));

            String publishingPrompt = "Generate a publishing schedule for the next 2 weeks from the calendar. "
                    + "Return as JSON: {\"schedule\": [{\"day\": \"\", \"platform\": \"\", \"content\": \"\", \"time\": \"\"}]}\n\n"
                    + "Context: " + contextJson;

            Map<String, Object> publishingSchedule = parseJson(
                    llmService.generate(systemPrompt, publishingPrompt));

            Map<String, Object> data = new LinkedHashMap<>();
            data.put("stage", "assets");
            data.put("linkedinPosts", linkedinPosts);
            data.put("newsletter", newsletter);
            data.put("publishingSchedule", publishingSchedule);

            entity.setPipelineAssets(data);
            entity.setMarketingScore(75.0);
            strategyRepository.save(entity);

            int postCount = 0;
            if (linkedinPosts.containsKey("posts")) {
                postCount = ((List<?>) linkedinPosts.get("posts")).size();
            }

            return new ProgressiveResponse(strategyId, entity.getCompanyId(), "assets", null, false, data,
                    postCount + " LinkedIn posts, newsletter draft, and publishing schedule created.");
        } catch (Exception e) {
            log.error("Asset generation failed: {}", e.getMessage());
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("stage", "assets");
            data.put("error", e.getMessage());
            return new ProgressiveResponse(strategyId, entity.getCompanyId(), "assets", null, false, data,
                    "Asset generation encountered an error: " + e.getMessage());
        }
    }

    public PublishResult publishScheduleItem(String strategyId, Object index) {
        log.info("[Pipeline] Publish schedule item — strategy: {}, index: {}", strategyId, index);

        StrategyEntity entity = strategyRepository.findByStrategyId(strategyId)
                .orElseThrow(() -> new IllegalArgumentException("Strategy not found: " + strategyId));

        Map<String, Object> assets = entity.getPipelineAssets();
        if (assets == null) throw new IllegalArgumentException("No pipeline assets found");

        Map<String, Object> publishingSchedule = (Map<String, Object>) assets.get("publishingSchedule");
        if (publishingSchedule == null) throw new IllegalArgumentException("No publishing schedule found");

        List<Map<String, Object>> schedule = (List<Map<String, Object>>) publishingSchedule.get("schedule");
        if (schedule == null || !(index instanceof Number num) || num.intValue() < 0 || num.intValue() >= schedule.size()) {
            throw new IllegalArgumentException("Invalid schedule index: " + index);
        }

        Map<String, Object> item = schedule.get(num.intValue());
        String platform = (String) item.getOrDefault("platform", "");
        String content = (String) item.getOrDefault("content", "");

        if (!"LinkedIn".equalsIgnoreCase(platform)) {
            return new PublishResult(platform, "skipped", null, null,
                    "Auto-publish for " + platform + " is not yet supported. Only LinkedIn is available.");
        }

        Map<String, Object> linkedinPosts = (Map<String, Object>) assets.get("linkedinPosts");
        List<Map<String, Object>> posts = linkedinPosts != null
                ? (List<Map<String, Object>>) linkedinPosts.get("posts") : null;

        String fullContent;
        if (posts != null && !posts.isEmpty()) {
            Map<String, Object> first = posts.get(0);
            String title = (String) first.getOrDefault("title", "");
            String body = (String) first.getOrDefault("body", "");
            fullContent = title + "\n\n" + body;
        } else {
            fullContent = content;
        }

        return linkedInPublisherService.publishText(fullContent);
    }

    public PublishResult publishLinkedInPost(String strategyId, Object index) {
        log.info("[Pipeline] Publish LinkedIn post — strategy: {}, index: {}", strategyId, index);

        StrategyEntity entity = strategyRepository.findByStrategyId(strategyId)
                .orElseThrow(() -> new IllegalArgumentException("Strategy not found: " + strategyId));

        Map<String, Object> assets = entity.getPipelineAssets();
        if (assets == null) {
            throw new IllegalArgumentException("No pipeline assets found");
        }

        Map<String, Object> linkedinPosts = (Map<String, Object>) assets.get("linkedinPosts");
        if (linkedinPosts == null) {
            throw new IllegalArgumentException("No LinkedIn posts found");
        }

        List<Map<String, Object>> posts = (List<Map<String, Object>>) linkedinPosts.get("posts");
        if (posts == null || !(index instanceof Number num) || num.intValue() < 0 || num.intValue() >= posts.size()) {
            throw new IllegalArgumentException("Invalid post index: " + index);
        }

        Map<String, Object> post = posts.get(num.intValue());
        String title = (String) post.getOrDefault("title", "");
        String body = (String) post.getOrDefault("body", "");
        String content = title + "\n\n" + body;

        return linkedInPublisherService.publishText(content);
    }

    @Transactional
    public ProgressiveResponse updateAssetStatus(String strategyId, String type, Object index, String status) {
        log.info("[Pipeline] Update asset status — strategy: {}, type: {}, index: {}, status: {}",
                strategyId, type, index, status);

        StrategyEntity entity = strategyRepository.findByStrategyId(strategyId)
                .orElseThrow(() -> new IllegalArgumentException("Strategy not found: " + strategyId));

        Map<String, Object> assets = entity.getPipelineAssets();
        if (assets == null) {
            throw new IllegalArgumentException("No pipeline assets found for strategy: " + strategyId);
        }

        if ("post".equals(type)) {
            Map<String, Object> linkedinPosts = (Map<String, Object>) assets.get("linkedinPosts");
            if (linkedinPosts != null) {
                List<Map<String, Object>> posts = (List<Map<String, Object>>) linkedinPosts.get("posts");
                if (posts != null && index instanceof Number num) {
                    int idx = num.intValue();
                    if (idx >= 0 && idx < posts.size()) {
                        posts.get(idx).put("approvalStatus", status);
                    }
                }
            }
        } else if ("newsletter".equals(type)) {
            Map<String, Object> newsletter = (Map<String, Object>) assets.get("newsletter");
            if (newsletter != null) {
                newsletter.put("approvalStatus", status);
            }
        }

        entity.setPipelineAssets(assets);
        strategyRepository.save(entity);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("stage", "asset-status-updated");
        data.put("pipelineAssets", assets);

        return new ProgressiveResponse(strategyId, entity.getCompanyId(), "assets", null, false, data,
                "Asset status updated to " + status);
    }

    private Map<String, Object> parseJson(String response) {
        if (response == null || response.isBlank()) return Map.of("raw", "");
        String json = extractJson(response);
        try {
            return objectMapper.readValue(json, LinkedHashMap.class);
        } catch (Exception e) {
            log.warn("Failed to parse JSON: {}", e.getMessage());
            return Map.of("raw", response);
        }
    }

    private String extractJson(String raw) {
        String trimmed = raw.trim();
        int fenceStart = trimmed.indexOf("```json");
        if (fenceStart >= 0) {
            int contentStart = trimmed.indexOf("\n", fenceStart) + 1;
            int fenceEnd = trimmed.indexOf("```", contentStart);
            return fenceEnd > contentStart
                    ? trimmed.substring(contentStart, fenceEnd).trim()
                    : trimmed.substring(contentStart).trim();
        }
        int objStart = trimmed.indexOf("{");
        int objEnd = trimmed.lastIndexOf("}");
        if (objStart >= 0 && objEnd > objStart) {
            return trimmed.substring(objStart, objEnd + 1);
        }
        return trimmed;
    }
}
