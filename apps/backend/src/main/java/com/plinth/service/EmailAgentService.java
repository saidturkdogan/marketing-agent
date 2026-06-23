package com.plinth.service;

import com.plinth.domain.CompanyProfile;
import com.plinth.llm.LlmService;
import com.plinth.persistence.entity.AgentConfigEntity;
import com.plinth.persistence.entity.GmailMessageEntity;
import com.plinth.persistence.repository.GmailMessageRepository;
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
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class EmailAgentService {

    private static final Logger log = LoggerFactory.getLogger(EmailAgentService.class);
    private static final Pattern EMAIL_IN_ANGLE = Pattern.compile("<([^>]+@[^>]+)>");
    private static final Pattern PLAIN_EMAIL = Pattern.compile("([\\w.+-]+@[\\w.-]+)");

    private final GmailAuthService gmailAuthService;
    private final GmailFetchService gmailFetchService;
    private final GmailMessageRepository gmailMessageRepository;
    private final ApprovalService approvalService;
    private final AgentBudgetService agentBudgetService;
    private final LlmService llmService;

    public EmailAgentService(GmailAuthService gmailAuthService,
                             GmailFetchService gmailFetchService,
                             GmailMessageRepository gmailMessageRepository,
                             ApprovalService approvalService,
                             AgentBudgetService agentBudgetService,
                             LlmService llmService) {
        this.gmailAuthService = gmailAuthService;
        this.gmailFetchService = gmailFetchService;
        this.gmailMessageRepository = gmailMessageRepository;
        this.approvalService = approvalService;
        this.agentBudgetService = agentBudgetService;
        this.llmService = llmService;
    }

    @Transactional
    public Map<String, Object> runEmailCycle(String companyId,
                                             AgentConfigEntity config,
                                             String runId,
                                             CompanyProfile profile) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("channel", "email");

        int target = config.getEmailDraftsPerWeek();
        if (target <= 0) {
            result.put("status", "skipped");
            result.put("message", "Email drafts per week is 0");
            result.put("drafted", 0);
            result.put("items", List.of());
            return result;
        }

        ensureInboxLoaded(companyId);

        int existing = countDraftsThisWeek(companyId);
        int toProcess = Math.max(0, target - existing);
        if (toProcess == 0) {
            result.put("status", "success");
            result.put("message", "Weekly email draft target already met (" + existing + "/" + target + ")");
            result.put("drafted", 0);
            result.put("items", List.of());
            return result;
        }

        List<GmailMessageEntity> candidates = findCandidateMessages(companyId);
        int drafted = 0;
        int skipped = 0;
        int failed = 0;
        List<Map<String, Object>> items = new ArrayList<>();

        for (GmailMessageEntity message : candidates) {
            if (drafted >= toProcess) break;
            if (!agentBudgetService.canSpendLlm(companyId)) {
                items.add(Map.of("outcome", "budget_skipped", "reason", "LLM budget exhausted"));
                break;
            }

            try {
                Map<String, Object> item = processOneEmail(runId, companyId, profile, message);
                items.add(item);
                String outcome = String.valueOf(item.get("outcome"));
                switch (outcome) {
                    case "pending_approval" -> drafted++;
                    case "skipped" -> skipped++;
                    default -> failed++;
                }
            } catch (Exception ex) {
                failed++;
                log.warn("[EmailAgent] Run {} failed for message {}: {}", runId, message.getMessageId(), ex.getMessage());
                items.add(Map.of(
                        "messageId", message.getMessageId(),
                        "subject", message.getSubject() != null ? message.getSubject() : "",
                        "outcome", "failed",
                        "error", ex.getMessage()
                ));
            }
        }

        String message = String.format(
                "Email agent: %d drafted, %d skipped, %d failed (target %d/week, %d already this week)",
                drafted, skipped, failed, target, existing);
        result.put("status", "success");
        result.put("message", message);
        result.put("drafted", drafted);
        result.put("skipped", skipped);
        result.put("failed", failed);
        result.put("items", items);
        log.info("[EmailAgent] Run {} complete: {}", runId, message);
        return result;
    }

    private void ensureInboxLoaded(String companyId) {
        if (gmailAuthService.isConnected(companyId)) {
            gmailFetchService.fetchRecentEmails(companyId, 30);
        } else {
            gmailFetchService.getMockMessages(companyId);
        }
    }

    private Map<String, Object> processOneEmail(String runId,
                                                String companyId,
                                                CompanyProfile profile,
                                                GmailMessageEntity message) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("messageId", message.getMessageId());
        item.put("subject", message.getSubject());
        item.put("from", message.getFrom());

        if (isNoReplyAddress(message.getFrom())) {
            markSkipped(message, "no_reply");
            item.put("outcome", "skipped");
            item.put("reason", "no-reply sender");
            return item;
        }

        EmailClassification classification = classifyEmail(profile, message);
        agentBudgetService.recordLlmCall(companyId);

        if ("spam".equals(classification.label())) {
            markSkipped(message, "spam");
            item.put("outcome", "skipped");
            item.put("reason", "classified as spam");
            item.put("classification", classification.label());
            return item;
        }

        String senderName = extractSenderName(message.getFrom());
        String incomingBody = GmailFetchService.toPlainEmailText(
                message.getBody() != null ? message.getBody() : message.getSnippet());
        String draft = gmailFetchService.draftReply(
                companyId,
                message.getSubject(),
                incomingBody,
                senderName
        );
        agentBudgetService.recordLlmCall(companyId);

        message.setAgentLabel(classification.label());
        message.setAgentPriority(classification.priority());
        message.setAgentDraft(draft);
        message.setAgentStatus("pending_approval");
        message.setAgentProcessedAt(OffsetDateTime.now());
        gmailMessageRepository.save(message);

        approvalService.requestEmailApproval(
                companyId,
                message.getMessageId(),
                draft,
                "Email agent [" + classification.label() + "/" + classification.priority() + "]: "
                        + (message.getSubject() != null ? message.getSubject() : "No subject")
        );

        item.put("outcome", "pending_approval");
        item.put("classification", classification.label());
        item.put("priority", classification.priority());
        item.put("topic", message.getSubject());
        return item;
    }

    private void markSkipped(GmailMessageEntity message, String label) {
        message.setAgentStatus("skipped");
        message.setAgentLabel(label);
        message.setAgentProcessedAt(OffsetDateTime.now());
        gmailMessageRepository.save(message);
    }

    private EmailClassification classifyEmail(CompanyProfile profile, GmailMessageEntity message) {
        String body = GmailFetchService.toPlainEmailText(
                message.getBody() != null ? message.getBody() : message.getSnippet());
        if (body.length() > 1200) {
            body = body.substring(0, 1200) + "...";
        }

        String systemPrompt = """
                You classify inbound business emails for a marketing team.
                Reply with exactly 3 lines:
                CLASSIFICATION: partnership|inquiry|support|sales|spam|other
                PRIORITY: high|medium|low
                SUMMARY: one short sentence
                """;
        String userPrompt = "Company: " + profile.name() + " (" + profile.industry() + ")\n"
                + "From: " + message.getFrom() + "\n"
                + "Subject: " + message.getSubject() + "\n"
                + "Body:\n" + (body != null ? body : "");

        String response = llmService.generate(systemPrompt, userPrompt);
        return parseClassification(response);
    }

    private EmailClassification parseClassification(String response) {
        String label = "other";
        String priority = "medium";
        for (String line : response.split("\n")) {
            String trimmed = line.trim();
            if (trimmed.toUpperCase(Locale.ROOT).startsWith("CLASSIFICATION:")) {
                label = trimmed.substring("CLASSIFICATION:".length()).trim().toLowerCase(Locale.ROOT);
            } else if (trimmed.toUpperCase(Locale.ROOT).startsWith("PRIORITY:")) {
                priority = trimmed.substring("PRIORITY:".length()).trim().toLowerCase(Locale.ROOT);
            }
        }
        if (!List.of("partnership", "inquiry", "support", "sales", "spam", "other").contains(label)) {
            label = "other";
        }
        if (!List.of("high", "medium", "low").contains(priority)) {
            priority = "medium";
        }
        return new EmailClassification(label, priority);
    }

    public int countDraftsThisWeek(String companyId) {
        OffsetDateTime weekStart = OffsetDateTime.now()
                .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                .withHour(0).withMinute(0).withSecond(0).withNano(0);

        return (int) gmailMessageRepository.findByCompanyIdOrderByReceivedAtDesc(companyId).stream()
                .filter(m -> m.getAgentProcessedAt() != null && !m.getAgentProcessedAt().isBefore(weekStart))
                .filter(m -> List.of("pending_approval", "sent", "approved").contains(
                        m.getAgentStatus() != null ? m.getAgentStatus() : ""))
                .count();
    }

    public long countPendingEmailDrafts(String companyId) {
        return gmailMessageRepository.findByCompanyIdOrderByReceivedAtDesc(companyId).stream()
                .filter(m -> "pending_approval".equals(m.getAgentStatus()))
                .count();
    }

    private List<GmailMessageEntity> findCandidateMessages(String companyId) {
        return gmailMessageRepository.findByCompanyIdOrderByReceivedAtDesc(companyId).stream()
                .filter(m -> m.getMessageId() != null && !m.getMessageId().startsWith("sent_"))
                .filter(m -> m.getAgentStatus() == null || "none".equals(m.getAgentStatus()))
                .filter(m -> !isNoReplyAddress(m.getFrom()))
                .toList();
    }

    private boolean isNoReplyAddress(String from) {
        if (from == null) return true;
        String lower = from.toLowerCase(Locale.ROOT);
        return lower.contains("noreply") || lower.contains("no-reply") || lower.contains("donotreply");
    }

    private String extractSenderName(String from) {
        if (from == null) return "there";
        int angle = from.indexOf('<');
        if (angle > 0) {
            String name = from.substring(0, angle).trim().replace("\"", "");
            if (!name.isBlank()) return name;
        }
        return from;
    }

    public static String extractReplyAddress(String from) {
        if (from == null || from.isBlank()) return "";
        Matcher angle = EMAIL_IN_ANGLE.matcher(from);
        if (angle.find()) return angle.group(1).trim();
        Matcher plain = PLAIN_EMAIL.matcher(from);
        if (plain.find()) return plain.group(1).trim();
        return from.trim();
    }

    private record EmailClassification(String label, String priority) {}
}
