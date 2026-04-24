package com.marketingagent.agent;

import com.marketingagent.domain.CampaignState;
import com.marketingagent.llm.LlmService;
import com.marketingagent.prompt.PromptCatalog;
import com.marketingagent.rag.RagService;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class AnalyticsStep implements AgentStep {

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
        double score = 0.71;
        String learnings = llmService.generate(prompts.analytics(), "Assets: " + state.getAssets());
        state.setPerformanceScore(score);
        state.putAsset("analytics", Map.of(
                "performance_score", score,
                "learnings", learnings
        ));
        try {
            ragService.storeCampaign(state);
            state.putAsset("rag", Map.of("stored", true));
        } catch (Exception ex) {
            state.putAsset("rag", Map.of("stored", false, "reason", ex.getMessage()));
        }
        state.completeStep(name());
    }
}
