package com.plinth.dto.response;

import java.util.List;
import java.util.Map;

public record DashboardResponse(
        String strategyId,
        double marketingScore,
        int contentOpportunities,
        int competitorWeaknesses,
        int keywordsFound,
        List<Map<String, Object>> opportunities,
        Map<String, Object> calendar
) {
}
