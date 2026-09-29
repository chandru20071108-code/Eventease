package com.example.eventease.controller;

import com.example.eventease.entity.Registration;
import com.example.eventease.entity.Student;
import com.example.eventease.service.RegistrationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/registrations")
public class RegistrationController {

    @Autowired
    private RegistrationService registrationService;

    @PostMapping("/event/{eventId}/student/{studentId}")
    public ResponseEntity<Registration> registerStudent(
            @PathVariable Long eventId, 
            @PathVariable String studentId) {
        Registration reg = registrationService.registerStudentForEvent(eventId, studentId);
        return new ResponseEntity<>(reg, HttpStatus.CREATED);
    }

    @GetMapping("/event/{eventId}/participants")
    public ResponseEntity<List<Student>> getParticipants(@PathVariable Long eventId) {
        return ResponseEntity.ok(registrationService.getRegisteredParticipants(eventId));
    }

    @DeleteMapping("/event/{eventId}/student/{studentId}")
    public ResponseEntity<String> cancelRegistration(
            @PathVariable Long eventId, 
            @PathVariable String studentId) {
        registrationService.cancelRegistration(eventId, studentId);
        return ResponseEntity.ok("Registration cancelled successfully.");
    }

    @GetMapping("/student/{studentId}")
    public ResponseEntity<List<com.example.eventease.controller.EventResponse>> getEventsForStudent(@PathVariable String studentId) {
        return ResponseEntity.ok(registrationService.getEventsForStudent(studentId));
    }
}
