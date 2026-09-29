package com.example.eventease.controller;

import com.example.eventease.repository.EventRepository;
import com.example.eventease.repository.OrganizerRepository;
import com.example.eventease.repository.RegistrationRepository;
import com.example.eventease.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {
    
    @Autowired
    private EventRepository eventRepository;
    
    @Autowired
    private StudentRepository studentRepository;
    
    @Autowired
    private OrganizerRepository organizerRepository;
    
    @Autowired
    private RegistrationRepository registrationRepository;

    @GetMapping
    public Map<String, Long> getDashboardStats() {
        Map<String, Long> stats = new HashMap<>();
        stats.put("totalEvents", eventRepository.count());
        stats.put("totalStudents", studentRepository.count());
        stats.put("totalOrganizers", organizerRepository.count());
        stats.put("totalRegistrations", registrationRepository.count());
        return stats;
    }
}
