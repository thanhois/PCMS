package com.pcms.service;

import com.pcms.dto.response.NotificationResponse;
import com.pcms.entity.Appointment;

import java.util.List;

public interface NotificationService {

    void notifyAppointmentBooked(Appointment appointment);

    void notifyAppointmentBooked(Integer appointmentId);

    void createNotification(Integer recipientUserId, String title, String message, String type, Integer referenceId);

    List<NotificationResponse> getMyNotifications(Integer userId);

    long getUnreadCount(Integer userId);

    void markAsRead(Integer notificationId, Integer userId);

    void markAllAsRead(Integer userId);
}
