package com.pcms.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Chi tiết dịch vụ thực hiện trong một lần khám (Requires: MedicalRecord 1 - N MedicalRecordDetail, Service 1 - N MedicalRecordDetail).
 */
@Entity
@Table(name = "MedicalRecordDetail")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicalRecordDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "recordDetailId")
    private Integer recordDetailId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recordId", nullable = false)
    private MedicalRecord medicalRecord;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "serviceId", nullable = false)
    private Service service;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Column(name = "notes", length = 500)
    private String notes;
}
