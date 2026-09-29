# EventEase 🎉

EventEase is a complete Event Management system featuring a Spring Boot backend and a lightweight Vanilla JS frontend. It allows organizers to create and manage events while letting students register and track their events seamlessly.

## 🚀 Features

- **Organizer Dashboard:** Create new events, set capacity limits, and view registered students.
- **Student Dashboard:** View available events, register with one click, and check registration status.
- **Real-time API Integration:** Fast and responsive SPA built with Vite.
- **Database seeder:** Automatically creates test users on startup.

## 🛠️ Technology Stack

- **Backend:** Java 17, Spring Boot 3.1.5, Spring Data JPA, MySQL
- **Frontend:** HTML, Vanilla JavaScript, CSS, Vite (Build Tool)

## ⚙️ Prerequisites

Before you begin, ensure you have met the following requirements:
- **Java 17** installed.
- **Node.js** (v18+) and npm installed.
- **MySQL Server** installed and running on default port `3306`.
- **Maven** installed (optional, as Spring Boot can be run via IDE).

## 🗄️ Database Setup

Create a database in your local MySQL instance named `eventease`. 
The application will automatically create the required tables when you start it.

**Default Credentials (can be changed in `application.properties`):**
- Username: `root`
- Password: `8117`

## 🚦 Running the Application

### 1. Start the Backend (Spring Boot)
The Spring Boot application runs on port `8081` by default.

```bash
# Navigate to the root project directory
cd EventEase

# Run using Maven
mvn spring-boot:run
```

*Note: On startup, the backend automatically seeds a test Organizer (ID: `ORG123`) and a test Student (ID: `25AM015`) for you to use!*

### 2. Start the Frontend (Vite)
The frontend uses Vite for a lightning-fast development experience.

```bash
# Navigate to the frontend directory
cd project

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open your browser and navigate to `http://localhost:5173` to see the app!

## 🧪 Testing Credentials

You can use the following seeded credentials to test the dashboards:

- **Student Login ID:** `25AM015`
- **Organizer Login ID:** `ORG123`

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

