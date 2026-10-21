package com.pcms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * Danh mục thuốc trong kho phòng khám.
 */
@Entity
@Table(name = "Medicine")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Medicine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "medicineId")
    private Integer medicineId;

    @Column(name = "medicineName", nullable = false, length = 150)
    private String medicineName;

    @Column(name = "unit", nullable = false, length = 50)
    private String unit;

    @Column(name = "unitPrice", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPrice;

    @Builder.Default
    @Column(name = "status", length = 20)
    private String status = "ACTIVE";

    @Builder.Default
    @Column(name = "minThreshold")
    private Integer minThreshold = 20;
}
