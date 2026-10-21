package com.pcms.exception;

import org.springframework.http.HttpStatus;

/**
 * Lỗi xác thực khi đăng nhập:
 * <ul>
 *   <li>401 - sai username/password</li>
 *   <li>403 - tài khoản INACTIVE</li>
 *   <li>423 - tài khoản bị LOCKED</li>
 * </ul>
 */
public class AuthenticationFailedException extends AppException {

    public AuthenticationFailedException(HttpStatus status, String message) {
        super(status, message);
    }

    public static AuthenticationFailedException invalidCredentials() {
        return new AuthenticationFailedException(HttpStatus.UNAUTHORIZED,
                "Tên đăng nhập hoặc mật khẩu không chính xác");
    }

    public static AuthenticationFailedException locked() {
        return new AuthenticationFailedException(HttpStatus.LOCKED,
                "Tài khoản đang tạm khóa do nhập sai mật khẩu quá nhiều lần. Vui lòng thử lại sau 15 phút hoặc bấm Quên mật khẩu.");
    }

    public static AuthenticationFailedException temporarilyLocked(long remainingMinutes) {
        long mins = Math.max(1, remainingMinutes);
        return new AuthenticationFailedException(HttpStatus.LOCKED,
                "Bạn đã nhập sai mật khẩu quá 5 lần. Tài khoản tạm khóa trong " + mins
                        + " phút nữa (hoặc bấm Quên mật khẩu để mở lại ngay).");
    }

    public static AuthenticationFailedException inactive() {
        return new AuthenticationFailedException(HttpStatus.FORBIDDEN,
                "Tài khoản của bạn đã bị vô hiệu hóa, vui lòng liên hệ Quản trị viên");
    }
}
