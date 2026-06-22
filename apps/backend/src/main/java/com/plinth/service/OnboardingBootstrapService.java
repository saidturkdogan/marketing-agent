package com.plinth.service;

import com.plinth.domain.CompanyProfile;
import com.plinth.dto.response.ProgressiveResponse;
import com.plinth.persistence.entity.CompanyEntity;
import com.plinth.persistence.entity.ContentEntity;
import com.plinth.persistence.entity.StrategyEntity;
import com.plinth.persistence.repository.CompanyRepository;
import com.plinth.persistence.repository.StrategyRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class OnboardingBootstrapService {

    private static final Logger log = LoggerFactory.getLogger(OnboardingBootstrapService.class);
    private static final int TWEET_COUNT = 2;

    private final ProgressiveStrategyService progressiveStrategyService;
    private final CompanyService companyService;
    private final CompanyRepository companyRepository;
    private final StrategyRepository strategyRepository;
    private final ContentService contentService;

    public OnboardingBootstrapService(ProgressiveStrategyService progressiveStrategyService,
                                      CompanyService companyService,
                                      CompanyRepository companyRepository,
                                      StrategyRepository strategyRepository,
                                      ContentService contentService) {
        this.progressiveStrategyService = progressiveStrategyService;
        this.companyService = companyService;
        this.companyRepository = companyRepository;
        this.strategyRepository = strategyRepository;
        this.contentService = contentService;
    }

    public Map<String, Object> bootstrap(String companyId) {
        log.info("[Onboarding] Bootstrap started for company {}", companyId);

        companyService.requireOwnedCompany(companyId);
        CompanyEntity company = companyRepository.findByCompanyId(companyId)
                .orElseThrow(() -> new IllegalArgumentException("Company not found: " + companyId));
        CompanyProfile profile = companyService.getProfileInternal(companyId);
        Long userId = company.getUserId() != null ? company.getUserId() : 0L;

        String websiteUrl = profile.websiteUrl() != null ? profile.websiteUrl() : "";
        String goal = "brand-awareness";

        ProgressiveResponse research = progressiveStrategyService.runResearch(
                companyId,
                websiteUrl,
                goal,
                profile.name(),
                profile.industry() != null ? profile.industry() : "",
                profile.valueProposition() != null ? profile.valueProposition() : "",
                profile.targetAudience() != null ? profile.targetAudience() : ""
        );

        String strategyId = research.strategyId();
        progressiveStrategyService.runStrategy(strategyId);
        progressiveStrategyService.runPlan(strategyId);
        // Skip full asset pack (LinkedIn/newsletter) — onboarding only needs tweets.

        StrategyEntity strategy = strategyRepository.findByStrategyId(strategyId)
                .orElseThrow(() -> new IllegalArgumentException("Strategy not found after bootstrap"));

        if (strategy.getMarketingScore() <= 0) {
            strategy.setMarketingScore(68.0);
            strategyRepository.save(strategy);
        }

        List<String> topics = extractTweetTopics(strategy, profile);
        List<Map<String, Object>> tweets = new ArrayList<>();
        String strategyContext = buildStrategyContext(strategy);

        for (int i = 0; i < topics.size(); i++) {
            String topic = topics.get(i);
            try {
                ContentEntity entity = contentService.generateContentForAgent(
                        companyId, userId, "tweet", topic, strategyContext);
                entity.setApprovalStatus("auto_passed");

                if (i == 0) {
                    OffsetDateTime slot = OffsetDateTime.now().plusDays(1).truncatedTo(ChronoUnit.HOURS)
                            .withHour(10).withMinute(0);
                    Map<String, Object> scheduled = contentService.scheduleContentInternal(entity.getContentId(), slot);
                    entity.setStatus(String.valueOf(scheduled.getOrDefault("status", "scheduled")));
                }

                Map<String, Object> tweet = new LinkedHashMap<>();
                tweet.put("contentId", entity.getContentId());
                tweet.put("title", entity.getTitle());
                tweet.put("body", entity.getBody());
                tweet.put("status", entity.getStatus());
                tweet.put("topic", topic);
                if (entity.getScheduledAt() != null) {
                    tweet.put("scheduledAt", entity.getScheduledAt().toString());
                }
                tweets.add(tweet);
            } catch (Exception ex) {
                log.warn("[Onboarding] Tweet generation failed for topic '{}': {}", topic, ex.getMessage());
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "success");
        result.put("companyId", companyId);
        result.put("strategyId", strategyId);
        result.put("marketingScore", strategy.getMarketingScore());
        result.put("tweetCount", tweets.size());
        result.put("tweets", tweets);
        result.put("message", String.format(
                "Research complete — %d X posts drafted from your company profile.", tweets.size()));
        log.info("[Onboarding] Bootstrap complete for {} — {} tweets", companyId, tweets.size());
        return result;
    }

    @SuppressWarnings("unchecked")
    private List<String> extractTweetTopics(StrategyEntity entity, CompanyProfile profile) {
        List<String> topics = new ArrayList<>();

        Map<String, Object> strategy = entity.getStrategy();
        if (strategy != null && strategy.get("strategic_pillars") instanceof List<?> pillars) {
            for (Object pillar : pillars) {
                if (pillar instanceof Map<?, ?> map) {
                    Object name = map.get("name");
                    if (name != null && !name.toString().isBlank()) {
                        topics.add(name.toString());
                    }
                }
            }
        }

        Map<String, Object> calendar = entity.getCalendar();
        if (calendar != null) {
            collectCalendarTopics(calendar, topics);
        }

        if (topics.isEmpty() && profile.industry() != null && !profile.industry().isBlank()) {
            topics.add(profile.industry() + " insights for " + profile.name());
        }
        if (topics.isEmpty()) {
            topics.add("Introducing " + profile.name());
        }

        List<String> result = new ArrayList<>(topics.stream().distinct().limit(TWEET_COUNT).toList());
        while (result.size() < TWEET_COUNT) {
            result.add(profile.name() + " — thought #" + (result.size() + 1));
        }
        return result.stream().limit(TWEET_COUNT).toList();
    }

    @SuppressWarnings("unchecked")
    private void collectCalendarTopics(Map<String, Object> calendar, List<String> topics) {
        List<Map<String, Object>> days = new ArrayList<>();
        if (calendar.get("days") instanceof List<?> dayList) {
            for (Object d : dayList) {
                if (d instanceof Map<?, ?> m) days.add((Map<String, Object>) m);
            }
        } else if (calendar.get("weeks") instanceof List<?> weeks) {
            for (Object w : weeks) {
                if (w instanceof Map<?, ?> week && week.get("days") instanceof List<?> weekDays) {
                    for (Object d : weekDays) {
                        if (d instanceof Map<?, ?> m) days.add((Map<String, Object>) m);
                    }
                }
            }
        }

        for (Map<String, Object> day : days) {
            if (!(day.get("items") instanceof List<?> items)) continue;
            for (Object item : items) {
                if (!(item instanceof Map<?, ?> raw)) continue;
                Map<String, Object> map = (Map<String, Object>) raw;
                String type = String.valueOf(map.getOrDefault("type", ""));
                if ("x".equalsIgnoreCase(type) || "twitter".equalsIgnoreCase(type) || "tweet".equalsIgnoreCase(type)) {
                    Object title = map.get("title");
                    if (title != null && !title.toString().isBlank()) {
                        topics.add(title.toString());
                    }
                }
            }
        }
    }

    private String buildStrategyContext(StrategyEntity entity) {
        StringBuilder sb = new StringBuilder("Onboarding content batch. Use the company strategy below.\n");
        if (entity.getStrategy() != null) {
            Object summary = entity.getStrategy().get("executive_summary");
            if (summary != null) {
                sb.append("Executive summary: ").append(summary).append("\n");
            }
        }
        if (entity.getOpportunities() != null && !entity.getOpportunities().isEmpty()) {
            sb.append("Top opportunities: ").append(entity.getOpportunities().stream()
                    .limit(3)
                    .map(o -> o.getOrDefault("title", ""))
                    .toList()).append("\n");
        }
        return sb.toString();
    }
}
