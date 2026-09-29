package com.example.eventease.repository;

import com.example.eventease.entity.Registration;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import com.example.eventease.entity.RegistrationStatus;

public interface RegistrationRepository extends JpaRepository<Registration, Long> {
    long countByEventIdAndStatus(Long eventId, RegistrationStatus status);
    List<Registration> findByEventIdAndStatus(Long eventId, RegistrationStatus status);
    List<Registration> findByStudentIdAndStatus(String studentId, RegistrationStatus status);
    Optional<Registration> findByEventIdAndStudentId(Long eventId, String studentId);
    void deleteByEventId(Long eventId);
}
