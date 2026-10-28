package com.pcms.service.impl;

import com.pcms.config.AppProperties;
import com.pcms.service.EmailService;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

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
    public void sendPasswordResetEmail(String to, String fullName, String token, String resetLink, int expiresInMinutes) {
        String subject = "[PCMS] Mã khôi phục mật khẩu tài khoản của bạn";
        String plainText = """
                Xin chào %s,

                Hệ thống nhận được yêu cầu đặt lại mật khẩu cho tài khoản Pet Clinic của bạn (hiệu lực %d phút).

                1. Mã xác nhận (Token) để copy và dán trực tiếp trên trang đặt lại mật khẩu:
                %s

                2. Hoặc nhấn trực tiếp vào đường dẫn dưới đây:
                %s

                Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.

                Pet Clinic Management System
                """.formatted(fullName, expiresInMinutes, token, resetLink);

        String htmlBody = """
                <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
                  <h2 style="margin-top: 0; color: #0f172a;">Đặt lại mật khẩu tài khoản PCMS</h2>
                  <p>Xin chào <strong>%s</strong>,</p>
                  <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Pet Clinic của bạn. Mã khôi phục có hiệu lực trong <strong>%d phút</strong>.</p>
                  
                  <div style="margin: 20px 0; padding: 16px; background-color: #f8fafc; border: 1px dashed #94a3b8; border-radius: 8px; text-align: center;">
                    <div style="font-size: 13px; color: #64748b; margin-bottom: 6px;">Mã Token khôi phục (bôi đen để copy):</div>
                    <div style="font-family: monospace; font-size: 24px; font-weight: 700; letter-spacing: 3px; color: #0f172a; user-select: all;">%s</div>
                  </div>

                  <p style="margin-bottom: 16px;">Hoặc bạn có thể nhấn trực tiếp vào nút bên dưới để đặt lại mật khẩu:</p>
                  <div style="text-align: center; margin: 20px 0;">
                    <a href="%s" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; border-radius: 8px;">Đặt lại mật khẩu ngay</a>
                  </div>

                  <p style="font-size: 12px; color: #64748b; word-break: break-all;">Liên kết trực tiếp: <a href="%s" style="color: #2563eb;">%s</a></p>
                  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                  <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.<br/>Pet Clinic Management System</p>
                </div>
                """.formatted(fullName, expiresInMinutes, token, resetLink, resetLink, resetLink);

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (!appProperties.mail().enabled() || mailSender == null) {
            log.info("[MAIL DISABLED] Password reset email to {} | Token: {} | Link: {}", to, token, resetLink);
            return;
        }

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, StandardCharsets.UTF_8.name());
            helper.setFrom(appProperties.mail().from());
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(plainText, htmlBody);
            mailSender.send(mimeMessage);
            log.info("Password reset email sent to {}", to);
        } catch (Exception ex) {
            // Không ném lỗi ra ngoài để tránh lộ thông tin email có tồn tại hay không
            log.error("Failed to send password reset email to {}: {}", to, ex.getMessage());
        }
    }
}
