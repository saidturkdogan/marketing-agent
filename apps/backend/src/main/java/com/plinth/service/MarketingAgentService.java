package com.plinth.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
public class MarketingAgentService {

    private final MarketingAgentOrchestrator orchestrator;

    public MarketingAgentService(MarketingAgentOrchestrator orchestrator) {
        this.orchestrator = orchestrator;
    }

    @Transactional
    public Map<String, Object> runWeeklyCycle(String companyId) {
        return orchestrator.runWeeklyCycle(companyId);
    }
}
