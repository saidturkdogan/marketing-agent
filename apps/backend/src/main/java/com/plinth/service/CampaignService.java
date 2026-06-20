package com.plinth.service;

import com.plinth.domain.CampaignState;
import com.plinth.domain.CompanyProfile;
import com.plinth.dto.request.CampaignRequest;
import com.plinth.dto.request.InstagramPublishRequest;
import com.plinth.dto.response.CampaignResponse;
import com.plinth.dto.response.JobResponse;
import com.plinth.persistence.CampaignPersistenceService;
import com.plinth.persistence.entity.CampaignEntity;
import com.plinth.persistence.entity.JobEntity;
import com.plinth.persistence.entity.PublishJobEntity;
import com.plinth.persistence.repository.PublishJobRepository;
import com.plinth.publisher.PublishResult;
import com.plinth.publisher.PublishService;
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
    private final PublishQueueService publishQueueService;
    private final PublishJobRepository publishJobRepository;
    private final CompanyService companyService;
    private final CampaignMemoryService campaignMemoryService;
    private final UnifiedProfileService unifiedProfileService;

    public CampaignService(JavaAiOrchestratorService javaAiOrchestratorService,
                           CampaignPersistenceService campaignPersistenceService,
                           PublishService publishService,
                           PublishQueueService publishQueueService,
                           PublishJobRepository publishJobRepository,
                           CompanyService companyService,
                           CampaignMemoryService campaignMemoryService,
                           UnifiedProfileService unifiedProfileService) {
        this.javaAiOrchestratorService = javaAiOrchestratorService;
        this.campaignPersistenceService = campaignPersistenceService;
        this.publishService = publishService;
        this.publishQueueService = publishQueueService;
        this.publishJobRepository = publishJobRepository;
        this.companyService = companyService;
        this.campaignMemoryService = campaignMemoryService;
        this.unifiedProfileService = unifiedProfileService;
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

        String memoryContext = campaignMemoryService.buildMemoryContext(request.topic(), request.companyId());
        initial.setMemoryContext(memoryContext);

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

        PublishJobEntity job = publishQueueService.enqueue(campaignId, "LinkedIn", content, null);
        publishQueueService.processInternal(job.getJobId());

        PublishJobEntity processed = publishJobRepository.findAll().stream()
                .filter(j -> j.getJobId().equals(job.getJobId()))
                .findFirst().orElse(null);
        if (processed != null && "published".equals(processed.getStatus())) {
            return new PublishResult("LinkedIn", "published", null, null, "published via queue");
        }
        return new PublishResult("LinkedIn", "queued", job.getJobId(), null, "queued for publishing");
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

        PublishJobEntity job = publishQueueService.enqueue(campaignId, "Instagram", caption, imageUrl);
        publishQueueService.processInternal(job.getJobId());

        PublishJobEntity processed = publishJobRepository.findAll().stream()
                .filter(j -> j.getJobId().equals(job.getJobId()))
                .findFirst().orElse(null);
        if (processed != null && "published".equals(processed.getStatus())) {
            return new PublishResult("Instagram", "published", null, null, "published via queue");
        }
        return new PublishResult("Instagram", "queued", job.getJobId(), null, "queued for publishing");
    }

    @SuppressWarnings("unchecked")
    public PublishResult publishTwitter(String campaignId) {
        CampaignEntity campaign = campaignPersistenceService.getCampaign(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campaign not found: " + campaignId));
        ensureReviewPassed(campaign);
        Map<String, Object> assets = campaign.getAssets();
        Map<String, Object> twitter = getPlatformAsset(assets, "X");
        if (twitter.isEmpty()) {
            twitter = getPlatformAsset(assets, "Twitter");
        }
        String content = String.valueOf(twitter.getOrDefault("variant_a", ""));
        if (content.isBlank()) {
            content = String.valueOf(twitter.getOrDefault("content", ""));
        }
        if (content.isBlank()) {
            throw new IllegalArgumentException("Twitter content not found for campaign: " + campaignId);
        }

        PublishJobEntity job = publishQueueService.enqueue(campaignId, "Twitter", content, null);
        publishQueueService.processInternal(job.getJobId());

        PublishJobEntity processed = publishJobRepository.findAll().stream()
                .filter(j -> j.getJobId().equals(job.getJobId()))
                .findFirst().orElse(null);
        if (processed != null && "published".equals(processed.getStatus())) {
            return new PublishResult("Twitter", "published", null, null, "published via queue");
        }
        return new PublishResult("Twitter", "queued", job.getJobId(), null, "queued for publishing");
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
