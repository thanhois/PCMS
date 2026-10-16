package com.pcms.exception;

import org.springframework.http.HttpStatus;

/** 404 - Không tìm thấy tài nguyên. */
public class ResourceNotFoundException extends AppException {

    public ResourceNotFoundException(String message) {
        super(HttpStatus.NOT_FOUND, message);
    }
}
