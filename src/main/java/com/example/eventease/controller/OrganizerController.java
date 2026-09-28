package com.example.eventease.controller;

import com.example.eventease.entity.Organizer;
import com.example.eventease.repository.OrganizerRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/organizers")
public class OrganizerController {

    @Autowired
    private OrganizerRepository organizerRepository;

    @PostMapping
    public ResponseEntity<Organizer> createOrganizer(@Valid @RequestBody Organizer organizer) {
        if (organizer.getId() == null || organizer.getId().trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        Organizer savedOrganizer = organizerRepository.save(organizer);
        return new ResponseEntity<>(savedOrganizer, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Organizer> getOrganizerById(@PathVariable String id) {
        return organizerRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
