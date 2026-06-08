package com.plinth.dto.request;

import jakarta.validation.constraints.NotBlank;

public record ClerkUserSyncRequest(
        @NotBlank String clerkUserId,
        @NotBlank String email,
        String name
) {}
