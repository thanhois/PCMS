package com.pcms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Hồ sơ bệnh án (Has: Pet 1 - N MedicalRecord, Examines: UserAccount 1 - N MedicalRecord).
 */
@Entity
@Table(name = "MedicalRecord")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicalRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "recordId")
    private Integer recordId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "petId", nullable = false)
    private Pet pet;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "veterinarianId", nullable = false)
    private UserAccount veterinarian;

    @Column(name = "visitDate", nullable = false)
    private LocalDateTime visitDate;

    @Column(name = "symptoms", nullable = false, length = 1000)
    private String symptoms;

    @Column(name = "diagnosis", nullable = false, length = 1000)
    private String diagnosis;

    @Column(name = "treatmentPlan", length = 2000)
    private String treatmentPlan;
}
