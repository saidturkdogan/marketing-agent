package com.plinth.service;

import com.plinth.domain.CampaignState;
import com.plinth.llm.LlmService;
import com.plinth.persistence.entity.KnowledgeEntryEntity;
import com.plinth.persistence.repository.KnowledgeEntryRepository;
import com.plinth.rag.RagService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class KnowledgeBaseService {

    private static final Logger log = LoggerFactory.getLogger(KnowledgeBaseService.class);

    private final KnowledgeEntryRepository repository;
    private final RagService ragService;

    public KnowledgeBaseService(KnowledgeEntryRepository repository, RagService ragService) {
        this.repository = repository;
        this.ragService = ragService;
    }

    public KnowledgeEntryEntity addEntry(String companyId, String entryType, String title,
                                          String content, String tags, String sourceUrl) {
        KnowledgeEntryEntity entry = new KnowledgeEntryEntity();
        entry.setEntryId(UUID.randomUUID().toString());
        entry.setCompanyId(companyId);
        entry.setEntryType(entryType);
        entry.setTitle(title);
        entry.setContent(content);
        entry.setTags(tags);
        entry.setSourceUrl(sourceUrl);
        entry.setIsActive(true);
        KnowledgeEntryEntity saved = repository.save(entry);
        log.info("Knowledge entry added: type={}, title='{}' for company {}", entryType, title, companyId);
        return saved;
    }

    public String buildKnowledgeContext(String companyId) {
        List<KnowledgeEntryEntity> activeEntries = repository.findByCompanyIdAndIsActiveTrue(companyId);
        if (activeEntries.isEmpty()) {
            return "";
        }

        StringBuilder sb = new StringBuilder();
        sb.append("<brand_knowledge>\n");

        addEntriesByType(sb, activeEntries, "brand_guideline", "Brand Guidelines");
        addEntriesByType(sb, activeEntries, "industry_report", "Industry Reports");
        addEntriesByType(sb, activeEntries, "competitor_intel", "Competitor Intelligence");
        addEntriesByType(sb, activeEntries, "campaign_learning", "Campaign Learnings");
        addEntriesByType(sb, activeEntries, "content_template", "Content Templates");

        for (KnowledgeEntryEntity entry : activeEntries) {
            if (!List.of("brand_guideline", "industry_report", "competitor_intel",
                    "campaign_learning", "content_template").contains(entry.getEntryType())) {
                sb.append("  <entry type=\"").append(entry.getEntryType()).append("\">\n");
                sb.append("    <title>").append(entry.getTitle()).append("</title>\n");
                sb.append("    <content>").append(truncate(entry.getContent(), 1000)).append("</content>\n");
                sb.append("  </entry>\n");
            }
        }

        sb.append("</brand_knowledge>");
        return sb.toString();
    }

    public String searchKnowledge(String query, String companyId, int limit) {
        List<KnowledgeEntryEntity> entries = repository.findByCompanyId(companyId);
        if (entries.isEmpty()) {
            return "No knowledge entries found.";
        }
        StringBuilder sb = new StringBuilder();
        sb.append("<knowledge_search_results query=\"").append(query).append("\">\n");
        int count = 0;
        for (KnowledgeEntryEntity entry : entries) {
            if (count >= limit) break;
            if (entry.getTitle() != null && entry.getTitle().toLowerCase().contains(query.toLowerCase())
                    || entry.getContent() != null && entry.getContent().toLowerCase().contains(query.toLowerCase())
                    || entry.getTags() != null && entry.getTags().toLowerCase().contains(query.toLowerCase())) {
                sb.append("  <result type=\"").append(entry.getEntryType()).append("\">\n");
                sb.append("    <title>").append(entry.getTitle()).append("</title>\n");
                sb.append("    <content>").append(truncate(entry.getContent(), 800)).append("</content>\n");
                sb.append("  </result>\n");
                count++;
            }
        }
        sb.append("</knowledge_search_results>");
        return sb.toString();
    }

    public void ingestCampaignLearning(CampaignState state) {
        String analytics = String.valueOf(state.getAssets().getOrDefault("analytics", ""));
        if (analytics.isBlank() || "null".equals(analytics)) return;

        String content = "Campaign: " + state.getTopic() + "\n"
                + "Score: " + String.format("%.2f", state.getPerformanceScore()) + "\n"
                + "Platforms: " + String.join(", ", state.getPlatforms()) + "\n"
                + "Learnings: " + analytics;

        addEntry(state.getCompanyId(), "campaign_learning",
                "Campaign Learning: " + state.getTopic(),
                content, state.getTopic() + ", campaign", null);
    }

    private void addEntriesByType(StringBuilder sb, List<KnowledgeEntryEntity> entries,
                                   String type, String sectionName) {
        List<KnowledgeEntryEntity> filtered = entries.stream()
                .filter(e -> type.equals(e.getEntryType()))
                .toList();
        if (filtered.isEmpty()) return;

        sb.append("  <section name=\"").append(sectionName).append("\">\n");
        for (KnowledgeEntryEntity e : filtered) {
            sb.append("    <item>\n");
            sb.append("      <title>").append(e.getTitle()).append("</title>\n");
            sb.append("      <content>").append(truncate(e.getContent(), 1500)).append("</content>\n");
            if (e.getSourceUrl() != null && !e.getSourceUrl().isBlank()) {
                sb.append("      <source>").append(e.getSourceUrl()).append("</source>\n");
            }
            sb.append("    </item>\n");
        }
        sb.append("  </section>\n");
    }

    private String truncate(String value, int max) {
        if (value == null) return "";
        return value.length() <= max ? value : value.substring(0, max) + "...";
    }
}
