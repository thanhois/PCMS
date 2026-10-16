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
        return new AuthenticationFailedException(HttpStatus.UNAUTHORIZED, "Incorrect username or password");
    }

    public static AuthenticationFailedException locked() {
        return new AuthenticationFailedException(HttpStatus.LOCKED,
                "Your account has been locked, please contact the administrator");
    }

    public static AuthenticationFailedException inactive() {
        return new AuthenticationFailedException(HttpStatus.FORBIDDEN,
                "Your account is inactive, please contact the administrator");
    }
}
