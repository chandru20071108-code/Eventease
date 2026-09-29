package com.example.eventease.service;

import com.example.eventease.entity.Event;
import com.example.eventease.entity.Organizer;
import com.example.eventease.exception.ResourceNotFoundException;
import com.example.eventease.repository.EventRepository;
import com.example.eventease.repository.OrganizerRepository;
import com.example.eventease.repository.RegistrationRepository;
import com.example.eventease.controller.EventResponse;
import com.example.eventease.entity.RegistrationStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class EventService {
    
    @Autowired
    private EventRepository eventRepository;
    
    @Autowired
    private OrganizerRepository organizerRepository;

    @Autowired
    private RegistrationRepository registrationRepository;

    private EventResponse mapToResponse(Event event) {
        long count = registrationRepository.countByEventIdAndStatus(event.getId(), RegistrationStatus.REGISTERED);
        return new EventResponse(event, (int) count);
    }

    public Event createEvent(Event event, String organizerId) {
        Organizer organizer = organizerRepository.findById(organizerId)
            .orElseThrow(() -> new ResourceNotFoundException("Organizer not found with id: " + organizerId));
        event.setOrganizer(organizer);
        return eventRepository.save(event);
    }
    
    public List<EventResponse> getAllEvents() {
        return eventRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }
    
    public EventResponse getEventById(Long id) {
        return mapToResponse(getEventEntityById(id));
    }

    private Event getEventEntityById(Long id) {
        return eventRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Event not found with id: " + id));
    }

    public List<EventResponse> getEventsByOrganizer(String organizerId) {
        return eventRepository.findByOrganizerId(organizerId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public Event updateEvent(Long id, Event eventDetails) {
        Event event = getEventEntityById(id);
        event.setTitle(eventDetails.getTitle());
        event.setDate(eventDetails.getDate());
        event.setVenue(eventDetails.getVenue());
        event.setMaxSeats(eventDetails.getMaxSeats());
        return eventRepository.save(event);
    }

    @Transactional
    public void deleteEvent(Long id) {
        Event event = getEventEntityById(id);
        registrationRepository.deleteByEventId(id);
        eventRepository.delete(event);
    }
}
