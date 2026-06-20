package com.plinth.service;

import com.plinth.domain.CompanyProfile;
import com.plinth.persistence.CampaignPersistenceService;
import com.plinth.persistence.entity.CampaignEntity;
import com.plinth.persistence.entity.CustomerInteractionEntity;
import com.plinth.persistence.entity.CustomerProfileEntity;
import com.plinth.persistence.repository.CustomerInteractionRepository;
import com.plinth.persistence.repository.CustomerProfileRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.StringJoiner;
import java.util.stream.Collectors;

@Service
public class UnifiedProfileService {

    private static final Logger log = LoggerFactory.getLogger(UnifiedProfileService.class);

    private final CompanyService companyService;
    private final CampaignPersistenceService campaignPersistenceService;
    private final CustomerProfileRepository customerProfileRepository;
    private final CustomerInteractionRepository customerInteractionRepository;

    public UnifiedProfileService(CompanyService companyService,
                                 CampaignPersistenceService campaignPersistenceService,
                                 CustomerProfileRepository customerProfileRepository,
                                 CustomerInteractionRepository customerInteractionRepository) {
        this.companyService = companyService;
        this.campaignPersistenceService = campaignPersistenceService;
        this.customerProfileRepository = customerProfileRepository;
        this.customerInteractionRepository = customerInteractionRepository;
    }

    public String buildUnifiedContext(String companyId) {
        CompanyProfile profile = companyService.getProfile(companyId);
        List<CustomerProfileEntity> segments = customerProfileRepository.findByCompanyId(companyId);
        List<CustomerInteractionEntity> interactions = customerInteractionRepository.findByCompanyId(companyId);
        List<CampaignEntity> pastCampaigns = campaignPersistenceService.listCampaigns().stream()
                .filter(c -> companyId.equals(c.getCompanyId()))
                .collect(Collectors.toList());

        StringJoiner ctx = new StringJoiner("\n");
        ctx.add("<unified_profile>");
        ctx.add(formatCompanySection(profile));

        if (!segments.isEmpty()) {
            ctx.add(formatSegmentsSection(segments));
        }
        if (!interactions.isEmpty()) {
            ctx.add(formatInteractionsSection(interactions));
        }
        if (!pastCampaigns.isEmpty()) {
            ctx.add(formatCampaignHistorySection(pastCampaigns));
        }

        ctx.add("</unified_profile>");
        return ctx.toString();
    }

    public Map<String, Object> getUnifiedProfileAsMap(String companyId) {
        CompanyProfile profile = companyService.getProfile(companyId);
        List<CustomerProfileEntity> segments = customerProfileRepository.findByCompanyId(companyId);
        List<CustomerInteractionEntity> interactions = customerInteractionRepository.findByCompanyId(companyId);
        List<CampaignEntity> pastCampaigns = campaignPersistenceService.listCampaigns().stream()
                .filter(c -> companyId.equals(c.getCompanyId()))
                .collect(Collectors.toList());

        return Map.of(
                "company", profile.toMap(),
                "segments", segments.stream().map(this::segmentToMap).toList(),
                "interactions", interactions.stream().map(this::interactionToMap).toList(),
                "past_campaigns", pastCampaigns.stream().map(this::campaignToSummary).toList()
        );
    }

    private String formatCompanySection(CompanyProfile p) {
        StringJoiner sj = new StringJoiner("\n");
        sj.add("  <company>");
        sj.add("    <name>" + safe(p.name()) + "</name>");
        sj.add("    <industry>" + safe(p.industry()) + "</industry>");
        sj.add("    <description>" + safe(p.description()) + "</description>");
        sj.add("    <target_audience>" + safe(p.targetAudience()) + "</target_audience>");
        sj.add("    <value_proposition>" + safe(p.valueProposition()) + "</value_proposition>");
        if (p.productsOrServices() != null && !p.productsOrServices().isEmpty()) {
            sj.add("    <products>" + String.join(", ", p.productsOrServices()) + "</products>");
        }
        sj.add("  </company>");
        return sj.toString();
    }

    private String formatSegmentsSection(List<CustomerProfileEntity> segments) {
        StringJoiner sj = new StringJoiner("\n");
        sj.add("  <customer_segments>");
        for (CustomerProfileEntity s : segments) {
            sj.add("    <segment>");
            sj.add("      <name>" + safe(s.getSegmentName()) + "</name>");
            sj.add("      <description>" + safe(s.getDescription()) + "</description>");
            sj.add("      <motivation>" + safe(s.getBuyingMotivation()) + "</motivation>");
            sj.add("      <pain_points>" + safe(s.getPainPoints()) + "</pain_points>");
            sj.add("      <channels>" + safe(s.getPreferredChannels()) + "</channels>");
            if (s.getAverageOrderValue() != null) {
                sj.add("      <avg_order_value>" + s.getAverageOrderValue() + "</avg_order_value>");
            }
            if (s.getLifetimeValue() != null) {
                sj.add("      <lifetime_value>" + s.getLifetimeValue() + "</lifetime_value>");
            }
            sj.add("    </segment>");
        }
        sj.add("  </customer_segments>");
        return sj.toString();
    }

    private String formatInteractionsSection(List<CustomerInteractionEntity> interactions) {
        StringJoiner sj = new StringJoiner("\n");
        sj.add("  <channel_interactions>");
        for (CustomerInteractionEntity i : interactions) {
            sj.add("    <interaction>");
            sj.add("      <segment>" + safe(i.getSegment()) + "</segment>");
            sj.add("      <channel>" + safe(i.getChannel()) + "</channel>");
            sj.add("      <type>" + safe(i.getInteractionType()) + "</type>");
            if (i.getCount() != null) sj.add("      <count>" + i.getCount() + "</count>");
            if (i.getEngagementRate() != null) sj.add("      <rate>" + String.format("%.2f", i.getEngagementRate()) + "</rate>");
            sj.add("    </interaction>");
        }
        sj.add("  </channel_interactions>");
        return sj.toString();
    }

    private String formatCampaignHistorySection(List<CampaignEntity> campaigns) {
        StringJoiner sj = new StringJoiner("\n");
        sj.add("  <campaign_history>");
        for (CampaignEntity c : campaigns) {
            sj.add("    <campaign>");
            sj.add("      <topic>" + safe(c.getTopic()) + "</topic>");
            sj.add("      <status>" + safe(c.getStatus()) + "</status>");
            if (c.getPerformanceScore() != null) {
                sj.add("      <score>" + String.format("%.2f", c.getPerformanceScore()) + "</score>");
            }
            sj.add("      <platforms>" + (c.getTargetPlatforms() != null ? String.join(", ", c.getTargetPlatforms()) : "") + "</platforms>");
            sj.add("    </campaign>");
        }
        sj.add("  </campaign_history>");
        return sj.toString();
    }

    private Map<String, Object> segmentToMap(CustomerProfileEntity s) {
        return Map.of(
                "segment_name", safe(s.getSegmentName()),
                "description", safe(s.getDescription()),
                "buying_motivation", safe(s.getBuyingMotivation()),
                "pain_points", safe(s.getPainPoints()),
                "preferred_channels", safe(s.getPreferredChannels()),
                "avg_order_value", s.getAverageOrderValue(),
                "lifetime_value", s.getLifetimeValue()
        );
    }

    private Map<String, Object> interactionToMap(CustomerInteractionEntity i) {
        return Map.of(
                "segment", safe(i.getSegment()),
                "channel", safe(i.getChannel()),
                "type", safe(i.getInteractionType()),
                "count", i.getCount(),
                "engagement_rate", i.getEngagementRate()
        );
    }

    private Map<String, Object> campaignToSummary(CampaignEntity c) {
        return Map.of(
                "topic", safe(c.getTopic()),
                "status", safe(c.getStatus()),
                "score", c.getPerformanceScore(),
                "platforms", c.getTargetPlatforms() != null ? c.getTargetPlatforms() : List.of()
        );
    }

    private static String safe(String v) { return v == null ? "" : v; }
}
