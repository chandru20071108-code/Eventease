package com.example.eventease.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RootController {

    @GetMapping("/")
    public String home() {
        return "Welcome to EventEase API! Your application is running successfully. \n\n" +
               "Available endpoints: \n" +
               "- /api/events \n" +
               "- /api/registrations";
    }
}
