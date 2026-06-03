package com.marketingagent.agent;

import com.marketingagent.domain.CampaignState;
import com.marketingagent.llm.LlmService;
import com.marketingagent.prompt.PromptCatalog;
import com.marketingagent.tool.SeoTool;
import com.marketingagent.tool.TrendTool;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class ResearchStep implements AgentStep {

    private final LlmService llmService;
    private final PromptCatalog prompts;
    private final TrendTool trendTool;
    private final SeoTool seoTool;

    public ResearchStep(LlmService llmService,
                        PromptCatalog prompts,
                        TrendTool trendTool,
                        SeoTool seoTool) {
        this.llmService = llmService;
        this.prompts = prompts;
        this.trendTool = trendTool;
        this.seoTool = seoTool;
    }

    @Override
    public String name() {
        return "Researcher";
    }

    @Override
    public int order() {
        return 20;
    }

    @Override
    public void execute(CampaignState state) {
        Map<String, Object> trends = trendTool.trends(state.getTopic());
        Map<String, Object> keywords = seoTool.keywords(state.getTopic());
        String brief = llmService.generate(
                prompts.researcher(),
                "Company context:\n" + state.getCompanyContext()
                        + "\n\nTopic: " + state.getTopic()
                        + "\nTrends: " + trends
                        + "\nKeywords: " + keywords
        );
        state.putAsset("research", Map.of(
                "brief", brief,
                "trends", trends,
                "keywords", keywords
        ));
        state.completeStep(name());
    }
}
