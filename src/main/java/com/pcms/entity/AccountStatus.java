package com.pcms.entity;

/**
 * Trạng thái tài khoản. LOCKED được set tự động khi đăng nhập sai quá số lần cho phép.
 */
public enum AccountStatus {
    ACTIVE,
    INACTIVE,
    LOCKED
}
