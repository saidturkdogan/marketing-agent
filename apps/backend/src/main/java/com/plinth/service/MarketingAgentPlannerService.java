package com.plinth.service;

import com.plinth.domain.AgentDecision;
import com.plinth.domain.CompanyProfile;
import com.plinth.persistence.entity.StrategyEntity;
import com.plinth.prompt.PromptCatalog;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class MarketingAgentPlannerService {

    private static final Logger log = LoggerFactory.getLogger(MarketingAgentPlannerService.class);
    private static final Pattern NUMBERED_TOPIC = Pattern.compile("^\\d+[.)\\s]+(.+)$");

    public record PlannedTopic(String topic, String rationale, double priority) {}

    private final ReasoningService reasoningService;
    private final AgentIdentityService identityService;
    private final PromptCatalog prompts;
    private final MarketPerceptionService marketPerceptionService;

    public MarketingAgentPlannerService(ReasoningService reasoningService,
                                        AgentIdentityService identityService,
                                        PromptCatalog prompts,
                                        MarketPerceptionService marketPerceptionService) {
        this.reasoningService = reasoningService;
        this.identityService = identityService;
        this.prompts = prompts;
        this.marketPerceptionService = marketPerceptionService;
    }

    public List<PlannedTopic> planTopics(String runId,
                                         CompanyProfile profile,
                                         StrategyEntity strategy,
                                         Map<String, Object> marketBrief,
                                         int count) {
        if (count <= 0) return List.of();

        List<PlannedTopic> fallback = buildFallbackTopics(profile, strategy, count);
        try {
            String identity = identityService.buildIdentityContext(profile);
            String marketSummary = marketPerceptionService.summarizeForPrompt(marketBrief);

            AgentDecision decision = reasoningService.reason(
                    prompts.marketingAgentPlanner(identity),
                    "Plan exactly " + count + " Twitter/X posts for this week.\n\n"
                            + "Company context:\n" + profile.toPromptContext() + "\n\n"
                            + "Market brief:\n" + marketSummary + "\n\n"
                            + "Output format (one per line inside your answer):\n"
                            + "TOPIC: <tweet topic> | RATIONALE: <why now> | PRIORITY: <0.0-1.0>\n"
                            + "Prioritize topics with trend velocity, strategy alignment, and differentiation from recent posts.",
                    "MarketingPlanner",
                    runId
            );

            List<PlannedTopic> parsed = parsePlannedTopics(decision.answer());
            if (parsed.isEmpty()) {
                log.warn("Planner returned no parseable topics for run {}, using fallback", runId);
                return fallback;
            }

            while (parsed.size() < count) {
                parsed = new ArrayList<>(parsed);
                parsed.add(fallback.get(parsed.size() % fallback.size()));
            }
            return parsed.subList(0, count);
        } catch (Exception ex) {
            log.warn("Marketing planner failed for run {}: {}", runId, ex.getMessage());
            return fallback;
        }
    }

    private List<PlannedTopic> parsePlannedTopics(String answer) {
        Set<String> seen = new LinkedHashSet<>();
        List<PlannedTopic> topics = new ArrayList<>();

        for (String line : answer.split("\n")) {
            String trimmed = line.trim();
            if (trimmed.isBlank()) continue;

            String topic = null;
            String rationale = "";
            double priority = 0.5;

            if (trimmed.toUpperCase().startsWith("TOPIC:")) {
                String[] parts = trimmed.split("\\|");
                topic = extractAfterLabel(parts[0], "TOPIC:");
                if (parts.length > 1) rationale = extractAfterLabel(parts[1], "RATIONALE:");
                if (parts.length > 2) priority = parsePriority(extractAfterLabel(parts[2], "PRIORITY:"));
            } else {
                Matcher matcher = NUMBERED_TOPIC.matcher(trimmed);
                if (matcher.matches()) {
                    topic = matcher.group(1).trim();
                } else if (!trimmed.startsWith("<") && trimmed.length() > 5) {
                    topic = trimmed.replaceAll("^[-*]\\s*", "");
                }
            }

            if (topic == null || topic.isBlank()) continue;
            topic = topic.replaceAll("\\|.*$", "").trim();
            if (topic.isBlank() || !seen.add(topic.toLowerCase())) continue;

            topics.add(new PlannedTopic(topic, rationale, priority));
        }
        return topics;
    }

    private List<PlannedTopic> buildFallbackTopics(CompanyProfile profile, StrategyEntity strategy, int count) {
        List<PlannedTopic> candidates = new ArrayList<>();
        collectCalendarTopics(strategy, candidates);
        collectStrategyTopics(strategy, candidates);

        if (candidates.isEmpty() && profile.industry() != null) {
            candidates.add(new PlannedTopic(profile.industry() + " insights", "Industry baseline", 0.5));
        }
        if (profile.valueProposition() != null && !profile.valueProposition().isBlank()) {
            candidates.add(new PlannedTopic(profile.valueProposition(), "Value proposition", 0.6));
        }
        if (candidates.isEmpty()) {
            candidates.add(new PlannedTopic("Weekly brand update", "Default fallback", 0.4));
        }

        List<PlannedTopic> result = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            result.add(candidates.get(i % candidates.size()));
        }
        return result;
    }

    @SuppressWarnings("unchecked")
    private void collectCalendarTopics(StrategyEntity strategy, List<PlannedTopic> topics) {
        if (strategy == null || strategy.getCalendar() == null) return;
        Object weeks = strategy.getCalendar().get("weeks");
        if (!(weeks instanceof List<?> weekList)) return;
        for (Object weekObj : weekList) {
            if (!(weekObj instanceof Map<?, ?> week)) continue;
            Object days = week.get("days");
            if (!(days instanceof List<?> dayList)) continue;
            for (Object dayObj : dayList) {
                if (!(dayObj instanceof Map<?, ?> day)) continue;
                Object topic = day.get("topic");
                if (topic == null) topic = day.get("title");
                if (topic == null) topic = day.get("content");
                if (topic != null && !topic.toString().isBlank()) {
                    topics.add(new PlannedTopic(topic.toString(), "Strategy calendar", 0.7));
                }
            }
        }
    }

    @SuppressWarnings("unchecked")
    private void collectStrategyTopics(StrategyEntity strategy, List<PlannedTopic> topics) {
        if (strategy == null || strategy.getStrategy() == null) return;
        Object pillars = strategy.getStrategy().get("content_pillars");
        if (pillars instanceof List<?> pillarList) {
            for (Object p : pillarList) {
                if (p != null && !p.toString().isBlank()) {
                    topics.add(new PlannedTopic(p.toString(), "Content pillar", 0.65));
                }
            }
        }
    }

    private String extractAfterLabel(String part, String label) {
        if (part == null) return "";
        int idx = part.toUpperCase().indexOf(label.toUpperCase());
        if (idx >= 0) {
            return part.substring(idx + label.length()).trim();
        }
        return part.trim();
    }

    private double parsePriority(String raw) {
        try {
            return Math.max(0.0, Math.min(1.0, Double.parseDouble(raw.trim())));
        } catch (Exception ex) {
            return 0.5;
        }
    }
}
