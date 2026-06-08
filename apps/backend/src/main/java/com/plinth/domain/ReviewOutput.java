package com.plinth.domain;

public record ReviewOutput(
        ReviewStatus status,
        String policyResult,
        String verdict
) {}