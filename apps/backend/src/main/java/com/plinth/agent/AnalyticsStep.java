package com.plinth.agent;

import com.plinth.domain.CampaignState;
import com.plinth.llm.LlmService;
import com.plinth.prompt.PromptCatalog;
import com.plinth.rag.RagService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class AnalyticsStep implements AgentStep {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsStep.class);

    private final LlmService llmService;
    private final PromptCatalog prompts;
    private final RagService ragService;

    public AnalyticsStep(LlmService llmService, PromptCatalog prompts, RagService ragService) {
        this.llmService = llmService;
        this.prompts = prompts;
        this.ragService = ragService;
    }

    @Override
    public String name() {
        return "Analytics";
    }

    @Override
    public int order() {
        return 60;
    }

    @Override
    public void execute(CampaignState state) {
        String assetsSummary = summarizeAssets(state.getAssets());
        String promptInput = "Campaign assets: " + assetsSummary
                + "\n\nEvaluate the campaign quality on a scale of 0.0 to 1.0. "
                + "Output your score on a separate line in the format 'SCORE: X.XX' (e.g., 'SCORE: 0.85'). "
                + "Then provide concise learnings and recommendations.";
        String learnings = llmService.generate(prompts.analytics(), promptInput);
        double score = parseScore(learnings, assetsSummary);

        state.setPerformanceScore(score);
        state.putAsset("analytics", Map.of(
                "performance_score", score,
                "learnings", learnings
        ));
        storeToRagIfQualityMet(state, score);
        state.completeStep(name());
    }

    private static final double RAG_STORE_THRESHOLD = 0.4;

    private void storeToRagIfQualityMet(CampaignState state, double score) {
        if (score < RAG_STORE_THRESHOLD) {
            log.info("Campaign {} scored {}. RAG storage skipped (threshold={}).",
                    state.getCampaignId(), String.format("%.2f", score), RAG_STORE_THRESHOLD);
            state.putAsset("rag", Map.of("stored", false, "reason",
                    "score " + String.format("%.2f", score) + " below threshold " + RAG_STORE_THRESHOLD));
            return;
        }
        try {
            ragService.storeCampaign(state);
            state.putAsset("rag", Map.of("stored", true));
            log.info("Campaign {} stored in RAG with score {}", state.getCampaignId(), String.format("%.2f", score));
        } catch (Exception ex) {
            log.error("RAG storage failed for campaign {}", state.getCampaignId(), ex);
            state.putAsset("rag", Map.of("stored", false, "reason", ex.getMessage()));
        }
    }

    /**
     * Extracts a score from the LLM response. Falls back to content-based
     * heuristics if parsing fails.
     */
    private double parseScore(String learnings, String assetsSummary) {
        if (learnings != null) {
            for (String line : learnings.lines().toList()) {
                String trimmed = line.trim();
                if (trimmed.startsWith("SCORE:") || trimmed.startsWith("Score:") || trimmed.startsWith("score:")) {
                    try {
                        String numeric = trimmed.substring(trimmed.indexOf(":") + 1).trim();
                        double parsed = Double.parseDouble(numeric);
                        return Math.max(0.0, Math.min(1.0, parsed));
                    } catch (NumberFormatException e) {
                        log.debug("Failed to parse score from line: {}", trimmed);
                    }
                }
            }
        }
        return calculateHeuristicScore(assetsSummary);
    }

    /**
     * Content-based quality heuristics as fallback:
     * - Presence of research, strategy, social assets: +0.2 each
     * - Review passed: +0.25
     * - Has analytics/learnings: +0.15
     */
    private double calculateHeuristicScore(String assetsSummary) {
        double score = 0.1; // baseline
        if (assetsSummary.contains("research")) score += 0.2;
        if (assetsSummary.contains("strategy")) score += 0.2;
        if (assetsSummary.contains("social")) score += 0.2;
        if (assetsSummary.contains("review") && assetsSummary.contains("pass")) score += 0.25;
        if (assetsSummary.contains("learnings")) score += 0.05;
        return Math.min(1.0, score);
    }

    private String summarizeAssets(Map<String, Object> assets) {
        if (assets == null || assets.isEmpty()) return "No assets available";
        StringBuilder sb = new StringBuilder();
        for (String key : assets.keySet()) {
            sb.append("[").append(key).append("] present; ");
        }
        return sb.toString();
    }
}
