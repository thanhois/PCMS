package com.pcms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Lịch hẹn khám của PetOwner cho Pet (Books: PetOwner 1 - N Appointment, Has: Pet 1 - N Appointment).
 */
@Entity
@Table(name = "Appointment")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "appointmentId")
    private Integer appointmentId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ownerId", nullable = false)
    private PetOwner petOwner;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "petId", nullable = false)
    private Pet pet;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "veterinarianId")
    private UserAccount veterinarian;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "serviceId")
    private Service service;

    @Column(name = "appointmentDate", nullable = false)
    private LocalDateTime appointmentDate;

    @Column(name = "reason", length = 500)
    private String reason;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "shift", length = 20)
    private String shift;

    @Column(name = "notes", length = 1000)
    private String notes;

    @Column(name = "rejectionReason", length = 500)
    private String rejectionReason;

    @Column(name = "checkInTime")
    private LocalDateTime checkInTime;
}
