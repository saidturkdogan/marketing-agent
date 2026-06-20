package com.plinth.agent;

import com.plinth.domain.AgentDecision;
import com.plinth.domain.CampaignState;
import com.plinth.llm.LlmService;
import com.plinth.prompt.PromptCatalog;
import com.plinth.service.AgentIdentityService;
import com.plinth.service.ExternalDataService;
import com.plinth.service.KnowledgeBaseService;
import com.plinth.service.ReasoningService;
import com.plinth.service.UnifiedProfileService;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class ResearchStep implements AgentStep {

    private final LlmService llmService;
    private final PromptCatalog prompts;
    private final ExternalDataService externalDataService;
    private final UnifiedProfileService unifiedProfileService;
    private final KnowledgeBaseService knowledgeBaseService;
    private final AgentIdentityService identityService;
    private final ReasoningService reasoningService;

    public ResearchStep(LlmService llmService,
                        PromptCatalog prompts,
                        ExternalDataService externalDataService,
                        UnifiedProfileService unifiedProfileService,
                        KnowledgeBaseService knowledgeBaseService,
                        AgentIdentityService identityService,
                        ReasoningService reasoningService) {
        this.llmService = llmService;
        this.prompts = prompts;
        this.externalDataService = externalDataService;
        this.unifiedProfileService = unifiedProfileService;
        this.knowledgeBaseService = knowledgeBaseService;
        this.identityService = identityService;
        this.reasoningService = reasoningService;
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
        Map<String, Object> externalData = externalDataService.enrichWithExternalData(
                state.getTopic(), state.getCompanyId());
        String unifiedContext = unifiedProfileService.buildUnifiedContext(state.getCompanyId());
        String knowledgeContext = knowledgeBaseService.buildKnowledgeContext(state.getCompanyId());
        String identityContext = identityService.buildIdentityContext(state.getCompanyProfile());

        AgentDecision decision = reasoningService.reason(
                prompts.researcher(identityContext),
                "Company context:\n" + state.getCompanyContext()
                        + "\n\nTopic: " + state.getTopic()
                        + "\nPlan: " + state.getPlan()
                        + "\n\nExternal data:\n" + externalData
                        + "\n\nUnified customer profile:\n" + unifiedContext
                        + "\n\nBrand knowledge:\n" + (knowledgeContext.isBlank() ? "No knowledge entries yet." : knowledgeContext),
                name(),
                state.getCampaignId()
        );

        state.putAsset("research", Map.of(
                "brief", decision.answer(),
                "reasoning", decision.reasoning(),
                "confidence", decision.confidence(),
                "external_data", externalData,
                "unified_profile", unifiedContext,
                "knowledge_context", knowledgeContext
        ));
        state.completeStep(name());
    }
}
