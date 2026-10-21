package com.pcms.repository;

import com.pcms.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Integer> {
    long countByAppointmentDateBetween(LocalDateTime start, LocalDateTime end);
    List<Appointment> findByAppointmentDateBetween(LocalDateTime start, LocalDateTime end);
}
