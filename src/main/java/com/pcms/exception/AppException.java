package com.pcms.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

import java.util.Map;

/**
 * Exception nghiệp vụ gốc. Mọi exception nghiệp vụ kế thừa class này để GlobalExceptionHandler
 * tự map sang HTTP status + body lỗi chuẩn.
 */
@Getter
public class AppException extends RuntimeException {

    private final HttpStatus status;
    private final Map<String, String> fieldErrors;

    public AppException(HttpStatus status, String message) {
        this(status, message, null);
    }

    public AppException(HttpStatus status, String message, Map<String, String> fieldErrors) {
        super(message);
        this.status = status;
        this.fieldErrors = fieldErrors;
    }
}
