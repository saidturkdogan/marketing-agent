package com.plinth.tool;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class TrendToolService implements TrendTool {

    public Map<String, Object> trends(String topic) {
        return Map.of(
                "interest_over_time", "rising",
                "related_queries", List.of(topic + " tutorial", "best " + topic + " tools", topic + " for beginners"),
                "viral_formats", List.of("carousel", "thread", "short-form video"),
                "hashtags", List.of("#" + topic.replace(" ", ""), "#marketing", "#automation")
        );
    }
}
