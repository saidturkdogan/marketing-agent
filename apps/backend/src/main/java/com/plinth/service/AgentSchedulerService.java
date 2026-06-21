package com.plinth.service;

import com.plinth.persistence.entity.AgentConfigEntity;
import com.plinth.persistence.entity.ContentEntity;
import com.plinth.persistence.repository.AgentConfigRepository;
import com.plinth.persistence.repository.ContentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;

@Service
public class AgentSchedulerService {

    private static final Logger log = LoggerFactory.getLogger(AgentSchedulerService.class);

    private final ContentRepository contentRepository;
    private final ContentService contentService;
    private final AgentConfigRepository agentConfigRepository;
    private final MarketingAgentService marketingAgentService;

    public AgentSchedulerService(ContentRepository contentRepository,
                                 ContentService contentService,
                                 AgentConfigRepository agentConfigRepository,
                                 MarketingAgentService marketingAgentService) {
        this.contentRepository = contentRepository;
        this.contentService = contentService;
        this.agentConfigRepository = agentConfigRepository;
        this.marketingAgentService = marketingAgentService;
    }

    @Scheduled(fixedRate = 300_000)
    public void processDueContent() {
        List<ContentEntity> due = contentRepository.findByStatusAndScheduledAtBefore(
                "scheduled", OffsetDateTime.now());
        if (due.isEmpty()) return;

        log.info("[Scheduler] Processing {} due content items", due.size());
        for (ContentEntity entity : due) {
            try {
                if (isQuietHours(entity.getCompanyId())) {
                    log.debug("[Scheduler] Skipping {} — quiet hours", entity.getContentId());
                    continue;
                }
                contentService.publishScheduledContent(entity.getContentId());
            } catch (Exception ex) {
                log.warn("[Scheduler] Failed to publish {}: {}", entity.getContentId(), ex.getMessage());
            }
        }
    }

    @Scheduled(cron = "0 0 8 * * MON")
    public void runWeeklyPlanning() {
        List<AgentConfigEntity> configs = agentConfigRepository.findByAutopilotEnabledTrue();
        log.info("[Scheduler] Weekly planning for {} companies", configs.size());
        for (AgentConfigEntity config : configs) {
            try {
                marketingAgentService.runWeeklyCycle(config.getCompanyId());
            } catch (Exception ex) {
                log.warn("[Scheduler] Weekly cycle failed for {}: {}", config.getCompanyId(), ex.getMessage());
            }
        }
    }

    private boolean isQuietHours(String companyId) {
        AgentConfigEntity config = agentConfigRepository.findByCompanyId(companyId).orElse(null);
        if (config == null) return false;

        try {
            ZoneId zone = ZoneId.of(config.getTimezone() != null ? config.getTimezone() : "Europe/Istanbul");
            LocalTime now = LocalTime.now(zone);
            LocalTime start = LocalTime.parse(config.getQuietHoursStart() != null ? config.getQuietHoursStart() : "22:00");
            LocalTime end = LocalTime.parse(config.getQuietHoursEnd() != null ? config.getQuietHoursEnd() : "08:00");

            if (start.isBefore(end)) {
                return !now.isBefore(start) && now.isBefore(end);
            }
            return !now.isBefore(start) || now.isBefore(end);
        } catch (Exception ex) {
            return false;
        }
    }
}
