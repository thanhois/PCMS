package com.pcms.service;

public interface EmailService {

    /** Gửi email chứa link đặt lại mật khẩu. */
    void sendPasswordResetEmail(String to, String fullName, String resetLink, int expiresInMinutes);
}
