package com.example.eventease.repository;

import com.example.eventease.entity.Registration;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface RegistrationRepository extends JpaRepository<Registration, Long> {
    long countByEventId(Long eventId);
    List<Registration> findByEventId(Long eventId);
    List<Registration> findByStudentId(String studentId);
    Optional<Registration> findByEventIdAndStudentId(Long eventId, String studentId);
}
