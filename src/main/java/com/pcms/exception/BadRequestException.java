package com.pcms.exception;

import org.springframework.http.HttpStatus;

/** 400 - Request không hợp lệ về mặt nghiệp vụ (vd: token reset hết hạn). */
public class BadRequestException extends AppException {

    public BadRequestException(String message) {
        super(HttpStatus.BAD_REQUEST, message);
    }
}
