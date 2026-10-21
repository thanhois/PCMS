package com.pcms.repository;

import com.pcms.entity.Service;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ServiceRepository extends JpaRepository<Service, Integer> {
    boolean existsByServiceNameIgnoreCase(String serviceName);
}
