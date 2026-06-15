package com.plinth.dto.response;

import java.util.Map;

public record ProgressiveResponse(
        String strategyId,
        String companyId,
        String currentStage,
        String nextStage,
        boolean nextAvailable,
        Map<String, Object> data,
        String message
) {
    public ProgressiveResponse withNextStage(String next) {
        return new ProgressiveResponse(strategyId, companyId, currentStage, next, true, data, message);
    }

    public ProgressiveResponse noNext() {
        return new ProgressiveResponse(strategyId, companyId, currentStage, null, false, data, message);
    }
}
