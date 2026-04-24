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
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

@Component
public class SocialWritersStep implements AgentStep {

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
        ExecutorService executor = Executors.newFixedThreadPool(Math.max(1, state.getPlatforms().size()));
        List<Callable<Map.Entry<String, Map<String, Object>>>> tasks = new ArrayList<>();

        for (String platform : state.getPlatforms()) {
            tasks.add(() -> {
                Map<String, Object> specs = platformToolService.specs(platform);
                String promptInput = "Topic: " + state.getTopic() + "\nStrategy: " + state.getAssets().get("strategy") + "\nSpecs: " + specs;
                String draftA = llmService.generate(prompts.socialWriter(platform), promptInput + "\nCreate variant A.");
                String draftB = llmService.generate(prompts.socialWriter(platform), promptInput + "\nCreate variant B.");
                Map<String, Object> payload = new LinkedHashMap<>();
                payload.put("variant_a", draftA);
                payload.put("variant_b", draftB);
                payload.put("platform_specs", specs);
                payload.put("hashtags", platformToolService.hashtags(state.getTopic()));
                return Map.entry(platform, payload);
            });
        }

        try {
            List<Future<Map.Entry<String, Map<String, Object>>>> futures = executor.invokeAll(tasks);
            for (Future<Map.Entry<String, Map<String, Object>>> future : futures) {
                Map.Entry<String, Map<String, Object>> item = future.get();
                state.putSocialAsset(item.getKey(), item.getValue());
            }
            state.completeStep(name());
        } catch (Exception ex) {
            throw new IllegalStateException("Social writer execution failed", ex);
        } finally {
            executor.shutdown();
        }
    }
}
