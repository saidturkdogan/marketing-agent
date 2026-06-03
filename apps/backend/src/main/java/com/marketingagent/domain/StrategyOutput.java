package com.marketingagent.domain;

import java.util.List;

public record StrategyOutput(
        String positioning,
        List<String> contentPillars,
        String cta,
        int ragContextCount
) {}