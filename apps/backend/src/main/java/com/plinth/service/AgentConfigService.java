package com.plinth.service;

import com.plinth.persistence.entity.AgentConfigEntity;
import com.plinth.persistence.repository.AgentConfigRepository;
import com.plinth.persistence.repository.ApprovalRepository;
import com.plinth.persistence.repository.ContentRepository;
import com.plinth.security.AuthUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class AgentConfigService {

    private final AgentConfigRepository configRepository;
    private final ContentRepository contentRepository;
    private final ApprovalRepository approvalRepository;
    private final AuthUtils authUtils;
    private final TwitterAuthService twitterAuthService;
    private final GmailAuthService gmailAuthService;
    private final GoogleCalendarAuthService calendarAuthService;
    private final AgentBudgetService agentBudgetService;
    private final EmailAgentService emailAgentService;
    private final OutreachAgentService outreachAgentService;

    public AgentConfigService(AgentConfigRepository configRepository,
                              ContentRepository contentRepository,
                              ApprovalRepository approvalRepository,
                              AuthUtils authUtils,
                              TwitterAuthService twitterAuthService,
                              GmailAuthService gmailAuthService,
                              GoogleCalendarAuthService calendarAuthService,
                              AgentBudgetService agentBudgetService,
                              EmailAgentService emailAgentService,
                              OutreachAgentService outreachAgentService) {
        this.configRepository = configRepository;
        this.contentRepository = contentRepository;
        this.approvalRepository = approvalRepository;
        this.authUtils = authUtils;
        this.twitterAuthService = twitterAuthService;
        this.gmailAuthService = gmailAuthService;
        this.calendarAuthService = calendarAuthService;
        this.agentBudgetService = agentBudgetService;
        this.emailAgentService = emailAgentService;
        this.outreachAgentService = outreachAgentService;
    }

    @Transactional
    public AgentConfigEntity getOrCreate(String companyId) {
        return configRepository.findByCompanyId(companyId)
                .orElseGet(() -> {
                    AgentConfigEntity config = new AgentConfigEntity();
                    config.setCompanyId(companyId);
                    return configRepository.save(config);
                });
    }

    @Transactional
    public AgentConfigEntity update(String companyId, Map<String, Object> updates) {
        AgentConfigEntity config = getOrCreate(companyId);
        if (updates.containsKey("autopilotEnabled")) {
            config.setAutopilotEnabled(Boolean.TRUE.equals(updates.get("autopilotEnabled")));
        }
        if (updates.containsKey("twitterPostsPerWeek")) {
            config.setTwitterPostsPerWeek(((Number) updates.get("twitterPostsPerWeek")).intValue());
        }
        if (updates.containsKey("emailDraftsPerWeek")) {
            config.setEmailDraftsPerWeek(((Number) updates.get("emailDraftsPerWeek")).intValue());
        }
        if (updates.containsKey("outreachEnabled")) {
            config.setOutreachEnabled(Boolean.TRUE.equals(updates.get("outreachEnabled")));
        }
        if (updates.containsKey("outreachEmailsPerWeek")) {
            config.setOutreachEmailsPerWeek(((Number) updates.get("outreachEmailsPerWeek")).intValue());
        }
        if (updates.containsKey("outreachDailyCap")) {
            config.setOutreachDailyCap(((Number) updates.get("outreachDailyCap")).intValue());
        }
        if (updates.containsKey("outreachType")) {
            config.setOutreachType(String.valueOf(updates.get("outreachType")));
        }
        if (updates.containsKey("quietHoursStart")) {
            config.setQuietHoursStart(String.valueOf(updates.get("quietHoursStart")));
        }
        if (updates.containsKey("quietHoursEnd")) {
            config.setQuietHoursEnd(String.valueOf(updates.get("quietHoursEnd")));
        }
        if (updates.containsKey("timezone")) {
            config.setTimezone(String.valueOf(updates.get("timezone")));
        }
        if (updates.containsKey("riskThreshold")) {
            config.setRiskThreshold(String.valueOf(updates.get("riskThreshold")));
        }
        if (updates.containsKey("maxContentRetries")) {
            config.setMaxContentRetries(((Number) updates.get("maxContentRetries")).intValue());
        }
        if (updates.containsKey("minConfidenceToAutopublish")) {
            config.setMinConfidenceToAutopublish(((Number) updates.get("minConfidenceToAutopublish")).doubleValue());
        }
        if (updates.containsKey("llmBudgetUsdPerWeek")) {
            config.setLlmBudgetUsdPerWeek(((Number) updates.get("llmBudgetUsdPerWeek")).doubleValue());
        }
        if (updates.containsKey("xApiBudgetCreditsPerWeek")) {
            config.setXApiBudgetCreditsPerWeek(((Number) updates.get("xApiBudgetCreditsPerWeek")).intValue());
        }
        return configRepository.save(config);
    }

    public Map<String, Object> toMap(AgentConfigEntity config) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("companyId", config.getCompanyId());
        map.put("autopilotEnabled", config.isAutopilotEnabled());
        map.put("twitterPostsPerWeek", config.getTwitterPostsPerWeek());
        map.put("emailDraftsPerWeek", config.getEmailDraftsPerWeek());
        map.put("outreachEnabled", config.isOutreachEnabled());
        map.put("outreachEmailsPerWeek", config.getOutreachEmailsPerWeek());
        map.put("outreachDailyCap", config.getOutreachDailyCap());
        map.put("outreachType", config.getOutreachType());
        map.put("quietHoursStart", config.getQuietHoursStart());
        map.put("quietHoursEnd", config.getQuietHoursEnd());
        map.put("timezone", config.getTimezone());
        map.put("riskThreshold", config.getRiskThreshold());
        map.put("maxContentRetries", config.getMaxContentRetries());
        map.put("minConfidenceToAutopublish", config.getMinConfidenceToAutopublish());
        map.put("llmBudgetUsdPerWeek", config.getLlmBudgetUsdPerWeek());
        map.put("llmSpendUsdThisWeek", config.getLlmSpendUsdThisWeek());
        map.put("xApiBudgetCreditsPerWeek", config.getXApiBudgetCreditsPerWeek());
        map.put("xCreditsUsedThisWeek", config.getXCreditsUsedThisWeek());
        map.put("lastRunAt", config.getLastRunAt() != null ? config.getLastRunAt().toString() : null);
        map.put("lastRunStatus", config.getLastRunStatus());
        map.put("lastRunMessage", config.getLastRunMessage());
        return map;
    }

    public Map<String, Object> getStatus(String companyId) {
        authUtils.getCurrentUserId(); // ensure authenticated
        AgentConfigEntity config = getOrCreate(companyId);

        long scheduled = contentRepository.findByCompanyIdAndStatusOrderByCreatedAtDesc(companyId, "scheduled").size();
        long pendingApproval = contentRepository.findByCompanyIdAndStatusOrderByCreatedAtDesc(companyId, "pending_approval").size();
        long pendingApprovals = approvalRepository.findByCompanyIdAndStatusOrderByRequestedAtDesc(companyId, "pending").size();

        Map<String, Object> status = new LinkedHashMap<>(toMap(config));
        status.put("scheduledCount", scheduled);
        status.put("pendingApprovalContentCount", pendingApproval);
        status.put("pendingApprovalsCount", pendingApprovals);
        status.put("emailDraftsThisWeek", emailAgentService.countDraftsThisWeek(companyId));
        status.put("pendingEmailDraftsCount", emailAgentService.countPendingEmailDrafts(companyId));
        status.put("outreachDraftsThisWeek", outreachAgentService.countOutreachDraftsThisWeek(companyId));
        status.put("pendingOutreachCount", outreachAgentService.countPendingOutreach(companyId));
        status.put("twitterConnected", twitterAuthService.isConnected(companyId));
        status.put("gmailConnected", gmailAuthService.isConnected(companyId));
        status.put("calendarConnected", calendarAuthService.isConnected(companyId));
        status.putAll(agentBudgetService.budgetStatus(companyId));
        return status;
    }

    @Transactional
    public void recordRun(String companyId, String status, String message) {
        AgentConfigEntity config = getOrCreate(companyId);
        config.setLastRunAt(java.time.OffsetDateTime.now());
        config.setLastRunStatus(status);
        config.setLastRunMessage(message);
        configRepository.save(config);
    }
}
