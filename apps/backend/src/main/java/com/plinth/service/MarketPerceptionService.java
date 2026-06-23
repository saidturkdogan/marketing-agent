package com.plinth.service;

import com.plinth.domain.CompanyProfile;
import com.plinth.persistence.entity.ContentEntity;
import com.plinth.persistence.entity.StrategyEntity;
import com.plinth.persistence.repository.ContentRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class MarketPerceptionService {

    private final ExternalDataService externalDataService;
    private final KnowledgeBaseService knowledgeBaseService;
    private final ContentRepository contentRepository;
    private final AgentLearningService agentLearningService;

    public MarketPerceptionService(ExternalDataService externalDataService,
                                   KnowledgeBaseService knowledgeBaseService,
                                   ContentRepository contentRepository,
                                   AgentLearningService agentLearningService) {
        this.externalDataService = externalDataService;
        this.knowledgeBaseService = knowledgeBaseService;
        this.contentRepository = contentRepository;
        this.agentLearningService = agentLearningService;
    }

    public Map<String, Object> buildMarketBrief(String companyId, CompanyProfile profile, StrategyEntity strategy) {
        String trendsQuery = resolveTrendsQuery(profile, strategy);

        Map<String, Object> brief = new LinkedHashMap<>();
        brief.put("research_topic", trendsQuery);
        brief.put("trends_query", trendsQuery);
        brief.put("external_data", externalDataService.enrichWithExternalData(trendsQuery, companyId));
        brief.put("has_real_connectors", externalDataService.hasRealConnectors());
        brief.put("strategy_calendar", strategy != null ? strategy.getCalendar() : Map.of());
        brief.put("strategy_pillars", extractPillars(strategy));
        brief.put("knowledge_context", knowledgeBaseService.buildKnowledgeContext(companyId));
        brief.put("recent_published", summarizeRecentPublished(companyId));
        brief.put("performance_insights", agentLearningService.buildPerformanceInsights(companyId));
        return brief;
    }

    public String summarizeForPrompt(Map<String, Object> marketBrief) {
        StringBuilder sb = new StringBuilder();
        sb.append("Research topic: ").append(marketBrief.get("research_topic")).append("\n");
        sb.append("Real data connectors: ").append(marketBrief.get("has_real_connectors")).append("\n");
        sb.append("External signals: ").append(truncate(String.valueOf(marketBrief.get("external_data")), 2000)).append("\n");
        sb.append("Strategy pillars: ").append(marketBrief.get("strategy_pillars")).append("\n");
        sb.append("Recent published: ").append(marketBrief.get("recent_published")).append("\n");
        Object performance = marketBrief.get("performance_insights");
        if (performance instanceof Map<?, ?> perfMap) {
            Object summary = perfMap.get("summary");
            if (summary != null && !summary.toString().isBlank()) {
                sb.append("Performance learnings:\n").append(truncate(summary.toString(), 1200)).append("\n");
            }
        }
        Object knowledge = marketBrief.get("knowledge_context");
        if (knowledge != null && !knowledge.toString().isBlank()) {
            sb.append("Brand knowledge: ").append(truncate(knowledge.toString(), 1500)).append("\n");
        }
        return sb.toString();
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> buildUiSignals(Map<String, Object> brief) {
        Map<String, Object> ui = new LinkedHashMap<>();
        ui.put("researchTopic", brief.get("research_topic"));
        ui.put("trendsQuery", brief.get("trends_query"));
        ui.put("hasRealConnectors", brief.get("has_real_connectors"));
        ui.put("strategyPillars", brief.get("strategy_pillars"));

        Object externalObj = brief.get("external_data");
        if (externalObj instanceof Map<?, ?> external) {
            Object trendsObj = external.get("trends");
            if (trendsObj instanceof Map<?, ?> trendsMap) {
                ui.put("googleTrends", extractGoogleTrends((Map<String, Object>) trendsMap));
                ui.put("twitterPerformance", extractTwitterPerformance((Map<String, Object>) trendsMap));
            }
            Object keywordsObj = external.get("keywords");
            if (keywordsObj instanceof Map<?, ?> keywordsMap) {
                ui.put("relatedKeywords", extractRelatedKeywords((Map<String, Object>) keywordsMap));
            }
        }

        ui.put("recentPublished", brief.get("recent_published"));
        ui.put("learnings", extractLearnings(brief.get("performance_insights")));
        return ui;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> extractGoogleTrends(Map<String, Object> trendsFetch) {
        Map<String, Object> result = new LinkedHashMap<>();
        Map<String, Object> serpData = findNestedMap(trendsFetch, "trends", "serpapi_trends_data");
        if (serpData == null || serpData.isEmpty()) {
            result.put("available", false);
            return result;
        }

        result.put("available", true);
        result.put("relatedQueries", extractStringList(serpData.get("related_queries")));

        List<Map<String, Object>> points = new ArrayList<>();
        Object interest = serpData.get("interest_over_time");
        if (interest instanceof Map<?, ?> interestMap) {
            Object timeline = interestMap.get("timeline_data");
            if (timeline instanceof List<?> timelineList) {
                for (Object item : timelineList) {
                    if (!(item instanceof Map<?, ?> row)) continue;
                    String date = stringOrEmpty(row.get("date"));
                    int value = 0;
                    Object values = row.get("values");
                    if (values instanceof List<?> valueList && !valueList.isEmpty()) {
                        Object first = valueList.get(0);
                        if (first instanceof Map<?, ?> valueMap) {
                            Object extracted = valueMap.get("extracted_value");
                            if (extracted instanceof Number num) value = num.intValue();
                        }
                    }
                    points.add(Map.of("date", date, "value", value));
                }
            }
        }
        result.put("interestPoints", points);

        if (points.size() >= 2) {
            int first = ((Number) points.get(0).get("value")).intValue();
            int last = ((Number) points.get(points.size() - 1).get("value")).intValue();
            result.put("currentIndex", last);
            result.put("trendDirection", last > first + 3 ? "up" : last < first - 3 ? "down" : "stable");
        } else if (!points.isEmpty()) {
            result.put("currentIndex", points.get(points.size() - 1).get("value"));
            result.put("trendDirection", "stable");
        }
        return result;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> extractTwitterPerformance(Map<String, Object> trendsFetch) {
        Map<String, Object> twitter = findNestedMap(trendsFetch, "twitter_metrics_data");
        Map<String, Object> result = new LinkedHashMap<>();
        if (twitter == null || twitter.isEmpty()) {
            result.put("connected", false);
            return result;
        }

        if (Boolean.FALSE.equals(twitter.get("connected")) && !twitter.containsKey("aggregate")) {
            result.put("connected", false);
            result.put("message", stringOrEmpty(twitter.get("message")));
            return result;
        }

        result.put("connected", Boolean.TRUE.equals(twitter.get("connected"))
                || twitter.containsKey("aggregate")
                || twitter.containsKey("tweets"));

        Object aggregateObj = twitter.get("aggregate");
        if (aggregateObj instanceof Map<?, ?> aggregate) {
            result.put("impressions", numberOrZero(aggregate.get("total_impressions")));
            result.put("likes", numberOrZero(aggregate.get("total_likes")));
            result.put("retweets", numberOrZero(aggregate.get("total_retweets")));
            result.put("replies", numberOrZero(aggregate.get("total_replies")));
            result.put("avgEngagement", numberOrZero(aggregate.get("avg_engagement")));
        }

        Object topObj = twitter.get("top_performer");
        if (topObj instanceof Map<?, ?> top) {
            result.put("topTweetPreview", truncate(stringOrEmpty(top.get("text")), 140));
            result.put("topTweetImpressions", numberOrZero(top.get("impressions")));
        }
        return result;
    }

    @SuppressWarnings("unchecked")
    private List<String> extractRelatedKeywords(Map<String, Object> keywordsFetch) {
        Map<String, Object> serpData = findNestedMap(keywordsFetch, "seo", "serpapi_trends_data");
        if (serpData != null) {
            List<String> fromSerp = extractStringList(serpData.get("related_queries"));
            if (!fromSerp.isEmpty()) return fromSerp;
        }
        Object seo = keywordsFetch.get("seo");
        if (seo instanceof Map<?, ?> seoMap) {
            Object keywords = seoMap.get("keywords");
            if (keywords instanceof List<?> list) {
                return list.stream().map(Object::toString).filter(s -> !s.isBlank()).limit(8).toList();
            }
        }
        return List.of();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> extractLearnings(Object performanceObj) {
        Map<String, Object> result = new LinkedHashMap<>();
        if (!(performanceObj instanceof Map<?, ?> perf)) {
            result.put("bullets", List.of());
            return result;
        }
        String summary = stringOrEmpty(perf.get("summary"));
        result.put("bullets", parseBulletLines(summary));
        return result;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> findNestedMap(Map<String, Object> root, String... keys) {
        for (String key : keys) {
            Object value = root.get(key);
            if (value instanceof Map<?, ?> map && !map.isEmpty()) {
                return (Map<String, Object>) map;
            }
        }
        return null;
    }

    private List<String> extractStringList(Object value) {
        if (!(value instanceof List<?> list)) return List.of();
        List<String> result = new ArrayList<>();
        for (Object item : list) {
            if (item == null) continue;
            String text = item.toString().trim();
            if (!text.isBlank()) result.add(text);
        }
        return result.stream().limit(8).toList();
    }

    private List<String> parseBulletLines(String text) {
        if (text == null || text.isBlank()) return List.of();
        List<String> bullets = new ArrayList<>();
        for (String line : text.split("\n")) {
            String trimmed = line.trim();
            if (trimmed.isBlank()) continue;

            String content = null;
            if (trimmed.startsWith("-")) {
                content = trimmed.replaceFirst("^-\\s*", "");
            } else if (trimmed.startsWith("*") && !trimmed.startsWith("**")) {
                content = trimmed.replaceFirst("^\\*\\s*", "");
            } else if (trimmed.startsWith("**") || trimmed.startsWith("##")) {
                content = trimmed;
            }

            if (content != null) {
                content = stripMarkdown(content);
                if (!content.isBlank()) {
                    bullets.add(content);
                }
            }
        }

        if (bullets.isEmpty()) {
            for (String paragraph : text.split("\n\n")) {
                String cleaned = stripMarkdown(paragraph.replace('\n', ' ').trim());
                if (!cleaned.isBlank()) {
                    bullets.add(cleaned);
                }
            }
        }

        return bullets.stream().filter(s -> !s.isBlank()).limit(6).toList();
    }

    private String stripMarkdown(String text) {
        if (text == null || text.isBlank()) return "";
        String cleaned = text.trim();
        cleaned = cleaned.replaceAll("\\*\\*(.+?)\\*\\*", "$1");
        cleaned = cleaned.replaceAll("__(.+?)__", "$1");
        cleaned = cleaned.replaceAll("\\*(.+?)\\*", "$1");
        cleaned = cleaned.replaceAll("_([^_]+)_", "$1");
        cleaned = cleaned.replaceAll("`([^`]+)`", "$1");
        cleaned = cleaned.replaceAll("^#+\\s*", "");
        cleaned = cleaned.replaceAll("\\s{2,}", " ");
        return cleaned.trim();
    }

    private String stringOrEmpty(Object value) {
        return value == null ? "" : value.toString();
    }

    private Number numberOrZero(Object value) {
        return value instanceof Number num ? num : 0;
    }

    @SuppressWarnings("unchecked")
    private List<String> extractPillars(StrategyEntity strategy) {
        if (strategy == null || strategy.getStrategy() == null) return List.of();
        Object pillars = strategy.getStrategy().get("content_pillars");
        if (!(pillars instanceof List<?> list)) return List.of();
        List<String> result = new ArrayList<>();
        for (Object p : list) {
            if (p != null && !p.toString().isBlank()) result.add(p.toString());
        }
        return result;
    }

    private List<Map<String, String>> summarizeRecentPublished(String companyId) {
        return contentRepository.findByCompanyIdOrderByCreatedAtDesc(companyId).stream()
                .filter(c -> "published".equals(c.getStatus()))
                .limit(5)
                .map(this::toPublishedSummary)
                .toList();
    }

    private Map<String, String> toPublishedSummary(ContentEntity entity) {
        Map<String, String> item = new LinkedHashMap<>();
        item.put("title", entity.getTitle());
        item.put("body", entity.getBody() != null
                ? entity.getBody().substring(0, Math.min(entity.getBody().length(), 120))
                : "");
        item.put("published_at", entity.getPublishedAt() != null ? entity.getPublishedAt().toString() : "");
        return item;
    }

    private String truncate(String value, int max) {
        if (value == null) return "";
        return value.length() <= max ? value : value.substring(0, max) + "...";
    }

    /**
     * Builds a Google Trends query from industry + product/category signals.
     * Brand names alone (e.g. "Ovura") produce misleading 0→100 relative indexes,
     * so the company name is only used as a last resort.
     */
    String resolveTrendsQuery(CompanyProfile profile, StrategyEntity strategy) {
        LinkedHashMap<String, String> terms = new LinkedHashMap<>();
        String companyName = normalizeComparable(profile.name());

        addTrendTerm(terms, profile.industry(), companyName);
        addTrendTerm(terms, firstMeaningfulProduct(profile, companyName), companyName);
        addTrendTerm(terms, shortPhrase(profile.coreValueProp(), 4), companyName);
        addTrendTerm(terms, shortPhrase(profile.valueProposition(), 4), companyName);

        for (String pillar : extractPillars(strategy)) {
            if (terms.size() >= 2) {
                break;
            }
            addTrendTerm(terms, pillar, companyName);
        }

        if (terms.isEmpty()) {
            addTrendTerm(terms, shortPhrase(profile.description(), 5), companyName);
        }

        if (terms.isEmpty() && profile.name() != null && !profile.name().isBlank()) {
            terms.put(normalizeComparable(profile.name()), profile.name().trim());
        }

        if (terms.isEmpty()) {
            return "marketing";
        }

        return String.join(" ", terms.values().stream().limit(2).toList());
    }

    private void addTrendTerm(Map<String, String> terms, String candidate, String companyName) {
        if (candidate == null || candidate.isBlank()) {
            return;
        }
        String trimmed = candidate.trim();
        if (trimmed.isBlank()) {
            return;
        }
        String comparable = normalizeComparable(trimmed);
        if (comparable.isBlank() || comparable.equals(companyName)) {
            return;
        }
        if (comparable.length() < 3) {
            return;
        }
        terms.putIfAbsent(comparable, trimmed);
    }

    private String firstMeaningfulProduct(CompanyProfile profile, String companyName) {
        if (profile.productName() != null && !profile.productName().isBlank()) {
            String product = profile.productName().trim();
            if (!normalizeComparable(product).equals(companyName)) {
                return product;
            }
        }
        if (profile.productsOrServices() == null) {
            return null;
        }
        for (String item : profile.productsOrServices()) {
            if (item == null || item.isBlank()) {
                continue;
            }
            String trimmed = item.trim();
            if (!normalizeComparable(trimmed).equals(companyName)) {
                return trimmed;
            }
        }
        return null;
    }

    private String shortPhrase(String text, int maxWords) {
        if (text == null || text.isBlank()) {
            return null;
        }
        String[] words = text.trim().split("\\s+");
        if (words.length == 0) {
            return null;
        }
        int limit = Math.min(maxWords, words.length);
        return String.join(" ", java.util.Arrays.copyOfRange(words, 0, limit));
    }

    private String normalizeComparable(String value) {
        if (value == null) {
            return "";
        }
        return value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "").trim();
    }
}
