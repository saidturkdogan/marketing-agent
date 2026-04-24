package com.marketingagent.service;

import com.marketingagent.domain.CampaignState;
import com.marketingagent.dto.request.CampaignRequest;
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
import java.util.UUID;

@Service
public class CampaignService {

    private final JavaAiOrchestratorService javaAiOrchestratorService;
    private final CampaignPersistenceService campaignPersistenceService;
    private final PublishService publishService;

    public CampaignService(JavaAiOrchestratorService javaAiOrchestratorService,
                           CampaignPersistenceService campaignPersistenceService,
                           PublishService publishService) {
        this.javaAiOrchestratorService = javaAiOrchestratorService;
        this.campaignPersistenceService = campaignPersistenceService;
        this.publishService = publishService;
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

        CampaignState initial = new CampaignState(campaignId, request.topic(), platforms, outputs);
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
    public PublishResult publishLinkedIn(String campaignId) {
        CampaignEntity campaign = campaignPersistenceService.getCampaign(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campaign not found: " + campaignId));
        Map<String, Object> assets = campaign.getAssets();
        Map<String, Object> social = (Map<String, Object>) assets.getOrDefault("social", Map.of());
        Map<String, Object> linkedIn = (Map<String, Object>) social.getOrDefault("LinkedIn", Map.of());
        String content = String.valueOf(linkedIn.getOrDefault("variant_a", ""));
        if (content.isBlank()) {
            throw new IllegalArgumentException("LinkedIn content not found for campaign: " + campaignId);
        }
        PublishResult result = publishService.publishLinkedIn(content);
        campaignPersistenceService.savePublishLog(campaignId, result, Map.of("content", content));
        return result;
    }

    private CampaignResponse mapState(CampaignState state) {
        return new CampaignResponse(
                state.getCampaignId(),
                state.getStatus(),
                state.getPlan(),
                state.getAssets(),
                state.getCompletedSteps(),
                state.getPerformanceScore()
        );
    }
}
