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

    public Map<String, Object> fetchTrends(String topic) {
        Map<String, Object> combined = new LinkedHashMap<>();
        combined.put("source", "external_data_service");
        combined.put("topic", topic);

        for (DataConnector connector : connectors) {
            if (connector.isAvailable()) {
                try {
                    Map<String, Object> data = connector.fetch(topic, Map.of("type", "trends"));
                    combined.put(connector.name() + "_data", data);
                    log.info("Fetched trends from connector: {}", connector.name());
                } catch (Exception ex) {
                    log.warn("Connector '{}' failed: {}", connector.name(), ex.getMessage());
                }
            }
        }

        if (!combined.containsKey("trends")) {
            Map<String, Object> fallback = trendToolFallback.trends(topic);
            combined.put("trends", fallback);
            combined.put("fallback", true);
            log.info("Using simulated trend data (no real connector available)");
        }

        return combined;
    }

    public Map<String, Object> fetchKeywords(String topic) {
        Map<String, Object> combined = new LinkedHashMap<>();
        combined.put("source", "external_data_service");
        combined.put("topic", topic);

        for (DataConnector connector : connectors) {
            if (connector.isAvailable()) {
                try {
                    Map<String, Object> data = connector.fetch(topic, Map.of("type", "keywords"));
                    combined.put(connector.name() + "_data", data);
                    log.info("Fetched keywords from connector: {}", connector.name());
                } catch (Exception ex) {
                    log.warn("Connector '{}' failed: {}", connector.name(), ex.getMessage());
                }
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
        result.put("trends", fetchTrends(topic));
        result.put("keywords", fetchKeywords(topic));
        return result;
    }

    public boolean hasRealConnectors() {
        return connectors.stream().anyMatch(DataConnector::isAvailable);
    }
}
