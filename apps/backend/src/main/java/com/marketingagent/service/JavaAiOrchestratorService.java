package com.marketingagent.service;

import com.marketingagent.domain.CampaignState;
import com.marketingagent.workflow.CampaignWorkflowRunner;
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
