package com.marketingagent.domain;

import java.util.List;
import java.util.Map;

public record PlanOutput(
        String campaignTitle,
        String goal,
        Map<String, Object> companySnapshot,
        List<String> targetPlatforms,
        List<String> requestedOutputs,
        String draft,
        List<String> executionQueue
) {}