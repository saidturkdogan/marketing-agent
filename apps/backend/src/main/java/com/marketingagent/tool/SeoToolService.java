package com.marketingagent.tool;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class SeoToolService implements SeoTool {

    public Map<String, Object> keywords(String topic) {
        return Map.of(
                "primary_keywords", List.of(topic + " tips", "best " + topic + " strategies", "how to use " + topic),
                "secondary_keywords", List.of(topic + " automation", topic + " examples"),
                "search_volume", "simulated-high"
        );
    }
}
