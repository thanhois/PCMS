package com.pcms.event;

import java.time.LocalDateTime;

/**
 * Event đại diện cho sự kiện lịch hẹn khám bệnh đã được lưu thành công vào cơ sở dữ liệu.
 * Dùng cho cơ chế gửi thông báo bất đồng bộ sau khi commit giao dịch (Section 4.1.6).
 */
public record AppointmentBookedEvent(
        Integer appointmentId,
        String ownerEmail,
        String ownerFullName,
        String petName,
        LocalDateTime appointmentDateTime,
        String shift,
        String serviceName,
        String vetName,
        String eventSource
) {
    public String getDeduplicationKey() {
        return "booking-notify-" + appointmentId;
    }
}
