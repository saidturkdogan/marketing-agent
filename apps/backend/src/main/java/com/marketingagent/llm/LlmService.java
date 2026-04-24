package com.marketingagent.llm;

public interface LlmService {
    String generate(String systemPrompt, String userPrompt);
}
