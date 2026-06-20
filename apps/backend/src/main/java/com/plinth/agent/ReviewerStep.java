package com.plinth.agent;

import com.plinth.domain.AgentDecision;
import com.plinth.domain.CampaignState;
import com.plinth.guardrail.GuardrailEngine;
import com.plinth.guardrail.GuardrailReport;
import com.plinth.llm.LlmService;
import com.plinth.prompt.PromptCatalog;
import com.plinth.service.AgentIdentityService;
import com.plinth.service.ApprovalService;
import com.plinth.service.ReasoningService;
import com.plinth.tool.PolicyToolService;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class ReviewerStep implements AgentStep {

    private final LlmService llmService;
    private final PromptCatalog prompts;
    private final PolicyToolService policyToolService;
    private final GuardrailEngine guardrailEngine;
    private final ApprovalService approvalService;
    private final AgentIdentityService identityService;
    private final ReasoningService reasoningService;

    public ReviewerStep(LlmService llmService, PromptCatalog prompts,
                        PolicyToolService policyToolService,
                        GuardrailEngine guardrailEngine,
                        ApprovalService approvalService,
                        AgentIdentityService identityService,
                        ReasoningService reasoningService) {
        this.llmService = llmService;
        this.prompts = prompts;
        this.policyToolService = policyToolService;
        this.guardrailEngine = guardrailEngine;
        this.approvalService = approvalService;
        this.identityService = identityService;
        this.reasoningService = reasoningService;
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
    public boolean isEssential() {
        return true;
    }

    @Override
    public void execute(CampaignState state) {
        String assetsText = String.valueOf(state.getAssets());
        String policyResult = policyToolService.check(assetsText);
        boolean policyPassed = "pass".equals(policyResult);

        GuardrailReport guardrailReport = guardrailEngine.checkCampaign(state);
        boolean guardrailsPassed = guardrailReport.isPassed();

        String identityContext = identityService.buildIdentityContext(state.getCompanyProfile());

        AgentDecision decision = reasoningService.reason(
                prompts.reviewer(identityContext),
                "Campaign topic: " + state.getTopic()
                        + "\nCompany: " + state.getCompanyProfile().name()
                        + "\nAssets: " + assetsText
                        + "\n\nPolicy check result: " + policyResult
                        + "\nGuardrail check: " + guardrailReport.summary()
                        + (policyPassed && guardrailsPassed
                                ? "\nAll checks passed. Review for strategic consistency, platform fit, clarity, and completeness."
                                : "\nIssues found. Review flag content and suggest specific rewrites."),
                name(),
                state.getCampaignId()
        );

        String reviewStatus;
        if (policyPassed && guardrailsPassed) {
            reviewStatus = "pass";
        } else if (guardrailReport.isBlocked()) {
            reviewStatus = "blocked";
            approvalService.requestApproval(state, name(), guardrailReport);
        } else {
            reviewStatus = "needs_revision";
            if (guardrailReport.needsReview()) {
                approvalService.requestApproval(state, name(), guardrailReport);
            }
        }

        state.putAsset("review", Map.of(
                "status", reviewStatus,
                "policy_result", policyResult,
                "policy_passed", policyPassed,
                "guardrail_report", guardrailReport,
                "guardrails_passed", guardrailsPassed,
                "requires_approval", guardrailReport.requiresApproval(),
                "reasoning", decision.reasoning(),
                "confidence", decision.confidence(),
                "verdict", decision.answer()
        ));
        state.completeStep(name());
    }
}
