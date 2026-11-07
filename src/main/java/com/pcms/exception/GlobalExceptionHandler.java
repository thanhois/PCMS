package com.pcms.exception;

import com.pcms.config.security.CorrelationIdFilter;
import com.pcms.dto.response.ErrorResponse;
import jakarta.persistence.OptimisticLockException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.validation.ObjectError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Xử lý ngoại lệ toàn cục tại biên API theo đặc tả 4.1.5 (Error Handling & Logging):
 * - Dịch mọi exception thành ErrorResponse thống nhất.
 * - Mã lỗi ổn định (stable errorCode), thông báo an toàn, mã tương quan (correlationId), chi tiết validation.
 * - Tuyệt đối không để lộ stack trace, mật khẩu, JWT, dữ liệu nhạy cảm ra client.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AppException.class)
    public ResponseEntity<ErrorResponse> handleAppException(AppException ex, HttpServletRequest request) {
        HttpStatus status = ex.getStatus() != null ? ex.getStatus() : HttpStatus.BAD_REQUEST;
        String errorCode = switch (status.value()) {
            case 404 -> "RESOURCE_NOT_FOUND";
            case 409 -> "STATE_CONFLICT";
            case 401 -> "UNAUTHENTICATED";
            case 403 -> "ACCESS_DENIED";
            default -> "BAD_REQUEST";
        };
        log.warn("[{}] AppException [{}] at {}: {}", resolveCorrelationId(request), errorCode, request.getRequestURI(), ex.getMessage());
        return build(status, errorCode, ex.getMessage(), request, ex.getFieldErrors());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.putIfAbsent(fe.getField(), fe.getDefaultMessage());
        }
        for (ObjectError ge : ex.getBindingResult().getGlobalErrors()) {
            fieldErrors.putIfAbsent(ge.getObjectName(), ge.getDefaultMessage());
        }
        log.warn("[{}] Validation failed at {}: {}", resolveCorrelationId(request), request.getRequestURI(), fieldErrors);
        return build(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "Validation failed", request, fieldErrors);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleUnreadable(HttpMessageNotReadableException ex, HttpServletRequest request) {
        log.warn("[{}] Malformed JSON at {}: {}", resolveCorrelationId(request), request.getRequestURI(), ex.getMessage());
        return build(HttpStatus.BAD_REQUEST, "MALFORMED_JSON", "Malformed JSON request", request, null);
    }

    @ExceptionHandler({OptimisticLockingFailureException.class, OptimisticLockException.class, CannotAcquireLockException.class})
    public ResponseEntity<ErrorResponse> handleConcurrencyConflict(Exception ex, HttpServletRequest request) {
        log.warn("[{}] Concurrency conflict at {}: {}", resolveCorrelationId(request), request.getRequestURI(), ex.getMessage());
        return build(HttpStatus.CONFLICT, "CONCURRENCY_CONFLICT",
                "Dữ liệu vừa được cập nhật bởi một giao dịch khác. Vui lòng tải lại trang và thử lại.", request, null);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrity(DataIntegrityViolationException ex, HttpServletRequest request) {
        log.warn("[{}] Data integrity conflict at {}: {}", resolveCorrelationId(request), request.getRequestURI(), ex.getMostSpecificCause().getMessage());
        return build(HttpStatus.CONFLICT, "STATE_CONFLICT", "Dữ liệu bị trùng lặp hoặc vi phạm ràng buộc toàn vẹn.", request, null);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthentication(AuthenticationException ex, HttpServletRequest request) {
        log.warn("[{}] Authentication failure at {}: {}", resolveCorrelationId(request), request.getRequestURI(), ex.getMessage());
        return build(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Authentication is required", request, null);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        log.warn("[{}] Access denied at {}: {}", resolveCorrelationId(request), request.getRequestURI(), ex.getMessage());
        return build(HttpStatus.FORBIDDEN, "ACCESS_DENIED", "You do not have permission to access this resource", request, null);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex, HttpServletRequest request) {
        return build(HttpStatus.METHOD_NOT_ALLOWED, "METHOD_NOT_ALLOWED", ex.getMessage(), request, null);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoResource(NoResourceFoundException ex, HttpServletRequest request) {
        return build(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", "Resource not found", request, null);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex, HttpServletRequest request) {
        String corrId = resolveCorrelationId(request);
        log.error("[{}] Internal server error at {}: {}", corrId, request.getRequestURI(), ex.getMessage(), ex);
        String safeMessage = "An unexpected error occurred. Please contact support with Correlation ID: " + corrId;
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_SERVER_ERROR", safeMessage, request, null);
    }

    private ResponseEntity<ErrorResponse> build(HttpStatus status, String errorCode, String message,
                                                HttpServletRequest request, Map<String, String> fieldErrors) {
        String correlationId = resolveCorrelationId(request);
        ErrorResponse body = ErrorResponse.of(status.value(), errorCode, status.getReasonPhrase(), message,
                request.getRequestURI(), correlationId, fieldErrors);
        return ResponseEntity.status(status).body(body);
    }

    private String resolveCorrelationId(HttpServletRequest request) {
        Object attr = request.getAttribute(CorrelationIdFilter.CORRELATION_ID_KEY);
        if (attr != null) return String.valueOf(attr);
        return CorrelationIdFilter.getCorrelationId();
    }
}
