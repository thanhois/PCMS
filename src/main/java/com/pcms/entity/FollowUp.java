package com.pcms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

/**
 * Lịch tái khám / theo dõi sau điều trị (Receives: Pet 1 - N FollowUp, Schedules: MedicalRecord 1 - N FollowUp).
 */
@Entity
@Table(name = "FollowUp")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FollowUp {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "followUpId")
    private Integer followUpId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "petId", nullable = false)
    private Pet pet;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recordId", nullable = false)
    private MedicalRecord medicalRecord;

    @Column(name = "followUpDate", nullable = false)
    private LocalDate followUpDate;

    @Column(name = "followUpType", nullable = false, length = 100)
    private String followUpType;

    @Column(name = "notes", length = 1000)
    private String notes;

    @Column(name = "status", nullable = false, length = 30)
    private String status;
}
