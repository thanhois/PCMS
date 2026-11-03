package com.pcms.service.impl;

import com.pcms.config.AppProperties;
import com.pcms.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Gửi email qua SMTP. Khi {@code app.mail.enabled=false} (mặc định ở dev), nội dung email
 * chỉ được ghi ra log để có thể test các luồng thông báo & bảo mật.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailServiceImpl implements EmailService {

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final AppProperties appProperties;

    @Override
    public void sendPasswordResetEmail(String to, String fullName, String resetLink, int expiresInMinutes) {
        String subject = "[PCMS] Reset your password";
        String body = """
                Hello %s,

                We received a request to reset the password for your Pet Clinic account.
                Click the link below to set a new password (valid for %d minutes):

                %s

                If you did not request this, please ignore this email.

                Pet Clinic Management System
                """.formatted(fullName, expiresInMinutes, resetLink);

        sendMail(to, subject, body, "Password reset");
    }

    @Override
    public void sendBookingConfirmationEmail(String to, String ownerName, String petName, String appointmentTimeDisplay, String serviceName, String vetName) {
        String subject = "[Veterian PCMS] Xác nhận đặt lịch khám thành công";
        String body = """
                Kính gửi %s,

                Phòng khám Thú y Veterian trân trọng thông báo lịch hẹn khám cho bé %s đã được xác nhận thành công:
                - Thời gian hẹn: %s
                - Dịch vụ dự kiến: %s
                - Bác sĩ phụ trách: %s

                Quý khách vui lòng đến trước 10 phút để Lễ tân hỗ trợ tiếp đón và đo thể trọng ban đầu cho bé.
                Hotline hỗ trợ: 028 1234 5678.

                Trân trọng,
                Hệ thống Quản lý Phòng khám Thú y Veterian PCMS.
                """.formatted(
                ownerName != null ? ownerName : "Quý khách",
                petName != null ? petName : "thú cưng",
                appointmentTimeDisplay != null ? appointmentTimeDisplay : "Theo thông báo",
                serviceName != null ? serviceName : "Khám lâm sàng",
                vetName != null ? vetName : "Bác sĩ phụ trách trực ca"
        );

        sendMail(to, subject, body, "Booking confirmation");
    }

    private void sendMail(String to, String subject, String body, String type) {
        if (to == null || to.isBlank()) return;

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (!appProperties.mail().enabled() || mailSender == null) {
            log.info("[MAIL SIMULATION / DISABLED] {} email to {} ->\n{}", type, to, body);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(appProperties.mail().from());
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            log.info("{} email sent successfully to {}", type, to);
        } catch (Exception ex) {
            // Không ném lỗi ra ngoài để đảm bảo thất bại khi gửi mail KHÔNG làm rollback giao dịch
            log.warn("Failed to send {} email to {}: {}", type, to, ex.getMessage());
        }
    }
}
