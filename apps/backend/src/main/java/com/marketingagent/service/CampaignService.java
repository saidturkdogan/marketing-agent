package com.marketingagent.service;

import com.marketingagent.domain.CampaignState;
import com.marketingagent.domain.CompanyProfile;
import com.marketingagent.dto.request.CampaignRequest;
import com.marketingagent.dto.request.InstagramPublishRequest;
import com.marketingagent.dto.response.CampaignResponse;
import com.marketingagent.dto.response.JobResponse;
import com.marketingagent.persistence.CampaignPersistenceService;
import com.marketingagent.persistence.entity.CampaignEntity;
import com.marketingagent.persistence.entity.JobEntity;
import com.marketingagent.publisher.PublishResult;
import com.marketingagent.publisher.PublishService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class CampaignService {

    private final JavaAiOrchestratorService javaAiOrchestratorService;
    private final CampaignPersistenceService campaignPersistenceService;
    private final PublishService publishService;
    private final CompanyService companyService;

    public CampaignService(JavaAiOrchestratorService javaAiOrchestratorService,
                           CampaignPersistenceService campaignPersistenceService,
                           PublishService publishService,
                           CompanyService companyService) {
        this.javaAiOrchestratorService = javaAiOrchestratorService;
        this.campaignPersistenceService = campaignPersistenceService;
        this.publishService = publishService;
        this.companyService = companyService;
    }

    public CampaignResponse runCampaign(CampaignRequest request) {
        String campaignId = UUID.randomUUID().toString();
        String jobId = UUID.randomUUID().toString();

        List<String> platforms = request.platforms() == null || request.platforms().isEmpty()
                ? List.of("LinkedIn", "Twitter")
                : request.platforms();
        List<String> outputs = request.outputs() == null || request.outputs().isEmpty()
                ? List.of("social")
                : request.outputs();

        CompanyProfile companyProfile = companyService.getProfile(request.companyId());
        CampaignState initial = new CampaignState(campaignId, companyProfile, request.topic(), platforms, outputs);
        campaignPersistenceService.markJobRunning(jobId, campaignId);

        try {
            CampaignState finalState = javaAiOrchestratorService.run(initial);
            campaignPersistenceService.saveCampaignResult(jobId, finalState);
            return mapState(finalState);
        } catch (RuntimeException ex) {
            campaignPersistenceService.markJobFailed(jobId, ex.getMessage());
            throw ex;
        }
    }

    public CampaignResponse getCampaign(String campaignId) {
        CampaignEntity campaign = campaignPersistenceService.getCampaign(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campaign not found: " + campaignId));

        return new CampaignResponse(
                campaign.getCampaignId(),
                campaign.getCompanyId(),
                campaign.getCompanySnapshot(),
                campaign.getStatus(),
                campaign.getPlan(),
                campaign.getAssets(),
                campaign.getCompletedSteps(),
                campaign.getPerformanceScore()
        );
    }

    public JobResponse getJob(String jobId) {
        JobEntity job = campaignPersistenceService.getJob(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job not found: " + jobId));

        return new JobResponse(job.getJobId(), job.getCampaignId(), job.getStatus(), job.getError());
    }

    @SuppressWarnings("unchecked")
    public List<CampaignResponse> listCampaigns() {
        return campaignPersistenceService.listCampaigns().stream()
                .map(entity -> new CampaignResponse(
                        entity.getCampaignId(),
                        entity.getCompanyId(),
                        entity.getCompanySnapshot(),
                        entity.getStatus(),
                        entity.getPlan(),
                        entity.getAssets(),
                        entity.getCompletedSteps(),
                        entity.getPerformanceScore()
                ))
                .collect(Collectors.toList());
    }

    public PublishResult publishLinkedIn(String campaignId) {
        CampaignEntity campaign = campaignPersistenceService.getCampaign(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campaign not found: " + campaignId));
        ensureReviewPassed(campaign);
        Map<String, Object> assets = campaign.getAssets();
        Map<String, Object> linkedIn = getPlatformAsset(assets, "LinkedIn");
        String content = String.valueOf(linkedIn.getOrDefault("variant_a", ""));
        if (content.isBlank()) {
            throw new IllegalArgumentException("LinkedIn content not found for campaign: " + campaignId);
        }
        PublishResult result = publishService.publishLinkedIn(content);
        campaignPersistenceService.savePublishLog(campaignId, result, Map.of("content", content));
        return result;
    }

    @SuppressWarnings("unchecked")
    public PublishResult publishInstagram(String campaignId, InstagramPublishRequest request) {
        CampaignEntity campaign = campaignPersistenceService.getCampaign(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campaign not found: " + campaignId));
        ensureReviewPassed(campaign);

        Map<String, Object> assets = campaign.getAssets();
        Map<String, Object> instagram = getPlatformAsset(assets, "Instagram");
        String caption = firstNonBlank(
                request == null ? null : request.caption(),
                String.valueOf(instagram.getOrDefault("variant_a", ""))
        );
        if (caption == null || caption.isBlank()) {
            throw new IllegalArgumentException("Instagram caption not found for campaign: " + campaignId);
        }

        String imageUrl = request == null ? null : request.imageUrl();
        if (imageUrl == null || imageUrl.isBlank()) {
            throw new IllegalArgumentException("imageUrl is required to publish Instagram content");
        }

        PublishResult result = publishService.publishInstagramImage(imageUrl, caption);
        campaignPersistenceService.savePublishLog(campaignId, result, Map.of("caption", caption, "image_url", imageUrl));
        return result;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> getPlatformAsset(Map<String, Object> assets, String platformName) {
        Map<String, Object> social = (Map<String, Object>) assets.getOrDefault("social", Map.of());
        for (Map.Entry<String, Object> entry : social.entrySet()) {
            if (platformName.equalsIgnoreCase(entry.getKey()) && entry.getValue() instanceof Map<?, ?> map) {
                return (Map<String, Object>) map;
            }
        }
        return Map.of();
    }

    @SuppressWarnings("unchecked")
    private void ensureReviewPassed(CampaignEntity campaign) {
        Map<String, Object> assets = campaign.getAssets();
        Object reviewObj = assets.get("review");
        if (!(reviewObj instanceof Map<?, ?> review)) {
            throw new IllegalStateException("Campaign review is missing; publishing is blocked by guardrails");
        }
        String status = Objects.toString(review.get("status"), "");
        if (!"pass".equalsIgnoreCase(status)) {
            throw new IllegalStateException("Campaign review did not pass guardrails; publishing is blocked");
        }
    }

    private String firstNonBlank(String first, String second) {
        if (first != null && !first.isBlank()) {
            return first;
        }
        return second;
    }

    private CampaignResponse mapState(CampaignState state) {
        return new CampaignResponse(
                state.getCampaignId(),
                state.getCompanyId(),
                state.getCompanySnapshot(),
                state.getStatus(),
                state.getPlan(),
                state.getAssets(),
                state.getCompletedSteps(),
                state.getPerformanceScore()
        );
    }
}
