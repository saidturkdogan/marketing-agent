package com.plinth.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;

@Entity
@Table(name = "approvals")
public class ApprovalEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "approval_id", nullable = false, unique = true)
    private String approvalId;

    @Column(name = "campaign_id")
    private String campaignId;

    @Column(name = "company_id", length = 255)
    private String companyId;

    @Column(name = "content_id", length = 36)
    private String contentId;

    @Column(name = "step_name", nullable = false)
    private String stepName;

    @Column(nullable = false)
    private String status;

    @Column(name = "request_reason", columnDefinition = "text")
    private String requestReason;

    @Column(name = "reviewer_notes", columnDefinition = "text")
    private String reviewerNotes;

    @Column(name = "reviewed_by")
    private String reviewedBy;

    @Column(name = "requested_at", nullable = false)
    private OffsetDateTime requestedAt;

    @Column(name = "reviewed_at")
    private OffsetDateTime reviewedAt;

    @PrePersist
    void onCreate() {
        this.requestedAt = OffsetDateTime.now();
        if (this.status == null) {
            this.status = "pending";
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getApprovalId() { return approvalId; }
    public void setApprovalId(String approvalId) { this.approvalId = approvalId; }
    public String getCampaignId() { return campaignId; }
    public void setCampaignId(String campaignId) { this.campaignId = campaignId; }
    public String getCompanyId() { return companyId; }
    public void setCompanyId(String companyId) { this.companyId = companyId; }
    public String getContentId() { return contentId; }
    public void setContentId(String contentId) { this.contentId = contentId; }
    public String getStepName() { return stepName; }
    public void setStepName(String stepName) { this.stepName = stepName; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getRequestReason() { return requestReason; }
    public void setRequestReason(String requestReason) { this.requestReason = requestReason; }
    public String getReviewerNotes() { return reviewerNotes; }
    public void setReviewerNotes(String reviewerNotes) { this.reviewerNotes = reviewerNotes; }
    public String getReviewedBy() { return reviewedBy; }
    public void setReviewedBy(String reviewedBy) { this.reviewedBy = reviewedBy; }
    public OffsetDateTime getRequestedAt() { return requestedAt; }
    public OffsetDateTime getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(OffsetDateTime reviewedAt) { this.reviewedAt = reviewedAt; }
}
