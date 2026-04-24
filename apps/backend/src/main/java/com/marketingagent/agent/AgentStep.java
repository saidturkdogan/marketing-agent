package com.marketingagent.agent;

import com.marketingagent.domain.CampaignState;

public interface AgentStep {
    String name();
    int order();
    void execute(CampaignState state);
}
