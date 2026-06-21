package com.plinth.connector;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plinth.tool.DataConnector;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class SerpApiTrendsConnector implements DataConnector {

    private static final Logger log = LoggerFactory.getLogger(SerpApiTrendsConnector.class);

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;

    public SerpApiTrendsConnector(ObjectMapper objectMapper,
                                @Value("${app.serpapi.api-key:}") String apiKey) {
        var factory = new JdkClientHttpRequestFactory();
        factory.setReadTimeout(Duration.ofSeconds(30));
        this.restClient = RestClient.builder()
                .baseUrl("https://serpapi.com")
                .requestFactory(factory)
                .build();
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
    }

    @Override
    public String name() {
        return "serpapi_trends";
    }

    @Override
    public boolean isAvailable() {
        return apiKey != null && !apiKey.isBlank();
    }

    @Override
    public Map<String, Object> fetch(String topic, Map<String, String> params) {
        String type = params.getOrDefault("type", "trends");
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("connector", name());
        result.put("topic", topic);

        try {
            if ("keywords".equals(type)) {
                return fetchRelatedQueries(topic, result);
            }
            return fetchTrends(topic, result);
        } catch (Exception ex) {
            log.warn("SerpAPI fetch failed: {}", ex.getMessage());
            result.put("error", ex.getMessage());
            return result;
        }
    }

    private Map<String, Object> fetchTrends(String topic, Map<String, Object> result) throws Exception {
        String uri = UriComponentsBuilder.fromPath("/search")
                .queryParam("engine", "google_trends")
                .queryParam("q", topic)
                .queryParam("data_type", "TIMESERIES")
                .queryParam("api_key", apiKey)
                .build()
                .toUriString();

        String body = restClient.get().uri(uri).retrieve().body(String.class);
        JsonNode root = objectMapper.readTree(body);

        JsonNode interestNode = root.path("interest_over_time");
        if (!interestNode.isMissingNode() && !interestNode.isNull()) {
            result.put("interest_over_time", objectMapper.convertValue(interestNode, Map.class));
        }
        result.put("related_queries", extractRelatedQueries(root));
        result.put("trends", true);
        return result;
    }

    private Map<String, Object> fetchRelatedQueries(String topic, Map<String, Object> result) throws Exception {
        String uri = UriComponentsBuilder.fromPath("/search")
                .queryParam("engine", "google_trends")
                .queryParam("q", topic)
                .queryParam("data_type", "RELATED_QUERIES")
                .queryParam("api_key", apiKey)
                .build()
                .toUriString();

        String body = restClient.get().uri(uri).retrieve().body(String.class);
        JsonNode root = objectMapper.readTree(body);
        result.put("related_queries", extractRelatedQueries(root));
        result.put("seo", Map.of("keywords", extractRelatedQueries(root)));
        return result;
    }

    private List<String> extractRelatedQueries(JsonNode root) {
        List<String> queries = new ArrayList<>();
        JsonNode rising = root.path("related_queries").path("rising");
        if (rising.isArray()) {
            for (JsonNode q : rising) {
                String query = q.path("query").asText(null);
                if (query != null && !query.isBlank()) queries.add(query);
            }
        }
        JsonNode top = root.path("related_queries").path("top");
        if (top.isArray()) {
            for (JsonNode q : top) {
                String query = q.path("query").asText(null);
                if (query != null && !query.isBlank() && queries.size() < 10) queries.add(query);
            }
        }
        return queries;
    }
}
