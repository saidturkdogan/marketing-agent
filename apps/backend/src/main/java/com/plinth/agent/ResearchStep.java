package com.plinth.agent;

import com.plinth.domain.CampaignState;
import com.plinth.llm.LlmService;
import com.plinth.prompt.PromptCatalog;
import com.plinth.service.AgentIdentityService;
import com.plinth.tool.SeoTool;
import com.plinth.tool.TrendTool;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class ResearchStep implements AgentStep {

    private final LlmService llmService;
    private final PromptCatalog prompts;
    private final TrendTool trendTool;
    private final SeoTool seoTool;
    private final AgentIdentityService identityService;

    public ResearchStep(LlmService llmService,
                        PromptCatalog prompts,
                        TrendTool trendTool,
                        SeoTool seoTool,
                        AgentIdentityService identityService) {
        this.llmService = llmService;
        this.prompts = prompts;
        this.trendTool = trendTool;
        this.seoTool = seoTool;
        this.identityService = identityService;
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
        String identityContext = identityService.buildIdentityContext(state.getCompanyProfile());
        String brief = llmService.generate(
                prompts.researcher(identityContext),
                "Company context:\n" + state.getCompanyContext()
                        + "\n\nTopic: " + state.getTopic()
                        + "\nPlan: " + state.getPlan()
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
