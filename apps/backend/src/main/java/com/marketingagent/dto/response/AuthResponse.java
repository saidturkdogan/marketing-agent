package com.marketingagent.dto.response;

public record AuthResponse(
        String token,
        String email,
        String name
) {}