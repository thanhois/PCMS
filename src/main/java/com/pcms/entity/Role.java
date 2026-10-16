package com.pcms.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Vai trò trong hệ thống (ADMIN, VETERINARIAN, RECEPTIONIST, PET_OWNER).
 */
@Entity
@Table(name = "Role")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "roleId")
    private Integer roleId;

    @Column(name = "roleName", nullable = false, unique = true, length = 50)
    private String roleName;

    @Column(name = "description", length = 255)
    private String description;
}
