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
    public void sendPasswordResetEmail(String to, String fullName, String rawToken, String resetLink, int expiresInMinutes) {
        String subject = "[PCMS] Mã khôi phục mật khẩu tài khoản";
        String baseUrl = resetLink.contains("?") ? resetLink.substring(0, resetLink.indexOf("?")) : resetLink;
        String body = """
                Xin chào %s,

                Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản PCMS của bạn.

                ============================================================
                MÃ XÁC NHẬN KHÔI PHỤC (Hiệu lực %d phút):
                %s
                ============================================================

                Bạn có thể sao chép mã số trên và dán trực tiếp vào trang Đặt lại mật khẩu:
                %s

                Hoặc nhấn vào liên kết bên dưới để đổi mật khẩu ngay:
                %s

                Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email. Mật khẩu hiện tại của bạn vẫn an toàn.

                Trân trọng,
                Hệ thống Quản lý Phòng khám Thú y PCMS
                """.formatted(
                fullName != null && !fullName.isBlank() ? fullName : "Quý khách",
                expiresInMinutes,
                rawToken,
                baseUrl,
                resetLink
        );

        sendMail(to, subject, body, "Password reset");
    }

    @Override
    public void sendBookingConfirmationEmail(String to, String ownerName, String petName, String appointmentTimeDisplay, String serviceName, String vetName) {
        String subject = "[PCMS] Xác nhận đặt lịch khám thành công";
        String body = """
                Kính gửi %s,

                Phòng khám Thú y PCMS trân trọng thông báo lịch hẹn khám cho bé %s đã được xác nhận thành công:
                - Thời gian hẹn: %s
                - Dịch vụ dự kiến: %s
                - Bác sĩ phụ trách: %s

                Quý khách vui lòng đến trước 10 phút để Lễ tân hỗ trợ tiếp đón và đo thể trọng ban đầu cho bé.
                Hotline hỗ trợ: 028 1234 5678.

                Trân trọng,
                Hệ thống Quản lý Phòng khám Thú y PCMS.
                """.formatted(
                ownerName != null ? ownerName : "Quý khách",
                petName != null ? petName : "thú cưng",
                appointmentTimeDisplay != null ? appointmentTimeDisplay : "Theo thông báo",
                serviceName != null ? serviceName : "Khám lâm sàng",
                vetName != null ? vetName : "Bác sĩ phụ trách trực ca"
        );

        sendMail(to, subject, body, "Booking confirmation");
    }

    @Override
    public void sendStaffWelcomeEmail(String to, String fullName, String username, String tempPassword, String roleName) {
        String subject = "[PCMS] Thông tin tài khoản nhân sự mới";
        String body = """
                Xin chào %s,

                Quản trị viên đã khởi tạo tài khoản truy cập Hệ thống Quản lý Phòng khám Thú y PCMS cho bạn:
                - Tên đăng nhập (Username): %s
                - Vai trò công tác: %s
                - Mật khẩu tạm thời: %s

                Lưu ý bảo mật: Bạn bắt buộc phải đổi mật khẩu ngay trong lần đăng nhập đầu tiên.

                Trân trọng,
                Ban Quản trị Hệ thống PCMS.
                """.formatted(
                fullName != null && !fullName.isBlank() ? fullName : username,
                username,
                roleName,
                tempPassword
        );

        sendMail(to, subject, body, "Staff welcome");
    }

    @Override
    public void sendTemporaryPasswordEmail(String to, String fullName, String username, String tempPassword) {
        String subject = "[PCMS] Cấp lại mật khẩu tạm thời";
        String body = """
                Xin chào %s,

                Quản trị viên hệ thống vừa đặt lại mật khẩu tạm thời cho tài khoản PCMS của bạn (@%s):
                - Mật khẩu tạm thời mới: %s

                Vui lòng đăng nhập và đổi sang mật khẩu cá nhân mới ngay lập tức để bảo mật tài khoản.

                Trân trọng,
                Ban Quản trị Hệ thống PCMS.
                """.formatted(
                fullName != null && !fullName.isBlank() ? fullName : username,
                username,
                tempPassword
        );

        sendMail(to, subject, body, "Admin temporary password");
    }

    @Override
    public void sendInventoryAlertEmail(String to, String recipientName, String alertSummary) {
        String subject = "[PCMS] Cảnh báo định kỳ tồn kho thấp & thuốc cận hạn";
        String body = """
                Xin chào %s,

                Hệ thống PCMS gửi báo cáo tự động hàng ngày về các mặt hàng dược phẩm cần lưu ý:

                %s

                Vui lòng kiểm tra phân hệ Quản lý Kho để lập kế hoạch nhập bổ sung hoặc xử lý lô cận hạn.

                Trân trọng,
                Hệ thống Quản lý Phòng khám Thú y PCMS.
                """.formatted(
                recipientName != null && !recipientName.isBlank() ? recipientName : "Quản lý kho",
                alertSummary
        );

        sendMail(to, subject, body, "Inventory daily alert");
    }

    @Override
    public void sendFollowUpReminderEmail(String to, String ownerName, String petName, String followUpDateDisplay, String reason) {
        String subject = "[PCMS] Nhắc lịch tái khám / tiêm nhắc cho thú cưng";
        String body = """
                Kính gửi %s,

                Phòng khám Thú y PCMS xin nhắc lịch hẹn tái khám / tiêm phòng định kỳ sắp tới của bé %s:
                - Ngày dự kiến: %s
                - Nội dung theo dõi: %s

                Quý khách có thể đặt khung giờ khám trực tuyến trên Cổng Khách hàng PCMS hoặc liên hệ hotline 028 1234 5678.

                Trân trọng,
                Hệ thống Quản lý Phòng khám Thú y PCMS.
                """.formatted(
                ownerName != null && !ownerName.isBlank() ? ownerName : "Quý khách",
                petName != null && !petName.isBlank() ? petName : "thú cưng",
                followUpDateDisplay,
                reason != null && !reason.isBlank() ? reason : "Tái khám theo chỉ định bác sĩ"
        );

        sendMail(to, subject, body, "Follow-up reminder");
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
