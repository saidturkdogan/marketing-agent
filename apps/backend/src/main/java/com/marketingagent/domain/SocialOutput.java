package com.marketingagent.domain;

import java.util.List;
import java.util.Map;

public record SocialOutput(
        String platform,
        Map<String, Object> companyContext,
        String variantA,
        String variantB,
        Map<String, Object> platformSpecs,
        List<String> hashtags
) {}