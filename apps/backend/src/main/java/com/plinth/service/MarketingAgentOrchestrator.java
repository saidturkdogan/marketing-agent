package com.plinth.service;

import com.plinth.domain.CompanyProfile;
import com.plinth.persistence.entity.AgentConfigEntity;
import com.plinth.persistence.entity.CompanyEntity;
import com.plinth.persistence.entity.ContentEntity;
import com.plinth.persistence.entity.StrategyEntity;
import com.plinth.persistence.repository.CompanyRepository;
import com.plinth.persistence.repository.ContentRepository;
import com.plinth.persistence.repository.StrategyRepository;
import com.plinth.service.ContentReviewService.ContentReviewResult;
import com.plinth.service.MarketingAgentPlannerService.PlannedTopic;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.OffsetDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class MarketingAgentOrchestrator {

    private static final Logger log = LoggerFactory.getLogger(MarketingAgentOrchestrator.class);

    private final AgentConfigService agentConfigService;
    private final CompanyRepository companyRepository;
    private final CompanyService companyService;
    private final StrategyRepository strategyRepository;
    private final ContentRepository contentRepository;
    private final ContentService contentService;
    private final ApprovalService approvalService;
    private final AgentSchedulePlanner schedulePlanner;
    private final MarketPerceptionService marketPerceptionService;
    private final MarketingAgentPlannerService plannerService;
    private final ContentReviewService contentReviewService;
    private final AgentBudgetService agentBudgetService;
    private final AgentLearningService agentLearningService;
    private final EmailAgentService emailAgentService;
    private final OutreachAgentService outreachAgentService;

    public MarketingAgentOrchestrator(AgentConfigService agentConfigService,
                                      CompanyRepository companyRepository,
                                      CompanyService companyService,
                                      StrategyRepository strategyRepository,
                                      ContentRepository contentRepository,
                                      ContentService contentService,
                                      ApprovalService approvalService,
                                      AgentSchedulePlanner schedulePlanner,
                                      MarketPerceptionService marketPerceptionService,
                                      MarketingAgentPlannerService plannerService,
                                      ContentReviewService contentReviewService,
                                      AgentBudgetService agentBudgetService,
                                      AgentLearningService agentLearningService,
                                      EmailAgentService emailAgentService,
                                      OutreachAgentService outreachAgentService) {
        this.agentConfigService = agentConfigService;
        this.companyRepository = companyRepository;
        this.companyService = companyService;
        this.strategyRepository = strategyRepository;
        this.contentRepository = contentRepository;
        this.contentService = contentService;
        this.approvalService = approvalService;
        this.schedulePlanner = schedulePlanner;
        this.marketPerceptionService = marketPerceptionService;
        this.plannerService = plannerService;
        this.contentReviewService = contentReviewService;
        this.agentBudgetService = agentBudgetService;
        this.agentLearningService = agentLearningService;
        this.emailAgentService = emailAgentService;
        this.outreachAgentService = outreachAgentService;
    }

    @Transactional
    public Map<String, Object> runWeeklyCycle(String companyId) {
        AgentConfigEntity config = agentBudgetService.ensureFreshWeek(agentConfigService.getOrCreate(companyId));

        if (!config.isAutopilotEnabled()) {
            return Map.of("status", "skipped", "message", "Autopilot is disabled");
        }
        if (!agentBudgetService.canRunAgentCycle(companyId)) {
            String message = "LLM budget exhausted for this week";
            Map<String, Object> budget = agentBudgetService.budgetStatus(companyId);
            agentConfigService.recordRun(companyId, "skipped", message);
            return Map.of("status", "skipped", "message", message, "budget", budget);
        }

        CompanyEntity company = companyRepository.findByCompanyId(companyId)
                .orElseThrow(() -> new IllegalArgumentException("Company not found: " + companyId));
        CompanyProfile profile = companyService.getProfileInternal(companyId);
        StrategyEntity strategy = strategyRepository.findTopByCompanyIdOrderByCreatedAtDesc(companyId).orElse(null);

        String runId = "agent-" + companyId + "-" + UUID.randomUUID();

        return AgentRunContext.runWith(new AgentRunContext.Scope(companyId, runId), () -> {
            Map<String, Object> marketBrief = marketPerceptionService.buildMarketBrief(companyId, profile, strategy);
            String marketSummary = marketPerceptionService.summarizeForPrompt(marketBrief);
            log.info("[Agent] Run {} perceive complete for {}", runId, companyId);

            Map<String, Object> emailResult = emailAgentService.runEmailCycle(companyId, config, runId, profile);
            Map<String, Object> outreachResult = outreachAgentService.runOutreachCycle(
                    companyId, config, runId, profile, marketBrief);

            List<Map<String, Object>> allItemResults = new ArrayList<>();
            int channelPending = appendChannelItems(allItemResults, emailResult);
            channelPending += appendChannelItems(allItemResults, outreachResult);

            int target = config.getTwitterPostsPerWeek();
            int existing = countActiveTwitterPostsThisWeek(companyId);
            int toCreate = Math.max(0, target - existing);

            if (toCreate == 0) {
                String message = String.format(
                        "Twitter target already met (%d/%d). %s %s",
                        existing, target,
                        emailResult.getOrDefault("message", ""),
                        outreachResult.getOrDefault("message", ""));
                agentConfigService.recordRun(companyId, "success", message);
                Map<String, Object> result = new LinkedHashMap<>();
                result.put("status", "success");
                result.put("runId", runId);
                result.put("created", 0);
                result.put("scheduled", 0);
                result.put("pendingApproval", channelPending);
                result.put("failed", 0);
                result.put("budgetSkipped", 0);
                result.put("message", message);
                result.put("items", allItemResults);
                result.put("email", emailResult);
                result.put("outreach", outreachResult);
                result.put("marketDataReal", marketBrief.get("has_real_connectors"));
                result.put("budget", agentBudgetService.budgetStatus(companyId));
                agentLearningService.recordWeeklyLearnings(companyId, result);
                return result;
            }

            List<PlannedTopic> plannedTopics = plannerService.planTopics(
                    runId, profile, strategy, marketBrief, toCreate);
            List<AgentSchedulePlanner.ScheduleSlot> slots = schedulePlanner.planWeeklySlots(config, strategy, toCreate);
            log.info("[Agent] Run {} planned {} topics", runId, plannedTopics.size());

            int scheduled = 0;
            int pendingApproval = channelPending;
            int failed = channelDraftFailures(emailResult) + channelDraftFailures(outreachResult);
            int budgetSkipped = 0;
            List<Map<String, Object>> itemResults = new ArrayList<>(allItemResults);
            List<String> previousTweetBodies = new ArrayList<>();

            for (int i = 0; i < toCreate; i++) {
                if (!agentBudgetService.canSpendLlm(companyId)) {
                    budgetSkipped++;
                    itemResults.add(Map.of("outcome", "budget_skipped", "reason", "LLM budget exhausted"));
                    continue;
                }

                PlannedTopic planned = plannedTopics.get(i);
                AgentSchedulePlanner.ScheduleSlot slot = i < slots.size()
                        ? slots.get(i)
                        : schedulePlanner.nextAvailableSlot(config, strategy);

                try {
                    Map<String, Object> itemResult = processOneItem(
                            runId, companyId, company.getUserId(), config, profile,
                            planned, slot, marketBrief, marketSummary, previousTweetBodies);
                    itemResults.add(itemResult);
                    Object contentId = itemResult.get("contentId");
                    if (contentId != null) {
                        contentRepository.findByContentId(contentId.toString())
                                .ifPresent(entity -> previousTweetBodies.add(entity.getBody()));
                    }

                    String outcome = String.valueOf(itemResult.get("outcome"));
                    switch (outcome) {
                        case "scheduled" -> scheduled++;
                        case "pending_approval" -> pendingApproval++;
                        case "budget_skipped" -> budgetSkipped++;
                        default -> failed++;
                    }
                } catch (Exception ex) {
                    failed++;
                    log.warn("[Agent] Run {} failed item {}: {}", runId, i, ex.getMessage());
                    itemResults.add(Map.of(
                            "topic", planned.topic(),
                            "outcome", "failed",
                            "error", ex.getMessage()
                    ));
                }
            }

            String message = String.format(
                    "Agent cycle: %d tweets planned, %d scheduled, %d pending approval, %d failed. %s %s",
                    toCreate, scheduled, pendingApproval, failed,
                    emailResult.getOrDefault("message", ""),
                    outreachResult.getOrDefault("message", ""));
            agentConfigService.recordRun(companyId, "success", message);
            log.info("[Agent] Run {} complete: {}", runId, message);

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("status", "success");
            result.put("runId", runId);
            result.put("created", toCreate);
            result.put("scheduled", scheduled);
            result.put("pendingApproval", pendingApproval);
            result.put("failed", failed);
            result.put("budgetSkipped", budgetSkipped);
            result.put("message", message);
            result.put("items", itemResults);
            result.put("email", emailResult);
            result.put("outreach", outreachResult);
            result.put("marketDataReal", marketBrief.get("has_real_connectors"));
            result.put("budget", agentBudgetService.budgetStatus(companyId));

            agentLearningService.recordWeeklyLearnings(companyId, result);
            return result;
        });
    }

    private Map<String, Object> processOneItem(String runId,
                                               String companyId,
                                               Long userId,
                                               AgentConfigEntity config,
                                               CompanyProfile profile,
                                               PlannedTopic planned,
                                               AgentSchedulePlanner.ScheduleSlot slot,
                                               Map<String, Object> marketBrief,
                                               String marketSummary,
                                               List<String> previousTweetBodies) {
        String agentContext = buildAgentContext(marketBrief, planned, previousTweetBodies);

        ContentEntity entity = contentService.generateContentForAgent(
                companyId, userId, "tweet", planned.topic(), agentContext, previousTweetBodies);

        ContentReviewResult review = reviewWithCorrectionLoop(
                runId, entity, profile, planned, agentContext, marketSummary, config);

        Map<String, Object> item = new LinkedHashMap<>();
        item.put("contentId", entity.getContentId());
        item.put("topic", planned.topic());
        item.put("verdict", review.verdict());
        item.put("confidence", review.confidence());

        if (shouldAutoSchedule(config, review)) {
            contentService.scheduleContentInternal(entity.getContentId(), slot.scheduledAt());
            entity.setApprovalStatus("auto_passed");
            contentRepository.save(entity);
            item.put("outcome", "scheduled");
            item.put("scheduledAt", slot.scheduledAt().toString());
        } else {
            entity.setStatus("pending_approval");
            entity.setApprovalStatus("pending");
            contentRepository.save(entity);
            if (review.guardrailReport() != null) {
                approvalService.requestContentApproval(companyId, entity.getContentId(), review.guardrailReport());
            } else {
                approvalService.requestContentApproval(companyId, entity.getContentId(),
                        "Agent review: " + review.verdict() + " — " + review.feedback());
            }
            item.put("outcome", "pending_approval");
            item.put("feedback", review.feedback());
        }
        return item;
    }

    private ContentReviewResult reviewWithCorrectionLoop(String runId,
                                                           ContentEntity entity,
                                                           CompanyProfile profile,
                                                           PlannedTopic planned,
                                                           String agentContext,
                                                           String marketSummary,
                                                           AgentConfigEntity config) {
        int maxRetries = Math.max(0, config.getMaxContentRetries());
        ContentReviewResult review = contentReviewService.review(runId, entity, profile, marketSummary);

        for (int attempt = 0; attempt < maxRetries && !review.passed() && !review.blocked(); attempt++) {
            log.info("[Agent] Self-correction attempt {} for content {}", attempt + 1, entity.getContentId());
            entity = contentService.reviseContentForAgent(
                    entity.getContentId(),
                    planned.topic(),
                    agentContext,
                    review.feedback());
            review = contentReviewService.review(runId, entity, profile, marketSummary);
        }
        return review;
    }

    private boolean shouldAutoSchedule(AgentConfigEntity config, ContentReviewResult review) {
        if (review.blocked()) return false;
        if (!review.passed()) return false;
        if (review.confidence() < config.getMinConfidenceToAutopublish()) return false;
        if ("pass_only".equals(config.getRiskThreshold()) && review.needsApproval()) {
            return false;
        }
        return true;
    }

    private String buildAgentContext(Map<String, Object> marketBrief,
                                     PlannedTopic planned,
                                     List<String> previousTweetBodies) {
        StringBuilder sb = new StringBuilder();
        sb.append("Autopilot agent content\n");
        sb.append("Planned rationale: ").append(planned.rationale()).append("\n");
        sb.append("Priority: ").append(planned.priority()).append("\n");
        sb.append("Unique angle required: write a tweet that is clearly different from other drafts this week.\n");
        if (previousTweetBodies != null && !previousTweetBodies.isEmpty()) {
            sb.append("\nAlready drafted in this run — use a different hook, angle, and wording:\n");
            for (int i = 0; i < previousTweetBodies.size(); i++) {
                sb.append(i + 1).append(". ").append(previousTweetBodies.get(i)).append("\n");
            }
        }
        sb.append(marketPerceptionService.summarizeForPrompt(marketBrief));
        return sb.toString();
    }

    @SuppressWarnings("unchecked")
    private int appendChannelItems(List<Map<String, Object>> target, Map<String, Object> channelResult) {
        List<Map<String, Object>> items = (List<Map<String, Object>>) channelResult.getOrDefault("items", List.of());
        target.addAll(items);
        return ((Number) channelResult.getOrDefault("drafted", 0)).intValue();
    }

    private int channelDraftFailures(Map<String, Object> channelResult) {
        return ((Number) channelResult.getOrDefault("failed", 0)).intValue();
    }

    private int countActiveTwitterPostsThisWeek(String companyId) {
        OffsetDateTime weekStart = OffsetDateTime.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        return (int) contentRepository.findByCompanyIdOrderByCreatedAtDesc(companyId).stream()
                .filter(c -> "tweet".equals(c.getType()))
                .filter(c -> c.getCreatedAt() != null && !c.getCreatedAt().isBefore(weekStart))
                .filter(c -> List.of("scheduled", "published", "pending_approval", "draft").contains(c.getStatus()))
                .count();
    }
}
