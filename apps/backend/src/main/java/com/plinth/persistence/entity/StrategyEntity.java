package com.plinth.persistence.entity;

import com.plinth.persistence.converter.ListMapJsonConverter;
import com.plinth.persistence.converter.MapJsonConverter;
import com.plinth.persistence.converter.StringListJsonConverter;
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
@Table(name = "strategies")
public class StrategyEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "strategy_id", unique = true, nullable = false)
    private String strategyId;

    @Column(name = "company_id", nullable = false)
    private String companyId;

    private String businessType;

    private String targetCountry;

    private String targetLanguage;

    @Column(columnDefinition = "text")
    private String productDescription;

    private String averagePrice;

    private String personaType;

    private String goal;

    @Column(columnDefinition = "TEXT")
    @Convert(converter = MapJsonConverter.class)
    private Map<String, Object> websiteAnalysis;

    @Column(columnDefinition = "TEXT")
    @Convert(converter = MapJsonConverter.class)
    private Map<String, Object> competitorAnalysis;

    @Column(columnDefinition = "TEXT")
    @Convert(converter = MapJsonConverter.class)
    private Map<String, Object> contentGaps;

    @Column(columnDefinition = "TEXT")
    @Convert(converter = MapJsonConverter.class)
    private Map<String, Object> keywordDiscovery;

    @Column(columnDefinition = "TEXT")
    @Convert(converter = MapJsonConverter.class)
    private Map<String, Object> strategy;

    @Column(columnDefinition = "TEXT")
    @Convert(converter = MapJsonConverter.class)
    private Map<String, Object> calendar;

    private double marketingScore;

    @Column(columnDefinition = "TEXT")
    @Convert(converter = ListMapJsonConverter.class)
    private List<Map<String, Object>> opportunities;

    @Convert(converter = StringListJsonConverter.class)
    @Column(columnDefinition = "text")
    private List<String> competitorUrls;

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

    public String getStrategyId() { return strategyId; }
    public void setStrategyId(String strategyId) { this.strategyId = strategyId; }

    public String getCompanyId() { return companyId; }
    public void setCompanyId(String companyId) { this.companyId = companyId; }

    public String getBusinessType() { return businessType; }
    public void setBusinessType(String businessType) { this.businessType = businessType; }

    public String getTargetCountry() { return targetCountry; }
    public void setTargetCountry(String targetCountry) { this.targetCountry = targetCountry; }

    public String getTargetLanguage() { return targetLanguage; }
    public void setTargetLanguage(String targetLanguage) { this.targetLanguage = targetLanguage; }

    public String getProductDescription() { return productDescription; }
    public void setProductDescription(String productDescription) { this.productDescription = productDescription; }

    public String getAveragePrice() { return averagePrice; }
    public void setAveragePrice(String averagePrice) { this.averagePrice = averagePrice; }

    public String getPersonaType() { return personaType; }
    public void setPersonaType(String personaType) { this.personaType = personaType; }

    public String getGoal() { return goal; }
    public void setGoal(String goal) { this.goal = goal; }

    public Map<String, Object> getWebsiteAnalysis() { return websiteAnalysis; }
    public void setWebsiteAnalysis(Map<String, Object> websiteAnalysis) { this.websiteAnalysis = websiteAnalysis; }

    public Map<String, Object> getCompetitorAnalysis() { return competitorAnalysis; }
    public void setCompetitorAnalysis(Map<String, Object> competitorAnalysis) { this.competitorAnalysis = competitorAnalysis; }

    public Map<String, Object> getContentGaps() { return contentGaps; }
    public void setContentGaps(Map<String, Object> contentGaps) { this.contentGaps = contentGaps; }

    public Map<String, Object> getKeywordDiscovery() { return keywordDiscovery; }
    public void setKeywordDiscovery(Map<String, Object> keywordDiscovery) { this.keywordDiscovery = keywordDiscovery; }

    public Map<String, Object> getStrategy() { return strategy; }
    public void setStrategy(Map<String, Object> strategy) { this.strategy = strategy; }

    public Map<String, Object> getCalendar() { return calendar; }
    public void setCalendar(Map<String, Object> calendar) { this.calendar = calendar; }

    public double getMarketingScore() { return marketingScore; }
    public void setMarketingScore(double marketingScore) { this.marketingScore = marketingScore; }

    public List<Map<String, Object>> getOpportunities() { return opportunities; }
    public void setOpportunities(List<Map<String, Object>> opportunities) { this.opportunities = opportunities; }

    public List<String> getCompetitorUrls() { return competitorUrls; }
    public void setCompetitorUrls(List<String> competitorUrls) { this.competitorUrls = competitorUrls; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
