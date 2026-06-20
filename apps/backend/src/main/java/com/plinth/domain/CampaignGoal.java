package com.plinth.domain;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public record CampaignGoal(
        String objective,
        List<String> kpis,
        String targetAudience,
        String successCriteria,
        Map<String, Object> metadata
) {
    public CampaignGoal(String objective) {
        this(objective, List.of("engagement", "reach"), "target audience", "All steps completed", Map.of());
    }

    public CampaignGoal(String objective, List<String> kpis, String targetAudience,
                        String successCriteria, List<String> executionSteps) {
        this(objective, kpis, targetAudience, successCriteria, createStepsMap(executionSteps));
    }

    private static Map<String, Object> createStepsMap(List<String> steps) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("execution_steps", steps);
        return m;
    }
}
