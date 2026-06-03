package com.marketingagent.persistence;

import com.marketingagent.domain.CampaignState;
import com.marketingagent.persistence.entity.AssetEntity;
import com.marketingagent.persistence.entity.CampaignEntity;
import com.marketingagent.persistence.entity.JobEntity;
import com.marketingagent.persistence.entity.PublishLogEntity;
import com.marketingagent.persistence.repository.AssetRepository;
import com.marketingagent.persistence.repository.CampaignRepository;
import com.marketingagent.persistence.repository.JobRepository;
import com.marketingagent.persistence.repository.PublishLogRepository;
import com.marketingagent.publisher.PublishResult;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class CampaignPersistenceService {

    private final CampaignRepository campaignRepository;
    private final AssetRepository assetRepository;
    private final JobRepository jobRepository;
    private final PublishLogRepository publishLogRepository;

    public CampaignPersistenceService(CampaignRepository campaignRepository,
                                      AssetRepository assetRepository,
                                      JobRepository jobRepository,
                                      PublishLogRepository publishLogRepository) {
        this.campaignRepository = campaignRepository;
        this.assetRepository = assetRepository;
        this.jobRepository = jobRepository;
        this.publishLogRepository = publishLogRepository;
    }

    @Transactional
    public void markJobRunning(String jobId, String campaignId) {
        JobEntity job = new JobEntity();
        job.setJobId(jobId);
        job.setCampaignId(campaignId);
        job.setStatus("running");
        jobRepository.save(job);
    }

    @Transactional
    public void saveCampaignResult(String jobId, CampaignState state) {
        CampaignEntity campaign = campaignRepository.findByCampaignId(state.getCampaignId()).orElseGet(CampaignEntity::new);
        campaign.setCampaignId(state.getCampaignId());
        campaign.setTopic(state.getTopic());
        campaign.setCompanyId(state.getCompanyId());
        campaign.setCompanySnapshot(state.getCompanySnapshot());
        campaign.setStatus(state.getStatus());
        campaign.setTargetPlatforms(state.getPlatforms());
        campaign.setRequestedOutputs(state.getOutputs());
        campaign.setPlan(state.getPlan());
        campaign.setAssets(state.getAssets());
        campaign.setCompletedSteps(state.getCompletedSteps());
        campaign.setPerformanceScore(state.getPerformanceScore());
        campaignRepository.save(campaign);

        assetRepository.deleteByCampaignId(state.getCampaignId());
        for (Map.Entry<String, Object> entry : state.getAssets().entrySet()) {
            AssetEntity asset = new AssetEntity();
            asset.setCampaignId(state.getCampaignId());
            asset.setAssetType(entry.getKey());
            asset.setContent(asMap(entry.getValue()));
            assetRepository.save(asset);
        }

        Optional<JobEntity> maybeJob = jobRepository.findByJobId(jobId);
        if (maybeJob.isPresent()) {
            JobEntity job = maybeJob.get();
            job.setStatus("completed");
            job.setError(null);
            jobRepository.save(job);
        }
    }

    @Transactional
    public void markJobFailed(String jobId, String error) {
        Optional<JobEntity> maybeJob = jobRepository.findByJobId(jobId);
        if (maybeJob.isPresent()) {
            JobEntity job = maybeJob.get();
            job.setStatus("failed");
            job.setError(error);
            jobRepository.save(job);
        }
    }

    public Optional<CampaignEntity> getCampaign(String campaignId) {
        return campaignRepository.findByCampaignId(campaignId);
    }

    public List<CampaignEntity> listCampaigns() {
        return campaignRepository.findAllByOrderByCreatedAtDesc();
    }

    public Optional<JobEntity> getJob(String jobId) {
        return jobRepository.findByJobId(jobId);
    }

    @Transactional
    public void savePublishLog(String campaignId, PublishResult result, Map<String, Object> payload) {
        PublishLogEntity log = new PublishLogEntity();
        log.setCampaignId(campaignId);
        log.setPlatform(result.platform());
        log.setStatus(result.status());
        log.setExternalPostId(result.externalId());
        log.setUrl(result.url());
        log.setPayload(payload);
        publishLogRepository.save(log);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> asMap(Object value) {
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> result = new LinkedHashMap<>();
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                result.put(String.valueOf(entry.getKey()), entry.getValue());
            }
            return result;
        }
        return Map.of("value", value);
    }
}
