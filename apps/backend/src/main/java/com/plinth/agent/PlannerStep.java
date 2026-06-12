package com.plinth.agent;

import com.plinth.domain.CampaignState;
import com.plinth.llm.LlmService;
import com.plinth.prompt.PromptCatalog;
import com.plinth.service.AgentIdentityService;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class PlannerStep implements AgentStep {

    private final LlmService llmService;
    private final PromptCatalog prompts;
    private final AgentIdentityService identityService;

    public PlannerStep(LlmService llmService, PromptCatalog prompts, AgentIdentityService identityService) {
        this.llmService = llmService;
        this.prompts = prompts;
        this.identityService = identityService;
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
        String identityContext = identityService.buildIdentityContext(state.getCompanyProfile());
        String planDraft = llmService.generate(
                prompts.planner(identityContext),
                "Company context:\n" + state.getCompanyContext()
                        + "\n\nTopic: " + state.getTopic()
                        + "\nPlatforms: " + state.getPlatforms()
                        + "\nOutputs: " + state.getOutputs()
        );
        state.putPlan("campaign_title", "Campaign: " + state.getTopic());
        state.putPlan("goal", "Generate platform-ready content assets");
        state.putPlan("company", state.getCompanySnapshot());
        state.putPlan("target_platforms", state.getPlatforms());
        state.putPlan("requested_outputs", state.getOutputs());
        state.putPlan("draft", planDraft);
        state.putPlan("execution_queue", List.of("Researcher", "Strategist", "SocialWriters", "Reviewer", "Analytics"));
        state.completeStep(name());
    }
}
