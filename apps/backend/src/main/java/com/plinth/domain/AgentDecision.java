package com.plinth.domain;

import java.util.List;
import java.util.Map;

public record AgentDecision(
        String reasoning,
        String answer,
        double confidence,
        List<String> alternatives,
        Map<String, Object> metadata
) {
    public AgentDecision(String reasoning, String answer, double confidence) {
        this(reasoning, answer, confidence, List.of(), Map.of());
    }
}
