package com.example.eventease.controller;

import com.example.eventease.entity.Event;
import com.example.eventease.entity.Organizer;
import java.time.LocalDate;

public class EventResponse {
    private Long id;
    private String title;
    private LocalDate eventDate;
    private String venue;
    private Integer maxSeats;
    private Integer registeredSeats;
    private Integer registeredCount;
    private Integer availableSeats;
    private Organizer organizer;
    private String organizerId;

    public EventResponse() {}

    public EventResponse(Event event, int registeredSeats) {
        this.id = event.getId();
        this.title = event.getTitle();
        this.eventDate = event.getDate();
        this.venue = event.getVenue();
        this.maxSeats = event.getMaxSeats();
        this.registeredSeats = registeredSeats;
        this.registeredCount = registeredSeats;
        this.availableSeats = Math.max(0, this.maxSeats - this.registeredSeats);
        this.organizer = event.getOrganizer();
        if (event.getOrganizer() != null) {
            this.organizerId = event.getOrganizer().getId();
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public LocalDate getEventDate() { return eventDate; }
    public void setEventDate(LocalDate eventDate) { this.eventDate = eventDate; }
    public String getVenue() { return venue; }
    public void setVenue(String venue) { this.venue = venue; }
    public Integer getMaxSeats() { return maxSeats; }
    public void setMaxSeats(Integer maxSeats) { this.maxSeats = maxSeats; }
    public Integer getRegisteredSeats() { return registeredSeats; }
    public void setRegisteredSeats(Integer registeredSeats) { this.registeredSeats = registeredSeats; }
    public Integer getRegisteredCount() { return registeredCount; }
    public void setRegisteredCount(Integer registeredCount) { this.registeredCount = registeredCount; }
    public Integer getAvailableSeats() { return availableSeats; }
    public void setAvailableSeats(Integer availableSeats) { this.availableSeats = availableSeats; }
    public Organizer getOrganizer() { return organizer; }
    public void setOrganizer(Organizer organizer) { this.organizer = organizer; }
    public String getOrganizerId() { return organizerId; }
    public void setOrganizerId(String organizerId) { this.organizerId = organizerId; }
}
