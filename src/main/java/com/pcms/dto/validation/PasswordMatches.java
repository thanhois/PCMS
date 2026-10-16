package com.pcms.dto.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

/**
 * Class-level constraint: confirmPassword phải trùng password.
 * Lỗi được gắn vào field {@code confirmPassword} để frontend hiển thị đúng dưới ô input.
 */
@Documented
@Constraint(validatedBy = PasswordMatchesValidator.class)
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
public @interface PasswordMatches {

    String message() default "Confirmation password does not match";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
