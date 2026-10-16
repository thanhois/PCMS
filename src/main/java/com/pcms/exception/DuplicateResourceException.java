package com.pcms.exception;

import org.springframework.http.HttpStatus;

import java.util.Map;

/** 409 - Dữ liệu đã tồn tại (vd: email / SĐT đã được sử dụng). */
public class DuplicateResourceException extends AppException {

    public DuplicateResourceException(String message, Map<String, String> fieldErrors) {
        super(HttpStatus.CONFLICT, message, fieldErrors);
    }
}
