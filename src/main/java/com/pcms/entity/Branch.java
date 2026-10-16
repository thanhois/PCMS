package com.pcms.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Chi nhánh phòng khám.
 */
@Entity
@Table(name = "Branch")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Branch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "branchId")
    private Integer branchId;

    @Column(name = "branchName", nullable = false, length = 150)
    private String branchName;

    @Column(name = "address", nullable = false, length = 255)
    private String address;

    @Column(name = "phoneNumber", nullable = false, length = 20)
    private String phoneNumber;
}
