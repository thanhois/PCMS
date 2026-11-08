package com.pcms.controller;

import com.pcms.config.security.UserPrincipal;
import com.pcms.dto.response.ApiResponse;
import com.pcms.dto.response.NotificationResponse;
import com.pcms.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<NotificationResponse>>> getMyNotifications(
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.ok(ApiResponse.success("Thành công", List.of()));
        }
        List<NotificationResponse> list = notificationService.getMyNotifications(principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách thông báo thành công", list));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUnreadCount(
            @AuthenticationPrincipal UserPrincipal principal) {
        long count = principal != null ? notificationService.getUnreadCount(principal.getId()) : 0L;
        return ResponseEntity.ok(ApiResponse.success("Thành công", Map.of("unreadCount", count)));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(
            @PathVariable Integer id,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal != null) {
            notificationService.markAsRead(id, principal.getId());
        }
        return ResponseEntity.ok(ApiResponse.success("Đã đánh dấu đã đọc", null));
    }

    @PostMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead(
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal != null) {
            notificationService.markAllAsRead(principal.getId());
        }
        return ResponseEntity.ok(ApiResponse.success("Đã đánh dấu tất cả đã đọc", null));
    }
}
