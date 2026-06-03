package com.marketingagent.domain;

public record ReviewOutput(
        ReviewStatus status,
        String policyResult,
        String verdict
) {}