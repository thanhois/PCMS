package com.pcms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Hóa đơn thanh toán cho hồ sơ bệnh án (Billed in: MedicalRecord 1 - 0..1 Invoice).
 */
@Entity
@Table(name = "Invoice")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "invoiceId")
    private Integer invoiceId;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recordId", nullable = false, unique = true)
    private MedicalRecord medicalRecord;

    @Column(name = "invoiceDate", nullable = false)
    private LocalDateTime invoiceDate;

    @Column(name = "totalAmount", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "discountAmount", precision = 12, scale = 2)
    private BigDecimal discountAmount;

    @Column(name = "status", nullable = false, length = 30)
    private String status;
}
