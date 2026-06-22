package com.plinth.service;

import com.plinth.persistence.CampaignPersistenceService;
import com.plinth.persistence.entity.PublishJobEntity;
import com.plinth.persistence.repository.PublishJobRepository;
import com.plinth.publisher.PublishResult;
import com.plinth.publisher.PublishService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PublishQueueService {

    private static final Logger log = LoggerFactory.getLogger(PublishQueueService.class);

    private final PublishJobRepository publishJobRepository;
    private final PublishService publishService;
    private final CampaignPersistenceService campaignPersistenceService;

    private final Map<String, RateBucket> rateLimiters = new ConcurrentHashMap<>();

    public PublishQueueService(PublishJobRepository publishJobRepository,
                               PublishService publishService,
                               CampaignPersistenceService campaignPersistenceService) {
        this.publishJobRepository = publishJobRepository;
        this.publishService = publishService;
        this.campaignPersistenceService = campaignPersistenceService;
    }

    @Transactional
    public PublishJobEntity enqueue(String campaignId, String platform, String content, String mediaUrl) {
        PublishJobEntity job = new PublishJobEntity();
        job.setJobId(UUID.randomUUID().toString());
        job.setCampaignId(campaignId);
        job.setPlatform(platform);
        job.setContent(content);
        job.setMediaUrl(mediaUrl);
        job.setStatus("queued");

        PublishJobEntity saved = publishJobRepository.save(job);
        log.info("Publish job enqueued: {} -> {} for campaign {}", saved.getJobId(), platform, campaignId);
        return saved;
    }

    @Async
    public void processJob(String jobId) {
        var maybeJob = publishJobRepository.findById(Long.parseLong(jobId.replaceAll("\\D", "")));
        // Use the jobId string directly to find by the unique job_id column
        processInternal(jobId);
    }

    @Transactional
    public void processInternal(String jobId) {
        PublishJobEntity job = publishJobRepository.findAll().stream()
                .filter(j -> j.getJobId().equals(jobId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Publish job not found: " + jobId));

        if (!"queued".equals(job.getStatus())) {
            log.info("Job {} already processed (status={})", jobId, job.getStatus());
            return;
        }

        if (!checkRateLimit(job.getPlatform())) {
            log.info("Rate limited for platform {}, requeueing job {}", job.getPlatform(), jobId);
            job.setStatus("requeued");
            job.setLastError("rate_limited");
            publishJobRepository.save(job);
            return;
        }

        job.setStatus("processing");
        job.setScheduledAt(OffsetDateTime.now());
        publishJobRepository.save(job);

        try {
            PublishResult result = executePublish(job);
            job.setStatus(result.status().equals("published") ? "published" : "failed");
            job.setLastError(result.status().equals("published") ? null : result.message());
            if (result.status().equals("published")) {
                job.setPublishedAt(OffsetDateTime.now());
            }
            publishJobRepository.save(job);

            if (result.status().equals("published")) {
                campaignPersistenceService.savePublishLog(
                        job.getCampaignId(), result,
                        Map.of("content", job.getContent(), "media_url", job.getMediaUrl())
                );
            }
        } catch (Exception ex) {
            handleFailure(job, ex);
        }
    }

    @Transactional
    public void processQueue() {
        var queued = publishJobRepository.findByStatusOrderByCreatedAtAsc("queued");
        for (PublishJobEntity job : queued) {
            processInternal(job.getJobId());
        }
    }

    @Transactional
    public void retryFailed(String jobId) {
        PublishJobEntity job = publishJobRepository.findAll().stream()
                .filter(j -> j.getJobId().equals(jobId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Publish job not found: " + jobId));

        if (!"failed".equals(job.getStatus())) {
            throw new IllegalStateException("Job " + jobId + " is not in failed state");
        }
        job.setStatus("queued");
        job.setRetryCount(0);
        publishJobRepository.save(job);
        processInternal(job.getJobId());
    }

    private PublishResult executePublish(PublishJobEntity job) {
        return switch (job.getPlatform().toLowerCase()) {
            case "linkedin" -> publishService.publishLinkedIn(job.getContent());
            case "instagram" -> publishService.publishInstagramImage(
                    job.getMediaUrl() != null ? job.getMediaUrl() : "", job.getContent());
            case "twitter", "x" -> publishService.publishTwitter(
                    job.getContent(),
                    resolveCompanyId(job.getCampaignId()),
                    job.getMediaUrl());
            default -> throw new IllegalArgumentException("Unknown platform: " + job.getPlatform());
        };
    }

    private String resolveCompanyId(String campaignId) {
        return campaignPersistenceService.getCampaign(campaignId)
                .map(c -> c.getCompanyId())
                .filter(id -> id != null && !id.isBlank())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Campaign not found or missing companyId: " + campaignId));
    }

    private void handleFailure(PublishJobEntity job, Exception ex) {
        int retryCount = job.getRetryCount() + 1;
        job.setRetryCount(retryCount);
        job.setLastError(ex.getMessage());

        if (retryCount >= job.getMaxRetries()) {
            job.setStatus("failed");
            log.error("Publish job {} failed after {} retries: {}", job.getJobId(), retryCount, ex.getMessage());
        } else {
            job.setStatus("queued");
            log.warn("Publish job {} failed (retry {}/{}): {}",
                    job.getJobId(), retryCount, job.getMaxRetries(), ex.getMessage());
        }
        publishJobRepository.save(job);
    }

    private boolean checkRateLimit(String platform) {
        RateBucket bucket = rateLimiters.computeIfAbsent(platform.toLowerCase(), k -> {
            int maxRequests = switch (k) {
                case "linkedin" -> 100;
                case "instagram" -> 200;
                case "twitter", "x" -> 50;
                default -> 100;
            };
            return new RateBucket(maxRequests, 3600);
        });
        return bucket.tryConsume();
    }

    private static class RateBucket {
        private final int maxRequests;
        private final long windowSeconds;
        private int consumed;
        private long windowStart;

        RateBucket(int maxRequests, long windowSeconds) {
            this.maxRequests = maxRequests;
            this.windowSeconds = windowSeconds;
            this.consumed = 0;
            this.windowStart = System.currentTimeMillis();
        }

        synchronized boolean tryConsume() {
            long now = System.currentTimeMillis();
            if (now - windowStart > windowSeconds * 1000) {
                consumed = 0;
                windowStart = now;
            }
            if (consumed >= maxRequests) {
                return false;
            }
            consumed++;
            return true;
        }
    }
}
