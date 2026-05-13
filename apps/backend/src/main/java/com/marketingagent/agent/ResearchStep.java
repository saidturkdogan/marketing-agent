package com.marketingagent.agent;

import com.marketingagent.domain.CampaignState;
import com.marketingagent.llm.LlmService;
import com.marketingagent.prompt.PromptCatalog;
import com.marketingagent.tool.SeoToolService;
import com.marketingagent.tool.TrendToolService;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class ResearchStep implements AgentStep {

    private final LlmService llmService;
    private final PromptCatalog prompts;
    private final TrendToolService trendToolService;
    private final SeoToolService seoToolService;

    public ResearchStep(LlmService llmService,
                        PromptCatalog prompts,
                        TrendToolService trendToolService,
                        SeoToolService seoToolService) {
        this.llmService = llmService;
        this.prompts = prompts;
        this.trendToolService = trendToolService;
        this.seoToolService = seoToolService;
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
        Map<String, Object> trends = trendToolService.trends(state.getTopic());
        Map<String, Object> keywords = seoToolService.keywords(state.getTopic());
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
