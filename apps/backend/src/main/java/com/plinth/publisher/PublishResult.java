package com.plinth.publisher;

public record PublishResult(
        String platform,
        String status,
        String externalId,
        String url,
        String message
) {
}
