package com.pcms.dto.request;

import com.pcms.dto.validation.PasswordConfirmable;
import com.pcms.dto.validation.PasswordMatches;
import com.pcms.dto.validation.ValidationPatterns;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Bước 2 của luồng quên mật khẩu: đặt mật khẩu mới bằng token nhận qua email.
 */
@PasswordMatches
public record ResetPasswordRequest(

        @NotBlank(message = "Reset token is required")
        String token,

        @NotBlank(message = "Password is required")
        @Pattern(regexp = ValidationPatterns.STRONG_PASSWORD, message = ValidationPatterns.STRONG_PASSWORD_MESSAGE)
        String password,

        @NotBlank(message = "Confirm password is required")
        String confirmPassword

) implements PasswordConfirmable {
}
