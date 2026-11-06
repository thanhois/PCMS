package com.pcms.service;

public interface EmailService {

    /** Gửi email chứa link đặt lại mật khẩu. */
    void sendPasswordResetEmail(String to, String fullName, String rawToken, String resetLink, int expiresInMinutes);

    /** Gửi email xác nhận đặt lịch hẹn thành công (UC-06 / 4.1.6). */
    void sendBookingConfirmationEmail(String to, String ownerName, String petName, String appointmentTimeDisplay, String serviceName, String vetName);
}
