package com.plinth.service;

import com.plinth.domain.CompanyProfile;
import com.plinth.persistence.entity.DecisionLogEntity;
import com.plinth.persistence.entity.StrategyEntity;
import com.plinth.persistence.repository.DecisionLogRepository;
import com.plinth.persistence.repository.StrategyRepository;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class AgentInsightsService {

    private final AgentBudgetService agentBudgetService;
    private final MarketPerceptionService marketPerceptionService;
    private final AgentLearningService agentLearningService;
    private final CompanyService companyService;
    private final StrategyRepository strategyRepository;
    private final DecisionLogRepository decisionLogRepository;
    private final ExternalDataService externalDataService;

    public AgentInsightsService(AgentBudgetService agentBudgetService,
                                MarketPerceptionService marketPerceptionService,
                                AgentLearningService agentLearningService,
                                CompanyService companyService,
                                StrategyRepository strategyRepository,
                                DecisionLogRepository decisionLogRepository,
                                ExternalDataService externalDataService) {
        this.agentBudgetService = agentBudgetService;
        this.marketPerceptionService = marketPerceptionService;
        this.agentLearningService = agentLearningService;
        this.companyService = companyService;
        this.strategyRepository = strategyRepository;
        this.decisionLogRepository = decisionLogRepository;
        this.externalDataService = externalDataService;
    }

    public Map<String, Object> getBudget(String companyId) {
        return agentBudgetService.budgetStatus(companyId);
    }

    public Map<String, Object> getMarketBrief(String companyId) {
        CompanyProfile profile = companyService.getProfileInternal(companyId);
        StrategyEntity strategy = strategyRepository.findTopByCompanyIdOrderByCreatedAtDesc(companyId).orElse(null);
        Map<String, Object> brief = marketPerceptionService.buildMarketBrief(companyId, profile, strategy);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("brief", brief);
        response.put("summary", marketPerceptionService.summarizeForPrompt(brief));
        response.put("signals", marketPerceptionService.buildUiSignals(brief));
        response.put("performanceInsights", agentLearningService.buildPerformanceInsights(companyId));
        response.put("hasRealConnectors", externalDataService.hasRealConnectors());
        return response;
    }

    public List<Map<String, Object>> getRecentDecisions(String companyId, int limit) {
        String prefix = "agent-" + companyId + "-";
        return decisionLogRepository
                .findTop50ByCampaignIdStartingWithOrderByCreatedAtDesc(prefix)
                .stream()
                .limit(limit)
                .map(this::toDecisionMap)
                .toList();
    }

    private Map<String, Object> toDecisionMap(DecisionLogEntity d) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("runId", d.getCampaignId());
        map.put("step", d.getStepName());
        map.put("reasoning", truncate(d.getReasoning(), 300));
        map.put("answer", truncate(d.getAnswer(), 400));
        map.put("confidence", d.getConfidence());
        map.put("createdAt", d.getCreatedAt() != null ? d.getCreatedAt().toString() : null);
        return map;
    }

    private String truncate(String value, int max) {
        if (value == null) return "";
        return value.length() <= max ? value : value.substring(0, max) + "...";
    }
}
