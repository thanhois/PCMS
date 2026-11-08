package com.pcms.repository;

import com.pcms.entity.AppNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationRepository extends JpaRepository<AppNotification, Integer> {

    List<AppNotification> findByRecipient_UserIdOrderByCreatedAtDesc(Integer userId);

    long countByRecipient_UserIdAndIsReadFalse(Integer userId);

    Optional<AppNotification> findByNotificationIdAndRecipient_UserId(Integer notificationId, Integer userId);
}

