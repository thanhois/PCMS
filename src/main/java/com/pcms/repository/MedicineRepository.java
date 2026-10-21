package com.pcms.repository;

import com.pcms.entity.Medicine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MedicineRepository extends JpaRepository<Medicine, Integer> {
    boolean existsByMedicineNameIgnoreCase(String medicineName);
}
