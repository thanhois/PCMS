package com.pcms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

/**
 * Đơn thuốc gắn với hồ sơ bệnh án (Has: MedicalRecord 1 - 0..1 Prescription).
 */
@Entity
@Table(name = "Prescription")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Prescription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "prescriptionId")
    private Integer prescriptionId;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recordId", nullable = false, unique = true)
    private MedicalRecord medicalRecord;

    @Column(name = "prescribedDate", nullable = false)
    private LocalDate prescribedDate;

    @Column(name = "instructions", length = 1000)
    private String instructions;
}
