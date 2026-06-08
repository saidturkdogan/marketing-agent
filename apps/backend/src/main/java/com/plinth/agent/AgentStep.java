package com.plinth.agent;

import com.plinth.domain.CampaignState;

public interface AgentStep {
    String name();
    int order();
    void execute(CampaignState state);
}
