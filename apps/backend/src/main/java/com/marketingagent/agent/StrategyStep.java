package com.marketingagent.agent;

import com.marketingagent.domain.CampaignState;
import com.marketingagent.llm.LlmService;
import com.marketingagent.prompt.PromptCatalog;
import com.marketingagent.rag.RagService;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class StrategyStep implements AgentStep {

    private final LlmService llmService;
    private final PromptCatalog prompts;
    private final RagService ragService;

    public StrategyStep(LlmService llmService, PromptCatalog prompts, RagService ragService) {
        this.llmService = llmService;
        this.prompts = prompts;
        this.ragService = ragService;
    }

    @Override
    public String name() {
        return "Strategist";
    }

    @Override
    public int order() {
        return 30;
    }

    @Override
    public void execute(CampaignState state) {
        List<String> context = ragService.retrieveContext(state.getTopic(), 3);
        String strategy = llmService.generate(
                prompts.strategist(),
                "Topic: " + state.getTopic() + "\nPlan: " + state.getPlan() + "\nResearch: " + state.getAssets().get("research") + "\nSimilar campaigns: " + context
        );
        state.putAsset("strategy", Map.of(
                "positioning", strategy,
                "content_pillars", List.of("Pain", "Solution", "Outcome"),
                "cta", "Book a demo",
                "rag_context_count", context.size()
        ));
        state.completeStep(name());
    }
}
