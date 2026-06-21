package com.plinth.llm;

import com.plinth.service.AgentBudgetService;
import com.plinth.service.AgentRunContext;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

@Service
@Primary
public class MeteredLlmService implements LlmService {

    private final SpringAiCompatibleLlmService delegate;
    private final AgentBudgetService agentBudgetService;

    public MeteredLlmService(SpringAiCompatibleLlmService delegate,
                             AgentBudgetService agentBudgetService) {
        this.delegate = delegate;
        this.agentBudgetService = agentBudgetService;
    }

    @Override
    public String generate(String systemPrompt, String userPrompt) {
        String result = delegate.generate(systemPrompt, userPrompt);
        AgentRunContext.Scope scope = AgentRunContext.get();
        if (scope != null) {
            double estimate = estimateCost(systemPrompt, userPrompt, result);
            agentBudgetService.recordLlmCall(scope.companyId(), estimate);
        }
        return result;
    }

    private double estimateCost(String systemPrompt, String userPrompt, String response) {
        int chars = (systemPrompt != null ? systemPrompt.length() : 0)
                + (userPrompt != null ? userPrompt.length() : 0)
                + (response != null ? response.length() : 0);
        // ~4 chars per token, Gemini Flash ~ $0.15/1M tokens blended estimate
        double tokens = chars / 4.0;
        return Math.max(0.0005, tokens * 0.00000015);
    }
}
