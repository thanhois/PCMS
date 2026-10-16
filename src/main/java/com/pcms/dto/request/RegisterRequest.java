package com.pcms.dto.request;

import com.pcms.dto.validation.PasswordConfirmable;
import com.pcms.dto.validation.PasswordMatches;
import com.pcms.dto.validation.ValidationPatterns;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Payload đăng ký tài khoản Pet Owner (UC01).
 */
@PasswordMatches
public record RegisterRequest(

        @NotBlank(message = "Full name is required")
        @Size(max = 150, message = "Full name must not exceed 150 characters")
        String fullName,

        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        @Size(max = 150, message = "Email must not exceed 150 characters")
        String email,

        @NotBlank(message = "Phone number is required")
        @Pattern(regexp = ValidationPatterns.VN_PHONE, message = ValidationPatterns.VN_PHONE_MESSAGE)
        String phoneNumber,

        @Size(max = 255, message = "Address must not exceed 255 characters")
        String address,

        @NotBlank(message = "Password is required")
        @Pattern(regexp = ValidationPatterns.STRONG_PASSWORD, message = ValidationPatterns.STRONG_PASSWORD_MESSAGE)
        String password,

        @NotBlank(message = "Confirm password is required")
        String confirmPassword

) implements PasswordConfirmable {
}
