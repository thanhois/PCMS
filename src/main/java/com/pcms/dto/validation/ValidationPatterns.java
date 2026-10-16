package com.pcms.dto.validation;

/**
 * Các constant validate dùng chung giữa các DTO.
 */
public final class ValidationPatterns {

    /** >= 8 ký tự, có ít nhất 1 chữ hoa, 1 chữ thường, 1 chữ số (BR-01 UC01). */
    public static final String STRONG_PASSWORD = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$";
    public static final String STRONG_PASSWORD_MESSAGE =
            "Password must be at least 8 characters and include uppercase, lowercase letters and digits";

    /** Số điện thoại Việt Nam: 0xxxxxxxxx hoặc +84xxxxxxxxx */
    public static final String VN_PHONE = "^(0|\\+84)(3|5|7|8|9)\\d{8}$";
    public static final String VN_PHONE_MESSAGE = "Invalid phone number format";

    private ValidationPatterns() {
    }
}
