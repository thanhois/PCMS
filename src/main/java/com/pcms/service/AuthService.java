package com.pcms.service;

import com.pcms.dto.request.ForgotPasswordRequest;
import com.pcms.dto.request.LoginRequest;
import com.pcms.dto.request.RegisterRequest;
import com.pcms.dto.request.ResetPasswordRequest;
import com.pcms.dto.response.AuthResponse;
import com.pcms.dto.response.UserInfoResponse;

public interface AuthService {

    /**  Đăng ký tài khoản Pet Owner (tạo UserAccount + PetOwner). */
    UserInfoResponse register(RegisterRequest request);

    /**  Đăng nhập bằng username/email + password, trả JWT. */
    AuthResponse login(LoginRequest request);

    /** Quên mật khẩu - bước 1: sinh token reset và gửi link qua email. */
    void forgotPassword(ForgotPasswordRequest request);

    /** Quên mật khẩu - bước 2: đặt mật khẩu mới bằng token. */
    void resetPassword(ResetPasswordRequest request);

    /** Lấy thông tin user hiện tại theo username (từ JWT). */
    UserInfoResponse getCurrentUser(String username);
}
