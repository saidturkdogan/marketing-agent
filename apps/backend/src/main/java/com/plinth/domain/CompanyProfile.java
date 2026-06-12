package com.plinth.domain;

import java.util.List;
import java.util.Map;
import java.util.StringJoiner;

public record CompanyProfile(
        String companyId,
        String name,
        String websiteUrl,
        String logoUrl,
        String industry,
        String description,
        String targetAudience,
        String brandVoice,
        String valueProposition,
        List<String> productsOrServices,
        List<String> competitors,
        Map<String, Object> socialLinks,
        String productName,
        String coreValueProp,
        List<String> bannedWords,
        Map<String, Object> brandVoiceScale,
        List<Map<String, Object>> competitorsDetail
) {
    public Map<String, Object> toMap() {
        return Map.ofEntries(
                Map.entry("company_id", safe(companyId)),
                Map.entry("name", safe(name)),
                Map.entry("website_url", safe(websiteUrl)),
                Map.entry("logo_url", safe(logoUrl)),
                Map.entry("industry", safe(industry)),
                Map.entry("description", safe(description)),
                Map.entry("target_audience", safe(targetAudience)),
                Map.entry("brand_voice", safe(brandVoice)),
                Map.entry("value_proposition", safe(valueProposition)),
                Map.entry("products_or_services", productsOrServices == null ? List.of() : productsOrServices),
                Map.entry("competitors", competitors == null ? List.of() : competitors),
                Map.entry("social_links", socialLinks == null ? Map.of() : socialLinks),
                Map.entry("product_name", safe(productName)),
                Map.entry("core_value_prop", safe(coreValueProp)),
                Map.entry("banned_words", bannedWords == null ? List.of() : bannedWords),
                Map.entry("brand_voice_scale", brandVoiceScale == null ? Map.of() : brandVoiceScale),
                Map.entry("competitors_detail", competitorsDetail == null ? List.of() : competitorsDetail)
        );
    }

    public String toPromptContext() {
        StringJoiner joiner = new StringJoiner("\n");
        joiner.add("Company: " + safe(name));
        addIfPresent(joiner, "Product Name", productName);
        addIfPresent(joiner, "Core Value Proposition", coreValueProp);
        addIfPresent(joiner, "Website", websiteUrl);
        addIfPresent(joiner, "Logo URL", logoUrl);
        addIfPresent(joiner, "Industry", industry);
        addIfPresent(joiner, "Description", description);
        addIfPresent(joiner, "Target audience", targetAudience);
        addIfPresent(joiner, "Brand voice", brandVoice);
        addIfPresent(joiner, "Value proposition", valueProposition);
        if (brandVoiceScale != null && !brandVoiceScale.isEmpty()) {
            joiner.add("Brand Voice Scale (1-10): " + formatVoiceScale());
        }
        if (bannedWords != null && !bannedWords.isEmpty()) {
            joiner.add("BANNED WORDS (NEVER use these): " + bannedWords);
        }
        if (productsOrServices != null && !productsOrServices.isEmpty()) {
            joiner.add("Products or services: " + productsOrServices);
        }
        if (competitors != null && !competitors.isEmpty()) {
            joiner.add("Competitors: " + competitors);
        }
        if (competitorsDetail != null && !competitorsDetail.isEmpty()) {
            joiner.add("Competitor Intelligence: " + formatCompetitorIntel());
        }
        if (socialLinks != null && !socialLinks.isEmpty()) {
            joiner.add("Social links: " + socialLinks);
        }
        return joiner.toString();
    }

    private String formatVoiceScale() {
        StringJoiner sj = new StringJoiner(", ");
        brandVoiceScale.forEach((k, v) -> sj.add(k + "=" + v + "/10"));
        return sj.toString();
    }

    private String formatCompetitorIntel() {
        StringJoiner sj = new StringJoiner(" | ");
        for (Map<String, Object> comp : competitorsDetail) {
            String name = String.valueOf(comp.getOrDefault("name", "?"));
            String weakness = String.valueOf(comp.getOrDefault("weakness", "?"));
            String advantage = String.valueOf(comp.getOrDefault("our_advantage", "?"));
            sj.add(name + " [weakness: " + weakness + ", our advantage: " + advantage + "]");
        }
        return sj.toString();
    }

    private static void addIfPresent(StringJoiner joiner, String label, String value) {
        if (value != null && !value.isBlank()) {
            joiner.add(label + ": " + value);
        }
    }

    private static String safe(String value) {
        return value == null ? "" : value;
    }
}
