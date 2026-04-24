package com.marketingagent.agent;

import com.marketingagent.domain.CampaignState;
import com.marketingagent.llm.LlmService;
import com.marketingagent.prompt.PromptCatalog;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class PlannerStep implements AgentStep {

    private final LlmService llmService;
    private final PromptCatalog prompts;

    public PlannerStep(LlmService llmService, PromptCatalog prompts) {
        this.llmService = llmService;
        this.prompts = prompts;
    }

    @Override
    public String name() {
        return "Planner";
    }

    @Override
    public int order() {
        return 10;
    }

    @Override
    public void execute(CampaignState state) {
        String planDraft = llmService.generate(
                prompts.planner(),
                "Topic: " + state.getTopic() + "\nPlatforms: " + state.getPlatforms() + "\nOutputs: " + state.getOutputs()
        );
        state.putPlan("campaign_title", "Campaign: " + state.getTopic());
        state.putPlan("goal", "Generate platform-ready content assets");
        state.putPlan("target_platforms", state.getPlatforms());
        state.putPlan("requested_outputs", state.getOutputs());
        state.putPlan("draft", planDraft);
        state.putPlan("execution_queue", List.of("Researcher", "Strategist", "SocialWriters", "Reviewer", "Analytics"));
        state.completeStep(name());
    }
}
