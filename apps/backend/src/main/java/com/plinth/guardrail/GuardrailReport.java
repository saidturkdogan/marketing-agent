package com.plinth.guardrail;

import java.util.List;

public record GuardrailReport(
        String contentId,
        String overallStatus,
        List<GuardrailCheck> checks,
        boolean requiresApproval,
        String summary
) {
    public static GuardrailReport build(String contentId, List<GuardrailCheck> checks) {
        long failedCount = checks.stream().filter(c -> !c.passed()).count();
        long errorCount = checks.stream().filter(c -> "error".equals(c.severity()) && !c.passed()).count();

        String overallStatus;
        boolean requiresApproval;

        if (errorCount > 0) {
            overallStatus = "blocked";
            requiresApproval = true;
        } else if (failedCount > 0) {
            overallStatus = "needs_review";
            requiresApproval = true;
        } else {
            overallStatus = "passed";
            requiresApproval = false;
        }

        String summary = String.format(
                "Guardrail: %s — %d/%d checks passed (%d warnings)",
                overallStatus, checks.size() - failedCount, checks.size(), failedCount - errorCount
        );

        return new GuardrailReport(contentId, overallStatus, checks, requiresApproval, summary);
    }

    public boolean isBlocked() {
        return "blocked".equals(overallStatus);
    }

    public boolean needsReview() {
        return "needs_review".equals(overallStatus);
    }

    public boolean isPassed() {
        return "passed".equals(overallStatus);
    }
}
