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
@Table(name = "agent_configs")
public class AgentConfigEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_id", nullable = false, unique = true, length = 255)
    private String companyId;

    @Column(name = "autopilot_enabled", nullable = false)
    private boolean autopilotEnabled = false;

    @Column(name = "twitter_posts_per_week", nullable = false)
    private int twitterPostsPerWeek = 3;

    @Column(name = "email_drafts_per_week", nullable = false)
    private int emailDraftsPerWeek = 2;

    @Column(name = "outreach_enabled", nullable = false)
    private boolean outreachEnabled = false;

    @Column(name = "outreach_emails_per_week", nullable = false)
    private int outreachEmailsPerWeek = 5;

    @Column(name = "outreach_daily_cap", nullable = false)
    private int outreachDailyCap = 10;

    @Column(name = "outreach_type", nullable = false, length = 30)
    private String outreachType = "auto";

    @Column(name = "quiet_hours_start", length = 5)
    private String quietHoursStart = "22:00";

    @Column(name = "quiet_hours_end", length = 5)
    private String quietHoursEnd = "08:00";

    @Column(length = 64)
    private String timezone = "Europe/Istanbul";

    @Column(name = "risk_threshold", nullable = false, length = 30)
    private String riskThreshold = "warn_requires_approval";

    @Column(name = "max_content_retries", nullable = false)
    private int maxContentRetries = 2;

    @Column(name = "min_confidence_to_autopublish", nullable = false)
    private double minConfidenceToAutopublish = 0.7;

    @Column(name = "llm_budget_usd_per_week", nullable = false)
    private double llmBudgetUsdPerWeek = 5.0;

    @Column(name = "llm_spend_usd_this_week", nullable = false)
    private double llmSpendUsdThisWeek = 0;

    @Column(name = "x_api_budget_credits_per_week", nullable = false)
    private int xApiBudgetCreditsPerWeek = 100;

    @Column(name = "x_credits_used_this_week", nullable = false)
    private int xCreditsUsedThisWeek = 0;

    @Column(name = "budget_week_start")
    private OffsetDateTime budgetWeekStart;

    @Column(name = "last_run_at")
    private OffsetDateTime lastRunAt;

    @Column(name = "last_run_status", length = 30)
    private String lastRunStatus;

    @Column(name = "last_run_message", columnDefinition = "text")
    private String lastRunMessage;

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
    public String getCompanyId() { return companyId; }
    public void setCompanyId(String companyId) { this.companyId = companyId; }
    public boolean isAutopilotEnabled() { return autopilotEnabled; }
    public void setAutopilotEnabled(boolean autopilotEnabled) { this.autopilotEnabled = autopilotEnabled; }
    public int getTwitterPostsPerWeek() { return twitterPostsPerWeek; }
    public void setTwitterPostsPerWeek(int twitterPostsPerWeek) { this.twitterPostsPerWeek = twitterPostsPerWeek; }
    public int getEmailDraftsPerWeek() { return emailDraftsPerWeek; }
    public void setEmailDraftsPerWeek(int emailDraftsPerWeek) { this.emailDraftsPerWeek = emailDraftsPerWeek; }
    public boolean isOutreachEnabled() { return outreachEnabled; }
    public void setOutreachEnabled(boolean outreachEnabled) { this.outreachEnabled = outreachEnabled; }
    public int getOutreachEmailsPerWeek() { return outreachEmailsPerWeek; }
    public void setOutreachEmailsPerWeek(int outreachEmailsPerWeek) { this.outreachEmailsPerWeek = outreachEmailsPerWeek; }
    public int getOutreachDailyCap() { return outreachDailyCap; }
    public void setOutreachDailyCap(int outreachDailyCap) { this.outreachDailyCap = outreachDailyCap; }
    public String getOutreachType() { return outreachType; }
    public void setOutreachType(String outreachType) { this.outreachType = outreachType; }
    public String getQuietHoursStart() { return quietHoursStart; }
    public void setQuietHoursStart(String quietHoursStart) { this.quietHoursStart = quietHoursStart; }
    public String getQuietHoursEnd() { return quietHoursEnd; }
    public void setQuietHoursEnd(String quietHoursEnd) { this.quietHoursEnd = quietHoursEnd; }
    public String getTimezone() { return timezone; }
    public void setTimezone(String timezone) { this.timezone = timezone; }
    public String getRiskThreshold() { return riskThreshold; }
    public void setRiskThreshold(String riskThreshold) { this.riskThreshold = riskThreshold; }
    public int getMaxContentRetries() { return maxContentRetries; }
    public void setMaxContentRetries(int maxContentRetries) { this.maxContentRetries = maxContentRetries; }
    public double getMinConfidenceToAutopublish() { return minConfidenceToAutopublish; }
    public void setMinConfidenceToAutopublish(double minConfidenceToAutopublish) { this.minConfidenceToAutopublish = minConfidenceToAutopublish; }
    public double getLlmBudgetUsdPerWeek() { return llmBudgetUsdPerWeek; }
    public void setLlmBudgetUsdPerWeek(double llmBudgetUsdPerWeek) { this.llmBudgetUsdPerWeek = llmBudgetUsdPerWeek; }
    public double getLlmSpendUsdThisWeek() { return llmSpendUsdThisWeek; }
    public void setLlmSpendUsdThisWeek(double llmSpendUsdThisWeek) { this.llmSpendUsdThisWeek = llmSpendUsdThisWeek; }
    public int getXApiBudgetCreditsPerWeek() { return xApiBudgetCreditsPerWeek; }
    public void setXApiBudgetCreditsPerWeek(int xApiBudgetCreditsPerWeek) { this.xApiBudgetCreditsPerWeek = xApiBudgetCreditsPerWeek; }
    public int getXCreditsUsedThisWeek() { return xCreditsUsedThisWeek; }
    public void setXCreditsUsedThisWeek(int xCreditsUsedThisWeek) { this.xCreditsUsedThisWeek = xCreditsUsedThisWeek; }
    public OffsetDateTime getBudgetWeekStart() { return budgetWeekStart; }
    public void setBudgetWeekStart(OffsetDateTime budgetWeekStart) { this.budgetWeekStart = budgetWeekStart; }
    public OffsetDateTime getLastRunAt() { return lastRunAt; }
    public void setLastRunAt(OffsetDateTime lastRunAt) { this.lastRunAt = lastRunAt; }
    public String getLastRunStatus() { return lastRunStatus; }
    public void setLastRunStatus(String lastRunStatus) { this.lastRunStatus = lastRunStatus; }
    public String getLastRunMessage() { return lastRunMessage; }
    public void setLastRunMessage(String lastRunMessage) { this.lastRunMessage = lastRunMessage; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
