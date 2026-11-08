package com.pcms.dto.response;

import java.time.LocalDateTime;

public record NotificationResponse(
        Integer notificationId,
        String title,
        String message,
        String type,
        Integer referenceId,
        Boolean isRead,
        LocalDateTime createdAt,
        String timeAgo
) {}

