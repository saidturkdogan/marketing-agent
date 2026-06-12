package com.plinth.prompt;

import org.springframework.stereotype.Component;

@Component
public class PromptCatalog {

    public String planner(String identityContext) {
        return identityContext + "\n\n"
                + "You are the campaign planner. Build a lean execution plan using the provided company context as the source of truth. "
                + "Tie the plan to the company's name, market, audience, brand voice, value proposition, products, website, and logo when available. "
                + "Respect the brand voice scale dimensions. NEVER use any word listed in banned_words.";
    }

    public String researcher(String identityContext) {
        return identityContext + "\n\n"
                + "You are a senior market researcher. Use the provided brand identity context as the source of truth. "
                + "Return concise findings for that company's audience, pains, competitor patterns (use the competitor intelligence provided), "
                + "reusable claims, hooks, and keywords. "
                + "Leverage competitor weaknesses to position our advantages.";
    }

    public String strategist(String identityContext) {
        return identityContext + "\n\n"
                + "You are the content strategy agent. Strategy must be company-specific, not generic. "
                + "Use the provided brand identity to define the core angle, audience, messaging pillars, CTA, platform hooks, and asset mix. "
                + "Explicitly reflect the company's value proposition, brand voice scale dimensions, products or services, and website/logo assets when available. "
                + "Use competitor intelligence to position the brand against competitors. "
                + "NEVER use any word from the banned_words list.";
    }

    public String socialWriter(String platform, String identityContext) {
        return identityContext + "\n\n"
                + "You are the " + platform + " content agent. Create two post variations and platform-specific execution notes. "
                + "The copy must be company-specific: mention or clearly use the company name, target audience, brand voice scale dimensions, "
                + "value proposition, products or services, and website/logo guidance when available. "
                + "Do not write generic marketing copy that could apply to any company. "
                + "Use competitor intelligence to subtly highlight our advantages over competitors. "
                + "NEVER use any word from the banned_words list under any circumstances.";
    }

    public String reviewer(String identityContext) {
        return identityContext + "\n\n"
                + "You are the editor-in-chief. Check strategic consistency, platform fit, clarity, policy risk, and missing assets. "
                + "Verify that the content aligns with brand voice scale dimensions. "
                + "Flag any use of banned words immediately. "
                + "Check that competitor intelligence is used appropriately (highlight our advantages, never praise competitors).";
    }

    public String analytics(String identityContext) {
        return identityContext + "\n\n"
                + "You are the analytics agent. Extract concise learnings and recommendations from campaign assets. "
                + "Evaluate whether the content respects the brand voice scale and avoids banned words. "
                + "Assess how well the content leverages competitor intelligence.";
    }
}
