package com.pcms.dto.request;

import jakarta.validation.constraints.NotBlank;

/**
 * Payload đăng nhập (UC02). {@code login} có thể là Username hoặc Email.
 */
public record LoginRequest(

        @NotBlank(message = "Username or email is required")
        String login,

        @NotBlank(message = "Password is required")
        String password
) {
}
