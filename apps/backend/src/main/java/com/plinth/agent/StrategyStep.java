package com.plinth.agent;

import com.plinth.domain.AgentDecision;
import com.plinth.domain.CampaignState;
import com.plinth.llm.LlmService;
import com.plinth.prompt.PromptCatalog;
import com.plinth.rag.RagService;
import com.plinth.service.AgentIdentityService;
import com.plinth.service.KnowledgeBaseService;
import com.plinth.service.ReasoningService;
import com.plinth.service.UnifiedProfileService;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class StrategyStep implements AgentStep {

    private final LlmService llmService;
    private final PromptCatalog prompts;
    private final RagService ragService;
    private final UnifiedProfileService unifiedProfileService;
    private final KnowledgeBaseService knowledgeBaseService;
    private final AgentIdentityService identityService;
    private final ReasoningService reasoningService;

    public StrategyStep(LlmService llmService, PromptCatalog prompts, RagService ragService,
                        UnifiedProfileService unifiedProfileService,
                        KnowledgeBaseService knowledgeBaseService,
                        AgentIdentityService identityService,
                        ReasoningService reasoningService) {
        this.llmService = llmService;
        this.prompts = prompts;
        this.ragService = ragService;
        this.unifiedProfileService = unifiedProfileService;
        this.knowledgeBaseService = knowledgeBaseService;
        this.identityService = identityService;
        this.reasoningService = reasoningService;
    }

    @Override
    public String name() {
        return "Strategist";
    }

    @Override
    public int order() {
        return 30;
    }

    @Override
    public void execute(CampaignState state) {
        String retrievalQuery = state.getCompanyProfile().name() + " " + state.getTopic() + " " + state.getCompanyProfile().industry();
        List<String> ragContext = ragService.retrieveContext(retrievalQuery, 3);
        String unifiedContext = unifiedProfileService.buildUnifiedContext(state.getCompanyId());
        String knowledgeContext = knowledgeBaseService.buildKnowledgeContext(state.getCompanyId());
        String identityContext = identityService.buildIdentityContext(state.getCompanyProfile());

        AgentDecision decision = reasoningService.reasonWithAlternatives(
                prompts.strategist(identityContext),
                "Company context:\n" + state.getCompanyContext()
                        + "\n\nTopic: " + state.getTopic()
                        + "\nPlan: " + state.getPlan()
                        + "\nResearch: " + state.getAssets().get("research")
                        + "\n\nUnified customer profile:\n" + unifiedContext
                        + "\n\nBrand knowledge:\n" + (knowledgeContext.isBlank() ? "No knowledge entries yet." : knowledgeContext)
                        + "\n\nSimilar campaigns from RAG:\n" + ragContext
                        + "\n\nAt the end, output exactly three content pillars separated by ' | ' on a line starting with 'PILLARS:'",
                name(),
                state.getCampaignId()
        );

        String answer = decision.answer();
        List<String> pillars = extractPillars(answer);
        String cta = extractCta(answer);
        state.putAsset("strategy", Map.of(
                "positioning", answer,
                "reasoning", decision.reasoning(),
                "confidence", decision.confidence(),
                "content_pillars", pillars,
                "cta", cta,
                "rag_context_count", ragContext.size()
        ));
        state.completeStep(name());
    }

    private List<String> extractPillars(String text) {
        if (text == null) return List.of("Pain", "Solution", "Outcome");
        for (String line : text.lines().toList()) {
            if (line.contains("PILLARS:") || line.contains("Pillars:") || line.contains("pillars:")) {
                String raw = line.substring(line.indexOf(":") + 1).trim();
                return List.of(raw.split("\\s*\\|\\s*"));
            }
        }
        return List.of("Pain", "Solution", "Outcome");
    }

    private String extractCta(String text) {
        if (text == null) return "Book a demo";
        for (String line : text.lines().toList()) {
            if (line.contains("CTA:") || line.contains("Cta:") || line.contains("cta:")) {
                return line.substring(line.indexOf(":") + 1).trim();
            }
        }
        return "Book a demo";
    }
}
