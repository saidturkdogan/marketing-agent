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
@Table(name = "customer_profiles")
public class CustomerProfileEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "profile_id", nullable = false, unique = true)
    private String profileId;

    @Column(name = "company_id", nullable = false)
    private String companyId;

    @Column(name = "segment_name", nullable = false)
    private String segmentName;

    @Column(columnDefinition = "text")
    private String description;

    @Column(name = "buying_motivation", columnDefinition = "text")
    private String buyingMotivation;

    @Column(name = "pain_points", columnDefinition = "text")
    private String painPoints;

    @Column(name = "preferred_channels", columnDefinition = "text")
    private String preferredChannels;

    @Column(name = "avg_order_value")
    private Double averageOrderValue;

    @Column(name = "lifetime_value")
    private Double lifetimeValue;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getProfileId() { return profileId; }
    public void setProfileId(String profileId) { this.profileId = profileId; }
    public String getCompanyId() { return companyId; }
    public void setCompanyId(String companyId) { this.companyId = companyId; }
    public String getSegmentName() { return segmentName; }
    public void setSegmentName(String segmentName) { this.segmentName = segmentName; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getBuyingMotivation() { return buyingMotivation; }
    public void setBuyingMotivation(String buyingMotivation) { this.buyingMotivation = buyingMotivation; }
    public String getPainPoints() { return painPoints; }
    public void setPainPoints(String painPoints) { this.painPoints = painPoints; }
    public String getPreferredChannels() { return preferredChannels; }
    public void setPreferredChannels(String preferredChannels) { this.preferredChannels = preferredChannels; }
    public Double getAverageOrderValue() { return averageOrderValue; }
    public void setAverageOrderValue(Double averageOrderValue) { this.averageOrderValue = averageOrderValue; }
    public Double getLifetimeValue() { return lifetimeValue; }
    public void setLifetimeValue(Double lifetimeValue) { this.lifetimeValue = lifetimeValue; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
