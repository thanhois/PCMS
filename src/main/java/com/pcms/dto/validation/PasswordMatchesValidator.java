package com.pcms.dto.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.Objects;

public class PasswordMatchesValidator implements ConstraintValidator<PasswordMatches, PasswordConfirmable> {

    @Override
    public boolean isValid(PasswordConfirmable value, ConstraintValidatorContext context) {
        if (value == null || value.password() == null || value.confirmPassword() == null) {
            // Để @NotBlank trên từng field tự báo lỗi
            return true;
        }
        boolean matches = Objects.equals(value.password(), value.confirmPassword());
        if (!matches) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate(context.getDefaultConstraintMessageTemplate())
                    .addPropertyNode("confirmPassword")
                    .addConstraintViolation();
        }
        return matches;
    }
}
