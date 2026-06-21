package com.plinth.service;

import com.plinth.persistence.entity.AgentConfigEntity;
import com.plinth.persistence.repository.AgentConfigRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.OffsetDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class AgentBudgetService {

    /** Rough Gemini Flash estimate: ~$0.002 per agent LLM call */
    private static final double ESTIMATED_COST_PER_LLM_CALL = 0.002;
    private static final int X_CREDIT_PER_PUBLISH = 1;

    private final AgentConfigRepository configRepository;

    public AgentBudgetService(AgentConfigRepository configRepository) {
        this.configRepository = configRepository;
    }

    @Transactional
    public AgentConfigEntity ensureFreshWeek(AgentConfigEntity config) {
        OffsetDateTime weekStart = OffsetDateTime.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                .withHour(0).withMinute(0).withSecond(0).withNano(0);

        if (config.getBudgetWeekStart() == null || config.getBudgetWeekStart().isBefore(weekStart)) {
            config.setBudgetWeekStart(weekStart);
            config.setLlmSpendUsdThisWeek(0);
            config.setXCreditsUsedThisWeek(0);
            return configRepository.save(config);
        }
        return config;
    }

    public boolean canSpendLlm(String companyId) {
        return canSpendLlm(ensureFreshWeek(getOrCreate(companyId)));
    }

    public boolean canRunAgentCycle(String companyId) {
        return canRunAgentCycle(ensureFreshWeek(getOrCreate(companyId)));
    }

    public boolean canSpendLlm(AgentConfigEntity config) {
        config = ensureFreshWeek(config);
        return config.getLlmSpendUsdThisWeek() + ESTIMATED_COST_PER_LLM_CALL <= config.getLlmBudgetUsdPerWeek();
    }

    public boolean canRunAgentCycle(AgentConfigEntity config) {
        config = ensureFreshWeek(config);
        return config.getLlmSpendUsdThisWeek() < config.getLlmBudgetUsdPerWeek();
    }

    public boolean canSpendXApi(String companyId) {
        return canSpendXApi(ensureFreshWeek(getOrCreate(companyId)));
    }

    public boolean canSpendXApi(AgentConfigEntity config) {
        config = ensureFreshWeek(config);
        return config.getXCreditsUsedThisWeek() + X_CREDIT_PER_PUBLISH <= config.getXApiBudgetCreditsPerWeek();
    }

    @Transactional
    public void recordLlmCall(String companyId) {
        recordLlmCall(companyId, ESTIMATED_COST_PER_LLM_CALL);
    }

    @Transactional
    public void recordLlmCall(String companyId, double estimatedUsd) {
        AgentConfigEntity config = ensureFreshWeek(getOrCreate(companyId));
        config.setLlmSpendUsdThisWeek(config.getLlmSpendUsdThisWeek() + estimatedUsd);
        configRepository.save(config);
    }

    @Transactional
    public void recordXApiCredit(String companyId) {
        AgentConfigEntity config = ensureFreshWeek(getOrCreate(companyId));
        config.setXCreditsUsedThisWeek(config.getXCreditsUsedThisWeek() + X_CREDIT_PER_PUBLISH);
        configRepository.save(config);
    }

    public Map<String, Object> budgetStatus(String companyId) {
        AgentConfigEntity config = ensureFreshWeek(getOrCreate(companyId));
        Map<String, Object> status = new LinkedHashMap<>();
        status.put("llmBudgetUsdPerWeek", config.getLlmBudgetUsdPerWeek());
        status.put("llmSpendUsdThisWeek", config.getLlmSpendUsdThisWeek());
        status.put("llmRemainingUsd", Math.max(0, config.getLlmBudgetUsdPerWeek() - config.getLlmSpendUsdThisWeek()));
        status.put("xApiBudgetCreditsPerWeek", config.getXApiBudgetCreditsPerWeek());
        status.put("xCreditsUsedThisWeek", config.getXCreditsUsedThisWeek());
        status.put("xCreditsRemaining", Math.max(0, config.getXApiBudgetCreditsPerWeek() - config.getXCreditsUsedThisWeek()));
        status.put("budgetWeekStart", config.getBudgetWeekStart() != null ? config.getBudgetWeekStart().toString() : null);
        status.put("llmBudgetExhausted", !canSpendLlm(config));
        status.put("xBudgetExhausted", !canSpendXApi(config));
        return status;
    }

    private AgentConfigEntity getOrCreate(String companyId) {
        return configRepository.findByCompanyId(companyId).orElseGet(() -> {
            AgentConfigEntity c = new AgentConfigEntity();
            c.setCompanyId(companyId);
            return configRepository.save(c);
        });
    }
}
