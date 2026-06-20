package com.plinth.agent;

import com.plinth.domain.AgentDecision;
import com.plinth.domain.CampaignGoal;
import com.plinth.domain.CampaignState;
import com.plinth.llm.LlmService;
import com.plinth.prompt.PromptCatalog;
import com.plinth.service.AgentIdentityService;
import com.plinth.service.KnowledgeBaseService;
import com.plinth.service.ReasoningService;
import com.plinth.service.UnifiedProfileService;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class PlannerStep implements AgentStep {

    private final LlmService llmService;
    private final PromptCatalog prompts;
    private final AgentIdentityService identityService;
    private final ReasoningService reasoningService;
    private final UnifiedProfileService unifiedProfileService;
    private final KnowledgeBaseService knowledgeBaseService;

    public PlannerStep(LlmService llmService, PromptCatalog prompts,
                       AgentIdentityService identityService,
                       ReasoningService reasoningService,
                       UnifiedProfileService unifiedProfileService,
                       KnowledgeBaseService knowledgeBaseService) {
        this.llmService = llmService;
        this.prompts = prompts;
        this.identityService = identityService;
        this.reasoningService = reasoningService;
        this.unifiedProfileService = unifiedProfileService;
        this.knowledgeBaseService = knowledgeBaseService;
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
    public boolean isEssential() {
        return true;
    }

    @Override
    public void execute(CampaignState state) {
        String identityContext = identityService.buildIdentityContext(state.getCompanyProfile());
        String unifiedContext = unifiedProfileService.buildUnifiedContext(state.getCompanyId());
        String knowledgeContext = knowledgeBaseService.buildKnowledgeContext(state.getCompanyId());

        String userPrompt = "Company context:\n" + state.getCompanyContext()
                + "\n\nTopic: " + state.getTopic()
                + "\nPlatforms: " + state.getPlatforms()
                + "\nOutputs: " + state.getOutputs()
                + "\n\nUnified customer profile:\n" + unifiedContext
                + "\n\nBrand knowledge:\n" + (knowledgeContext.isBlank() ? "No knowledge entries yet." : knowledgeContext)
                + "\n\nPast campaign context:\n" + (state.getMemoryContext() != null ? state.getMemoryContext() : "No past campaigns.");

        AgentDecision decision = reasoningService.reason(
                prompts.planner(identityContext),
                userPrompt,
                name(),
                state.getCampaignId()
        );

        state.setGoal(new CampaignGoal(
                "Generate platform-ready content assets for: " + state.getTopic(),
                List.of("engagement", "reach", "quality_score"),
                state.getCompanyProfile().targetAudience(),
                "All content generated, reviewed, and scored",
                List.of("Planner", "Researcher", "Strategist", "SocialWriters", "Reviewer", "Analytics")
        ));

        state.putPlan("campaign_title", "Campaign: " + state.getTopic());
        state.putPlan("objective", state.getGoal().objective());
        state.putPlan("company", state.getCompanySnapshot());
        state.putPlan("target_platforms", state.getPlatforms());
        state.putPlan("requested_outputs", state.getOutputs());
        state.putPlan("draft", decision.answer());
        state.putPlan("reasoning", decision.reasoning());
        state.putPlan("confidence", decision.confidence());
        state.completeStep(name());
    }
}
