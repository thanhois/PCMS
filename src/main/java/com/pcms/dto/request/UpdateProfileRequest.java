package com.pcms.dto.request;

import com.pcms.dto.validation.ValidationPatterns;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * UC05 - Cập nhật thông tin hồ sơ cá nhân cho mọi vai trò.
 */
public record UpdateProfileRequest(

        @NotBlank(message = "Họ và tên không được để trống")
        @Size(max = 150, message = "Họ và tên tối đa 150 ký tự")
        String fullName,

        @NotBlank(message = "Email không được để trống")
        @Email(message = "Định dạng email không hợp lệ")
        @Size(max = 150, message = "Email tối đa 150 ký tự")
        String email,

        @NotBlank(message = "Số điện thoại không được để trống")
        @Pattern(regexp = ValidationPatterns.VN_PHONE, message = ValidationPatterns.VN_PHONE_MESSAGE)
        String phoneNumber,

        @Size(max = 20, message = "Giới tính tối đa 20 ký tự")
        String gender,

        @Size(max = 255, message = "Địa chỉ tối đa 255 ký tự")
        String address
) {
}
