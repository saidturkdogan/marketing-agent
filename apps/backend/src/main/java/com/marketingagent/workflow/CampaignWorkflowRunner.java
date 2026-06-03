package com.marketingagent.workflow;

import com.marketingagent.agent.AgentStep;
import com.marketingagent.domain.CampaignState;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Component
public class CampaignWorkflowRunner {

    private static final Logger log = LoggerFactory.getLogger(CampaignWorkflowRunner.class);
    private static final Set<String> CRITICAL_STEPS = Set.of("Planner");

    private final List<AgentStep> steps;

    public CampaignWorkflowRunner(List<AgentStep> steps) {
        this.steps = steps.stream().sorted(Comparator.comparingInt(AgentStep::order)).toList();
    }

    public CampaignState run(CampaignState state) {
        List<String> errors = new ArrayList<>();

        for (AgentStep step : steps) {
            try {
                step.execute(state);
                log.info("Step '{}' completed successfully for campaign {}", step.name(), state.getCampaignId());
            } catch (Exception ex) {
                log.error("Step '{}' failed for campaign {}: {}", step.name(), state.getCampaignId(), ex.getMessage(), ex);
                errors.add(step.name() + ": " + ex.getMessage());

                if (CRITICAL_STEPS.contains(step.name())) {
                    state.setStatus("failed");
                    state.putAsset("errors", errors);
                    log.warn("Critical step '{}' failed, aborting workflow for campaign {}", step.name(), state.getCampaignId());
                    return state;
                }

                // Non-critical steps: log error and continue
                log.warn("Non-critical step '{}' failed, continuing workflow for campaign {}", step.name(), state.getCampaignId());
            }
        }

        if (!errors.isEmpty()) {
            state.setStatus("completed_with_errors");
            state.putAsset("errors", errors);
        } else {
            state.setStatus("completed");
        }

        return state;
    }
}