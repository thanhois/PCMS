package com.pcms.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Envelope chuẩn cho mọi response thành công.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(boolean success, String message, T data) {

    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>(true, message, data);
    }

    public static <T> ApiResponse<T> success(String message) {
        return new ApiResponse<>(true, message, null);
    }
}
