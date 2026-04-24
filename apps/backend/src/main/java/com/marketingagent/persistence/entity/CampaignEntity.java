package com.marketingagent.persistence.entity;

import com.marketingagent.persistence.converter.MapJsonConverter;
import com.marketingagent.persistence.converter.StringListJsonConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "campaigns")
public class CampaignEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "campaign_id", nullable = false, unique = true)
    private String campaignId;

    @Column(nullable = false, length = 2000)
    private String topic;

    @Column(nullable = false)
    private String status;

    @Convert(converter = StringListJsonConverter.class)
    @Column(name = "target_platforms", columnDefinition = "text")
    private List<String> targetPlatforms;

    @Convert(converter = StringListJsonConverter.class)
    @Column(name = "requested_outputs", columnDefinition = "text")
    private List<String> requestedOutputs;

    @Convert(converter = MapJsonConverter.class)
    @Column(columnDefinition = "text")
    private Map<String, Object> plan;

    @Convert(converter = MapJsonConverter.class)
    @Column(columnDefinition = "text")
    private Map<String, Object> assets;

    @Convert(converter = StringListJsonConverter.class)
    @Column(name = "completed_steps", columnDefinition = "text")
    private List<String> completedSteps;

    @Column(name = "performance_score")
    private Double performanceScore;

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
    public String getCampaignId() { return campaignId; }
    public void setCampaignId(String campaignId) { this.campaignId = campaignId; }
    public String getTopic() { return topic; }
    public void setTopic(String topic) { this.topic = topic; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public List<String> getTargetPlatforms() { return targetPlatforms; }
    public void setTargetPlatforms(List<String> targetPlatforms) { this.targetPlatforms = targetPlatforms; }
    public List<String> getRequestedOutputs() { return requestedOutputs; }
    public void setRequestedOutputs(List<String> requestedOutputs) { this.requestedOutputs = requestedOutputs; }
    public Map<String, Object> getPlan() { return plan; }
    public void setPlan(Map<String, Object> plan) { this.plan = plan; }
    public Map<String, Object> getAssets() { return assets; }
    public void setAssets(Map<String, Object> assets) { this.assets = assets; }
    public List<String> getCompletedSteps() { return completedSteps; }
    public void setCompletedSteps(List<String> completedSteps) { this.completedSteps = completedSteps; }
    public Double getPerformanceScore() { return performanceScore; }
    public void setPerformanceScore(Double performanceScore) { this.performanceScore = performanceScore; }
}
