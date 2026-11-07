package com.pcms.service;

import com.pcms.dto.request.ChangePasswordRequest;
import com.pcms.dto.request.ForgotPasswordRequest;
import com.pcms.dto.request.LoginRequest;
import com.pcms.dto.request.RegisterRequest;
import com.pcms.dto.request.ResetPasswordRequest;
import com.pcms.dto.request.UpdateProfileRequest;
import com.pcms.dto.response.AuthResponse;
import com.pcms.dto.response.UserInfoResponse;

public interface AuthService {

    /** UC01 - Đăng ký tài khoản Pet Owner (tạo UserAccount + PetOwner). */
    UserInfoResponse register(RegisterRequest request);

    /** UC02 - Đăng nhập bằng username/email + password, trả JWT. */
    AuthResponse login(LoginRequest request);

    /** UC03 - Quên mật khẩu - bước 1: sinh token reset và gửi link qua email. */
    void forgotPassword(ForgotPasswordRequest request);

    /** UC03 - Quên mật khẩu - bước 2: đặt mật khẩu mới bằng token. */
    void resetPassword(ResetPasswordRequest request);

    /** UC04 - Đổi mật khẩu khi đang đăng nhập. */
    void changePassword(String username, ChangePasswordRequest request);

    /** UC05 - Cập nhật hồ sơ cá nhân của người dùng hiện tại. */
    UserInfoResponse updateProfile(String username, UpdateProfileRequest request);

    /** Lấy thông tin user hiện tại theo username (từ JWT). */
    UserInfoResponse getCurrentUser(String username);
}
