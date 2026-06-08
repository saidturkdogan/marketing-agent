package com.plinth.agent;

import com.plinth.domain.CampaignState;
import com.plinth.llm.LlmService;
import com.plinth.prompt.PromptCatalog;
import com.plinth.tool.PolicyToolService;
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
        String policyResult = policyToolService.check(assetsText);
        boolean policyPassed = "pass".equals(policyResult);

        String verdict = llmService.generate(
                prompts.reviewer(),
                "Campaign topic: " + state.getTopic()
                        + "\nCompany: " + state.getCompanyProfile().name()
                        + "\nAssets: " + assetsText
                        + "\n\nPolicy check result: " + policyResult
                        + (policyPassed
                                ? "\nPolicy check passed. Review for strategic consistency, platform fit, clarity, and completeness."
                                : "\nPolicy check found issues. Review the flagged content and suggest specific rewrites.")
        );

        state.putAsset("review", Map.of(
                "status", policyPassed ? "pass" : "needs_revision",
                "policy_result", policyResult,
                "policy_passed", policyPassed,
                "verdict", verdict
        ));
        state.completeStep(name());
    }
}
