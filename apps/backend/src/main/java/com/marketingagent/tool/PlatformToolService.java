package com.marketingagent.tool;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class PlatformToolService {

    public Map<String, Object> specs(String platform) {
        String key = platform == null ? "" : platform.toLowerCase();
        return switch (key) {
            case "instagram" -> Map.of("caption_max_chars", 2200, "recommended_hashtags", "20-25", "formats", List.of("Feed", "Carousel", "Reel"));
            case "linkedin" -> Map.of("post_max_chars", 3000, "recommended_hashtags", "3-5", "formats", List.of("Text Post", "Carousel", "Poll"));
            case "tiktok" -> Map.of("caption_max_chars", 4000, "recommended_hashtags", "3-5", "formats", List.of("Short Video", "Photo Carousel"));
            case "twitter", "x" -> Map.of("tweet_max_chars", 280, "recommended_hashtags", "2-3", "formats", List.of("Tweet", "Thread", "Poll"));
            default -> Map.of("formats", List.of("Text"), "recommended_hashtags", "3-5");
        };
    }

    public List<String> hashtags(String topic) {
        String compact = topic.replace(" ", "");
        return List.of("#" + compact, "#" + compact + "Tips", "#marketing", "#growth", "#ai");
    }
}
