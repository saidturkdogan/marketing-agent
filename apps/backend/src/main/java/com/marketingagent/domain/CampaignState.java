package com.marketingagent.domain;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class CampaignState {
    private final String campaignId;
    private final String topic;
    private final List<String> platforms;
    private final List<String> outputs;
    private final Map<String, Object> plan = new LinkedHashMap<>();
    private final Map<String, Object> assets = new LinkedHashMap<>();
    private final List<String> completedSteps = new ArrayList<>();
    private double performanceScore = 0.0;
    private String status = "running";

    public CampaignState(String campaignId, String topic, List<String> platforms, List<String> outputs) {
        this.campaignId = campaignId;
        this.topic = topic;
        this.platforms = platforms;
        this.outputs = outputs;
    }

    public String getCampaignId() {
        return campaignId;
    }

    public String getTopic() {
        return topic;
    }

    public List<String> getPlatforms() {
        return platforms;
    }

    public List<String> getOutputs() {
        return outputs;
    }

    public Map<String, Object> getPlan() {
        return plan;
    }

    public Map<String, Object> getAssets() {
        return assets;
    }

    public List<String> getCompletedSteps() {
        return completedSteps;
    }

    public double getPerformanceScore() {
        return performanceScore;
    }

    public void setPerformanceScore(double performanceScore) {
        this.performanceScore = performanceScore;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public void putPlan(String key, Object value) {
        plan.put(key, value);
    }

    public void putAsset(String key, Object value) {
        assets.put(key, value);
    }

    @SuppressWarnings("unchecked")
    public void putSocialAsset(String platform, Map<String, Object> value) {
        Map<String, Object> social = (Map<String, Object>) assets.computeIfAbsent("social", k -> new LinkedHashMap<>());
        social.put(platform, value);
    }

    public void completeStep(String stepName) {
        completedSteps.add(stepName);
    }
}
