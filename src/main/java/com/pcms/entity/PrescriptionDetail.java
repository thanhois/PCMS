package com.pcms.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Chi tiết thuốc trong đơn thuốc (Includes: Prescription 1 - N PrescriptionDetail, Stored in: Medicine 1 - N PrescriptionDetail).
 */
@Entity
@Table(name = "PrescriptionDetail")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrescriptionDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "prescriptionDetailId")
    private Integer prescriptionDetailId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "prescriptionId", nullable = false)
    private Prescription prescription;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "medicineId", nullable = false)
    private Medicine medicine;

    @Column(name = "dosage", nullable = false, length = 150)
    private String dosage;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Column(name = "notes", length = 500)
    private String notes;
}
