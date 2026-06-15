package com.plinth.dto.response;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

public record StrategyResponse(
        String strategyId,
        String companyId,
        String businessType,
        String targetCountry,
        String targetLanguage,
        String productDescription,
        String averagePrice,
        String personaType,
        String goal,
        Map<String, Object> websiteAnalysis,
        List<Map<String, Object>> competitors,
        Map<String, Object> competitorAnalysis,
        Map<String, Object> contentGaps,
        Map<String, Object> keywordDiscovery,
        Map<String, Object> strategy,
        Map<String, Object> calendar,
        double marketingScore,
        List<Map<String, Object>> opportunities,
        Map<String, Object> pipelineAssets,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
