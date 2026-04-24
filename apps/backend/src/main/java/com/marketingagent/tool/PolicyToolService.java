package com.marketingagent.tool;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PolicyToolService {

    private static final List<String> SPAM_WORDS = List.of("buy now", "click here", "miracle", "guaranteed", "100%");

    public String check(String text) {
        String normalized = text == null ? "" : text.toLowerCase();
        List<String> found = SPAM_WORDS.stream().filter(normalized::contains).toList();
        if (!found.isEmpty()) {
            return "violation: remove spam terms " + found;
        }
        return "pass";
    }
}
