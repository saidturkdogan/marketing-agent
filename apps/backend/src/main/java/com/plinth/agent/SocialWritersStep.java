package com.plinth.agent;

import com.plinth.domain.CampaignState;
import com.plinth.llm.LlmService;
import com.plinth.prompt.PromptCatalog;
import com.plinth.service.AgentIdentityService;
import com.plinth.tool.PlatformToolService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

@Component
public class SocialWritersStep implements AgentStep {

    private static final Logger log = LoggerFactory.getLogger(SocialWritersStep.class);
    private static final ExecutorService EXECUTOR = Executors.newVirtualThreadPerTaskExecutor();

    private final LlmService llmService;
    private final PromptCatalog prompts;
    private final PlatformToolService platformToolService;
    private final AgentIdentityService identityService;

    public SocialWritersStep(LlmService llmService, PromptCatalog prompts, PlatformToolService platformToolService, AgentIdentityService identityService) {
        this.llmService = llmService;
        this.prompts = prompts;
        this.platformToolService = platformToolService;
        this.identityService = identityService;
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
        List<SocialWriterTask> tasks = new ArrayList<>();
        List<String> failedPlatforms = new ArrayList<>();

        for (String platform : state.getPlatforms()) {
            tasks.add(new SocialWriterTask(state, platform));
        }

        try {
            List<Future<SocialWriterResult>> futures = EXECUTOR.invokeAll(tasks);
            for (Future<SocialWriterResult> future : futures) {
                try {
                    SocialWriterResult result = future.get();
                    state.putSocialAsset(result.platform, result.payload);
                } catch (ExecutionException ex) {
                    Throwable cause = ex.getCause();
                    log.error("Platform content generation failed: {}", cause.getMessage());
                    if (cause instanceof SocialWriterException swe) {
                        failedPlatforms.add(swe.platform);
                        state.putSocialAsset(swe.platform, Map.of(
                                "error", swe.getMessage(),
                                "variant_a", "[generation failed: " + swe.getMessage() + "]",
                                "variant_b", "[generation failed: " + swe.getMessage() + "]"
                        ));
                    }
                }
            }

            if (!failedPlatforms.isEmpty()) {
                log.warn("Social writer completed with {} platform failure(s): {}", failedPlatforms.size(), failedPlatforms);
                state.putAsset("social_writer_failures", failedPlatforms);
            }

            state.completeStep(name());
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Social writer execution interrupted", ex);
        }
    }

    private class SocialWriterTask implements java.util.concurrent.Callable<SocialWriterResult> {
        private final CampaignState state;
        private final String platform;

        SocialWriterTask(CampaignState state, String platform) {
            this.state = state;
            this.platform = platform;
        }

        @Override
        public SocialWriterResult call() {
            try {
                String identityContext = identityService.buildIdentityContext(state.getCompanyProfile());
                Map<String, Object> specs = platformToolService.specs(platform);
                String promptInput = "Company context:\n" + state.getCompanyContext()
                        + "\n\nTopic: " + state.getTopic()
                        + "\nStrategy: " + state.getAssets().get("strategy")
                        + "\nSpecs: " + specs
                        + "\n\nHard requirements:"
                        + "\n- Make the copy specific to " + state.getCompanyProfile().name() + "."
                        + "\n- Reflect the target audience, brand voice scale dimensions, value proposition, and products/services from company context."
                        + "\n- Use competitor intelligence to position our advantages."
                        + "\n- NEVER use any banned words from the brand identity."
                        + "\n- If a website URL is available, use it as the CTA/link destination."
                        + "\n- If a logo URL is available, mention it in visual or execution notes.";
                String draftA = llmService.generate(prompts.socialWriter(platform, identityContext), promptInput + "\nCreate variant A.");
                String draftB = llmService.generate(prompts.socialWriter(platform, identityContext), promptInput + "\nCreate variant B.");
                Map<String, Object> payload = new LinkedHashMap<>();
                payload.put("company_context", state.getCompanySnapshot());
                payload.put("variant_a", draftA);
                payload.put("variant_b", draftB);
                payload.put("platform_specs", specs);
                payload.put("hashtags", platformToolService.hashtags(state.getCompanyProfile().name() + " " + state.getTopic()));
                return new SocialWriterResult(platform, payload);
            } catch (Exception ex) {
                throw new SocialWriterException(platform, ex);
            }
        }
    }

    private record SocialWriterResult(String platform, Map<String, Object> payload) {}

    private static class SocialWriterException extends RuntimeException {
        final String platform;
        SocialWriterException(String platform, Throwable cause) {
            super("Platform '" + platform + "' content generation failed: " + cause.getMessage(), cause);
            this.platform = platform;
        }
    }
}
