package com.plinth.domain;

import java.util.List;
import java.util.Map;

public class StrategyReport {
    private String strategyId;
    private String companyId;
    private String businessType;
    private String targetCountry;
    private String targetLanguage;
    private String productDescription;
    private String averagePrice;
    private String personaType;
    private String goal;
    private Map<String, Object> websiteAnalysis;
    private List<Map<String, Object>> competitors;
    private Map<String, Object> competitorAnalysis;
    private Map<String, Object> contentGaps;
    private Map<String, Object> keywordDiscovery;
    private Map<String, Object> strategy;
    private Map<String, Object> calendar;
    private double marketingScore;
    private List<Map<String, Object>> opportunities;

    public String getStrategyId() { return strategyId; }
    public StrategyReport strategyId(String v) { this.strategyId = v; return this; }

    public String getCompanyId() { return companyId; }
    public StrategyReport companyId(String v) { this.companyId = v; return this; }

    public String getBusinessType() { return businessType; }
    public StrategyReport businessType(String v) { this.businessType = v; return this; }

    public String getTargetCountry() { return targetCountry; }
    public StrategyReport targetCountry(String v) { this.targetCountry = v; return this; }

    public String getTargetLanguage() { return targetLanguage; }
    public StrategyReport targetLanguage(String v) { this.targetLanguage = v; return this; }

    public String getProductDescription() { return productDescription; }
    public StrategyReport productDescription(String v) { this.productDescription = v; return this; }

    public String getAveragePrice() { return averagePrice; }
    public StrategyReport averagePrice(String v) { this.averagePrice = v; return this; }

    public String getPersonaType() { return personaType; }
    public StrategyReport personaType(String v) { this.personaType = v; return this; }

    public String getGoal() { return goal; }
    public StrategyReport goal(String v) { this.goal = v; return this; }

    public Map<String, Object> getWebsiteAnalysis() { return websiteAnalysis; }
    public StrategyReport websiteAnalysis(Map<String, Object> v) { this.websiteAnalysis = v; return this; }

    public List<Map<String, Object>> getCompetitors() { return competitors; }
    public StrategyReport competitors(List<Map<String, Object>> v) { this.competitors = v; return this; }

    public Map<String, Object> getCompetitorAnalysis() { return competitorAnalysis; }
    public StrategyReport competitorAnalysis(Map<String, Object> v) { this.competitorAnalysis = v; return this; }

    public Map<String, Object> getContentGaps() { return contentGaps; }
    public StrategyReport contentGaps(Map<String, Object> v) { this.contentGaps = v; return this; }

    public Map<String, Object> getKeywordDiscovery() { return keywordDiscovery; }
    public StrategyReport keywordDiscovery(Map<String, Object> v) { this.keywordDiscovery = v; return this; }

    public Map<String, Object> getStrategy() { return strategy; }
    public StrategyReport strategy(Map<String, Object> v) { this.strategy = v; return this; }

    public Map<String, Object> getCalendar() { return calendar; }
    public StrategyReport calendar(Map<String, Object> v) { this.calendar = v; return this; }

    public double getMarketingScore() { return marketingScore; }
    public StrategyReport marketingScore(double v) { this.marketingScore = v; return this; }

    public List<Map<String, Object>> getOpportunities() { return opportunities; }
    public StrategyReport opportunities(List<Map<String, Object>> v) { this.opportunities = v; return this; }

    public StrategyReport build() { return this; }
}
