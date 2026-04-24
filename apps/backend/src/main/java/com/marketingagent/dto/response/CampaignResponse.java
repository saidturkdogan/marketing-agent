package com.marketingagent.dto.response;

import java.util.List;
import java.util.Map;

public record CampaignResponse(
        String campaign_id,
        String status,
        Map<String, Object> plan,
        Map<String, Object> assets,
        List<String> completed_steps,
        Double performance_score
) {
}
