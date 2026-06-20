package com.plinth.agent;

import com.plinth.domain.CampaignState;

public interface AgentStep {
    String name();
    int order();
    void execute(CampaignState state);

    default boolean shouldRun(CampaignState state) {
        return !state.hasCompleted(name());
    }

    default boolean isEssential() {
        return false;
    }
}
