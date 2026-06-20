package com.plinth.service;

import com.plinth.domain.CampaignState;
import com.plinth.workflow.GoalDrivenOrchestrator;
import org.springframework.stereotype.Service;

@Service
public class JavaAiOrchestratorService {

    private final GoalDrivenOrchestrator orchestrator;

    public JavaAiOrchestratorService(GoalDrivenOrchestrator orchestrator) {
        this.orchestrator = orchestrator;
    }

    public CampaignState run(CampaignState state) {
        return orchestrator.run(state);
    }
}
