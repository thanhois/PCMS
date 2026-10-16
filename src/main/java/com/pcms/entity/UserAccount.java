package com.pcms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Tài khoản đăng nhập hệ thống (nhân viên + khách hàng Pet Owner).
 *
 * <p><b>Lưu ý:</b> {@code branchId} cho phép NULL — tài khoản role PET_OWNER tự đăng ký online
 * không thuộc chi nhánh nào. Tài khoản nhân viên (ADMIN/VET/RECEPTIONIST) nên được gán branch
 * ở tầng nghiệp vụ.</p>
 */
@Entity
@Table(name = "UserAccount")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "userId")
    private Integer userId;

    @Column(name = "username", nullable = false, unique = true, length = 100)
    private String username;

    @Column(name = "passwordHash", nullable = false, length = 100)
    private String passwordHash;

    @Column(name = "fullName", nullable = false, length = 150)
    private String fullName;

    @Column(name = "email", nullable = false, unique = true, length = 150)
    private String email;

    @Column(name = "phoneNumber", nullable = false, unique = true, length = 20)
    private String phoneNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private AccountStatus status;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "roleId", nullable = false)
    private Role role;

    /** NULL đối với PET_OWNER. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branchId", nullable = true)
    private Branch branch;

    /** Số lần đăng nhập sai liên tiếp (BR-01 UC02: khóa sau 5 lần). */
    @Builder.Default
    @Column(name = "failedLoginAttempts", nullable = false)
    private Integer failedLoginAttempts = 0;

    /** SHA-256 hash của token reset password (không lưu token gốc). */
    @Column(name = "resetTokenHash", length = 64)
    private String resetTokenHash;

    @Column(name = "resetTokenExpiry")
    private LocalDateTime resetTokenExpiry;

    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updatedAt")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
        if (this.status == null) {
            this.status = AccountStatus.ACTIVE;
        }
        if (this.failedLoginAttempts == null) {
            this.failedLoginAttempts = 0;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
