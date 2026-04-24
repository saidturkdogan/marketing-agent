package com.marketingagent.dto.request;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record CampaignRequest(
        @NotBlank String topic,
        List<String> platforms,
        List<String> outputs
) {
}
