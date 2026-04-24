package com.marketingagent.agent;

import com.marketingagent.domain.CampaignState;
import com.marketingagent.llm.LlmService;
import com.marketingagent.prompt.PromptCatalog;
import com.marketingagent.tool.PolicyToolService;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class ReviewerStep implements AgentStep {

    private final LlmService llmService;
    private final PromptCatalog prompts;
    private final PolicyToolService policyToolService;

    public ReviewerStep(LlmService llmService, PromptCatalog prompts, PolicyToolService policyToolService) {
        this.llmService = llmService;
        this.prompts = prompts;
        this.policyToolService = policyToolService;
    }

    @Override
    public String name() {
        return "Reviewer";
    }

    @Override
    public int order() {
        return 50;
    }

    @Override
    public void execute(CampaignState state) {
        String assetsText = String.valueOf(state.getAssets());
        String policy = policyToolService.check(assetsText);
        String verdict = llmService.generate(prompts.reviewer(), "Assets: " + assetsText + "\nPolicy check: " + policy);
        state.putAsset("review", Map.of(
                "status", policy.equals("pass") ? "pass" : "needs_revision",
                "policy", policy,
                "verdict", verdict
        ));
        state.completeStep(name());
    }
}
