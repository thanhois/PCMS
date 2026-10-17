package com.pcms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

/**
 * Lô hàng tồn kho của thuốc (Stored in: Medicine 1 - N InventoryBatch).
 */
@Entity
@Table(name = "InventoryBatch")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryBatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "batchId")
    private Integer batchId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "medicineId", nullable = false)
    private Medicine medicine;

    @Column(name = "batchNumber", nullable = false, length = 80)
    private String batchNumber;

    @Column(name = "expirationDate", nullable = false)
    private LocalDate expirationDate;

    @Column(name = "quantityInStock", nullable = false)
    private Integer quantityInStock;
}
