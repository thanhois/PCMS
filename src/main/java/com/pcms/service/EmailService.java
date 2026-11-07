package com.pcms.service;

public interface EmailService {

    /** Gửi email chứa link đặt lại mật khẩu. */
    void sendPasswordResetEmail(String to, String fullName, String rawToken, String resetLink, int expiresInMinutes);

    /** Gửi email xác nhận đặt lịch hẹn thành công (UC-06 / 4.1.6). */
    void sendBookingConfirmationEmail(String to, String ownerName, String petName, String appointmentTimeDisplay, String serviceName, String vetName);

    /** Gửi email thông báo tài khoản nhân viên mới tạo kèm mật khẩu tạm (UC37). */
    void sendStaffWelcomeEmail(String to, String fullName, String username, String tempPassword, String roleName);

    /** Gửi email thông báo mật khẩu tạm thời mới khi Admin reset (UC38). */
    void sendTemporaryPasswordEmail(String to, String fullName, String username, String tempPassword);

    /** Gửi email cảnh báo tồn kho thấp & thuốc cận hạn cho Admin/Thủ kho (FE-08). */
    void sendInventoryAlertEmail(String to, String recipientName, String alertSummary);

    /** Gửi email nhắc lịch tái khám/tiêm nhắc cho Chủ nuôi (FE-10). */
    void sendFollowUpReminderEmail(String to, String ownerName, String petName, String followUpDateDisplay, String reason);
}
