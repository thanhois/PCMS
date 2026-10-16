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
 * chỉ được ghi ra log để có thể test luồng quên mật khẩu mà không cần SMTP.
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

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (!appProperties.mail().enabled() || mailSender == null) {
            log.info("[MAIL DISABLED] Password reset email to {} -> {}", to, resetLink);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(appProperties.mail().from());
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            log.info("Password reset email sent to {}", to);
        } catch (Exception ex) {
            // Không ném lỗi ra ngoài để tránh lộ thông tin email có tồn tại hay không
            log.error("Failed to send password reset email to {}: {}", to, ex.getMessage());
        }
    }
}
