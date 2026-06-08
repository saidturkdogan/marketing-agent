package com.plinth.domain;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class CampaignState {
    private final String campaignId;
    private final CompanyProfile companyProfile;
    private final String topic;
    private final List<String> platforms;
    private final List<String> outputs;
    private final Map<String, Object> plan;
    private final Map<String, Object> assets;
    private final List<String> completedSteps;
    private volatile double performanceScore = 0.0;
    private volatile String status = "running";

    public CampaignState(String campaignId, CompanyProfile companyProfile, String topic, List<String> platforms, List<String> outputs) {
        this.campaignId = campaignId;
        this.companyProfile = companyProfile;
        this.topic = topic;
        this.platforms = platforms;
        this.outputs = outputs;
        this.plan = new LinkedHashMap<>();
        this.assets = new ConcurrentHashMap<>();
        this.completedSteps = Collections.synchronizedList(new ArrayList<>());
    }

    public String getCampaignId() {
        return campaignId;
    }

    public CompanyProfile getCompanyProfile() {
        return companyProfile;
    }

    public String getCompanyId() {
        return companyProfile.companyId();
    }

    public Map<String, Object> getCompanySnapshot() {
        return companyProfile.toMap();
    }

    public String getCompanyContext() {
        return companyProfile.toPromptContext();
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
        Map<String, Object> social = (Map<String, Object>) assets.computeIfAbsent("social", k -> new ConcurrentHashMap<>());
        social.put(platform, value);
    }

    public void completeStep(String stepName) {
        completedSteps.add(stepName);
    }
}