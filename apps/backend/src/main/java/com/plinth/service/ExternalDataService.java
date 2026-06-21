package com.plinth.service;

import com.plinth.tool.DataConnector;
import com.plinth.tool.SeoToolService;
import com.plinth.tool.TrendToolService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ExternalDataService {

    private static final Logger log = LoggerFactory.getLogger(ExternalDataService.class);
    private static final String PARAM_TYPE = "type";
    private static final String PARAM_COMPANY_ID = "companyId";
    private static final String TYPE_TRENDS = "trends";
    private static final String TYPE_KEYWORDS = "keywords";

    private final List<DataConnector> connectors;
    private final TrendToolService trendToolFallback;
    private final SeoToolService seoToolFallback;

    public ExternalDataService(List<DataConnector> connectors,
                               TrendToolService trendToolFallback,
                               SeoToolService seoToolFallback) {
        this.connectors = connectors;
        this.trendToolFallback = trendToolFallback;
        this.seoToolFallback = seoToolFallback;
    }

    public Map<String, Object> fetchTrends(String topic, String companyId) {
        Map<String, Object> combined = new LinkedHashMap<>();
        combined.put("source", "external_data_service");
        combined.put("topic", topic);

        for (DataConnector connector : connectors) {
            if (!connector.isAvailable()) {
                continue;
            }
            try {
                Map<String, String> connectorParams = connectorParams(TYPE_TRENDS, companyId);
                Map<String, Object> data = connector.fetch(topic, connectorParams);
                combined.put(connector.name() + "_data", data);
                if (isGoogleTrendData(data)) {
                    combined.put(TYPE_TRENDS, data);
                }
                log.info("Fetched trends from connector: {}", connector.name());
            } catch (Exception ex) {
                log.warn("Connector '{}' failed: {}", connector.name(), ex.getMessage());
            }
        }

        if (!combined.containsKey(TYPE_TRENDS)) {
            Map<String, Object> fallback = trendToolFallback.trends(topic);
            combined.put(TYPE_TRENDS, fallback);
            combined.put("fallback", true);
            log.info("Using simulated trend data (no real connector available)");
        }

        return combined;
    }

    public Map<String, Object> fetchKeywords(String topic, String companyId) {
        Map<String, Object> combined = new LinkedHashMap<>();
        combined.put("source", "external_data_service");
        combined.put("topic", topic);

        for (DataConnector connector : connectors) {
            if (!connector.isAvailable()) {
                continue;
            }
            try {
                Map<String, String> connectorParams = connectorParams(TYPE_KEYWORDS, companyId);
                Map<String, Object> data = connector.fetch(topic, connectorParams);
                combined.put(connector.name() + "_data", data);
                if (data.containsKey("seo")) {
                    combined.put("seo", data.get("seo"));
                } else if (isKeywordData(data)) {
                    combined.put("seo", data);
                }
                log.info("Fetched keywords from connector: {}", connector.name());
            } catch (Exception ex) {
                log.warn("Connector '{}' failed: {}", connector.name(), ex.getMessage());
            }
        }

        if (!combined.containsKey("seo")) {
            Map<String, Object> fallback = seoToolFallback.keywords(topic);
            combined.put("seo", fallback);
            combined.put("fallback", true);
            log.info("Using simulated SEO data (no real connector available)");
        }

        return combined;
    }

    public Map<String, Object> enrichWithExternalData(String topic, String companyId) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("topic", topic);
        if (companyId != null && !companyId.isBlank()) {
            result.put(PARAM_COMPANY_ID, companyId);
        }
        result.put(TYPE_TRENDS, fetchTrends(topic, companyId));
        result.put(TYPE_KEYWORDS, fetchKeywords(topic, companyId));
        return result;
    }

    public boolean hasRealConnectors() {
        for (DataConnector connector : connectors) {
            if (connector.isAvailable()) {
                return true;
            }
        }
        return false;
    }

    private Map<String, String> connectorParams(String type, String companyId) {
        Map<String, String> params = new LinkedHashMap<>(Map.of(PARAM_TYPE, type));
        if (companyId != null && !companyId.isBlank()) {
            params.put(PARAM_COMPANY_ID, companyId);
        }
        return params;
    }

    // Google Trends / SerpAPI payload (not Twitter aggregate metrics).
    private boolean isGoogleTrendData(Map<String, Object> data) {
        return data.containsKey("interest_over_time")
                || (data.containsKey("related_queries") && !data.containsKey("aggregate"));
    }

    private boolean isKeywordData(Map<String, Object> data) {
        return data.containsKey("related_queries") && !data.containsKey("aggregate");
    }
}
