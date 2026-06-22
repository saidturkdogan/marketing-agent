package com.plinth.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;

@Entity
@Table(name = "outreach_prospects")
public class OutreachProspectEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "prospect_id", nullable = false, unique = true, length = 36)
    private String prospectId;

    @Column(name = "company_id", nullable = false, length = 255)
    private String companyId;

    @Column(name = "contact_name", length = 255)
    private String contactName;

    @Column(length = 500)
    private String organization;

    @Column(length = 500)
    private String email;

    @Column(length = 1000)
    private String website;

    @Column(length = 100)
    private String segment;

    @Column(columnDefinition = "text")
    private String rationale;

    @Column(nullable = false, length = 50)
    private String source = "agent";

    @Column(length = 1000)
    private String subject;

    @Column(name = "outreach_draft", columnDefinition = "text")
    private String outreachDraft;

    @Column(nullable = false, length = 30)
    private String status = "discovered";

    @Column(name = "processed_at")
    private OffsetDateTime processedAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
        if (status == null) {
            status = "discovered";
        }
        if (source == null) {
            source = "agent";
        }
    }

    public Long getId() { return id; }
    public String getProspectId() { return prospectId; }
    public void setProspectId(String prospectId) { this.prospectId = prospectId; }
    public String getCompanyId() { return companyId; }
    public void setCompanyId(String companyId) { this.companyId = companyId; }
    public String getContactName() { return contactName; }
    public void setContactName(String contactName) { this.contactName = contactName; }
    public String getOrganization() { return organization; }
    public void setOrganization(String organization) { this.organization = organization; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getWebsite() { return website; }
    public void setWebsite(String website) { this.website = website; }
    public String getSegment() { return segment; }
    public void setSegment(String segment) { this.segment = segment; }
    public String getRationale() { return rationale; }
    public void setRationale(String rationale) { this.rationale = rationale; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }
    public String getOutreachDraft() { return outreachDraft; }
    public void setOutreachDraft(String outreachDraft) { this.outreachDraft = outreachDraft; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public OffsetDateTime getProcessedAt() { return processedAt; }
    public void setProcessedAt(OffsetDateTime processedAt) { this.processedAt = processedAt; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}
