package com.pcms.service.impl;

import com.pcms.dto.response.NotificationResponse;
import com.pcms.entity.*;
import com.pcms.exception.ResourceNotFoundException;
import com.pcms.repository.NotificationRepository;
import com.pcms.repository.RoleRepository;
import com.pcms.repository.UserAccountRepository;
import com.pcms.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserAccountRepository userAccountRepository;
    private final RoleRepository roleRepository;
    private final com.pcms.repository.AppointmentRepository appointmentRepository;

    private static final DateTimeFormatter DT_FORMATTER = DateTimeFormatter.ofPattern("HH:mm 'ngày' dd/MM/yyyy");

    @Value("${app.webhook.url:}")
    private String configuredWebhookUrl;

    @Override
    @Transactional
    public void notifyAppointmentBooked(Integer appointmentId) {
        if (appointmentId == null) return;
        Appointment appt = appointmentRepository.findByIdWithDetails(appointmentId).orElse(null);
        if (appt != null) {
            notifyAppointmentBooked(appt);
        }
    }

    @Override
    @Transactional
    public void notifyAppointmentBooked(Appointment appt) {
        if (appt == null) return;

        String petName = appt.getPet() != null ? appt.getPet().getPetName() : "thú cưng";
        String timeDisplay = appt.getAppointmentDate() != null ? appt.getAppointmentDate().format(DT_FORMATTER) : "thời gian đã hẹn";
        String serviceName = appt.getService() != null ? appt.getService().getServiceName() : "Khám lâm sàng";
        String vetName = appt.getVeterinarian() != null ? appt.getVeterinarian().getFullName() : "Phòng khám điều phối";
        String ownerName = appt.getPetOwner() != null ? appt.getPetOwner().getFullName() : "Khách hàng";
        String ownerPhone = appt.getPetOwner() != null ? appt.getPetOwner().getPhoneNumber() : "";

        // 1. Thông báo cho CHỦ NUÔI
        if (appt.getPetOwner() != null && appt.getPetOwner().getUserAccount() != null) {
            UserAccount ownerUser = appt.getPetOwner().getUserAccount();
            String ownerTitle = "Đặt lịch khám thành công";
            String ownerMsg = String.format(
                    "Lịch hẹn khám cho bé %s vào lúc %s (%s) với %s đã được ghi nhận thành công trên hệ thống.",
                    petName, timeDisplay, serviceName, vetName
            );
            saveNotification(ownerUser, ownerTitle, ownerMsg, "BOOKING_SUCCESS", appt.getAppointmentId());
        }

        // 2. Thông báo cho BÁC SĨ PHỤ TRÁCH
        if (appt.getVeterinarian() != null) {
            UserAccount vetUser = appt.getVeterinarian();
            String vetTitle = "Lịch hẹn khám mới được phân công";
            String vetMsg = String.format(
                    "Bạn được phân công phụ trách ca khám cho bé %s (Chủ nuôi: %s - SĐT: %s) vào lúc %s. Dịch vụ: %s.",
                    petName, ownerName, ownerPhone, timeDisplay, serviceName
            );
            saveNotification(vetUser, vetTitle, vetMsg, "APPOINTMENT_ASSIGNED", appt.getAppointmentId());
        }

        // 3. Thông báo cho nhân viên LỄ TÂN
        Role receptionistRole = roleRepository.findByRoleName(RoleName.RECEPTIONIST).orElse(null);
        if (receptionistRole != null) {
            List<UserAccount> receptionists = userAccountRepository.findAll().stream()
                    .filter(u -> u.getRole() != null && receptionistRole.getRoleId().equals(u.getRole().getRoleId()))
                    .filter(u -> AccountStatus.ACTIVE.equals(u.getStatus()))
                    .toList();

            for (UserAccount recep : receptionists) {
                String recepTitle = "Lịch hẹn trực tuyến mới #" + appt.getAppointmentId();
                String recepMsg = String.format(
                        "Khách hàng %s vừa đặt lịch hẹn khám cho bé %s lúc %s (%s). Bác sĩ phụ trách: %s.",
                        ownerName, petName, timeDisplay, serviceName, vetName
                );
                saveNotification(recep, recepTitle, recepMsg, "NEW_BOOKING_RECEPTION", appt.getAppointmentId());
            }
        }

        // 4. Kích hoạt Webhook (Bắn webhook payload ra ngoài)
        dispatchWebhook("APPOINTMENT_BOOKED", Map.of(
                "appointmentId", appt.getAppointmentId(),
                "petName", petName,
                "ownerName", ownerName,
                "ownerPhone", ownerPhone,
                "appointmentTime", timeDisplay,
                "serviceName", serviceName,
                "veterinarianName", vetName,
                "status", appt.getStatus() != null ? appt.getStatus() : "PENDING_APPROVAL",
                "createdAt", LocalDateTime.now().toString()
        ));
    }

    @Override
    @Transactional
    public void createNotification(Integer recipientUserId, String title, String message, String type, Integer referenceId) {
        UserAccount user = userAccountRepository.findById(recipientUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng #" + recipientUserId));
        saveNotification(user, title, message, type, referenceId);
    }

    private void saveNotification(UserAccount recipient, String title, String message, String type, Integer referenceId) {
        AppNotification notif = AppNotification.builder()
                .recipient(recipient)
                .title(title)
                .message(message)
                .type(type)
                .referenceId(referenceId)
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();
        notificationRepository.save(notif);
        log.info("[WEB NOTIFICATION] Created notification #{} for user '{}' ({}): {}",
                notif.getNotificationId(), recipient.getUsername(), recipient.getRole() != null ? recipient.getRole().getRoleName() : "N/A", title);
    }

    private void dispatchWebhook(String eventType, Map<String, Object> payload) {
        log.info("[WEBHOOK DISPATCH] Event: {}, Payload: {}", eventType, payload);
        if (configuredWebhookUrl != null && !configuredWebhookUrl.isBlank()) {
            try {
                HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
                String json = "{\"event\":\"" + eventType + "\",\"data\":" + payload + "}";
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(configuredWebhookUrl.trim()))
                        .header("Content-Type", "application/json")
                        .timeout(Duration.ofSeconds(5))
                        .POST(HttpRequest.BodyPublishers.ofString(json))
                        .build();
                client.sendAsync(request, HttpResponse.BodyHandlers.discarding());
            } catch (Exception ex) {
                log.warn("[WEBHOOK ERROR] Could not deliver webhook to {}: {}", configuredWebhookUrl, ex.getMessage());
            }
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<NotificationResponse> getMyNotifications(Integer userId) {
        return notificationRepository.findByRecipient_UserIdOrderByCreatedAtDesc(userId)
                .stream()
                .limit(50)
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(Integer userId) {
        return notificationRepository.countByRecipient_UserIdAndIsReadFalse(userId);
    }

    @Override
    @Transactional
    public void markAsRead(Integer notificationId, Integer userId) {
        AppNotification notif = notificationRepository.findByNotificationIdAndRecipient_UserId(notificationId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông báo #" + notificationId));
        notif.setIsRead(true);
        notificationRepository.save(notif);
    }

    @Override
    @Transactional
    public void markAllAsRead(Integer userId) {
        List<AppNotification> unread = notificationRepository.findByRecipient_UserIdOrderByCreatedAtDesc(userId)
                .stream()
                .filter(n -> !Boolean.TRUE.equals(n.getIsRead()))
                .toList();
        for (AppNotification n : unread) {
            n.setIsRead(true);
        }
        notificationRepository.saveAll(unread);
    }

    private NotificationResponse mapToResponse(AppNotification n) {
        return new NotificationResponse(
                n.getNotificationId(),
                n.getTitle(),
                n.getMessage(),
                n.getType(),
                n.getReferenceId(),
                n.getIsRead(),
                n.getCreatedAt(),
                formatTimeAgo(n.getCreatedAt())
        );
    }

    private String formatTimeAgo(LocalDateTime dt) {
        if (dt == null) return "Vừa xong";
        Duration duration = Duration.between(dt, LocalDateTime.now());
        long seconds = duration.getSeconds();
        if (seconds < 60) return "Vừa xong";
        long minutes = seconds / 60;
        if (minutes < 60) return minutes + " phút trước";
        long hours = minutes / 60;
        if (hours < 24) return hours + " giờ trước";
        long days = hours / 24;
        if (days < 30) return days + " ngày trước";
        return dt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
    }
}
