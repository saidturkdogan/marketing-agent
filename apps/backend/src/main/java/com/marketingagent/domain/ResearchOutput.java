package com.marketingagent.domain;

import java.util.List;
import java.util.Map;

public record ResearchOutput(
        String brief,
        Map<String, Object> trends,
        Map<String, Object> keywords
) {}