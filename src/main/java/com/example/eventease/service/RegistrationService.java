package com.example.eventease.service;

import com.example.eventease.entity.Event;
import com.example.eventease.controller.EventResponse;
import com.example.eventease.entity.Registration;
import com.example.eventease.entity.RegistrationStatus;
import com.example.eventease.entity.Student;
import com.example.eventease.exception.CapacityFullException;
import com.example.eventease.exception.ResourceNotFoundException;
import com.example.eventease.repository.EventRepository;
import com.example.eventease.repository.RegistrationRepository;
import com.example.eventease.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class RegistrationService {

    @Autowired
    private RegistrationRepository registrationRepository;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Transactional
    public Registration registerStudentForEvent(Long eventId, String studentId) {
        Event event = eventRepository.findByIdWithLock(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found with id: " + eventId));
        
        if (event.getDate().isBefore(java.time.LocalDate.now())) {
            throw new IllegalArgumentException("Cannot register for an event that has already occurred.");
        }

        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with id: " + studentId));

        java.util.Optional<Registration> existingOpt = registrationRepository.findByEventIdAndStudentId(eventId, studentId);
        
        if (existingOpt.isPresent()) {
            Registration existing = existingOpt.get();
            if (existing.getStatus() == RegistrationStatus.REGISTERED) {
                throw new CapacityFullException("Student is already registered for this event.");
            }
            
            long currentRegistrations = registrationRepository.countByEventIdAndStatus(eventId, RegistrationStatus.REGISTERED);
            if (currentRegistrations >= event.getMaxSeats()) {
                throw new CapacityFullException("Event is full. No seats are available.");
            }
            
            existing.setStatus(RegistrationStatus.REGISTERED);
            existing.setRegistrationDate(java.time.LocalDateTime.now());
            return registrationRepository.save(existing);
        }

        long currentRegistrations = registrationRepository.countByEventIdAndStatus(eventId, RegistrationStatus.REGISTERED);
        if (currentRegistrations >= event.getMaxSeats()) {
            throw new CapacityFullException("Event is full. No seats are available.");
        }

        Registration registration = new Registration();
        registration.setEvent(event);
        registration.setStudent(student);
        registration.setStatus(RegistrationStatus.REGISTERED);

        return registrationRepository.save(registration);
    }

    public List<Student> getRegisteredParticipants(Long eventId) {
        List<Registration> registrations = registrationRepository.findByEventIdAndStatus(eventId, RegistrationStatus.REGISTERED);
        return registrations.stream()
                .map(Registration::getStudent)
                .collect(Collectors.toList());
    }

    public List<EventResponse> getEventsForStudent(String studentId) {
        List<Registration> registrations = registrationRepository.findByStudentIdAndStatus(studentId, RegistrationStatus.REGISTERED);
        return registrations.stream()
                .map(r -> {
                    long count = registrationRepository.countByEventIdAndStatus(r.getEvent().getId(), RegistrationStatus.REGISTERED);
                    return new EventResponse(r.getEvent(), (int) count);
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public void cancelRegistration(Long eventId, String studentId) {
        Registration registration = registrationRepository.findByEventIdAndStudentId(eventId, studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Registration not found for student " + studentId + " in event " + eventId));
        
        Event event = registration.getEvent();
        if (event.getDate().isBefore(java.time.LocalDate.now())) {
            throw new IllegalArgumentException("Registration cannot be cancelled after the event date.");
        }

        registration.setStatus(RegistrationStatus.CANCELLED);
        registrationRepository.save(registration);
    }
}
