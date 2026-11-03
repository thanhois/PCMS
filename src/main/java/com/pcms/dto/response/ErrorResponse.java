package com.pcms.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import org.slf4j.MDC;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Envelope chuẩn cho mọi response lỗi theo đặc tả 4.1.5:
 * - {@code errorCode}: Mã lỗi ổn định máy đọc được (stable error code).
 * - {@code safe message}: Thông báo an toàn cho người dùng (không để lộ stack trace/bí mật).
 * - {@code correlationId}: Mã định danh tương quan yêu cầu (traceability).
 * - {@code fieldErrors}: Map tên trường -> chi tiết lỗi validate.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(
        boolean success,
        int status,
        String errorCode,
        String error,
        String message,
        String correlationId,
        String path,
        LocalDateTime timestamp,
        Map<String, String> fieldErrors
) {
    public static ErrorResponse of(int status, String errorCode, String error, String message, String path,
                                   String correlationId, Map<String, String> fieldErrors) {
        String corrId = (correlationId != null && !correlationId.isBlank())
                ? correlationId
                : MDC.get("correlationId");
        return new ErrorResponse(false, status, errorCode, error, message, corrId, path, LocalDateTime.now(), fieldErrors);
    }

    public static ErrorResponse of(int status, String error, String message, String path,
                                   Map<String, String> fieldErrors) {
        String defaultCode = switch (status) {
            case 400 -> "BAD_REQUEST";
            case 401 -> "UNAUTHENTICATED";
            case 403 -> "ACCESS_DENIED";
            case 404 -> "RESOURCE_NOT_FOUND";
            case 409 -> "STATE_CONFLICT";
            case 405 -> "METHOD_NOT_ALLOWED";
            default -> "INTERNAL_SERVER_ERROR";
        };
        return of(status, defaultCode, error, message, path, MDC.get("correlationId"), fieldErrors);
    }
}
