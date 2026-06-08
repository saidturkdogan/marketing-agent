package com.plinth.llm;

public interface LlmService {
    String generate(String systemPrompt, String userPrompt);
}
