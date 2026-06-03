package com.marketingagent.domain;

public record AnalyticsOutput(
        double performanceScore,
        String learnings,
        boolean ragStored,
        String ragError
) {}