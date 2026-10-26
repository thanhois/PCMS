package com.pcms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Thú cưng thuộc sở hữu của một PetOwner (quan hệ Owns: PetOwner 1 - N Pet).
 */
@Entity
@Table(name = "Pet")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Pet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "petId")
    private Integer petId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ownerId", nullable = false)
    private PetOwner petOwner;

    @Column(name = "petName", nullable = false, length = 100)
    private String petName;

    @Column(name = "species", nullable = false, length = 50)
    private String species;

    @Column(name = "breed", length = 100)
    private String breed;

    @Column(name = "gender", nullable = false, length = 20)
    private String gender;

    @Column(name = "dateOfBirth")
    private LocalDate dateOfBirth;

    @Column(name = "weight", precision = 6, scale = 2)
    private BigDecimal weight;

    @Builder.Default
    @Column(name = "status", length = 20)
    private String status = "ACTIVE";
}
