package com.pcms.dto.validation;

/**
 * DTO có cặp password / confirmPassword cần so khớp.
 */
public interface PasswordConfirmable {

    String password();

    String confirmPassword();
}
