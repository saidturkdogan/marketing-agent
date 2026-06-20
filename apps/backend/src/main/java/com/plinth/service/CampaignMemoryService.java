package com.plinth.service;

import com.plinth.domain.CampaignState;
import com.plinth.domain.CompanyProfile;
import com.plinth.llm.LlmService;
import com.plinth.persistence.CampaignPersistenceService;
import com.plinth.persistence.entity.CampaignEntity;
import com.plinth.persistence.entity.DecisionLogEntity;
import com.plinth.persistence.repository.DecisionLogRepository;
import com.plinth.prompt.PromptCatalog;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class CampaignMemoryService {

    private static final Logger log = LoggerFactory.getLogger(CampaignMemoryService.class);

    private final CampaignPersistenceService campaignPersistenceService;
    private final DecisionLogRepository decisionLogRepository;
    private final LlmService llmService;
    private final PromptCatalog prompts;

    public CampaignMemoryService(CampaignPersistenceService campaignPersistenceService,
                                 DecisionLogRepository decisionLogRepository,
                                 LlmService llmService,
                                 PromptCatalog prompts) {
        this.campaignPersistenceService = campaignPersistenceService;
        this.decisionLogRepository = decisionLogRepository;
        this.llmService = llmService;
        this.prompts = prompts;
    }

    public String buildMemoryContext(String topic, String companyId) {
        List<CampaignEntity> pastCampaigns = findRelatedCampaigns(topic, companyId, 5);
        if (pastCampaigns.isEmpty()) {
            return "No past campaign data available.";
        }

        StringBuilder sb = new StringBuilder();
        sb.append("<past_campaigns>\n");

        for (CampaignEntity campaign : pastCampaigns) {
            sb.append("  <campaign>\n");
            sb.append("    <topic>").append(escapeXml(campaign.getTopic())).append("</topic>\n");
            sb.append("    <status>").append(escapeXml(campaign.getStatus())).append("</status>\n");
            if (campaign.getPerformanceScore() != null) {
                sb.append("    <score>").append(String.format("%.2f", campaign.getPerformanceScore())).append("</score>\n");
            }

            Map<String, Object> assets = campaign.getAssets();
            if (assets != null && assets.get("analytics") instanceof Map<?, ?> raw) {
                @SuppressWarnings("unchecked")
                Map<String, Object> analytics = (Map<String, Object>) raw;
                String learnings = String.valueOf(analytics.getOrDefault("learnings", ""));
                if (!learnings.isBlank()) {
                    sb.append("    <learnings>").append(escapeXml(truncate(learnings, 500))).append("</learnings>\n");
                }
            }

            List<DecisionLogEntity> decisions = decisionLogRepository
                    .findByCampaignIdOrderByCreatedAtAsc(campaign.getCampaignId());
            if (!decisions.isEmpty()) {
                sb.append("    <decisions>\n");
                for (DecisionLogEntity d : decisions) {
                    sb.append("      <decision step=\"").append(escapeXml(d.getStepName())).append("\">\n");
                    sb.append("        <reasoning>").append(escapeXml(truncate(d.getReasoning(), 300))).append("</reasoning>\n");
                    sb.append("        <confidence>").append(d.getConfidence()).append("</confidence>\n");
                    sb.append("      </decision>\n");
                }
                sb.append("    </decisions>\n");
            }

            sb.append("  </campaign>\n");
        }

        sb.append("</past_campaigns>");
        return sb.toString();
    }

    public void storeCampaignAsMemory(CampaignState state) {
        try {
            String memoryDoc = formatAsMemoryDocument(state);
            log.info("Campaign memory captured for {} (score={})", state.getCampaignId(),
                    String.format("%.2f", state.getPerformanceScore()));
        } catch (Exception ex) {
            log.error("Failed to store campaign memory for {}: {}", state.getCampaignId(), ex.getMessage());
        }
    }

    private List<CampaignEntity> findRelatedCampaigns(String topic, String companyId, int limit) {
        List<CampaignEntity> all = campaignPersistenceService.listCampaigns();
        return all.stream()
                .filter(c -> companyId == null || companyId.equals(c.getCompanyId()))
                .filter(c -> c.getTopic() != null && (
                        c.getTopic().toLowerCase().contains(topic.toLowerCase())
                                || topic.toLowerCase().contains(c.getTopic().toLowerCase())
                ))
                .sorted((a, b) -> {
                    double scoreA = a.getPerformanceScore() != null ? a.getPerformanceScore() : 0;
                    double scoreB = b.getPerformanceScore() != null ? b.getPerformanceScore() : 0;
                    return Double.compare(scoreB, scoreA);
                })
                .limit(limit)
                .collect(Collectors.toList());
    }

    private String formatAsMemoryDocument(CampaignState state) {
        StringBuilder sb = new StringBuilder();
        sb.append("# Campaign Memory: ").append(state.getTopic()).append("\n\n");
        sb.append("- **Campaign ID**: ").append(state.getCampaignId()).append("\n");
        sb.append("- **Status**: ").append(state.getStatus()).append("\n");
        sb.append("- **Score**: ").append(String.format("%.2f", state.getPerformanceScore())).append("\n");
        sb.append("- **Platforms**: ").append(String.join(", ", state.getPlatforms())).append("\n\n");

        Map<String, Object> assets = state.getAssets();
        if (assets.get("analytics") instanceof Map<?, ?> rawAna) {
            @SuppressWarnings("unchecked")
            Map<String, Object> analytics = (Map<String, Object>) rawAna;
            sb.append("## Learnings\n\n");
            sb.append(analytics.getOrDefault("learnings", "")).append("\n\n");
        }

        if (assets.get("review") instanceof Map<?, ?> rawRev) {
            @SuppressWarnings("unchecked")
            Map<String, Object> review = (Map<String, Object>) rawRev;
            sb.append("## Review\n\n");
            sb.append("Status: ").append(review.get("status")).append("\n");
            sb.append(review.getOrDefault("verdict", "")).append("\n\n");
        }

        return sb.toString();
    }

    private static String escapeXml(String value) {
        if (value == null) return "";
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;");
    }

    private static String truncate(String value, int max) {
        if (value == null || value.length() <= max) return value;
        return value.substring(0, max) + "...";
    }
}
