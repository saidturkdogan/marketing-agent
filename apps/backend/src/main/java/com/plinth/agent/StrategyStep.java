package com.plinth.agent;

import com.plinth.domain.CampaignState;
import com.plinth.llm.LlmService;
import com.plinth.prompt.PromptCatalog;
import com.plinth.rag.RagService;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class StrategyStep implements AgentStep {

    private final LlmService llmService;
    private final PromptCatalog prompts;
    private final RagService ragService;

    public StrategyStep(LlmService llmService, PromptCatalog prompts, RagService ragService) {
        this.llmService = llmService;
        this.prompts = prompts;
        this.ragService = ragService;
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
        List<String> context = ragService.retrieveContext(retrievalQuery, 3);
        String strategy = llmService.generate(
                prompts.strategist(),
                "Company context:\n" + state.getCompanyContext()
                        + "\n\nTopic: " + state.getTopic()
                        + "\nPlan: " + state.getPlan()
                        + "\nResearch: " + state.getAssets().get("research")
                        + "\nSimilar campaigns: " + context
                        + "\n\nAt the end, output exactly three content pillars separated by ' | ' on a line starting with 'PILLARS:'"
        );
        List<String> pillars = extractPillars(strategy);
        String cta = extractCta(strategy);
        state.putAsset("strategy", Map.of(
                "positioning", strategy,
                "content_pillars", pillars,
                "cta", cta,
                "rag_context_count", context.size()
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
