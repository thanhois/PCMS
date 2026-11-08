package com.pcms.event;

import com.pcms.config.security.CorrelationIdFilter;
import com.pcms.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.format.DateTimeFormatter;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Xử lý thông báo xác nhận đặt lịch hẹn theo đặc tả 4.1.6:
 * - Thực thi bất đồng bộ (@Async) sau khi transaction đã COMMIT (@TransactionalEventListener AFTER_COMMIT).
 * - Cơ chế Deduplication Key: đảm bảo cùng một ca hẹn không gửi thông báo trùng lặp khi retry.
 * - Cô lập lỗi (Fault Isolation): Thất bại khi gửi email KHÔNG ảnh hưởng hay rollback ca hẹn đã lưu.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AppointmentNotificationListener {

    private final EmailService emailService;
    private final com.pcms.service.NotificationService notificationService;
    private final com.pcms.repository.AppointmentRepository appointmentRepository;
    private static final DateTimeFormatter DT_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    // Bộ nhớ tạm lưu các key đã xử lý để chống trùng lặp (Deduplication)
    private final Set<String> processedDeduplicationKeys = ConcurrentHashMap.newKeySet();

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleAppointmentBooked(AppointmentBookedEvent event) {
        String deduplicationKey = event.getDeduplicationKey();
        String correlationId = CorrelationIdFilter.getCorrelationId();

        // 1. Kiểm tra Deduplication Key
        if (processedDeduplicationKeys.contains(deduplicationKey)) {
            log.info("[{}] [DEDUPLICATION] Notification already processed for key: {}. Skipping duplicate message.",
                    correlationId, deduplicationKey);
            return;
        }

        // Đánh dấu key đã tiếp nhận
        processedDeduplicationKeys.add(deduplicationKey);

        log.info("[{}] [ASYNC NOTIFICATION] Processing booking confirmation for appointment #{} (Pet: {}, Owner: {})",
                correlationId, event.appointmentId(), event.petName(), event.ownerEmail());

        // 2. Tạo thông báo trong hệ thống (In-App Notification) cho Chủ nuôi, Bác sĩ và Lễ tân + Webhook
        try {
            notificationService.notifyAppointmentBooked(event.appointmentId());
            log.info("[{}] [IN-APP NOTIFICATION & WEBHOOK SUCCESS] Dispatched booking notifications for appointment #{}",
                    correlationId, event.appointmentId());
        } catch (Exception ex) {
            log.error("[{}] [IN-APP NOTIFICATION FAILURE] Could not create in-app notification for appointment #{}: {}",
                    correlationId, event.appointmentId(), ex.getMessage());
        }

        // 3. Thực hiện gửi email với cơ chế cô lập lỗi
        if (event.ownerEmail() != null && !event.ownerEmail().isBlank()) {
            try {
                String timeDisplay = event.appointmentDateTime() != null
                        ? event.appointmentDateTime().format(DT_FORMATTER) + " (" + ("AFTERNOON".equalsIgnoreCase(event.shift()) ? "Buổi chiều" : "Buổi sáng") + ")"
                        : "Giờ hẹn theo thỏa thuận";

                emailService.sendBookingConfirmationEmail(
                        event.ownerEmail(),
                        event.ownerFullName(),
                        event.petName(),
                        timeDisplay,
                        event.serviceName(),
                        event.vetName()
                );

                log.info("[{}] [ASYNC EMAIL SUCCESS] Sent booking confirmation email for appointment #{}",
                        correlationId, event.appointmentId());
            } catch (Exception ex) {
                // Section 4.1.6: Notification failure must not roll back a successfully saved appointment
                log.error("[{}] [ASYNC EMAIL FAILURE] Could not send booking confirmation email for appointment #{}: {}",
                        correlationId, event.appointmentId(), ex.getMessage());
            }
        }
    }
}
