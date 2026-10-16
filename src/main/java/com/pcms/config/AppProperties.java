package com.pcms.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * Bind các cấu hình {@code app.*} trong application.yml.
 */
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        Jwt jwt,
        Cors cors,
        Security security,
        PasswordReset passwordReset,
        Mail mail,
        Seed seed
) {
    public record Jwt(String secret, long expirationMs) {
    }

    public record Cors(List<String> allowedOrigins) {
    }

    public record Security(int maxFailedLoginAttempts) {
    }

    public record PasswordReset(int tokenExpirationMinutes, String frontendResetUrl) {
    }

    public record Mail(boolean enabled, String from) {
    }

    public record Seed(String adminUsername, String adminEmail, String adminPassword) {
    }
}
