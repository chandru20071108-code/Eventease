package com.example.eventease.service;

import com.example.eventease.entity.Event;
import com.example.eventease.entity.Registration;
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
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found with id: " + eventId));
        
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with id: " + studentId));

        long currentRegistrations = registrationRepository.countByEventId(eventId);
        if (currentRegistrations >= event.getMaxSeats()) {
            throw new CapacityFullException("Registration is auto-closed. Maximum capacity of " + event.getMaxSeats() + " has been reached for this event.");
        }

        if (registrationRepository.findByEventIdAndStudentId(eventId, studentId).isPresent()) {
            throw new CapacityFullException("Student is already registered for this event.");
        }

        Registration registration = new Registration();
        registration.setEvent(event);
        registration.setStudent(student);

        return registrationRepository.save(registration);
    }

    public List<Student> getRegisteredParticipants(Long eventId) {
        List<Registration> registrations = registrationRepository.findByEventId(eventId);
        return registrations.stream()
                .map(Registration::getStudent)
                .collect(Collectors.toList());
    }

    public List<Event> getEventsForStudent(String studentId) {
        List<Registration> registrations = registrationRepository.findByStudentId(studentId);
        return registrations.stream()
                .map(Registration::getEvent)
                .collect(Collectors.toList());
    }

    @Transactional
    public void cancelRegistration(Long eventId, String studentId) {
        Registration registration = registrationRepository.findByEventIdAndStudentId(eventId, studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Registration not found for student " + studentId + " in event " + eventId));
        
        Event event = registration.getEvent();
        if (!event.getDate().isAfter(java.time.LocalDate.now())) {
            throw new IllegalArgumentException("Cannot cancel registration for an event that has already started or passed.");
        }

        registrationRepository.delete(registration);
    }
}
