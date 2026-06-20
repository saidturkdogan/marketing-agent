package com.plinth.agent;

import com.plinth.domain.AgentDecision;
import com.plinth.domain.CampaignState;
import com.plinth.llm.LlmService;
import com.plinth.prompt.PromptCatalog;
import com.plinth.rag.RagService;
import com.plinth.service.AgentIdentityService;
import com.plinth.service.CampaignMemoryService;
import com.plinth.service.KnowledgeBaseService;
import com.plinth.service.ReasoningService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class AnalyticsStep implements AgentStep {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsStep.class);

    private final LlmService llmService;
    private final PromptCatalog prompts;
    private final RagService ragService;
    private final AgentIdentityService identityService;
    private final ReasoningService reasoningService;
    private final CampaignMemoryService campaignMemoryService;
    private final KnowledgeBaseService knowledgeBaseService;

    public AnalyticsStep(LlmService llmService, PromptCatalog prompts, RagService ragService,
                         AgentIdentityService identityService,
                         ReasoningService reasoningService,
                         CampaignMemoryService campaignMemoryService,
                         KnowledgeBaseService knowledgeBaseService) {
        this.llmService = llmService;
        this.prompts = prompts;
        this.ragService = ragService;
        this.identityService = identityService;
        this.reasoningService = reasoningService;
        this.campaignMemoryService = campaignMemoryService;
        this.knowledgeBaseService = knowledgeBaseService;
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
        String identityContext = identityService.buildIdentityContext(state.getCompanyProfile());

        AgentDecision decision = reasoningService.reason(
                prompts.analytics(identityContext),
                "Campaign assets: " + assetsSummary
                        + "\n\nEvaluate the campaign quality on a scale of 0.0 to 1.0. "
                        + "Output your score on a separate line in the format 'SCORE: X.XX' (e.g., 'SCORE: 0.85'). "
                        + "Then provide concise learnings and recommendations.\n"
                        + "Also extract: what worked well, what could be improved, what to repeat next time.",
                name(),
                state.getCampaignId()
        );

        double score = parseScore(decision.answer(), assetsSummary);
        state.setPerformanceScore(score);

        state.putAsset("analytics", Map.of(
                "performance_score", score,
                "reasoning", decision.reasoning(),
                "confidence", decision.confidence(),
                "learnings", decision.answer()
        ));

        storeToRagIfQualityMet(state, score);
        campaignMemoryService.storeCampaignAsMemory(state);
        knowledgeBaseService.ingestCampaignLearning(state);
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

    private double calculateHeuristicScore(String assetsSummary) {
        double score = 0.1;
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
