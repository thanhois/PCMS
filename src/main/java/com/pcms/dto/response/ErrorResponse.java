package com.pcms.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Envelope chuẩn cho mọi response lỗi.
 * {@code fieldErrors}: map tên field -> thông báo lỗi (frontend hiển thị dưới từng ô input).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(
        boolean success,
        int status,
        String error,
        String message,
        String path,
        LocalDateTime timestamp,
        Map<String, String> fieldErrors
) {
    public static ErrorResponse of(int status, String error, String message, String path,
                                   Map<String, String> fieldErrors) {
        return new ErrorResponse(false, status, error, message, path, LocalDateTime.now(), fieldErrors);
    }
}
