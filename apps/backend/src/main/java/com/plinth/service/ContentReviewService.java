package com.plinth.service;

import com.plinth.domain.AgentDecision;
import com.plinth.domain.CompanyProfile;
import com.plinth.guardrail.GuardrailEngine;
import com.plinth.guardrail.GuardrailReport;
import com.plinth.persistence.entity.ContentEntity;
import com.plinth.prompt.PromptCatalog;
import com.plinth.tool.PolicyToolService;
import org.springframework.stereotype.Service;

@Service
public class ContentReviewService {

    public record ContentReviewResult(
            boolean passed,
            boolean blocked,
            boolean needsApproval,
            double confidence,
            String verdict,
            String feedback,
            GuardrailReport guardrailReport
    ) {}

    private final GuardrailEngine guardrailEngine;
    private final PolicyToolService policyToolService;
    private final ReasoningService reasoningService;
    private final AgentIdentityService identityService;
    private final PromptCatalog prompts;

    public ContentReviewService(GuardrailEngine guardrailEngine,
                                PolicyToolService policyToolService,
                                ReasoningService reasoningService,
                                AgentIdentityService identityService,
                                PromptCatalog prompts) {
        this.guardrailEngine = guardrailEngine;
        this.policyToolService = policyToolService;
        this.reasoningService = reasoningService;
        this.identityService = identityService;
        this.prompts = prompts;
    }

    public ContentReviewResult review(String runId,
                                      ContentEntity entity,
                                      CompanyProfile profile,
                                      String marketBriefSummary) {
        String contentText = buildContentText(entity);
        GuardrailReport guardrail = guardrailEngine.checkContent(
                entity.getContentId(), contentText, profile.companyId());
        String policyResult = policyToolService.check(contentText);
        boolean policyPassed = "pass".equals(policyResult);

        String identity = identityService.buildIdentityContext(profile);
        AgentDecision decision = reasoningService.reason(
                prompts.contentReviewer(identity),
                "Review this tweet for autopilot publishing.\n\n"
                        + "Content:\n" + contentText + "\n\n"
                        + "Market context:\n" + marketBriefSummary + "\n\n"
                        + "Policy check: " + policyResult + "\n"
                        + "Guardrail summary: " + guardrail.summary() + "\n\n"
                        + "Respond with one of: PASS, REVISE, or BLOCK.\n"
                        + "If REVISE or BLOCK, include specific rewrite instructions after FEEDBACK:",
                "ContentReviewer",
                runId
        );

        String answer = decision.answer() != null ? decision.answer().toUpperCase() : "";
        boolean llmBlock = answer.contains("BLOCK");
        boolean llmRevise = answer.contains("REVISE");
        boolean llmPass = answer.contains("PASS") && !llmBlock && !llmRevise;

        boolean blocked = guardrail.isBlocked() || llmBlock || !policyPassed;
        boolean passed = guardrail.isPassed() && policyPassed && llmPass;
        boolean needsApproval = !passed && !blocked;

        String feedback = extractFeedback(decision.answer());
        if (feedback.isBlank() && !guardrail.isPassed()) {
            feedback = guardrail.summary();
        }

        String verdict = blocked ? "blocked" : (passed ? "pass" : "needs_revision");

        return new ContentReviewResult(
                passed,
                blocked,
                needsApproval,
                decision.confidence(),
                verdict,
                feedback,
                guardrail
        );
    }

    private String extractFeedback(String answer) {
        if (answer == null) return "";
        int idx = answer.toUpperCase().indexOf("FEEDBACK:");
        if (idx >= 0) {
            return answer.substring(idx + "FEEDBACK:".length()).trim();
        }
        return answer.trim();
    }

    private String buildContentText(ContentEntity entity) {
        String text = entity.getBody() != null ? entity.getBody() : "";
        if (entity.getHashtags() != null && !entity.getHashtags().isEmpty()) {
            text += " " + String.join(" ", entity.getHashtags());
        }
        return text;
    }
}
