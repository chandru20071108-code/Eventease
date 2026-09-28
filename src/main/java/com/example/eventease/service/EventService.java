package com.example.eventease.service;

import com.example.eventease.entity.Event;
import com.example.eventease.entity.Organizer;
import com.example.eventease.exception.ResourceNotFoundException;
import com.example.eventease.repository.EventRepository;
import com.example.eventease.repository.OrganizerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class EventService {
    
    @Autowired
    private EventRepository eventRepository;
    
    @Autowired
    private OrganizerRepository organizerRepository;

    public Event createEvent(Event event, String organizerId) {
        Organizer organizer = organizerRepository.findById(organizerId)
            .orElseThrow(() -> new ResourceNotFoundException("Organizer not found with id: " + organizerId));
        event.setOrganizer(organizer);
        return eventRepository.save(event);
    }
    
    public List<Event> getAllEvents() {
        return eventRepository.findAll();
    }
    
    public Event getEventById(Long id) {
        return eventRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Event not found with id: " + id));
    }

    public List<Event> getEventsByOrganizer(String organizerId) {
        return eventRepository.findByOrganizerId(organizerId);
    }

    public Event updateEvent(Long id, Event eventDetails) {
        Event event = getEventById(id);
        event.setTitle(eventDetails.getTitle());
        event.setDate(eventDetails.getDate());
        event.setVenue(eventDetails.getVenue());
        event.setMaxSeats(eventDetails.getMaxSeats());
        return eventRepository.save(event);
    }

    public void deleteEvent(Long id) {
        Event event = getEventById(id);
        eventRepository.delete(event);
    }
}
