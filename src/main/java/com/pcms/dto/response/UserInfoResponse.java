package com.pcms.dto.response;

import com.pcms.entity.UserAccount;

/**
 * Thông tin user trả về cho frontend (không chứa dữ liệu nhạy cảm).
 */
public record UserInfoResponse(
        Integer id,
        String username,
        String fullName,
        String email,
        String phoneNumber,
        String role
) {
    public static UserInfoResponse from(UserAccount user) {
        return new UserInfoResponse(
                user.getUserId(),
                user.getUsername(),
                user.getFullName(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.getRole().getRoleName()
        );
    }
}
