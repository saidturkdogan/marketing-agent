package com.plinth.dto.response;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

public record CompanyResponse(
        String companyId,
        String name,
        String role,
        String companySize,
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
        List<Map<String, Object>> competitorsDetail,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
