package com.pcms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Nhật ký hoạt động hệ thống (Performs: UserAccount 1 - N AuditLog).
 */
@Entity
@Table(name = "AuditLog")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "logId")
    private Integer logId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "userId", nullable = false)
    private UserAccount userAccount;

    @Column(name = "actionTime", nullable = false)
    private LocalDateTime actionTime;

    @Column(name = "actionDetails", nullable = false, length = 2000)
    private String actionDetails;
}
