package com.plinth.service;

import com.plinth.domain.CampaignState;
import com.plinth.workflow.CampaignWorkflowRunner;
import org.springframework.stereotype.Service;

@Service
public class JavaAiOrchestratorService {

    private final CampaignWorkflowRunner workflowRunner;

    public JavaAiOrchestratorService(CampaignWorkflowRunner workflowRunner) {
        this.workflowRunner = workflowRunner;
    }

    public CampaignState run(CampaignState state) {
        return workflowRunner.run(state);
    }
}
