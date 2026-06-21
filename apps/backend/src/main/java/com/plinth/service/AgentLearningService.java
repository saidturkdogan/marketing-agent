package com.plinth.service;

import com.plinth.domain.CompanyProfile;
import com.plinth.llm.LlmService;
import com.plinth.persistence.entity.ContentEntity;
import com.plinth.persistence.entity.KnowledgeEntryEntity;
import com.plinth.persistence.repository.ContentRepository;
import com.plinth.persistence.repository.KnowledgeEntryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AgentLearningService {

    private static final Logger log = LoggerFactory.getLogger(AgentLearningService.class);

    private final TwitterAnalyticsService twitterAnalyticsService;
    private final ContentRepository contentRepository;
    private final KnowledgeEntryRepository knowledgeEntryRepository;
    private final KnowledgeBaseService knowledgeBaseService;
    private final LlmService llmService;

    public AgentLearningService(TwitterAnalyticsService twitterAnalyticsService,
                                ContentRepository contentRepository,
                                KnowledgeEntryRepository knowledgeEntryRepository,
                                KnowledgeBaseService knowledgeBaseService,
                                LlmService llmService) {
        this.twitterAnalyticsService = twitterAnalyticsService;
        this.contentRepository = contentRepository;
        this.knowledgeEntryRepository = knowledgeEntryRepository;
        this.knowledgeBaseService = knowledgeBaseService;
        this.llmService = llmService;
    }

    public Map<String, Object> buildPerformanceInsights(String companyId) {
        Map<String, Object> insights = new LinkedHashMap<>();
        Map<String, Object> twitterMetrics = twitterAnalyticsService.fetchRecentMetrics(companyId);
        insights.put("twitter_metrics", twitterMetrics);

        List<ContentEntity> published = contentRepository.findByCompanyIdOrderByCreatedAtDesc(companyId).stream()
                .filter(c -> "published".equals(c.getStatus()))
                .limit(10)
                .toList();
        insights.put("published_count", published.size());
        insights.put("published_samples", published.stream()
                .map(c -> Map.of(
                        "title", c.getTitle() != null ? c.getTitle() : "",
                        "body", c.getBody() != null ? c.getBody().substring(0, Math.min(80, c.getBody().length())) : ""
                ))
                .toList());

        String stored = getLatestStoredInsights(companyId);
        if (stored != null) {
            insights.put("previous_learning", stored);
        }

        insights.put("summary", summarizeInsights(twitterMetrics, published));
        return insights;
    }

    public String getLatestStoredInsights(String companyId) {
        return knowledgeEntryRepository.findByCompanyIdAndEntryType(companyId, "campaign_learning").stream()
                .filter(e -> Boolean.TRUE.equals(e.getIsActive()))
                .max(Comparator.comparing(KnowledgeEntryEntity::getCreatedAt))
                .map(KnowledgeEntryEntity::getContent)
                .orElse(null);
    }

    public String summarizeForPlanner(String companyId) {
        Map<String, Object> insights = buildPerformanceInsights(companyId);
        Object summary = insights.get("summary");
        String stored = getLatestStoredInsights(companyId);
        StringBuilder sb = new StringBuilder();
        if (summary != null) sb.append(summary).append("\n");
        if (stored != null && !stored.isBlank()) {
            sb.append("Stored learnings: ").append(stored.substring(0, Math.min(stored.length(), 800))).append("\n");
        }
        Object aggregate = ((Map<?, ?>) insights.getOrDefault("twitter_metrics", Map.of())).get("aggregate");
        if (aggregate != null) sb.append("Twitter aggregate: ").append(aggregate).append("\n");
        return sb.toString();
    }

    @Transactional
    public void recordWeeklyLearnings(String companyId, Map<String, Object> runSummary) {
        try {
            Map<String, Object> insights = buildPerformanceInsights(companyId);
            String title = "Agent learnings " + OffsetDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE);
            String content = "Run summary: " + runSummary + "\n\nPerformance insights:\n" + insights.get("summary");
            knowledgeBaseService.addEntry(companyId, "campaign_learning", title, content, "agent,weekly", null);
            log.info("Stored weekly agent learnings for {}", companyId);
        } catch (Exception ex) {
            log.warn("Failed to store agent learnings for {}: {}", companyId, ex.getMessage());
        }
    }

    private String summarizeInsights(Map<String, Object> twitterMetrics, List<ContentEntity> published) {
        if (Boolean.TRUE.equals(twitterMetrics.get("connected"))) {
            Object top = twitterMetrics.get("top_performer");
            Object aggregate = twitterMetrics.get("aggregate");
            return llmService.generate(
                    "You summarize social media performance for a marketing agent planner.",
                    "Twitter metrics aggregate: " + aggregate + "\nTop performer: " + top
                            + "\nPublished posts in DB: " + published.stream()
                            .map(c -> c.getTitle() + " — " + (c.getBody() != null ? c.getBody().substring(0, Math.min(60, c.getBody().length())) : ""))
                            .collect(Collectors.joining("; "))
                            + "\n\nWrite 3-5 short bullet points (plain text only, no markdown, no ** or #). "
                            + "Start each line with '- '. Cover: what worked, what to avoid, what to try next week."
            );
        }
        if (published.isEmpty()) {
            return "No published content yet. Focus on awareness and brand introduction topics.";
        }
        return "Limited metrics available. Recent published topics: "
                + published.stream().map(ContentEntity::getTitle).collect(Collectors.joining(", "));
    }
}
