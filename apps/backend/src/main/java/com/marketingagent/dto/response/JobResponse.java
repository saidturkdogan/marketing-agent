package com.marketingagent.dto.response;

public record JobResponse(
        String job_id,
        String campaign_id,
        String status,
        String error
) {
}
