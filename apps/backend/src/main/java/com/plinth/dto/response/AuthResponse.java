package com.plinth.dto.response;

public record AuthResponse(
        String token,
        String email,
        String name
) {}