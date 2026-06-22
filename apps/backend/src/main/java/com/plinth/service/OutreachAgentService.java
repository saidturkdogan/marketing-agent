package com.plinth.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plinth.domain.CompanyProfile;
import com.plinth.llm.LlmService;
import com.plinth.persistence.entity.AgentConfigEntity;
import com.plinth.persistence.entity.OutreachProspectEntity;
import com.plinth.persistence.repository.OutreachProspectRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class OutreachAgentService {

    private static final Logger log = LoggerFactory.getLogger(OutreachAgentService.class);
    private static final Pattern SUBJECT_LINE = Pattern.compile("^SUBJECT:\\s*(.+)$", Pattern.MULTILINE | Pattern.CASE_INSENSITIVE);
    private static final Pattern BODY_LINE = Pattern.compile("^BODY:\\s*", Pattern.MULTILINE | Pattern.CASE_INSENSITIVE);

    private final OutreachProspectRepository prospectRepository;
    private final ApprovalService approvalService;
    private final AgentBudgetService agentBudgetService;
    private final LlmService llmService;
    private final ObjectMapper objectMapper;

    public OutreachAgentService(OutreachProspectRepository prospectRepository,
                                ApprovalService approvalService,
                                AgentBudgetService agentBudgetService,
                                LlmService llmService,
                                ObjectMapper objectMapper) {
        this.prospectRepository = prospectRepository;
        this.approvalService = approvalService;
        this.agentBudgetService = agentBudgetService;
        this.llmService = llmService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public Map<String, Object> runOutreachCycle(String companyId,
                                                AgentConfigEntity config,
                                                String runId,
                                                CompanyProfile profile,
                                                Map<String, Object> marketBrief) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("channel", "outreach");

        if (!config.isOutreachEnabled()) {
            result.put("status", "skipped");
            result.put("message", "Outreach is disabled — enable it in Agent settings");
            result.put("drafted", 0);
            result.put("items", List.of());
            return result;
        }

        int weeklyTarget = config.getOutreachEmailsPerWeek();
        if (weeklyTarget <= 0) {
            result.put("status", "skipped");
            result.put("message", "Outreach emails per week is 0");
            result.put("drafted", 0);
            result.put("items", List.of());
            return result;
        }

        int existingThisWeek = countOutreachDraftsThisWeek(companyId);
        int toProcess = Math.max(0, weeklyTarget - existingThisWeek);
        int dailyRemaining = Math.max(0, config.getOutreachDailyCap() - countSentToday(companyId));
        toProcess = Math.min(toProcess, dailyRemaining);

        if (toProcess == 0) {
            result.put("status", "success");
            result.put("message", "Outreach quota met for this week or daily cap reached");
            result.put("drafted", 0);
            result.put("items", List.of());
            return result;
        }

        String marketSummary = summarizeMarketBrief(marketBrief);
        List<ProspectCandidate> candidates = discoverProspects(profile, marketSummary, config.getOutreachType(), toProcess + 2);
        agentBudgetService.recordLlmCall(companyId);

        int drafted = 0;
        int skipped = 0;
        int failed = 0;
        List<Map<String, Object>> items = new ArrayList<>();

        for (ProspectCandidate candidate : candidates) {
            if (drafted >= toProcess) break;
            if (!agentBudgetService.canSpendLlm(companyId)) {
                items.add(Map.of("outcome", "budget_skipped", "reason", "LLM budget exhausted"));
                break;
            }

            if (candidate.email() == null || candidate.email().isBlank()) {
                skipped++;
                continue;
            }
            if (prospectRepository.existsByCompanyIdAndEmailIgnoreCase(companyId, candidate.email())) {
                skipped++;
                items.add(Map.of(
                        "organization", candidate.organization(),
                        "outcome", "skipped",
                        "reason", "already contacted"
                ));
                continue;
            }

            try {
                Map<String, Object> item = processProspect(companyId, profile, config.getOutreachType(), candidate);
                items.add(item);
                if ("pending_approval".equals(item.get("outcome"))) {
                    drafted++;
                } else {
                    skipped++;
                }
            } catch (Exception ex) {
                failed++;
                log.warn("[OutreachAgent] Run {} failed for {}: {}", runId, candidate.organization(), ex.getMessage());
                items.add(Map.of(
                        "organization", candidate.organization() != null ? candidate.organization() : "",
                        "outcome", "failed",
                        "error", ex.getMessage()
                ));
            }
        }

        String message = String.format(
                "Outreach agent: %d drafted, %d skipped, %d failed (target %d/week for %s)",
                drafted, skipped, failed, weeklyTarget, profile.name());
        result.put("status", "success");
        result.put("message", message);
        result.put("drafted", drafted);
        result.put("skipped", skipped);
        result.put("failed", failed);
        result.put("items", items);
        log.info("[OutreachAgent] Run {} complete: {}", runId, message);
        return result;
    }

    private Map<String, Object> processProspect(String companyId,
                                                CompanyProfile profile,
                                                String outreachType,
                                                ProspectCandidate candidate) {
        OutreachEmail email = generateOutreachEmail(profile, candidate, outreachType);
        agentBudgetService.recordLlmCall(companyId);

        OutreachProspectEntity entity = new OutreachProspectEntity();
        entity.setProspectId(UUID.randomUUID().toString());
        entity.setCompanyId(companyId);
        entity.setContactName(candidate.contactName());
        entity.setOrganization(candidate.organization());
        entity.setEmail(candidate.email().trim().toLowerCase());
        entity.setWebsite(candidate.website());
        entity.setSegment(candidate.segment());
        entity.setRationale(candidate.rationale());
        entity.setSource("agent");
        entity.setSubject(email.subject());
        entity.setOutreachDraft(email.body());
        entity.setStatus("pending_approval");
        entity.setProcessedAt(OffsetDateTime.now());
        prospectRepository.save(entity);

        String reason = "Outreach to " + candidate.organization()
                + " (" + candidate.segment() + "): " + email.subject();
        approvalService.requestOutreachApproval(
                companyId,
                entity.getProspectId(),
                entity.getEmail(),
                email.subject(),
                email.body(),
                reason
        );

        Map<String, Object> item = new LinkedHashMap<>();
        item.put("prospectId", entity.getProspectId());
        item.put("topic", candidate.organization());
        item.put("organization", candidate.organization());
        item.put("contactName", candidate.contactName());
        item.put("segment", candidate.segment());
        item.put("email", maskEmail(entity.getEmail()));
        item.put("subject", email.subject());
        item.put("outcome", "pending_approval");
        item.put("channel", "outreach");
        return item;
    }

    private List<ProspectCandidate> discoverProspects(CompanyProfile profile,
                                                      String marketSummary,
                                                      String outreachType,
                                                      int count) {
        String goalHint = switch (outreachType != null ? outreachType.toLowerCase() : "auto") {
            case "partnership" -> "Focus on partnership and collaboration opportunities.";
            case "press" -> "Focus on media, journalists, and PR contacts.";
            case "sales" -> "Focus on potential B2B customers and decision-makers.";
            default -> "Mix partnerships, press, and high-fit customer organizations based on the company profile.";
        };

        String systemPrompt = """
                You are a B2B outreach researcher. Based on the company profile, identify realistic organizations
                and professional contacts that would be relevant for marketing outreach.

                Return ONLY a JSON array (no markdown) of %d objects with these keys:
                - contactName: full name of a plausible contact person
                - organization: company or institution name
                - email: professional public-style email (e.g. partnerships@, hello@, contact@, info@) — must be plausible for the org
                - website: organization website domain or URL
                - segment: one of partnership, press, customer, community, investor
                - rationale: one sentence why this org fits THIS company

                Rules:
                - Tailor every prospect to the company's industry, audience, and value proposition
                - Use realistic but fictional/demo emails suitable for a graduation project demo
                - Do NOT use real personal emails of celebrities or identifiable individuals
                - Vary organization types (not all the same category)
                """.formatted(count);

        String userPrompt = goalHint + "\n\nCompany profile:\n" + profile.toPromptContext()
                + "\n\nMarket context:\n" + marketSummary;

        String response = llmService.generate(systemPrompt, userPrompt);
        return parseProspectCandidates(response);
    }

    private OutreachEmail generateOutreachEmail(CompanyProfile profile,
                                                ProspectCandidate candidate,
                                                String outreachType) {
        String systemPrompt = """
                You write concise, professional cold outreach emails for a marketing team.
                Output exactly two blocks:
                SUBJECT: <short subject line>
                BODY:
                <email body only, under 150 words, no placeholders, sign off with the company name>

                Tone: match the brand voice. Be specific to the recipient organization. No hype or spam phrases.
                """;

        String userPrompt = String.format("""
                Outreach type: %s
                Sender company: %s
                Industry: %s
                Value proposition: %s
                Brand voice: %s

                Recipient: %s at %s
                Segment: %s
                Why they fit: %s
                """,
                outreachType,
                profile.name(),
                profile.industry(),
                profile.valueProposition() != null ? profile.valueProposition() : profile.coreValueProp(),
                profile.brandVoice() != null ? profile.brandVoice() : "professional and friendly",
                candidate.contactName(),
                candidate.organization(),
                candidate.segment(),
                candidate.rationale());

        String response = llmService.generate(systemPrompt, userPrompt);
        return parseOutreachEmail(response, profile.name(), candidate);
    }

    private OutreachEmail parseOutreachEmail(String response, String companyName, ProspectCandidate candidate) {
        String subject = "Partnership opportunity with " + companyName;
        Matcher subjectMatcher = SUBJECT_LINE.matcher(response);
        boolean hasSubject = subjectMatcher.find();
        if (hasSubject) {
            subject = subjectMatcher.group(1).trim();
        }

        String body;
        Matcher bodyMatcher = BODY_LINE.matcher(response);
        if (bodyMatcher.find()) {
            body = response.substring(bodyMatcher.end()).trim();
        } else if (hasSubject) {
            body = response.substring(subjectMatcher.end()).trim();
        } else {
            body = response.trim();
        }
        body = body.replaceFirst("(?is)^SUBJECT:.*\\n?", "").trim();
        if (body.isBlank()) {
            body = "Hello " + candidate.contactName() + ",\n\n"
                    + "I'm reaching out from " + companyName + " because we believe there could be strong alignment with "
                    + candidate.organization() + ". " + candidate.rationale()
                    + "\n\nWould you be open to a brief conversation this week?\n\nBest regards,\n" + companyName;
        }
        return new OutreachEmail(subject, body);
    }

    private List<ProspectCandidate> parseProspectCandidates(String llmResponse) {
        try {
            String json = extractJsonArray(llmResponse);
            List<Map<String, Object>> raw = objectMapper.readValue(json, new TypeReference<>() {});
            List<ProspectCandidate> candidates = new ArrayList<>();
            for (Map<String, Object> row : raw) {
                candidates.add(new ProspectCandidate(
                        stringOrEmpty(row.get("contactName")),
                        stringOrEmpty(row.get("organization")),
                        stringOrEmpty(row.get("email")),
                        stringOrEmpty(row.get("website")),
                        stringOrEmpty(row.get("segment")),
                        stringOrEmpty(row.get("rationale"))
                ));
            }
            return candidates;
        } catch (Exception ex) {
            log.warn("Failed to parse outreach prospects JSON: {}", ex.getMessage());
            return List.of();
        }
    }

    private String extractJsonArray(String text) {
        int start = text.indexOf('[');
        int end = text.lastIndexOf(']');
        if (start >= 0 && end > start) {
            return text.substring(start, end + 1);
        }
        return text;
    }

    private String summarizeMarketBrief(Map<String, Object> marketBrief) {
        if (marketBrief == null || marketBrief.isEmpty()) {
            return "No additional market context.";
        }
        StringBuilder sb = new StringBuilder();
        sb.append("Topic: ").append(marketBrief.getOrDefault("research_topic", "")).append("\n");
        Object pillars = marketBrief.get("strategy_pillars");
        if (pillars != null) {
            sb.append("Strategy pillars: ").append(pillars).append("\n");
        }
        return sb.toString();
    }

    public int countOutreachDraftsThisWeek(String companyId) {
        OffsetDateTime weekStart = OffsetDateTime.now()
                .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                .withHour(0).withMinute(0).withSecond(0).withNano(0);

        return (int) prospectRepository.findByCompanyIdOrderByCreatedAtDesc(companyId).stream()
                .filter(p -> p.getProcessedAt() != null && !p.getProcessedAt().isBefore(weekStart))
                .filter(p -> List.of("pending_approval", "sent", "approved").contains(p.getStatus()))
                .count();
    }

    public long countPendingOutreach(String companyId) {
        return prospectRepository.findByCompanyIdOrderByCreatedAtDesc(companyId).stream()
                .filter(p -> "pending_approval".equals(p.getStatus()))
                .count();
    }

    private int countSentToday(String companyId) {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        return (int) prospectRepository.findByCompanyIdOrderByCreatedAtDesc(companyId).stream()
                .filter(p -> "sent".equals(p.getStatus()))
                .filter(p -> p.getProcessedAt() != null && p.getProcessedAt().toLocalDate().equals(today))
                .count();
    }

    @Transactional
    public void markSent(String companyId, String prospectId) {
        prospectRepository.findByCompanyIdAndProspectId(companyId, prospectId).ifPresent(p -> {
            p.setStatus("sent");
            p.setProcessedAt(OffsetDateTime.now());
            prospectRepository.save(p);
        });
    }

    @Transactional
    public void markRejected(String companyId, String prospectId) {
        prospectRepository.findByCompanyIdAndProspectId(companyId, prospectId).ifPresent(p -> {
            p.setStatus("rejected");
            p.setProcessedAt(OffsetDateTime.now());
            prospectRepository.save(p);
        });
    }

    public List<Map<String, Object>> listProspects(String companyId) {
        return prospectRepository.findByCompanyIdOrderByCreatedAtDesc(companyId).stream()
                .map(this::toMap)
                .toList();
    }

    private Map<String, Object> toMap(OutreachProspectEntity p) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("prospectId", p.getProspectId());
        map.put("contactName", p.getContactName());
        map.put("organization", p.getOrganization());
        map.put("email", p.getEmail());
        map.put("website", p.getWebsite());
        map.put("segment", p.getSegment());
        map.put("rationale", p.getRationale());
        map.put("subject", p.getSubject());
        map.put("outreachDraft", p.getOutreachDraft());
        map.put("status", p.getStatus());
        map.put("createdAt", p.getCreatedAt() != null ? p.getCreatedAt().toString() : null);
        map.put("processedAt", p.getProcessedAt() != null ? p.getProcessedAt().toString() : null);
        return map;
    }

    private static String stringOrEmpty(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private static String maskEmail(String email) {
        if (email == null || !email.contains("@")) return email;
        int at = email.indexOf('@');
        String local = email.substring(0, at);
        if (local.length() <= 2) return "**" + email.substring(at);
        return local.substring(0, 2) + "***" + email.substring(at);
    }

    private record ProspectCandidate(
            String contactName,
            String organization,
            String email,
            String website,
            String segment,
            String rationale
    ) {}

    private record OutreachEmail(String subject, String body) {}
}
