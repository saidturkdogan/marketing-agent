package com.plinth.controller;

import com.plinth.dto.request.StrategyRequest;
import com.plinth.dto.response.DashboardResponse;
import com.plinth.dto.response.StrategyResponse;
import com.plinth.llm.LlmService;
import com.plinth.service.StrategyService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/strategy")
public class StrategyController {

    private final StrategyService strategyService;
    private final LlmService llmService;

    public StrategyController(StrategyService strategyService, LlmService llmService) {
        this.strategyService = strategyService;
        this.llmService = llmService;
    }

    @PostMapping("/analyze-website")
    public Map<String, Object> analyzeWebsite(@RequestBody Map<String, String> body) {
        String url = body.get("url");
        if (url == null || url.isBlank()) {
            throw new IllegalArgumentException("url is required");
        }
        return strategyService.analyzeWebsite(url);
    }

    @PostMapping("/discover-competitors")
    public List<Map<String, Object>> discoverCompetitors(@RequestBody Map<String, String> body) {
        String companyName = body.getOrDefault("companyName", "");
        String industry = body.getOrDefault("industry", "");
        String productDescription = body.getOrDefault("productDescription", "");
        String targetCountry = body.getOrDefault("targetCountry", "");
        return strategyService.discoverCompetitors(companyName, industry, productDescription, targetCountry);
    }

    @PostMapping("/analyze-competitors")
    public Map<String, Object> analyzeCompetitors(@RequestBody Map<String, Object> body) {
        String companyName = (String) body.getOrDefault("companyName", "");
        @SuppressWarnings("unchecked")
        List<String> competitorUrls = (List<String>) body.getOrDefault("competitorUrls", List.of());
        String industry = (String) body.getOrDefault("industry", "");
        return strategyService.analyzeCompetitors(companyName, competitorUrls, industry);
    }

    @PostMapping("/content-gaps")
    public Map<String, Object> findContentGaps(@RequestBody Map<String, Object> body) {
        String companyName = (String) body.getOrDefault("companyName", "");
        String industry = (String) body.getOrDefault("industry", "");
        @SuppressWarnings("unchecked")
        Map<String, Object> competitorAnalysis = (Map<String, Object>) body.getOrDefault("competitorAnalysis", Map.of());
        String goal = (String) body.getOrDefault("goal", "");
        return strategyService.findContentGaps(companyName, industry, competitorAnalysis, goal);
    }

    @PostMapping("/discover-keywords")
    public Map<String, Object> discoverKeywords(@RequestBody Map<String, String> body) {
        String companyName = body.getOrDefault("companyName", "");
        String industry = body.getOrDefault("industry", "");
        String goal = body.getOrDefault("goal", "");
        String targetAudience = body.getOrDefault("targetAudience", "");
        return strategyService.discoverKeywords(companyName, industry, goal, targetAudience);
    }

    @PostMapping("/generate-strategy")
    public StrategyResponse generateStrategy(@Valid @RequestBody StrategyRequest request) {
        return strategyService.runFullAnalysis(request);
    }

    @PostMapping("/generate-calendar")
    public Map<String, Object> generateCalendar(@RequestBody Map<String, String> body) {
        String companyId = body.getOrDefault("companyId", "");
        if (companyId.isBlank()) {
            throw new IllegalArgumentException("companyId is required");
        }
        StrategyResponse latest = strategyService.getLatestStrategy(companyId);
        var report = new com.plinth.domain.StrategyReport()
                .companyId(companyId)
                .businessType(latest.businessType())
                .targetCountry(latest.targetCountry())
                .goal(latest.goal())
                .strategy(latest.strategy())
                .build();
        return strategyService.generateCalendar(companyId, report);
    }

    @PostMapping("/generate-brief")
    public Map<String, Object> generateBrief(@RequestBody Map<String, String> body) {
        String companyId = body.getOrDefault("companyId", "");
        String strategyId = body.getOrDefault("strategyId", "");
        String contentTitle = body.getOrDefault("contentTitle", "");
        String contentType = body.getOrDefault("contentType", "blog");
        String goal = body.getOrDefault("goal", "");
        String targetAudience = body.getOrDefault("targetAudience", "");
        return strategyService.generateBrief(companyId, strategyId, contentTitle, contentType, goal, targetAudience);
    }

    @PostMapping("/run-full")
    public StrategyResponse runFullAnalysis(@Valid @RequestBody StrategyRequest request) {
        return strategyService.runFullAnalysis(request);
    }

    @GetMapping("/{strategyId}")
    public StrategyResponse getStrategy(@PathVariable String strategyId) {
        return strategyService.getStrategy(strategyId);
    }

    @GetMapping("/dashboard/{companyId}")
    public DashboardResponse getDashboard(@PathVariable String companyId) {
        return strategyService.getDashboard(companyId);
    }

    @PostMapping("/ai-suggest")
    public Map<String, String> aiSuggest(@RequestBody Map<String, String> body) {
        String fieldName = body.getOrDefault("field", "");
        String currentText = body.getOrDefault("currentText", "");
        String context = body.getOrDefault("context", "");

        String systemPrompt = """
                You are a helpful marketing strategy assistant. Your task is to enhance and expand the user's draft text
                for a marketing onboarding form. Make the text more detailed, professional, and compelling while
                staying true to the user's intent. Return ONLY the enhanced plain text, nothing else.
                Do NOT use markdown formatting like **bold** or *italic*. Output raw text only.
                """;

        String userPrompt = String.format(
                "Field: %s\nCurrent text: %s\nAdditional context: %s\n\nPlease enhance the text above.",
                fieldName, currentText, context
        );

        String suggestion = llmService.generate(systemPrompt, userPrompt);
        return Map.of("suggestion", suggestion != null ? suggestion.trim() : currentText);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> handleBadRequest(IllegalArgumentException ex) {
        return Map.of("error", ex.getMessage());
    }
}
