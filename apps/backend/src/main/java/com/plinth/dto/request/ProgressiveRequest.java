package com.plinth.dto.request;

import java.util.List;

public record ProgressiveRequest(
        String companyId,
        String websiteUrl,
        String companyName,
        String industry,
        String productDescription,
        String targetAudience,
        String targetCountry,
        String goal,
        List<String> competitorUrls,
        String strategyId
) {
    public ProgressiveRequest withStrategyId(String sid) {
        return new ProgressiveRequest(companyId, websiteUrl, companyName, industry,
                productDescription, targetAudience, targetCountry, goal,
                competitorUrls, sid);
    }
}
