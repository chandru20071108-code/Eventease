let currentStudentId = 1;

document.getElementById('loginBtn').addEventListener('click', () => {
    const input = document.getElementById('studentIdInput').value;
    if (input) {
        currentStudentId = parseInt(input);
        alert(`Logged in as Student ID: ${currentStudentId}`);
    }
});

async function fetchEvents() {
    try {
        const res = await fetch('/api/events');
        if (!res.ok) throw new Error("Failed");
        const events = await res.json();
        renderEvents(events);
    } catch (e) {
        console.error("Failed to fetch events", e);
        document.getElementById('eventsGrid').innerHTML = `<p>No events found, or server error.</p>`;
    }
}

function renderEvents(events) {
    const grid = document.getElementById('eventsGrid');
    grid.innerHTML = '';
    if (!events || events.length === 0) {
        grid.innerHTML = '<p>No events currently available.</p>';
        return;
    }
    events.forEach(event => {
        const card = document.createElement('div');
        card.className = 'event-card';
        card.innerHTML = `
            <h3>${event.title}</h3>
            <p><strong>Date:</strong> ${event.date}</p>
            <p><strong>Venue:</strong> ${event.venue}</p>
            <p><strong>Max Seats:</strong> ${event.maxSeats}</p>
            <button class="register-btn" onclick="registerForEvent(${event.id})">Register</button>
        `;
        grid.appendChild(card);
    });
}

async function registerForEvent(eventId) {
    try {
        const res = await fetch(`/api/registrations/event/${eventId}/student/${currentStudentId}`, {
            method: 'POST'
        });
        if (res.ok) {
            alert('Successfully registered!');
        } else {
            alert(`Failed to register. Maybe capacity is full or already registered?`);
        }
    } catch (e) {
        alert('An error occurred during registration.');
    }
}

fetchEvents();
