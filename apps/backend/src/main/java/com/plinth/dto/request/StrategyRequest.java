package com.plinth.dto.request;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record StrategyRequest(
        @NotBlank String companyId,
        String websiteUrl,
        String businessType,
        String targetCountry,
        String targetLanguage,
        String productDescription,
        String averagePrice,
        String personaType,
        String goal,
        List<String> competitorUrls
) {
}
