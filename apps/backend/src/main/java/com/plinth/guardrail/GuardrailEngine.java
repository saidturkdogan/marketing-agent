package com.plinth.guardrail;

import com.plinth.domain.CampaignState;
import com.plinth.persistence.entity.KnowledgeEntryEntity;
import com.plinth.persistence.repository.KnowledgeEntryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@Service
public class GuardrailEngine {

    private static final Logger log = LoggerFactory.getLogger(GuardrailEngine.class);

    private static final List<String> SPAM_WORDS = List.of("buy now", "click here", "miracle", "guaranteed", "100%", "act now");
    private static final List<String> TOXIC_PATTERNS = List.of("hate", "discriminat", "violent", "illegal");
    private static final Pattern EMAIL_PATTERN = Pattern.compile("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}");
    private static final Pattern PHONE_PATTERN = Pattern.compile("\\b\\d{3}[-.]?\\d{3}[-.]?\\d{4}\\b");
    private static final int MAX_CONTENT_LENGTH = 5000;
    private static final int MIN_CONTENT_LENGTH = 10;

    private final KnowledgeEntryRepository knowledgeEntryRepository;

    public GuardrailEngine(KnowledgeEntryRepository knowledgeEntryRepository) {
        this.knowledgeEntryRepository = knowledgeEntryRepository;
    }

    public GuardrailReport checkCampaign(CampaignState state) {
        String campaignId = state.getCampaignId();
        List<GuardrailCheck> checks = new ArrayList<>();
        String allContent = flattenContent(state);

        checks.add(checkSpam(allContent));
        checks.add(checkBrandSafety(allContent));
        checks.add(checkPiiExposure(allContent));
        checks.add(checkContentLength(allContent));
        checks.add(checkPlatformCompliance(state));
        checks.add(checkBannedWords(allContent, state));
        checks.add(checkCompanyConsistency(state));

        GuardrailReport report = GuardrailReport.build(campaignId, checks);
        log.info("Guardrail check for {}: {}", campaignId, report.summary());
        return report;
    }

    public GuardrailReport checkContent(String contentId, String content, String companyId) {
        List<GuardrailCheck> checks = new ArrayList<>();
        checks.add(checkSpam(content));
        checks.add(checkBrandSafety(content));
        checks.add(checkPiiExposure(content));
        checks.add(checkContentLength(content));

        if (companyId != null) {
            List<KnowledgeEntryEntity> guidelines = knowledgeEntryRepository
                    .findByCompanyIdAndEntryType(companyId, "brand_guideline");
            for (KnowledgeEntryEntity g : guidelines) {
                checks.add(checkAgainstGuideline(content, g));
            }
        }

        GuardrailReport report = GuardrailReport.build(contentId, checks);
        log.info("Guardrail check for content {}: {}", contentId, report.summary());
        return report;
    }

    private GuardrailCheck checkSpam(String text) {
        String normalized = text.toLowerCase();
        for (String word : SPAM_WORDS) {
            if (normalized.contains(word)) {
                return GuardrailCheck.fail("spam_check", "SPAM",
                        "Contains spam keyword: '" + word + "'",
                        "Remove or rephrase: " + word);
            }
        }
        return GuardrailCheck.pass("spam_check", "SPAM");
    }

    private GuardrailCheck checkBrandSafety(String text) {
        String normalized = text.toLowerCase();
        for (String pattern : TOXIC_PATTERNS) {
            if (normalized.contains(pattern)) {
                return GuardrailCheck.fail("brand_safety", "BRAND_SAFETY",
                        "Content may contain inappropriate language: '" + pattern + "'",
                        "Review and rephrase the flagged section");
            }
        }
        return GuardrailCheck.pass("brand_safety", "BRAND_SAFETY");
    }

    private GuardrailCheck checkPiiExposure(String text) {
        if (EMAIL_PATTERN.matcher(text).find()) {
            return GuardrailCheck.fail("pii_check", "GDPR",
                    "Content may contain email addresses",
                    "Remove personal email addresses from content");
        }
        if (PHONE_PATTERN.matcher(text).find()) {
            return GuardrailCheck.warn("pii_check", "GDPR",
                    "Content may contain phone numbers",
                    "Verify phone numbers are company info, not personal PII");
        }
        return GuardrailCheck.pass("pii_check", "GDPR");
    }

    private GuardrailCheck checkContentLength(String text) {
        if (text.length() > MAX_CONTENT_LENGTH) {
            return GuardrailCheck.warn("content_length", "CONTENT_QUALITY",
                    "Content exceeds " + MAX_CONTENT_LENGTH + " characters (" + text.length() + ")",
                    "Consider trimming to under " + MAX_CONTENT_LENGTH + " chars");
        }
        if (text.length() < MIN_CONTENT_LENGTH) {
            return GuardrailCheck.fail("content_length", "CONTENT_QUALITY",
                    "Content is too short (" + text.length() + " chars, minimum " + MIN_CONTENT_LENGTH + ")",
                    "Expand the content to be more substantial");
        }
        return GuardrailCheck.pass("content_length", "CONTENT_QUALITY");
    }

    @SuppressWarnings("unchecked")
    private GuardrailCheck checkPlatformCompliance(CampaignState state) {
        for (String platform : state.getPlatforms()) {
            Map<String, Object> social = (Map<String, Object>) state.getAssets().get("social");
            if (social == null) continue;
            Map<String, Object> platformAsset = (Map<String, Object>) social.get(platform);
            if (platformAsset == null) continue;

            String content = String.valueOf(platformAsset.getOrDefault("variant_a", ""));
            String platformKey = platform.toLowerCase();

            if ("twitter".equals(platformKey) || "x".equals(platformKey)) {
                if (content.length() > 280) {
                    return GuardrailCheck.fail("platform_twitter", "PLATFORM_RULES",
                            "Twitter content exceeds 280 characters (" + content.length() + ")",
                            "Trim to 280 characters or use a thread");
                }
            }
            if ("linkedin".equals(platformKey) && content.length() > 3000) {
                return GuardrailCheck.warn("platform_linkedin", "PLATFORM_RULES",
                        "LinkedIn content exceeds 3000 characters (" + content.length() + ")",
                        "Consider shortening or using a document post");
            }
        }
        return GuardrailCheck.pass("platform_compliance", "PLATFORM_RULES");
    }

    private GuardrailCheck checkBannedWords(String text, CampaignState state) {
        var profile = state.getCompanyProfile();
        if (profile.bannedWords() == null || profile.bannedWords().isEmpty()) {
            return GuardrailCheck.pass("banned_words", "BRAND_SAFETY");
        }
        String normalized = text.toLowerCase();
        for (String banned : profile.bannedWords()) {
            if (normalized.contains(banned.toLowerCase())) {
                return GuardrailCheck.fail("banned_words", "BRAND_SAFETY",
                        "Content contains banned word: '" + banned + "'",
                        "Remove '" + banned + "' from all content");
            }
        }
        return GuardrailCheck.pass("banned_words", "BRAND_SAFETY");
    }

    @SuppressWarnings("unchecked")
    private GuardrailCheck checkCompanyConsistency(CampaignState state) {
        var profile = state.getCompanyProfile();
        String companyName = profile.name();
        if (companyName == null || companyName.isBlank()) {
            return GuardrailCheck.pass("company_consistency", "CONTENT_QUALITY");
        }

        Map<String, Object> social = (Map<String, Object>) state.getAssets().get("social");
        if (social == null) return GuardrailCheck.pass("company_consistency", "CONTENT_QUALITY");

        for (String platform : state.getPlatforms()) {
            Map<String, Object> pa = (Map<String, Object>) social.get(platform);
            if (pa == null) continue;
            String variantA = String.valueOf(pa.getOrDefault("variant_a", ""));
            String variantB = String.valueOf(pa.getOrDefault("variant_b", ""));
            String combined = variantA + " " + variantB;

            if (!combined.toLowerCase().contains(companyName.toLowerCase())) {
                return GuardrailCheck.warn("company_consistency", "CONTENT_QUALITY",
                        "Platform '" + platform + "' content doesn't mention company name: '" + companyName + "'",
                        "Add company name to at least one variant");
            }
        }
        return GuardrailCheck.pass("company_consistency", "CONTENT_QUALITY");
    }

    private GuardrailCheck checkAgainstGuideline(String content, KnowledgeEntryEntity guideline) {
        String guidelineText = guideline.getContent().toLowerCase();
        String contentLower = content.toLowerCase();

        if (guidelineText.contains("tone") && contentLower.length() > 50) {
            if (guidelineText.contains("professional") && !contentLower.contains("professional")) {
                return GuardrailCheck.warn("brand_guideline_tone", "BRAND_SAFETY",
                        "Brand guideline requires professional tone, but content may not reflect this",
                        "Review tone to align with brand guidelines: " + guideline.getTitle());
            }
        }
        return GuardrailCheck.pass("brand_guideline_" + guideline.getEntryType(), "BRAND_SAFETY");
    }

    private String flattenContent(CampaignState state) {
        StringBuilder sb = new StringBuilder();
        sb.append(state.getTopic()).append(" ");
        sb.append(state.getPlan()).append(" ");
        sb.append(state.getAssets());
        return sb.toString();
    }
}
