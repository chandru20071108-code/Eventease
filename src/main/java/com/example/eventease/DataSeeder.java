package com.example.eventease;

import com.example.eventease.entity.Organizer;
import com.example.eventease.entity.Student;
import com.example.eventease.repository.OrganizerRepository;
import com.example.eventease.repository.StudentRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DataSeeder {

    @Bean
    CommandLineRunner initDatabase(OrganizerRepository organizerRepo, StudentRepository studentRepo) {
        return args -> {
            if (organizerRepo.count() == 0) {
                Organizer organizer = new Organizer();
                organizer.setId("ORG123");
                organizer.setName("Tech Club");
                organizer.setEmail("techclub@example.com");
                organizerRepo.save(organizer);
                System.out.println("===> Seeded Organizer with ID ORG123");
            }
            if (studentRepo.count() == 0) {
                Student student = new Student();
                student.setId("25AM015");
                student.setName("Alice Smith");
                student.setEmail("alice@example.com");
                studentRepo.save(student);
                System.out.println("===> Seeded Student with ID 25AM015");
            }
        };
    }
}
