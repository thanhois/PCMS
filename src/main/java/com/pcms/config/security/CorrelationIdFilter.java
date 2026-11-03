package com.pcms.config.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Filter quản lý Correlation Identifier (Mã định danh tương quan yêu cầu).
 * Đảm bảo mọi request đều có correlation ID trong MDC (để log) và trong header response (để client theo dõi).
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationIdFilter extends OncePerRequestFilter {

    public static final String CORRELATION_ID_HEADER = "X-Correlation-ID";
    public static final String CORRELATION_ID_KEY = "correlationId";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String correlationId = request.getHeader(CORRELATION_ID_HEADER);
        if (correlationId == null || correlationId.trim().isEmpty()) {
            correlationId = UUID.randomUUID().toString();
        } else {
            correlationId = correlationId.trim();
        }

        // Lưu vào MDC để ghi log đồng bộ & request attribute cho RestControllerAdvice
        MDC.put(CORRELATION_ID_KEY, correlationId);
        request.setAttribute(CORRELATION_ID_KEY, correlationId);
        response.setHeader(CORRELATION_ID_HEADER, correlationId);

        try {
            filterChain.doFilter(request, response);
        } finally {
            MDC.remove(CORRELATION_ID_KEY);
        }
    }

    public static String getCorrelationId() {
        String id = MDC.get(CORRELATION_ID_KEY);
        return id != null ? id : UUID.randomUUID().toString();
    }
}
