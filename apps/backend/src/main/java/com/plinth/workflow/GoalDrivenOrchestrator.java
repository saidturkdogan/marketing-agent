package com.plinth.workflow;

import com.plinth.agent.AgentStep;
import com.plinth.domain.CampaignGoal;
import com.plinth.domain.CampaignState;
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
public class GoalDrivenOrchestrator {

    private static final Logger log = LoggerFactory.getLogger(GoalDrivenOrchestrator.class);

    private final List<AgentStep> steps;

    public GoalDrivenOrchestrator(List<AgentStep> steps) {
        var sorted = steps.stream()
                .sorted(Comparator.comparingInt(AgentStep::order))
                .toList();

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
        if (state.getGoal() == null) {
            state.setGoal(new CampaignGoal("Complete campaign: " + state.getTopic()));
        }

        List<String> errors = new ArrayList<>();
        Map<String, Long> stepTimings = new LinkedHashMap<>();
        long workflowStartedAt = System.currentTimeMillis();

        log.info("GoalDrivenOrchestrator: starting campaign {} with goal '{}'",
                state.getCampaignId(), state.getGoal().objective());

        int maxPasses = steps.size() * 2;
        int pass = 0;

        while (!state.isGoalAchieved() && pass < maxPasses) {
            pass++;
            boolean anyStepRan = false;

            for (AgentStep step : steps) {
                if (state.isGoalAchieved()) break;

                if (state.hasCompleted(step.name()) || state.wasSkipped(step.name())) {
                    continue;
                }

                if (!step.shouldRun(state)) {
                    log.info("Step '{}' preconditions not met, skipping for campaign {}",
                            step.name(), state.getCampaignId());
                    state.skipStep(step.name());
                    continue;
                }

                long startedAt = System.currentTimeMillis();
                try {
                    step.execute(state);
                    long elapsed = System.currentTimeMillis() - startedAt;
                    stepTimings.put(step.name(), elapsed);
                    anyStepRan = true;
                    log.info("Step '{}' completed in {}ms for campaign {}",
                            step.name(), elapsed, state.getCampaignId());
                } catch (Exception ex) {
                    long elapsed = System.currentTimeMillis() - startedAt;
                    stepTimings.put(step.name() + " (failed)", elapsed);
                    log.error("Step '{}' failed after {}ms for campaign {}: {}",
                            step.name(), elapsed, state.getCampaignId(), ex.getMessage(), ex);
                    errors.add(step.name() + ": " + ex.getMessage());

                    if (step.isEssential()) {
                        state.setStatus("failed");
                        state.putAsset("errors", errors);
                        state.putAsset("step_timings_ms", stepTimings);
                        state.putAsset("total_duration_ms", System.currentTimeMillis() - workflowStartedAt);
                        log.warn("Essential step '{}' failed, aborting workflow for campaign {}",
                                step.name(), state.getCampaignId());
                        return state;
                    }

                    log.warn("Non-essential step '{}' failed, continuing workflow for campaign {}",
                            step.name(), state.getCampaignId());
                }
            }

            if (!anyStepRan && pass >= 1) {
                log.info("No steps ran in pass {}, stopping for campaign {}", pass, state.getCampaignId());
                break;
            }
        }

        state.putAsset("step_timings_ms", stepTimings);
        state.putAsset("total_duration_ms", System.currentTimeMillis() - workflowStartedAt);

        if (!errors.isEmpty()) {
            state.setStatus("completed_with_errors");
            state.putAsset("errors", errors);
        } else if (!"failed".equals(state.getStatus())) {
            state.setStatus("completed");
        }

        log.info("Orchestrator finished campaign {} with status '{}' after {} passes",
                state.getCampaignId(), state.getStatus(), pass);
        return state;
    }
}
