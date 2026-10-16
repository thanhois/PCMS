package com.pcms.dto.response;

/**
 * Kết quả đăng nhập thành công.
 *
 * @param accessToken JWT
 * @param tokenType   luôn là "Bearer"
 * @param expiresIn   thời gian sống của token (giây)
 * @param user        thông tin user
 */
public record AuthResponse(
        String accessToken,
        String tokenType,
        long expiresIn,
        UserInfoResponse user
) {
}
