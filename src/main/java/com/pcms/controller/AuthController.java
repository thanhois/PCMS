package com.pcms.controller;

import com.pcms.config.security.UserPrincipal;
import com.pcms.dto.request.ChangePasswordRequest;
import com.pcms.dto.request.ForgotPasswordRequest;
import com.pcms.dto.request.LoginRequest;
import com.pcms.dto.request.RegisterRequest;
import com.pcms.dto.request.ResetPasswordRequest;
import com.pcms.dto.request.UpdateProfileRequest;
import com.pcms.dto.response.ApiResponse;
import com.pcms.dto.response.AuthResponse;
import com.pcms.dto.response.UserInfoResponse;
import com.pcms.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /** UC01 - Đăng ký tài khoản Pet Owner. */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserInfoResponse>> register(@Valid @RequestBody RegisterRequest request) {
        UserInfoResponse user = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Registration successful", user));
    }

    /** UC02 - Đăng nhập. */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Login successful", authService.login(request)));
    }

    /** UC03 - Quên mật khẩu - gửi link reset qua email. */
    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ResponseEntity.ok(ApiResponse.success(
                "If an account with that email exists, a password reset link has been sent"));
    }

    /** UC03 - Đặt lại mật khẩu bằng token trong link email. */
    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.success("Password has been reset successfully"));
    }

    /** UC04 - Đổi mật khẩu cá nhân (yêu cầu Bearer token). */
    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        authService.changePassword(principal.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.success("Đổi mật khẩu thành công"));
    }

    /** UC05 - Cập nhật thông tin cá nhân (yêu cầu Bearer token). */
    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<UserInfoResponse>> updateProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Cập nhật thông tin cá nhân thành công",
                authService.updateProfile(principal.getUsername(), request)
        ));
    }

    /** Thông tin user hiện tại (yêu cầu Bearer token). */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserInfoResponse>> me(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("OK", authService.getCurrentUser(principal.getUsername())));
    }
}
