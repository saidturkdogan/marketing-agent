package com.plinth.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plinth.domain.AgentDecision;
import com.plinth.llm.LlmService;
import com.plinth.persistence.entity.DecisionLogEntity;
import com.plinth.persistence.repository.DecisionLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ReasoningService {

    private static final Logger log = LoggerFactory.getLogger(ReasoningService.class);
    private static final Pattern REASONING_BLOCK = Pattern.compile(
            "<reasoning>([\\s\\S]*?)</reasoning>", Pattern.CASE_INSENSITIVE
    );
    private static final Pattern ANSWER_BLOCK = Pattern.compile(
            "<answer>([\\s\\S]*?)</answer>", Pattern.CASE_INSENSITIVE
    );
    private static final Pattern CONFIDENCE_PATTERN = Pattern.compile(
            "CONFIDENCE:\\s*(0?\\.\\d+|1\\.0|1\\.00|0|1)", Pattern.CASE_INSENSITIVE
    );

    private final LlmService llmService;
    private final DecisionLogRepository decisionLogRepository;
    private final ObjectMapper objectMapper;

    public ReasoningService(LlmService llmService,
                            DecisionLogRepository decisionLogRepository,
                            ObjectMapper objectMapper) {
        this.llmService = llmService;
        this.decisionLogRepository = decisionLogRepository;
        this.objectMapper = objectMapper;
    }

    public AgentDecision reason(String systemPrompt, String userPrompt,
                                String stepName, String campaignId) {
        String reasoningPrompt = userPrompt + "\n\n"
                + "Think step by step. Before giving your answer, write your reasoning "
                + "inside <reasoning></reasoning> tags. Then provide your final answer "
                + "inside <answer></answer> tags.\n"
                + "At the end, output your confidence in this decision on a separate line "
                + "as 'CONFIDENCE: X.XX' (0.0 to 1.0).";

        String raw = llmService.generate(systemPrompt, reasoningPrompt);
        return parseAndLog(raw, stepName, campaignId);
    }

    public AgentDecision reasonWithAlternatives(String systemPrompt, String userPrompt,
                                                 String stepName, String campaignId) {
        String reasoningPrompt = userPrompt + "\n\n"
                + "Think step by step. Before giving your answer, write your reasoning "
                + "inside <reasoning></reasoning> tags. Then provide your final answer "
                + "inside <answer></answer> tags.\n"
                + "If there are alternative approaches, list them inside "
                + "<alternatives></alternatives> tags, separated by '|'.\n"
                + "At the end, output your confidence in this decision on a separate line "
                + "as 'CONFIDENCE: X.XX' (0.0 to 1.0).";

        String raw = llmService.generate(systemPrompt, reasoningPrompt);
        return parseAndLog(raw, stepName, campaignId);
    }

    private AgentDecision parseAndLog(String raw, String stepName, String campaignId) {
        String reasoning = extractBlock(raw, REASONING_BLOCK);
        String answer = extractBlock(raw, ANSWER_BLOCK);
        double confidence = extractConfidence(raw);
        List<String> alternatives = extractAlternatives(raw);

        if (reasoning == null) {
            reasoning = "No explicit reasoning provided.";
            log.debug("No <reasoning> block found in LLM response for {}/{}", campaignId, stepName);
        }
        if (answer == null) {
            answer = raw.replaceAll("<[^>]+>", "").trim();
            if (answer.isBlank()) answer = raw;
        }

        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("raw_length", raw.length());
        metadata.put("has_reasoning", reasoning != null);
        metadata.put("has_alternatives", !alternatives.isEmpty());

        AgentDecision decision = new AgentDecision(
                reasoning, answer, confidence,
                alternatives, metadata
        );

        persistDecision(decision, raw, stepName, campaignId);
        return decision;
    }

    private void persistDecision(AgentDecision decision, String raw, String stepName, String campaignId) {
        try {
            DecisionLogEntity entity = new DecisionLogEntity();
            entity.setCampaignId(campaignId);
            entity.setStepName(stepName);
            entity.setReasoning(decision.reasoning());
            entity.setAnswer(decision.answer());
            entity.setConfidence(decision.confidence());
            entity.setAlternatives(String.join(" | ", decision.alternatives()));
            entity.setMetadataJson(objectMapper.writeValueAsString(decision.metadata()));
            decisionLogRepository.save(entity);
            log.info("Decision logged for {}/{} (confidence={})", campaignId, stepName,
                    String.format("%.2f", decision.confidence()));
        } catch (Exception ex) {
            log.error("Failed to persist decision log for {}/{}: {}", campaignId, stepName, ex.getMessage());
        }
    }

    private String extractBlock(String text, Pattern pattern) {
        if (text == null) return null;
        Matcher matcher = pattern.matcher(text);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        return null;
    }

    private double extractConfidence(String text) {
        if (text == null) return 0.5;
        Matcher matcher = CONFIDENCE_PATTERN.matcher(text);
        if (matcher.find()) {
            try {
                double val = Double.parseDouble(matcher.group(1).trim());
                return Math.max(0.0, Math.min(1.0, val));
            } catch (NumberFormatException e) {
                return 0.5;
            }
        }
        return 0.5;
    }

    private List<String> extractAlternatives(String text) {
        if (text == null) return List.of();
        Pattern altPattern = Pattern.compile(
                "<alternatives>([\\s\\S]*?)</alternatives>", Pattern.CASE_INSENSITIVE
        );
        Matcher matcher = altPattern.matcher(text);
        if (matcher.find()) {
            String content = matcher.group(1).trim();
            List<String> result = new ArrayList<>();
            for (String part : content.split("\\|")) {
                String trimmed = part.trim();
                if (!trimmed.isEmpty()) {
                    result.add(trimmed);
                }
            }
            return result;
        }
        return List.of();
    }
}
