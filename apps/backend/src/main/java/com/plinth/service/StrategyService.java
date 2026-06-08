package com.plinth.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plinth.domain.CompanyProfile;
import com.plinth.domain.StrategyReport;
import com.plinth.dto.request.StrategyRequest;
import com.plinth.dto.response.DashboardResponse;
import com.plinth.dto.response.StrategyResponse;
import com.plinth.persistence.entity.StrategyEntity;
import com.plinth.persistence.repository.StrategyRepository;
import com.plinth.prompt.StrategyPrompts;
import com.plinth.llm.LlmService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class StrategyService {

    private static final Logger log = LoggerFactory.getLogger(StrategyService.class);

    private final LlmService llmService;
    private final StrategyPrompts prompts;
    private final StrategyRepository strategyRepository;
    private final CompanyService companyService;
    private final ObjectMapper objectMapper;

    public StrategyService(LlmService llmService,
                           StrategyPrompts prompts,
                           StrategyRepository strategyRepository,
                           CompanyService companyService,
                           ObjectMapper objectMapper) {
        this.llmService = llmService;
        this.prompts = prompts;
        this.strategyRepository = strategyRepository;
        this.companyService = companyService;
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> analyzeWebsite(String websiteUrl) {
        try {
            String response = llmService.generate(prompts.websiteAnalyst(), "Analyze this website: " + websiteUrl);
            return parseJson(response);
        } catch (Exception e) {
            log.error("Website analysis failed for URL {}: {}", websiteUrl, e.getMessage());
            return Map.of("error", "Failed to analyze website: " + e.getMessage());
        }
    }

    public List<Map<String, Object>> discoverCompetitors(String companyName, String industry,
                                                          String productDescription, String targetCountry) {
        try {
            String userPrompt = String.format(
                    "Company: %s\nIndustry: %s\nProduct/Service: %s\nTarget Country: %s",
                    companyName, industry, productDescription, targetCountry);
            String response = llmService.generate(prompts.competitorDiscoverer(), userPrompt);
            return parseJsonArray(response);
        } catch (Exception e) {
            log.error("Competitor discovery failed for {}: {}", companyName, e.getMessage());
            return List.of(Map.of("error", "Failed to discover competitors: " + e.getMessage()));
        }
    }

    public Map<String, Object> analyzeCompetitors(String companyName, List<String> competitorUrls, String industry) {
        try {
            String userPrompt = String.format(
                    "Company: %s\nIndustry: %s\nCompetitor URLs to analyze:\n%s",
                    companyName, industry, String.join("\n", competitorUrls));
            String response = llmService.generate(prompts.competitorAnalyst(), userPrompt);
            return parseJson(response);
        } catch (Exception e) {
            log.error("Competitor analysis failed for {}: {}", companyName, e.getMessage());
            return Map.of("error", "Failed to analyze competitors: " + e.getMessage());
        }
    }

    public Map<String, Object> findContentGaps(String companyName, String industry,
                                                Map<String, Object> competitorAnalysis, String goal) {
        try {
            String competitorJson = objectMapper.writeValueAsString(competitorAnalysis);
            String userPrompt = String.format(
                    "Company: %s\nIndustry: %s\nGoal: %s\n\nCompetitor Analysis Data:\n%s",
                    companyName, industry, goal, competitorJson);
            String response = llmService.generate(prompts.contentGapAnalyst(), userPrompt);
            return parseJson(response);
        } catch (Exception e) {
            log.error("Content gap analysis failed for {}: {}", companyName, e.getMessage());
            return Map.of("error", "Failed to find content gaps: " + e.getMessage());
        }
    }

    public Map<String, Object> discoverKeywords(String companyName, String industry,
                                                 String goal, String targetAudience) {
        try {
            String userPrompt = String.format(
                    "Company: %s\nIndustry: %s\nGoal: %s\nTarget Audience: %s",
                    companyName, industry, goal, targetAudience);
            String response = llmService.generate(prompts.keywordStrategist(), userPrompt);
            return parseJson(response);
        } catch (Exception e) {
            log.error("Keyword discovery failed for {}: {}", companyName, e.getMessage());
            return Map.of("error", "Failed to discover keywords: " + e.getMessage());
        }
    }

    public Map<String, Object> generateStrategy(StrategyReport report) {
        try {
            StringBuilder context = new StringBuilder();
            context.append("Company ID: ").append(report.getCompanyId()).append("\n");
            context.append("Business Type: ").append(report.getBusinessType()).append("\n");
            context.append("Target Country: ").append(report.getTargetCountry()).append("\n");
            context.append("Product: ").append(report.getProductDescription()).append("\n");
            context.append("Goal: ").append(report.getGoal()).append("\n\n");

            if (report.getWebsiteAnalysis() != null) {
                context.append("Website Analysis:\n");
                context.append(objectMapper.writeValueAsString(report.getWebsiteAnalysis())).append("\n\n");
            }
            if (report.getCompetitorAnalysis() != null) {
                context.append("Competitor Analysis:\n");
                context.append(objectMapper.writeValueAsString(report.getCompetitorAnalysis())).append("\n\n");
            }
            if (report.getContentGaps() != null) {
                context.append("Content Gaps:\n");
                context.append(objectMapper.writeValueAsString(report.getContentGaps())).append("\n\n");
            }
            if (report.getKeywordDiscovery() != null) {
                context.append("Keyword Discovery:\n");
                context.append(objectMapper.writeValueAsString(report.getKeywordDiscovery())).append("\n\n");
            }

            String response = llmService.generate(prompts.strategyCreator(), context.toString());
            return parseJson(response);
        } catch (Exception e) {
            log.error("Strategy generation failed: {}", e.getMessage());
            return Map.of("error", "Failed to generate strategy: " + e.getMessage());
        }
    }

    public Map<String, Object> generateCalendar(String companyId, StrategyReport report) {
        try {
            StringBuilder context = new StringBuilder();
            context.append("Company ID: ").append(companyId).append("\n");
            context.append("Business Type: ").append(report.getBusinessType()).append("\n");
            context.append("Target Country: ").append(report.getTargetCountry()).append("\n");
            context.append("Goal: ").append(report.getGoal()).append("\n");

            if (report.getStrategy() != null) {
                context.append("\nFull Strategy:\n");
                context.append(objectMapper.writeValueAsString(report.getStrategy()));
            }

            String response = llmService.generate(prompts.calendarPlanner(), context.toString());
            return parseJson(response);
        } catch (Exception e) {
            log.error("Calendar generation failed: {}", e.getMessage());
            return Map.of("error", "Failed to generate calendar: " + e.getMessage());
        }
    }

    public Map<String, Object> generateBrief(String companyId, String strategyId,
                                              String contentTitle, String contentType,
                                              String goal, String targetAudience) {
        try {
            String userPrompt = String.format(
                    "Company ID: %s\nStrategy ID: %s\nContent Title: %s\nContent Type: %s\nGoal: %s\nTarget Audience: %s",
                    companyId, strategyId, contentTitle, contentType, goal, targetAudience);
            String response = llmService.generate(prompts.briefWriter(), userPrompt);
            return parseJson(response);
        } catch (Exception e) {
            log.error("Brief generation failed: {}", e.getMessage());
            return Map.of("error", "Failed to generate brief: " + e.getMessage());
        }
    }

    public List<Map<String, Object>> findOpportunities(String companyName,
                                                        Map<String, Object> competitorAnalysis,
                                                        Map<String, Object> contentGaps,
                                                        Map<String, Object> keywordDiscovery) {
        try {
            StringBuilder context = new StringBuilder();
            context.append("Company: ").append(companyName).append("\n\n");

            if (competitorAnalysis != null) {
                context.append("Competitor Analysis:\n");
                context.append(objectMapper.writeValueAsString(competitorAnalysis)).append("\n\n");
            }
            if (contentGaps != null) {
                context.append("Content Gaps:\n");
                context.append(objectMapper.writeValueAsString(contentGaps)).append("\n\n");
            }
            if (keywordDiscovery != null) {
                context.append("Keyword Discovery:\n");
                context.append(objectMapper.writeValueAsString(keywordDiscovery)).append("\n\n");
            }

            String response = llmService.generate(prompts.opportunityFinder(), context.toString());
            return parseJsonArray(response);
        } catch (Exception e) {
            log.error("Opportunity finding failed: {}", e.getMessage());
            return List.of(Map.of("error", "Failed to find opportunities: " + e.getMessage()));
        }
    }

    public double calculateScore(Map<String, Object> strategy, List<Map<String, Object>> opportunities) {
        try {
            StringBuilder context = new StringBuilder();
            if (strategy != null) {
                context.append("Strategy:\n");
                context.append(objectMapper.writeValueAsString(strategy)).append("\n\n");
            }
            if (opportunities != null) {
                context.append("Opportunities:\n");
                context.append(objectMapper.writeValueAsString(opportunities)).append("\n\n");
            }

            String response = llmService.generate(prompts.scoreCalculator(), context.toString());
            Map<String, Object> result = parseJson(response);

            if (result.containsKey("overall_score")) {
                Object score = result.get("overall_score");
                if (score instanceof Number num) {
                    return num.doubleValue();
                }
                if (score instanceof String s) {
                    try {
                        return Double.parseDouble(s);
                    } catch (NumberFormatException ignored) {
                    }
                }
            }
            return 50.0;
        } catch (Exception e) {
            log.error("Score calculation failed: {}", e.getMessage());
            return 50.0;
        }
    }

    @Transactional
    public StrategyResponse saveStrategy(StrategyReport report) {
        StrategyEntity entity = new StrategyEntity();
        entity.setStrategyId(report.getStrategyId() != null ? report.getStrategyId() : UUID.randomUUID().toString());
        entity.setCompanyId(report.getCompanyId());
        entity.setBusinessType(report.getBusinessType());
        entity.setTargetCountry(report.getTargetCountry());
        entity.setTargetLanguage(report.getTargetLanguage());
        entity.setProductDescription(report.getProductDescription());
        entity.setAveragePrice(report.getAveragePrice());
        entity.setPersonaType(report.getPersonaType());
        entity.setGoal(report.getGoal());
        entity.setWebsiteAnalysis(report.getWebsiteAnalysis());
        entity.setCompetitorAnalysis(report.getCompetitorAnalysis());
        entity.setContentGaps(report.getContentGaps());
        entity.setKeywordDiscovery(report.getKeywordDiscovery());
        entity.setStrategy(report.getStrategy());
        entity.setCalendar(report.getCalendar());
        entity.setMarketingScore(report.getMarketingScore());
        entity.setOpportunities(report.getOpportunities());
        entity.setCompetitorUrls(report.getCompetitors() != null
                ? report.getCompetitors().stream().map(c -> (String) c.getOrDefault("url", "")).toList()
                : List.of());

        StrategyEntity saved = strategyRepository.save(entity);
        return toResponse(saved);
    }

    public StrategyResponse getLatestStrategy(String companyId) {
        StrategyEntity entity = strategyRepository.findTopByCompanyIdOrderByCreatedAtDesc(companyId)
                .orElseThrow(() -> new IllegalArgumentException("No strategy found for company: " + companyId));
        return toResponse(entity);
    }

    public StrategyResponse getStrategy(String strategyId) {
        StrategyEntity entity = strategyRepository.findByStrategyId(strategyId)
                .orElseThrow(() -> new IllegalArgumentException("Strategy not found: " + strategyId));
        return toResponse(entity);
    }

    public DashboardResponse getDashboard(String companyId) {
        StrategyEntity entity = strategyRepository.findTopByCompanyIdOrderByCreatedAtDesc(companyId)
                .orElse(null);

        if (entity == null) {
            return new DashboardResponse(null, 0, 0, 0, 0, List.of(), Map.of());
        }

        return new DashboardResponse(
                entity.getStrategyId(),
                entity.getMarketingScore(),
                countContentOpportunities(entity),
                countCompetitorWeaknesses(entity),
                countKeywordsFound(entity),
                entity.getOpportunities() != null ? entity.getOpportunities() : List.of(),
                entity.getCalendar() != null ? entity.getCalendar() : Map.of()
        );
    }

    public StrategyResponse runFullAnalysis(StrategyRequest request) {
        CompanyProfile profile = companyService.getProfile(request.companyId());

        StrategyReport report = new StrategyReport()
                .strategyId(UUID.randomUUID().toString())
                .companyId(request.companyId())
                .businessType(request.businessType())
                .targetCountry(request.targetCountry())
                .targetLanguage(request.targetLanguage())
                .productDescription(request.productDescription())
                .averagePrice(request.averagePrice())
                .personaType(request.personaType())
                .goal(request.goal());

        log.info("Starting full analysis for company {} (strategy {})", request.companyId(), report.getStrategyId());

        Map<String, Object> websiteAnalysis = analyzeWebsite(
                request.websiteUrl() != null ? request.websiteUrl() : profile.websiteUrl());
        report.websiteAnalysis(websiteAnalysis);

        List<Map<String, Object>> competitors = discoverCompetitors(
                profile.name(), profile.industry(), request.productDescription(), request.targetCountry());
        report.competitors(competitors);

        List<String> competitorUrls = competitors.stream()
                .filter(c -> !c.containsKey("error"))
                .map(c -> (String) c.getOrDefault("url", ""))
                .filter(url -> url != null && !url.isBlank())
                .toList();
        if (request.competitorUrls() != null && !request.competitorUrls().isEmpty()) {
            competitorUrls = request.competitorUrls();
        }

        Map<String, Object> competitorAnalysis = analyzeCompetitors(
                profile.name(), competitorUrls, profile.industry());
        report.competitorAnalysis(competitorAnalysis);

        Map<String, Object> contentGaps = findContentGaps(
                profile.name(), profile.industry(), competitorAnalysis, request.goal());
        report.contentGaps(contentGaps);

        Map<String, Object> keywordDiscovery = discoverKeywords(
                profile.name(), profile.industry(), request.goal(), profile.targetAudience());
        report.keywordDiscovery(keywordDiscovery);

        Map<String, Object> strategy = generateStrategy(report);
        report.strategy(strategy);

        Map<String, Object> calendar = generateCalendar(request.companyId(), report);
        report.calendar(calendar);

        List<Map<String, Object>> opportunities = findOpportunities(
                profile.name(), competitorAnalysis, contentGaps, keywordDiscovery);
        report.opportunities(opportunities);

        double score = calculateScore(strategy, opportunities);
        report.marketingScore(score);

        log.info("Full analysis complete for company {} — score: {}", request.companyId(), score);

        return saveStrategy(report);
    }

    private StrategyResponse toResponse(StrategyEntity entity) {
        return new StrategyResponse(
                entity.getStrategyId(),
                entity.getCompanyId(),
                entity.getBusinessType(),
                entity.getTargetCountry(),
                entity.getTargetLanguage(),
                entity.getProductDescription(),
                entity.getAveragePrice(),
                entity.getPersonaType(),
                entity.getGoal(),
                entity.getWebsiteAnalysis(),
                entity.getCompetitorUrls() != null
                        ? entity.getCompetitorUrls().stream().map(url -> (Map<String, Object>) Map.<String, Object>of("url", url)).toList()
                        : List.of(),
                entity.getCompetitorAnalysis(),
                entity.getContentGaps(),
                entity.getKeywordDiscovery(),
                entity.getStrategy(),
                entity.getCalendar(),
                entity.getMarketingScore(),
                entity.getOpportunities(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private int countContentOpportunities(StrategyEntity entity) {
        List<Map<String, Object>> ops = entity.getOpportunities();
        if (ops == null) return 0;
        return (int) ops.stream()
                .filter(o -> "content-led growth".equalsIgnoreCase((String) o.getOrDefault("category", "")))
                .count();
    }

    private int countCompetitorWeaknesses(StrategyEntity entity) {
        Map<String, Object> analysis = entity.getCompetitorAnalysis();
        if (analysis == null) return 0;
        Object competitors = analysis.get("competitors");
        if (!(competitors instanceof List<?> list)) return 0;
        int count = 0;
        for (Object comp : list) {
            if (comp instanceof Map<?, ?> cm) {
                Object weaknesses = cm.get("weaknesses");
                if (weaknesses instanceof List<?> wl) {
                    count += wl.size();
                }
            }
        }
        return count;
    }

    private int countKeywordsFound(StrategyEntity entity) {
        Map<String, Object> kw = entity.getKeywordDiscovery();
        if (kw == null) return 0;
        int count = 0;
        for (String key : List.of("seed_keywords", "long_tail_keywords", "pain_point_keywords", "competitor_keyword_gaps")) {
            Object val = kw.get(key);
            if (val instanceof List<?> list) {
                count += list.size();
            }
        }
        return count;
    }

    private Map<String, Object> parseJson(String llmResponse) {
        if (llmResponse == null || llmResponse.isBlank()) {
            return Map.of("raw", "");
        }
        String json = extractJson(llmResponse, "{", "}");
        try {
            return objectMapper.readValue(json, new TypeReference<LinkedHashMap<String, Object>>() {});
        } catch (Exception e) {
            log.warn("Failed to parse LLM JSON response, returning raw. Error: {}", e.getMessage());
            return Map.of("raw", llmResponse, "parse_error", e.getMessage());
        }
    }

    private List<Map<String, Object>> parseJsonArray(String llmResponse) {
        if (llmResponse == null || llmResponse.isBlank()) {
            return List.of();
        }
        String json = extractJson(llmResponse, "[", "]");
        try {
            return objectMapper.readValue(json, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception e) {
            log.warn("Failed to parse LLM JSON array response, returning empty. Error: {}", e.getMessage());
            return List.of(Map.of("raw", llmResponse, "parse_error", e.getMessage()));
        }
    }

    private String extractJson(String raw, String openBrace, String closeBrace) {
        String trimmed = raw.trim();

        int fenceStart = trimmed.indexOf("```json");
        if (fenceStart >= 0) {
            int contentStart = trimmed.indexOf("\n", fenceStart) + 1;
            int fenceEnd = trimmed.indexOf("```", contentStart);
            if (fenceEnd > contentStart) {
                return trimmed.substring(contentStart, fenceEnd).trim();
            }
            return trimmed.substring(contentStart).trim();
        }

        int fenceSimple = trimmed.indexOf("```");
        if (fenceSimple >= 0) {
            int contentStart = trimmed.indexOf("\n", fenceSimple) + 1;
            int fenceEnd = trimmed.indexOf("```", contentStart);
            if (fenceEnd > contentStart) {
                return trimmed.substring(contentStart, fenceEnd).trim();
            }
        }

        int objStart = trimmed.indexOf(openBrace);
        int objEnd = trimmed.lastIndexOf(closeBrace);
        if (objStart >= 0 && objEnd > objStart) {
            return trimmed.substring(objStart, objEnd + 1);
        }

        return trimmed;
    }
}
