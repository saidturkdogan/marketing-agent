package com.plinth.service;

import com.plinth.guardrail.GuardrailEngine;
import com.plinth.guardrail.GuardrailReport;
import com.plinth.persistence.entity.AgentConfigEntity;
import com.plinth.persistence.entity.CompanyEntity;
import com.plinth.persistence.entity.ContentEntity;
import com.plinth.persistence.entity.StrategyEntity;
import com.plinth.persistence.repository.CompanyRepository;
import com.plinth.persistence.repository.ContentRepository;
import com.plinth.persistence.repository.StrategyRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.OffsetDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class MarketingAgentService {

    private static final Logger log = LoggerFactory.getLogger(MarketingAgentService.class);

    private final AgentConfigService agentConfigService;
    private final CompanyRepository companyRepository;
    private final StrategyRepository strategyRepository;
    private final ContentRepository contentRepository;
    private final ContentService contentService;
    private final GuardrailEngine guardrailEngine;
    private final ApprovalService approvalService;
    private final AgentSchedulePlanner schedulePlanner;

    public MarketingAgentService(AgentConfigService agentConfigService,
                                 CompanyRepository companyRepository,
                                 StrategyRepository strategyRepository,
                                 ContentRepository contentRepository,
                                 ContentService contentService,
                                 GuardrailEngine guardrailEngine,
                                 ApprovalService approvalService,
                                 AgentSchedulePlanner schedulePlanner) {
        this.agentConfigService = agentConfigService;
        this.companyRepository = companyRepository;
        this.strategyRepository = strategyRepository;
        this.contentRepository = contentRepository;
        this.contentService = contentService;
        this.guardrailEngine = guardrailEngine;
        this.approvalService = approvalService;
        this.schedulePlanner = schedulePlanner;
    }

    @Transactional
    public Map<String, Object> runWeeklyCycle(String companyId) {
        AgentConfigEntity config = agentConfigService.getOrCreate(companyId);
        if (!config.isAutopilotEnabled()) {
            return Map.of("status", "skipped", "message", "Autopilot is disabled");
        }

        CompanyEntity company = companyRepository.findByCompanyId(companyId)
                .orElseThrow(() -> new IllegalArgumentException("Company not found: " + companyId));

        List<String> topics = extractTopics(companyId, company);
        int target = config.getTwitterPostsPerWeek();
        int existing = countActiveTwitterPostsThisWeek(companyId);
        int toCreate = Math.max(0, target - existing);

        StrategyEntity strategy = strategyRepository.findTopByCompanyIdOrderByCreatedAtDesc(companyId).orElse(null);
        List<AgentSchedulePlanner.ScheduleSlot> slots = schedulePlanner.planWeeklySlots(config, strategy, toCreate);

        int scheduled = 0;
        int pendingApproval = 0;

        for (int i = 0; i < toCreate; i++) {
            AgentSchedulePlanner.ScheduleSlot slot = i < slots.size()
                    ? slots.get(i)
                    : schedulePlanner.nextAvailableSlot(config, strategy);
            String topic = slot.topicHint() != null && !slot.topicHint().isBlank()
                    ? slot.topicHint()
                    : (topics.isEmpty()
                            ? company.getIndustry() + " marketing update"
                            : topics.get(i % topics.size()));
            try {
                ContentEntity entity = contentService.generateContentForAgent(
                        companyId, company.getUserId(), "tweet", topic, "Autopilot weekly content");
                GuardrailReport report = guardrailEngine.checkContent(
                        entity.getContentId(), buildContentText(entity), companyId);

                if (shouldAutoSchedule(config, report)) {
                    contentService.scheduleContentInternal(entity.getContentId(), slot.scheduledAt());
                    entity.setApprovalStatus("auto_passed");
                    scheduled++;
                } else {
                    entity.setStatus("pending_approval");
                    entity.setApprovalStatus("pending");
                    contentRepository.save(entity);
                    approvalService.requestContentApproval(companyId, entity.getContentId(), report);
                    pendingApproval++;
                }
            } catch (Exception ex) {
                log.warn("Agent failed to create content for {}: {}", companyId, ex.getMessage());
            }
        }

        String message = String.format("Created %d tweets: %d scheduled, %d pending approval",
                toCreate, scheduled, pendingApproval);
        agentConfigService.recordRun(companyId, "success", message);
        log.info("[Agent] Weekly cycle for {}: {}", companyId, message);

        return Map.of(
                "status", "success",
                "created", toCreate,
                "scheduled", scheduled,
                "pendingApproval", pendingApproval,
                "message", message
        );
    }

    private boolean shouldAutoSchedule(AgentConfigEntity config, GuardrailReport report) {
        if (report.isBlocked()) return false;
        if ("pass_only".equals(config.getRiskThreshold())) {
            return report.isPassed();
        }
        return report.isPassed();
    }

    private int countActiveTwitterPostsThisWeek(String companyId) {
        OffsetDateTime weekStart = OffsetDateTime.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        return (int) contentRepository.findByCompanyIdOrderByCreatedAtDesc(companyId).stream()
                .filter(c -> "tweet".equals(c.getType()))
                .filter(c -> c.getCreatedAt() != null && !c.getCreatedAt().isBefore(weekStart))
                .filter(c -> List.of("scheduled", "published", "pending_approval", "draft").contains(c.getStatus()))
                .count();
    }

    @SuppressWarnings("unchecked")
    private List<String> extractTopics(String companyId, CompanyEntity company) {
        List<String> topics = new ArrayList<>();
        strategyRepository.findTopByCompanyIdOrderByCreatedAtDesc(companyId).ifPresent(strategy -> {
            collectCalendarTopics(strategy, topics);
            collectStrategyTopics(strategy, topics);
        });
        if (topics.isEmpty() && company.getIndustry() != null) {
            topics.add(company.getIndustry() + " insights");
        }
        if (company.getValueProposition() != null && !company.getValueProposition().isBlank()) {
            topics.add(company.getValueProposition());
        }
        return topics;
    }

    @SuppressWarnings("unchecked")
    private void collectCalendarTopics(StrategyEntity strategy, List<String> topics) {
        Map<String, Object> calendar = strategy.getCalendar();
        if (calendar == null) return;
        Object weeks = calendar.get("weeks");
        if (!(weeks instanceof List<?> weekList)) return;
        for (Object weekObj : weekList) {
            if (!(weekObj instanceof Map<?, ?> week)) continue;
            Object days = week.get("days");
            if (!(days instanceof List<?> dayList)) continue;
            for (Object dayObj : dayList) {
                if (!(dayObj instanceof Map<?, ?> day)) continue;
                Object topic = day.get("topic");
                if (topic == null) topic = day.get("title");
                if (topic == null) topic = day.get("content");
                if (topic != null && !topic.toString().isBlank()) {
                    topics.add(topic.toString());
                }
            }
        }
    }

    @SuppressWarnings("unchecked")
    private void collectStrategyTopics(StrategyEntity strategy, List<String> topics) {
        Map<String, Object> strat = strategy.getStrategy();
        if (strat == null) return;
        Object pillars = strat.get("content_pillars");
        if (pillars instanceof List<?> pillarList) {
            for (Object p : pillarList) {
                if (p != null && !p.toString().isBlank()) topics.add(p.toString());
            }
        }
    }

    private String buildContentText(ContentEntity entity) {
        String text = entity.getBody() != null ? entity.getBody() : "";
        if (entity.getHashtags() != null && !entity.getHashtags().isEmpty()) {
            text += " " + String.join(" ", entity.getHashtags());
        }
        return text;
    }
}
