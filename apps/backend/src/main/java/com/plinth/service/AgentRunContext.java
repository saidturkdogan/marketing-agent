package com.plinth.service;

/**
 * Thread-local scope for an active marketing agent run (LLM metering, budget attribution).
 */
public final class AgentRunContext {

    public record Scope(String companyId, String runId) {}

    private static final ThreadLocal<Scope> CURRENT = new ThreadLocal<>();

    private AgentRunContext() {}

    public static void set(Scope scope) {
        CURRENT.set(scope);
    }

    public static Scope get() {
        return CURRENT.get();
    }

    public static void clear() {
        CURRENT.remove();
    }

    public static <T> T runWith(Scope scope, java.util.function.Supplier<T> action) {
        set(scope);
        try {
            return action.get();
        } finally {
            clear();
        }
    }
}
