package com.pcms.scheduler;

import com.pcms.entity.*;
import com.pcms.repository.*;
import com.pcms.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Các tác vụ chạy nền định kỳ Non-UI theo SRS Mục 5.3:
 * - FE-03: Đồng bộ lịch hẹn quá hạn sang NO_SHOW và giải phóng slot bác sĩ.
 * - FE-08: Quét định kỳ thuốc dưới ngưỡng tồn tối thiểu và lô thuốc sắp hết hạn (<= 30 ngày).
 * - FE-10: Gửi email nhắc lịch tái khám / tiêm nhắc trước 1–2 ngày cho Chủ nuôi.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SystemMaintenanceScheduler {

    private static final Set<String> OVERDUE_ELIGIBLE_STATUSES = Set.of(
            "PENDING_APPROVAL",
            "CONFIRMED",
            "APPROVED"
    );

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final AppointmentRepository appointmentRepository;
    private final DoctorScheduleSlotRepository doctorScheduleSlotRepository;
    private final MedicineRepository medicineRepository;
    private final InventoryBatchRepository inventoryBatchRepository;
    private final FollowUpRepository followUpRepository;
    private final UserAccountRepository userAccountRepository;
    private final AuditLogRepository auditLogRepository;
    private final EmailService emailService;

    /**
     * FE-03: Chạy định kỳ mỗi 30 phút (mặc định) để tự động chuyển các lịch hẹn đã quá hạn
     * (trước thời điểm hiện tại quá 4 giờ hoặc thuộc các ngày trước) sang NO_SHOW.
     */
    @Scheduled(
            initialDelayString = "${pcms.scheduler.initial-delay-ms:60000}",
            fixedDelayString = "${pcms.scheduler.overdue-check-ms:1800000}"
    )
    @Transactional
    public int syncOverdueAppointments() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime cutoff = now.minusHours(4);

        List<Appointment> overdueList = appointmentRepository.findAll().stream()
                .filter(a -> a.getAppointmentDate() != null)
                .filter(a -> a.getStatus() != null && OVERDUE_ELIGIBLE_STATUSES.contains(a.getStatus().toUpperCase()))
                .filter(a -> a.getAppointmentDate().toLocalDate().isBefore(now.toLocalDate())
                        || a.getAppointmentDate().isBefore(cutoff))
                .toList();

        if (overdueList.isEmpty()) {
            return 0;
        }

        for (Appointment appt : overdueList) {
            appt.setStatus("NO_SHOW");
            String existingNotes = appt.getNotes() != null ? appt.getNotes().trim() : "";
            String sysNote = "[Hệ thống tự động đánh dấu NO_SHOW do quá hạn lịch hẹn]";
            if (!existingNotes.contains(sysNote)) {
                appt.setNotes(existingNotes.isEmpty() ? sysNote : existingNotes + " | " + sysNote);
            }
            appointmentRepository.save(appt);

            // Giải phóng DoctorScheduleSlot tương ứng nếu đang BOOKED
            if (appt.getVeterinarian() != null) {
                doctorScheduleSlotRepository
                        .findByVeterinarian_UserIdAndSlotDateOrderByStartTimeAsc(
                                appt.getVeterinarian().getUserId(),
                                appt.getAppointmentDate().toLocalDate()
                        )
                        .stream()
                        .filter(slot -> "BOOKED".equalsIgnoreCase(slot.getStatus())
                                && Objects.equals(slot.getStartTime(), appt.getAppointmentDate().toLocalTime()))
                        .forEach(slot -> {
                            slot.setStatus("AVAILABLE");
                            doctorScheduleSlotRepository.save(slot);
                        });
            }
        }

        recordSystemAudit(
                "SYSTEM_OVERDUE_APPOINTMENT_SYNC",
                "Appointment (" + overdueList.size() + " bản ghi)",
                "Tự động chuyển " + overdueList.size() + " lịch hẹn quá hạn sang trạng thái NO_SHOW."
        );
        log.info("[FE-03] Marked {} overdue appointments as NO_SHOW", overdueList.size());
        return overdueList.size();
    }

    /**
     * FE-08: Chạy hàng ngày lúc 07:00 sáng quét thuốc tồn kho thấp và lô thuốc hết hạn trong 30 ngày.
     */
    @Scheduled(cron = "${pcms.scheduler.inventory-alert-cron:0 0 7 * * *}")
    @Transactional
    public void scanInventoryLowStockAndExpiry() {
        LocalDate today = LocalDate.now();
        LocalDate expiryHorizon = today.plusDays(30);

        List<InventoryBatch> allBatches = inventoryBatchRepository.findAll();
        Map<Integer, Integer> validStockByMed = new HashMap<>();
        List<String> expiringLines = new ArrayList<>();

        for (InventoryBatch batch : allBatches) {
            int qty = batch.getQuantityInStock() != null ? batch.getQuantityInStock() : 0;
            if (qty <= 0) continue;

            LocalDate exp = batch.getExpirationDate();
            if (exp == null || !exp.isBefore(today)) {
                validStockByMed.merge(batch.getMedicine().getMedicineId(), qty, Integer::sum);
            }
            if (exp != null && !exp.isAfter(expiryHorizon)) {
                String state = exp.isBefore(today) ? "ĐÃ HẾT HẠN" : "CẬN HẠN";
                expiringLines.add("- [" + state + "] " + batch.getMedicine().getMedicineName()
                        + " | Lô: " + batch.getBatchNumber()
                        + " | Tồn: " + qty
                        + " | HSD: " + exp.format(DATE_FMT));
            }
        }

        List<String> lowStockLines = medicineRepository.findAll().stream()
                .filter(m -> "ACTIVE".equalsIgnoreCase(m.getStatus()))
                .filter(m -> {
                    int stock = validStockByMed.getOrDefault(m.getMedicineId(), 0);
                    int threshold = m.getMinThreshold() != null ? m.getMinThreshold() : 20;
                    return stock <= threshold;
                })
                .map(m -> "- [TỒN THẤP] " + m.getMedicineName()
                        + ": Tồn khả dụng " + validStockByMed.getOrDefault(m.getMedicineId(), 0)
                        + " " + m.getUnit()
                        + " (Ngưỡng tối thiểu: " + (m.getMinThreshold() != null ? m.getMinThreshold() : 20) + ")")
                .toList();

        if (lowStockLines.isEmpty() && expiringLines.isEmpty()) {
            return;
        }

        StringBuilder summary = new StringBuilder();
        if (!lowStockLines.isEmpty()) {
            summary.append("1. Danh sách thuốc chạm/dưới ngưỡng tồn (").append(lowStockLines.size()).append("):\n")
                    .append(String.join("\n", lowStockLines)).append("\n\n");
        }
        if (!expiringLines.isEmpty()) {
            summary.append("2. Danh sách lô thuốc cận hạn <=30 ngày hoặc hết hạn (").append(expiringLines.size()).append("):\n")
                    .append(String.join("\n", expiringLines));
        }

        recordSystemAudit(
                "SYSTEM_INVENTORY_ALERT",
                "Medicine / InventoryBatch",
                "Cảnh báo tồn kho tự động: " + lowStockLines.size() + " thuốc tồn thấp, "
                        + expiringLines.size() + " lô cận hạn/hết hạn."
        );

        userAccountRepository.findAll().stream()
                .filter(u -> u.getStatus() == AccountStatus.ACTIVE && u.getRole() != null)
                .filter(u -> RoleName.ADMIN.equalsIgnoreCase(u.getRole().getRoleName())
                        || RoleName.INVENTORY_MANAGER.equalsIgnoreCase(u.getRole().getRoleName()))
                .forEach(recipient -> emailService.sendInventoryAlertEmail(
                        recipient.getEmail(),
                        recipient.getFullName(),
                        summary.toString()
                ));
    }

    /**
     * FE-10: Chạy hàng ngày lúc 07:30 sáng gửi email nhắc lịch FollowUp sắp đến hạn (trước 1–2 ngày).
     */
    @Scheduled(cron = "${pcms.scheduler.followup-reminder-cron:0 30 7 * * *}")
    @Transactional
    public int sendUpcomingFollowUpReminders() {
        LocalDate today = LocalDate.now();
        LocalDate fromDate = today.plusDays(1);
        LocalDate toDate = today.plusDays(2);

        List<FollowUp> dueFollowUps = followUpRepository.findAll().stream()
                .filter(f -> f.getFollowUpDate() != null)
                .filter(f -> !f.getFollowUpDate().isBefore(fromDate) && !f.getFollowUpDate().isAfter(toDate))
                .filter(f -> f.getStatus() != null
                        && Set.of("PENDING", "SCHEDULED").contains(f.getStatus().toUpperCase()))
                .filter(f -> f.getNotes() == null || !f.getNotes().contains("[REMINDER_SENT]"))
                .collect(Collectors.toList());

        int sentCount = 0;
        for (FollowUp followUp : dueFollowUps) {
            Pet pet = followUp.getPet();
            PetOwner owner = pet != null ? pet.getPetOwner() : null;
            if (owner != null && owner.getEmail() != null && !owner.getEmail().isBlank()) {
                emailService.sendFollowUpReminderEmail(
                        owner.getEmail(),
                        owner.getFullName(),
                        pet.getPetName(),
                        followUp.getFollowUpDate().format(DATE_FMT),
                        followUp.getFollowUpType() + (followUp.getNotes() != null ? " — " + followUp.getNotes() : "")
                );
                String notes = followUp.getNotes() != null ? followUp.getNotes().trim() : "";
                followUp.setNotes(notes.isEmpty() ? "[REMINDER_SENT]" : notes + " [REMINDER_SENT]");
                followUpRepository.save(followUp);
                sentCount++;
            }
        }

        if (sentCount > 0) {
            recordSystemAudit(
                    "SYSTEM_FOLLOWUP_REMINDER",
                    "FollowUp (" + sentCount + " lịch nhắc)",
                    "Đã gửi email nhắc lịch tái khám / tiêm phòng cho " + sentCount + " chủ nuôi."
            );
        }
        return sentCount;
    }

    private void recordSystemAudit(String actionType, String affectedResource, String details) {
        UserAccount systemActor = userAccountRepository.findByUsername("admin")
                .orElseGet(() -> userAccountRepository.findAll().stream().findFirst().orElse(null));
        if (systemActor == null) {
            return;
        }
        auditLogRepository.save(AuditLog.builder()
                .userAccount(systemActor)
                .actionTime(LocalDateTime.now().withNano(0))
                .actionType(actionType)
                .affectedResource(affectedResource)
                .outcome("SUCCESS")
                .actionDetails("[" + actionType + "] [" + affectedResource + "] " + details)
                .build());
    }
}
