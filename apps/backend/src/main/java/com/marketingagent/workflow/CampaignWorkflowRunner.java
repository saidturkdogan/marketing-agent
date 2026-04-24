package com.marketingagent.workflow;

import com.marketingagent.agent.AgentStep;
import com.marketingagent.domain.CampaignState;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;

@Component
public class CampaignWorkflowRunner {

    private final List<AgentStep> steps;

    public CampaignWorkflowRunner(List<AgentStep> steps) {
        this.steps = steps.stream().sorted(Comparator.comparingInt(AgentStep::order)).toList();
    }

    public CampaignState run(CampaignState state) {
        for (AgentStep step : steps) {
            step.execute(state);
        }
        state.setStatus("completed");
        return state;
    }
}
