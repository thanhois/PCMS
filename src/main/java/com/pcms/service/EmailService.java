package com.pcms.service;

public interface EmailService {

    /** Gửi email chứa mã token và link đặt lại mật khẩu. */
    void sendPasswordResetEmail(String to, String fullName, String token, String resetLink, int expiresInMinutes);
}
