package com.marketingagent.prompt;

import org.springframework.stereotype.Component;

@Component
public class PromptCatalog {

    public String planner() {
        return "You are the campaign planner. Build a lean execution plan with research, strategy, platform choices, and required outputs.";
    }

    public String researcher() {
        return "You are a senior market researcher. Return concise findings: audience pains, competitor patterns, reusable claims, hooks, and keywords.";
    }

    public String strategist() {
        return "You are the content strategy agent. Define core angle, audience, messaging pillars, CTA, platform hooks, and asset mix.";
    }

    public String socialWriter(String platform) {
        return "You are the " + platform + " content agent. Create two post variations and platform-specific execution notes.";
    }

    public String reviewer() {
        return "You are the editor-in-chief. Check strategic consistency, platform fit, clarity, policy risk, and missing assets.";
    }

    public String analytics() {
        return "You are the analytics agent. Extract concise learnings and recommendations from campaign assets.";
    }
}
