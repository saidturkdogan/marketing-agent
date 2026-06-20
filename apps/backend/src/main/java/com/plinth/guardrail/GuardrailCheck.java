package com.plinth.guardrail;

public record GuardrailCheck(
        String ruleName,
        String category,
        String severity,
        boolean passed,
        String message,
        String suggestion
) {
    public static GuardrailCheck pass(String ruleName, String category) {
        return new GuardrailCheck(ruleName, category, "info", true, "Passed", null);
    }

    public static GuardrailCheck fail(String ruleName, String category, String message, String suggestion) {
        return new GuardrailCheck(ruleName, category, "error", false, message, suggestion);
    }

    public static GuardrailCheck warn(String ruleName, String category, String message, String suggestion) {
        return new GuardrailCheck(ruleName, category, "warning", false, message, suggestion);
    }
}
