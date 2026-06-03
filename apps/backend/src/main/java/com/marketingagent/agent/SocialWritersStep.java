package com.marketingagent.agent;

import com.marketingagent.domain.CampaignState;
import com.marketingagent.llm.LlmService;
import com.marketingagent.prompt.PromptCatalog;
import com.marketingagent.tool.PlatformToolService;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

@Component
public class SocialWritersStep implements AgentStep {

    private static final ExecutorService EXECUTOR = Executors.newVirtualThreadPerTaskExecutor();

    private final LlmService llmService;
    private final PromptCatalog prompts;
    private final PlatformToolService platformToolService;

    public SocialWritersStep(LlmService llmService, PromptCatalog prompts, PlatformToolService platformToolService) {
        this.llmService = llmService;
        this.prompts = prompts;
        this.platformToolService = platformToolService;
    }

    @Override
    public String name() {
        return "SocialWriters";
    }

    @Override
    public int order() {
        return 40;
    }

    @Override
    public void execute(CampaignState state) {
        List<Callable<Map.Entry<String, Map<String, Object>>>> tasks = new ArrayList<>();

        for (String platform : state.getPlatforms()) {
            tasks.add(() -> {
                Map<String, Object> specs = platformToolService.specs(platform);
                String promptInput = "Company context:\n" + state.getCompanyContext()
                        + "\n\nTopic: " + state.getTopic()
                        + "\nStrategy: " + state.getAssets().get("strategy")
                        + "\nSpecs: " + specs
                        + "\n\nHard requirements:"
                        + "\n- Make the copy specific to " + state.getCompanyProfile().name() + "."
                        + "\n- Reflect the target audience, brand voice, value proposition, and products/services from company context."
                        + "\n- If a website URL is available, use it as the CTA/link destination."
                        + "\n- If a logo URL is available, mention it in visual or execution notes.";
                String draftA = llmService.generate(prompts.socialWriter(platform), promptInput + "\nCreate variant A.");
                String draftB = llmService.generate(prompts.socialWriter(platform), promptInput + "\nCreate variant B.");
                Map<String, Object> payload = new LinkedHashMap<>();
                payload.put("company_context", state.getCompanySnapshot());
                payload.put("variant_a", draftA);
                payload.put("variant_b", draftB);
                payload.put("platform_specs", specs);
                payload.put("hashtags", platformToolService.hashtags(state.getCompanyProfile().name() + " " + state.getTopic()));
                return Map.entry(platform, payload);
            });
        }

        try {
            List<Future<Map.Entry<String, Map<String, Object>>>> futures = EXECUTOR.invokeAll(tasks);
            for (Future<Map.Entry<String, Map<String, Object>>> future : futures) {
                Map.Entry<String, Map<String, Object>> item = future.get();
                state.putSocialAsset(item.getKey(), item.getValue());
            }
            state.completeStep(name());
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Social writer execution interrupted", ex);
        } catch (ExecutionException ex) {
            throw new IllegalStateException("Social writer execution failed", ex.getCause());
        }
    }
}
