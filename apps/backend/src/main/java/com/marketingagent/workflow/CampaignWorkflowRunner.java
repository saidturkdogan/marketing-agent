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
import java.util.stream.Collectors;

@Component
public class CampaignWorkflowRunner {

    private static final Logger log = LoggerFactory.getLogger(CampaignWorkflowRunner.class);

    private final List<AgentStep> steps;

    public CampaignWorkflowRunner(List<AgentStep> steps) {
        var sorted = steps.stream().sorted(Comparator.comparingInt(AgentStep::order)).toList();

        var orderGroups = sorted.stream()
                .collect(Collectors.groupingBy(AgentStep::order));
        var duplicates = orderGroups.entrySet().stream()
                .filter(e -> e.getValue().size() > 1)
                .toList();
        if (!duplicates.isEmpty()) {
            var conflictNames = duplicates.stream()
                    .map(e -> "order=" + e.getKey() + ": "
                            + e.getValue().stream().map(AgentStep::name).collect(Collectors.joining(", ")))
                    .collect(Collectors.joining("; "));
            throw new IllegalStateException(
                    "Duplicate step order detected. Each AgentStep must have a unique order(). Conflicts: " + conflictNames);
        }

        this.steps = sorted;
    }

    public CampaignState run(CampaignState state) {
        List<String> errors = new ArrayList<>();
        Map<String, Long> stepTimings = new LinkedHashMap<>();
        long workflowStartedAt = System.currentTimeMillis();

        for (AgentStep step : steps) {
            long startedAt = System.currentTimeMillis();
            try {
                step.execute(state);
                long elapsed = System.currentTimeMillis() - startedAt;
                stepTimings.put(step.name(), elapsed);
                log.info("Step '{}' completed in {}ms for campaign {}", step.name(), elapsed, state.getCampaignId());
            } catch (Exception ex) {
                long elapsed = System.currentTimeMillis() - startedAt;
                stepTimings.put(step.name() + " (failed)", elapsed);
                log.error("Step '{}' failed after {}ms for campaign {}: {}", step.name(), elapsed, state.getCampaignId(), ex.getMessage(), ex);
                errors.add(step.name() + ": " + ex.getMessage());

                if ("Planner".equals(step.name())) {
                    state.setStatus("failed");
                    state.putAsset("errors", errors);
                    state.putAsset("step_timings_ms", stepTimings);
                    state.putAsset("total_duration_ms", System.currentTimeMillis() - workflowStartedAt);
                    log.warn("Critical step '{}' failed, aborting workflow for campaign {}", step.name(), state.getCampaignId());
                    return state;
                }

                log.warn("Non-critical step '{}' failed, continuing workflow for campaign {}", step.name(), state.getCampaignId());
            }
        }

        state.putAsset("step_timings_ms", stepTimings);
        state.putAsset("total_duration_ms", System.currentTimeMillis() - workflowStartedAt);

        if (!errors.isEmpty()) {
            state.setStatus("completed_with_errors");
            state.putAsset("errors", errors);
        } else {
            state.setStatus("completed");
        }

        return state;
    }
}