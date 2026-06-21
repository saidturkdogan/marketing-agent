package com.plinth.service;

import com.plinth.domain.CampaignState;
import com.plinth.guardrail.GuardrailReport;
import com.plinth.persistence.entity.ApprovalEntity;
import com.plinth.persistence.repository.ApprovalRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ApprovalService {

    private static final Logger log = LoggerFactory.getLogger(ApprovalService.class);

    private final ApprovalRepository approvalRepository;

    public ApprovalService(ApprovalRepository approvalRepository) {
        this.approvalRepository = approvalRepository;
    }

    @Transactional
    public ApprovalEntity requestApproval(CampaignState state, String stepName, GuardrailReport report) {
        ApprovalEntity approval = new ApprovalEntity();
        approval.setApprovalId(UUID.randomUUID().toString());
        approval.setCampaignId(state.getCampaignId());
        approval.setStepName(stepName);
        approval.setStatus("pending");
        approval.setRequestReason("Guardrail: " + report.overallStatus() + " — " + report.summary());

        ApprovalEntity saved = approvalRepository.save(approval);
        log.info("Approval requested for campaign {} step '{}' (id={})",
                state.getCampaignId(), stepName, saved.getApprovalId());
        return saved;
    }

    @Transactional
    public ApprovalEntity approve(String approvalId, String reviewerNotes, String reviewedBy) {
        ApprovalEntity approval = approvalRepository.findByApprovalId(approvalId)
                .orElseThrow(() -> new IllegalArgumentException("Approval not found: " + approvalId));

        approval.setStatus("approved");
        approval.setReviewerNotes(reviewerNotes);
        approval.setReviewedBy(reviewedBy);
        approval.setReviewedAt(OffsetDateTime.now());

        ApprovalEntity saved = approvalRepository.save(approval);
        log.info("Approval {} approved by {}", approvalId, reviewedBy);
        return saved;
    }

    @Transactional
    public ApprovalEntity reject(String approvalId, String reviewerNotes, String reviewedBy) {
        ApprovalEntity approval = approvalRepository.findByApprovalId(approvalId)
                .orElseThrow(() -> new IllegalArgumentException("Approval not found: " + approvalId));

        approval.setStatus("rejected");
        approval.setReviewerNotes(reviewerNotes);
        approval.setReviewedBy(reviewedBy);
        approval.setReviewedAt(OffsetDateTime.now());

        ApprovalEntity saved = approvalRepository.save(approval);
        log.info("Approval {} rejected by {}: {}", approvalId, reviewedBy, reviewerNotes);
        return saved;
    }

    public boolean isApproved(String campaignId, String stepName) {
        List<ApprovalEntity> approvals = approvalRepository
                .findByCampaignIdAndStatus(campaignId, "approved");
        return approvals.stream().anyMatch(a -> stepName.equals(a.getStepName()));
    }

    public boolean isPending(String campaignId, String stepName) {
        List<ApprovalEntity> approvals = approvalRepository
                .findByCampaignIdAndStatus(campaignId, "pending");
        return approvals.stream().anyMatch(a -> stepName.equals(a.getStepName()));
    }

    public List<ApprovalEntity> getApprovalHistory(String campaignId) {
        return approvalRepository.findByCampaignIdOrderByRequestedAtDesc(campaignId);
    }

    @Transactional
    public ApprovalEntity requestContentApproval(String companyId, String contentId, GuardrailReport report) {
        ApprovalEntity approval = new ApprovalEntity();
        approval.setApprovalId(UUID.randomUUID().toString());
        approval.setCompanyId(companyId);
        approval.setContentId(contentId);
        approval.setStepName("content_publish");
        approval.setStatus("pending");
        approval.setRequestReason(report.summary());

        ApprovalEntity saved = approvalRepository.save(approval);
        log.info("Content approval requested for company {} content {} (id={})",
                companyId, contentId, saved.getApprovalId());
        return saved;
    }

    public List<ApprovalEntity> getPendingForCompany(String companyId) {
        return approvalRepository.findByCompanyIdAndStatusOrderByRequestedAtDesc(companyId, "pending");
    }

    public boolean isContentApproved(String contentId) {
        return approvalRepository.findTopByContentIdAndStatusOrderByRequestedAtDesc(contentId, "approved").isPresent();
    }

    public boolean isContentRejected(String contentId) {
        return approvalRepository.findTopByContentIdAndStatusOrderByRequestedAtDesc(contentId, "rejected").isPresent();
    }

    public Map<String, Object> toMap(ApprovalEntity approval) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("approvalId", approval.getApprovalId());
        map.put("companyId", approval.getCompanyId());
        map.put("contentId", approval.getContentId());
        map.put("campaignId", approval.getCampaignId());
        map.put("stepName", approval.getStepName());
        map.put("status", approval.getStatus());
        map.put("requestReason", approval.getRequestReason());
        map.put("reviewerNotes", approval.getReviewerNotes());
        map.put("reviewedBy", approval.getReviewedBy());
        map.put("requestedAt", approval.getRequestedAt() != null ? approval.getRequestedAt().toString() : null);
        map.put("reviewedAt", approval.getReviewedAt() != null ? approval.getReviewedAt().toString() : null);
        return map;
    }
}
