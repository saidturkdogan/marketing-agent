package com.plinth.security;

import com.plinth.persistence.entity.UserEntity;
import com.plinth.persistence.repository.UserRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
public class ClerkJwtFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(ClerkJwtFilter.class);

    private final ClerkJwtVerifier verifier;
    private final UserRepository userRepository;

    public ClerkJwtFilter(ClerkJwtVerifier verifier, UserRepository userRepository) {
        this.verifier = verifier;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        var header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            var token = header.substring(7);
            try {
                var claims = verifier.verifyAndParse(token);
                var clerkUserId = claims.getSubject();
                var email = claims.get("email", String.class);

                if (email == null) {
                    var emailClaim = claims.get("emailAddress", String.class);
                    var nested = claims.get("email", java.util.Map.class);
                    email = emailClaim != null ? emailClaim
                            : (nested != null ? (String) nested.get("emailAddress") : clerkUserId + "@clerk.user");
                }

                var finalEmail = email;
                var user = userRepository.findByEmail(email).orElseGet(() -> {
                    var newUser = new UserEntity();
                    newUser.setEmail(finalEmail);
                    newUser.setPasswordHash("CLERK_" + clerkUserId);
                    newUser.setName(finalEmail);
                    return userRepository.save(newUser);
                });

                SecurityContextHolder.getContext().setAuthentication(
                        new UsernamePasswordAuthenticationToken(
                                new AppUserDetails(user), null, Collections.emptyList()));
                log.debug("Clerk JWT verified for user: {}", clerkUserId);
            } catch (Exception ex) {
                log.warn("Clerk JWT verification failed for {} {} - type: {}, message: {}",
                        request.getMethod(), request.getRequestURI(),
                        ex.getClass().getSimpleName(), ex.getMessage());
            }
        } else if (header == null) {
            log.debug("No Authorization header on {} {}", request.getMethod(), request.getRequestURI());
        } else {
            log.debug("Non-Bearer Authorization header on {} {}", request.getMethod(), request.getRequestURI());
        }

        chain.doFilter(request, response);
    }
}
