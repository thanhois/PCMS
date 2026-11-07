package com.pcms.dto.request;

import com.pcms.dto.validation.PasswordConfirmable;
import com.pcms.dto.validation.PasswordMatches;
import com.pcms.dto.validation.ValidationPatterns;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * UC04 - Đổi mật khẩu cho người dùng đang đăng nhập.
 */
@PasswordMatches
public record ChangePasswordRequest(

        @NotBlank(message = "Mật khẩu hiện tại không được để trống")
        String oldPassword,

        @NotBlank(message = "Mật khẩu mới không được để trống")
        @Pattern(regexp = ValidationPatterns.STRONG_PASSWORD, message = ValidationPatterns.STRONG_PASSWORD_MESSAGE)
        String password,

        @NotBlank(message = "Xác nhận mật khẩu mới không được để trống")
        String confirmPassword

) implements PasswordConfirmable {
}
