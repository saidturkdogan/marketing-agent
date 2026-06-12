package com.plinth.workflow;

import com.plinth.agent.AgentStep;
import com.plinth.domain.CampaignState;
import com.plinth.domain.CompanyProfile;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CampaignWorkflowRunnerTest {

    private CampaignWorkflowRunner runner;
    private boolean step1Executed;
    private boolean step2Executed;

    @BeforeEach
    void setUp() {
        step1Executed = false;
        step2Executed = false;

        AgentStep step1 = new AgentStep() {
            @Override public String name() { return "Step1"; }
            @Override public int order() { return 10; }
            @Override public void execute(CampaignState state) {
                step1Executed = true;
                state.completeStep("Step1");
            }
        };

        AgentStep step2 = new AgentStep() {
            @Override public String name() { return "Step2"; }
            @Override public int order() { return 20; }
            @Override public void execute(CampaignState state) {
                step2Executed = true;
                state.completeStep("Step2");
            }
        };

        runner = new CampaignWorkflowRunner(List.of(step1, step2));
    }

    @Test
    void shouldExecuteAllStepsAndComplete() {
        CompanyProfile profile = new CompanyProfile(
                "c1", "TestCo", null, null, "Tech", "desc",
                "audience", "voice", "vp", List.of(), List.of(), null,
                null, null, null, null, null
        );
        CampaignState state = new CampaignState("camp-1", profile, "Topic", List.of("LinkedIn"), List.of("social"));

        CampaignState result = runner.run(state);

        assertThat(step1Executed).isTrue();
        assertThat(step2Executed).isTrue();
        assertThat(result.getStatus()).isEqualTo("completed");
        assertThat(result.getCompletedSteps()).contains("Step1", "Step2");
    }

    @Test
    void shouldContinueOnNonCriticalStepFailure() {
        AgentStep failingStep = new AgentStep() {
            @Override public String name() { return "FailingStep"; }
            @Override public int order() { return 20; }
            @Override public void execute(CampaignState state) {
                throw new RuntimeException("Boom");
            }
        };

        AgentStep step1 = new AgentStep() {
            @Override public String name() { return "Step1"; }
            @Override public int order() { return 10; }
            @Override public void execute(CampaignState state) {
                step1Executed = true;
                state.completeStep("Step1");
            }
        };

        CampaignWorkflowRunner runner = new CampaignWorkflowRunner(List.of(step1, failingStep));
        CompanyProfile profile = new CompanyProfile(
                "c1", "TestCo", null, null, "Tech", "desc",
                "audience", "voice", "vp", List.of(), List.of(), null,
                null, null, null, null, null
        );
        CampaignState state = new CampaignState("camp-1", profile, "Topic", List.of("LinkedIn"), List.of("social"));

        CampaignState result = runner.run(state);

        assertThat(step1Executed).isTrue();
        assertThat(result.getStatus()).isEqualTo("completed_with_errors");
    }

    @Test
    void shouldAbortOnCriticalStepFailure() {
        AgentStep criticalFailing = new AgentStep() {
            @Override public String name() { return "Planner"; }
            @Override public int order() { return 10; }
            @Override public void execute(CampaignState state) {
                throw new RuntimeException("Critical failure");
            }
        };

        CampaignWorkflowRunner runner = new CampaignWorkflowRunner(List.of(criticalFailing));
        CompanyProfile profile = new CompanyProfile(
                "c1", "TestCo", null, null, "Tech", "desc",
                "audience", "voice", "vp", List.of(), List.of(), null,
                null, null, null, null, null
        );
        CampaignState state = new CampaignState("camp-1", profile, "Topic", List.of("LinkedIn"), List.of("social"));

        CampaignState result = runner.run(state);

        assertThat(result.getStatus()).isEqualTo("failed");
    }
}