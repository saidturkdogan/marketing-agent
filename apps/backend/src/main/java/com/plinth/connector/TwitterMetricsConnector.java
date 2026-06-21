package com.plinth.connector;

import com.plinth.service.TwitterAnalyticsService;
import com.plinth.tool.DataConnector;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class TwitterMetricsConnector implements DataConnector {

    private final TwitterAnalyticsService twitterAnalyticsService;
    private final String apiKey;
    private final String apiSecret;

    public TwitterMetricsConnector(TwitterAnalyticsService twitterAnalyticsService,
                                   @Value("${app.twitter.api-key:}") String apiKey,
                                   @Value("${app.twitter.api-secret:}") String apiSecret) {
        this.twitterAnalyticsService = twitterAnalyticsService;
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
    }

    @Override
    public String name() {
        return "twitter_metrics";
    }

    @Override
    public boolean isAvailable() {
        return apiKey != null && !apiKey.isBlank() && apiSecret != null && !apiSecret.isBlank();
    }

    @Override
    public Map<String, Object> fetch(String topic, Map<String, String> params) {
        String companyId = params.get("companyId");
        if (companyId == null || companyId.isBlank()) {
            return Map.of("error", "companyId required");
        }
        if (!twitterAnalyticsService.isConnected(companyId)) {
            return Map.of("connected", false, "message", "Twitter not connected for company");
        }
        Map<String, Object> metrics = twitterAnalyticsService.fetchRecentMetrics(companyId);
        Map<String, Object> result = new LinkedHashMap<>(metrics);
        result.put("connector", name());
        result.put("topic", topic);
        return result;
    }
}
