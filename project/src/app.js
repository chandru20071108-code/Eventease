/* ============================================================
   EventEase — Application Logic
   Vanilla JS SPA with Spring Boot API integration
   ============================================================ */

const API_BASE = 'http://localhost:8081';

/* ====================== State ====================== */
let currentStudentId = null;
let currentOrganizerId = null;
let editingEventId = null;
let registerEventId = null;
let allEventsCache = [];

/* ====================== DOM refs ====================== */
const navbar = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
const navLinkEls = document.querySelectorAll('.nav-link, .nav-logo');
const pages = document.querySelectorAll('.page');

const eventGrid = document.getElementById('eventGrid');
const eventsEmpty = document.getElementById('eventsEmpty');

const studentLoginForm = document.getElementById('studentLoginForm');
const studentIdInput = document.getElementById('studentIdInput');
const studentResults = document.getElementById('studentResults');
const studentEventsGrid = document.getElementById('studentEventsGrid');
const studentEventsEmpty = document.getElementById('studentEventsEmpty');
const studentWelcome = document.getElementById('studentWelcome');
const studentLogout = document.getElementById('studentLogout');

const organizerLoginForm = document.getElementById('organizerLoginForm');
const organizerIdInput = document.getElementById('organizerIdInput');
const organizerResults = document.getElementById('organizerResults');
const organizerEventsGrid = document.getElementById('organizerEventsGrid');
const organizerEventsEmpty = document.getElementById('organizerEventsEmpty');
const organizerWelcome = document.getElementById('organizerWelcome');
const organizerLogout = document.getElementById('organizerLogout');
const createEventBtn = document.getElementById('createEventBtn');

const eventModal = document.getElementById('eventModal');
const eventForm = document.getElementById('eventForm');
const modalTitle = document.getElementById('modalTitle');
const modalSubmit = document.getElementById('modalSubmit');
const modalClose = document.getElementById('modalClose');
const modalCancel = document.getElementById('modalCancel');
const eventIdField = document.getElementById('eventIdField');
const eventTitleInput = document.getElementById('eventTitle');
const eventDateInput = document.getElementById('eventDate');
const eventMaxSeatsInput = document.getElementById('eventMaxSeats');
const eventVenueInput = document.getElementById('eventVenue');
const eventOrganizerIdInput = document.getElementById('eventOrganizerId');
const organizerFieldGroup = document.getElementById('organizerFieldGroup');

const registerModal = document.getElementById('registerModal');
const registerModalClose = document.getElementById('registerModalClose');
const registerCancel = document.getElementById('registerCancel');
const registerForm = document.getElementById('registerForm');
const registerStudentIdInput = document.getElementById('registerStudentId');
const registerEventName = document.getElementById('registerEventName');

const toastContainer = document.getElementById('toastContainer');
const browseBtn = document.getElementById('browseBtn');

/* ====================== API Helpers ====================== */
async function apiFetch(path, options = {}) {
  const url = API_BASE + path;
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(errText || `Request failed (${res.status})`);
    }

    // 204 No Content or empty body
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
      throw new Error('Cannot connect to server at ' + API_BASE + '. Is your Spring Boot backend running?');
    }
    throw err;
  }
}

async function fetchAllEvents() {
  return apiFetch('/api/events');
}

async function fetchStudentRegistrations(studentId) {
  return apiFetch('/api/registrations/student/' + encodeURIComponent(studentId));
}

async function createEvent(eventData) {
  return apiFetch('/api/events/organizer/' + encodeURIComponent(currentOrganizerId), {
    method: 'POST',
    body: JSON.stringify(eventData),
  });
}

async function deleteEvent(id) {
  return apiFetch('/api/events/' + encodeURIComponent(id), { method: 'DELETE' });
}

async function registerForEvent(eventId, studentId) {
  return apiFetch(
    '/api/registrations/event/' + encodeURIComponent(eventId) +
    '/student/' + encodeURIComponent(studentId),
    { method: 'POST' }
  );
}

/* ====================== Toast Notifications ====================== */
function toast(message, type = 'info') {
  const el = document.createElement('div');
  el.className = 'toast toast-' + type;
  const icon =
    type === 'success'
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>'
      : type === 'error'
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>';
  el.innerHTML = icon + '<span>' + message + '</span>';
  toastContainer.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 400);
  }, 4000);
}

/* ====================== SPA Navigation ====================== */
function navigateTo(pageName) {
  pages.forEach((p) => p.classList.remove('active'));
  const target = document.getElementById('page-' + pageName);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-link').forEach((link) => {
    link.classList.toggle('active', link.dataset.page === pageName);
  });

  // Close mobile menu
  navLinks.classList.remove('open');
  navToggle.classList.remove('open');
  navToggle.setAttribute('aria-expanded', 'false');

  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Trigger reveal observer for newly visible elements
  setTimeout(() => observeReveals(), 100);
}

navLinkEls.forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const page = link.dataset.page;
    if (page) navigateTo(page);
  });
});

/* ====================== Mobile Nav Toggle ====================== */
navToggle.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  navToggle.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', isOpen);
});

/* ====================== Navbar Scroll ====================== */
let scrollTicking = false;
window.addEventListener('scroll', () => {
  if (scrollTicking) return;
  scrollTicking = true;
  requestAnimationFrame(() => {
    if (window.scrollY > 20) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
    scrollTicking = false;
  });
}, { passive: true });

/* ====================== Scroll Reveal ====================== */
let revealObserver = null;

function observeReveals() {
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
  }
  document.querySelectorAll('.reveal:not(.visible)').forEach((el) => {
    revealObserver.observe(el);
  });
}

/* ====================== Date Formatting ====================== */
function formatDate(dateStr) {
  if (!dateStr) return 'TBD';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/* ====================== Seats Calculation ====================== */
function getSeatsInfo(event) {
  const max = event.maxSeats || event.max_seats || 0;
  const registered = event.registeredCount || event.registered_count || 0;
  const available = Math.max(0, max - registered);
  return { max, registered, available };
}

function seatsBadgeClass(available, max) {
  if (available <= 0) return 'seats-full';
  if (available <= max * 0.2) return 'seats-low';
  return 'seats-available';
}

/* ====================== Event Card Rendering ====================== */
const bannerVariants = ['', 'variant-2', 'variant-3', 'variant-4', 'variant-5'];

function getBannerClass(index) {
  return bannerVariants[index % bannerVariants.length];
}

function createEventCard(event, index, options = {}) {
  const { showManageActions = false } = options;
  const id = event.id ?? event.eventId ?? event.event_id ?? '?';
  const title = event.title || event.eventTitle || event.event_title || 'Untitled Event';
  const date = event.date || event.eventDate || event.event_date || '';
  const venue = event.venue || event.eventVenue || event.event_venue || 'TBD';
  const { max, available } = getSeatsInfo(event);
  const seatsClass = seatsBadgeClass(available, max);
  const bannerClass = getBannerClass(index);

  const card = document.createElement('div');
  card.className = 'event-card reveal';

  const seatsLabel = available <= 0 ? 'Full' : available + ' / ' + max + ' seats';

  if (showManageActions) {
    card.innerHTML = `
      <div class="event-card-banner ${bannerClass}">
        <div class="event-card-date-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/></svg>
          ${formatDate(date)}
        </div>
      </div>
      <div class="event-card-body">
        <h3 class="event-card-title">${escapeHtml(title)}</h3>
        <div class="event-card-info">
          <div class="event-info-row">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            ${escapeHtml(venue)}
          </div>
          <div class="event-info-row">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Max ${max} seats
          </div>
        </div>
        <div class="event-card-seats">
          <span class="seats-badge ${seatsClass}">${seatsLabel}</span>
        </div>
      </div>
      <div class="event-card-actions">
        <button class="btn btn-ghost btn-sm" data-action="edit" data-id="${id}">Edit</button>
        <button class="btn btn-danger btn-sm" data-action="delete" data-id="${id}">Delete</button>
      </div>
    `;
  } else {
    const isFull = available <= 0;
    card.innerHTML = `
      <div class="event-card-banner ${bannerClass}">
        <div class="event-card-date-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/></svg>
          ${formatDate(date)}
        </div>
      </div>
      <div class="event-card-body">
        <h3 class="event-card-title">${escapeHtml(title)}</h3>
        <div class="event-card-info">
          <div class="event-info-row">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            ${escapeHtml(venue)}
          </div>
          <div class="event-info-row">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/></svg>
            ${formatDate(date)}
          </div>
        </div>
        <div class="event-card-seats">
          <span class="seats-badge ${seatsClass}">${seatsLabel}</span>
        </div>
      </div>
      <div class="event-card-actions">
        <button class="btn btn-primary btn-sm" data-action="register" data-id="${id}" data-title="${escapeHtml(title)}" ${isFull ? 'disabled' : ''}>
          ${isFull ? 'Sold Out' : 'Register'}
        </button>
      </div>
    `;
  }

  // Wire up action buttons
  card.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const eventId = btn.dataset.id;
      if (action === 'register') {
        openRegisterModal(eventId, btn.dataset.title);
      } else if (action === 'edit') {
        openEditModal(eventId);
      } else if (action === 'delete') {
        handleDeleteEvent(eventId);
      }
    });
  });

  return card;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

/* ====================== Loading Skeletons ====================== */
function renderSkeletons(container, count = 3) {
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const skel = document.createElement('div');
    skel.className = 'skeleton-card';
    skel.innerHTML = `
      <div class="skeleton-banner"></div>
      <div class="skeleton-line long"></div>
      <div class="skeleton-line short"></div>
      <div class="skeleton-line long"></div>
    `;
    container.appendChild(skel);
  }
}

/* ====================== Load & Render All Events ====================== */
async function loadAllEvents() {
  renderSkeletons(eventGrid, 6);
  eventsEmpty.classList.add('hidden');

  try {
    const events = await fetchAllEvents();
    allEventsCache = Array.isArray(events) ? events : [];
    renderAllEvents();
  } catch (err) {
    eventGrid.innerHTML = '';
    eventsEmpty.classList.remove('hidden');
    eventsEmpty.querySelector('p').textContent = 'Failed to load events: ' + err.message;
    toast('Failed to load events', 'error');
  }
}

function renderAllEvents() {
  eventGrid.innerHTML = '';
  if (allEventsCache.length === 0) {
    eventsEmpty.classList.remove('hidden');
    return;
  }
  eventsEmpty.classList.add('hidden');
  allEventsCache.forEach((event, i) => {
    eventGrid.appendChild(createEventCard(event, i));
  });
  observeReveals();
}

/* ====================== Student Dashboard ====================== */
studentLoginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const studentId = studentIdInput.value.trim();
  if (!studentId) return;

  // Verify student exists
  try {
    const res = await fetch(API_BASE + '/api/students/' + encodeURIComponent(studentId));
    if (!res.ok) {
      toast('Student ID not found. Please create an account.', 'error');
      return;
    }
  } catch (err) {
    toast('Network error verifying student.', 'error');
    return;
  }

  currentStudentId = studentId;
  studentLoginForm.parentElement.classList.add('hidden');
  studentResults.classList.remove('hidden');
  studentWelcome.textContent = 'Loading your events...';
  renderSkeletons(studentEventsGrid, 2);
  studentEventsEmpty.classList.add('hidden');

  try {
    const events = await fetchStudentRegistrations(studentId);
    renderStudentEvents(Array.isArray(events) ? events : []);
  } catch (err) {
    studentEventsGrid.innerHTML = '';
    studentEventsEmpty.classList.remove('hidden');
    studentEventsEmpty.querySelector('p').textContent = 'Failed to load your events: ' + err.message;
    toast('Failed to load registrations', 'error');
  }
});

function renderStudentEvents(events) {
  studentWelcome.textContent = 'Student ID: ' + currentStudentId + ' — ' + events.length + ' event(s) registered';
  studentEventsGrid.innerHTML = '';
  if (events.length === 0) {
    studentEventsEmpty.classList.remove('hidden');
    return;
  }
  studentEventsEmpty.classList.add('hidden');
  events.forEach((event, i) => {
    studentEventsGrid.appendChild(createEventCard(event, i));
  });
  observeReveals();
}

studentLogout.addEventListener('click', () => {
  currentStudentId = null;
  studentResults.classList.add('hidden');
  studentLoginForm.parentElement.classList.remove('hidden');
  studentIdInput.value = '';
});

/* ====================== Organizer Dashboard ====================== */
organizerLoginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const orgId = organizerIdInput.value.trim();
  if (!orgId) return;

  // Verify organizer exists
  try {
    const res = await fetch(API_BASE + '/api/organizers/' + encodeURIComponent(orgId));
    if (!res.ok) {
      toast('Organizer ID not found. Please create an account.', 'error');
      return;
    }
  } catch (err) {
    toast('Network error verifying organizer.', 'error');
    return;
  }

  currentOrganizerId = orgId;
  organizerLoginForm.parentElement.classList.add('hidden');
  organizerResults.classList.remove('hidden');
  organizerWelcome.textContent = 'Loading your events...';
  renderSkeletons(organizerEventsGrid, 2);
  organizerEventsEmpty.classList.add('hidden');

  try {
    const allEvents = await fetchAllEvents();
    const orgEvents = (Array.isArray(allEvents) ? allEvents : []).filter((ev) => {
      const orgIdField = ev.organizerId || ev.organizer_id || ev.organizerIdId || '';
      return String(orgIdField) === String(currentOrganizerId);
    });
    renderOrganizerEvents(orgEvents);
  } catch (err) {
    organizerEventsGrid.innerHTML = '';
    organizerEventsEmpty.classList.remove('hidden');
    organizerEventsEmpty.querySelector('p').textContent = 'Failed to load events: ' + err.message;
    toast('Failed to load your events', 'error');
  }
});

function renderOrganizerEvents(events) {
  organizerWelcome.textContent = 'Organizer ID: ' + currentOrganizerId + ' — managing ' + events.length + ' event(s)';
  organizerEventsGrid.innerHTML = '';
  if (events.length === 0) {
    organizerEventsEmpty.classList.remove('hidden');
    return;
  }
  organizerEventsEmpty.classList.add('hidden');
  events.forEach((event, i) => {
    organizerEventsGrid.appendChild(createEventCard(event, i, { showManageActions: true }));
  });
  observeReveals();
}

organizerLogout.addEventListener('click', () => {
  currentOrganizerId = null;
  organizerResults.classList.add('hidden');
  organizerLoginForm.parentElement.classList.remove('hidden');
  organizerIdInput.value = '';
});

/* ====================== Create / Edit Event Modal ====================== */
function openCreateModal() {
  editingEventId = null;
  modalTitle.textContent = 'Create New Event';
  modalSubmit.textContent = 'Create Event';
  eventForm.reset();
  eventIdField.value = '';
  eventOrganizerIdInput.value = currentOrganizerId || '';
  // Show organizer ID field if not logged in
  if (currentOrganizerId) {
    organizerFieldGroup.classList.add('hidden');
  } else {
    organizerFieldGroup.classList.remove('hidden');
  }
  eventModal.classList.add('open');
  eventModal.setAttribute('aria-hidden', 'false');
  setTimeout(() => eventTitleInput.focus(), 300);
}

function openEditModal(eventId) {
  const event = allEventsCache.find((e) => String(e.id ?? e.eventId ?? e.event_id) === String(eventId));
  if (!event) {
    toast('Event not found', 'error');
    return;
  }

  editingEventId = eventId;
  modalTitle.textContent = 'Edit Event';
  modalSubmit.textContent = 'Save Changes';
  eventIdField.value = String(eventId);
  eventTitleInput.value = event.title || event.eventTitle || '';
  eventDateInput.value = event.date || event.eventDate || '';
  eventMaxSeatsInput.value = event.maxSeats || event.max_seats || '';
  eventVenueInput.value = event.venue || event.eventVenue || '';
  eventOrganizerIdInput.value = currentOrganizerId || event.organizerId || '';
  organizerFieldGroup.classList.add('hidden');

  eventModal.classList.add('open');
  eventModal.setAttribute('aria-hidden', 'false');
  setTimeout(() => eventTitleInput.focus(), 300);
}

function closeEventModal() {
  eventModal.classList.remove('open');
  eventModal.setAttribute('aria-hidden', 'true');
  editingEventId = null;
}

createEventBtn.addEventListener('click', openCreateModal);
modalClose.addEventListener('click', closeEventModal);
modalCancel.addEventListener('click', closeEventModal);
eventModal.addEventListener('click', (e) => {
  if (e.target === eventModal) closeEventModal();
});

eventForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    title: eventTitleInput.value.trim(),
    date: eventDateInput.value,
    venue: eventVenueInput.value.trim(),
    maxSeats: parseInt(eventMaxSeatsInput.value, 10),
    organizerId: eventOrganizerIdInput.value.trim() || currentOrganizerId,
  };

  if (!payload.title || !payload.date || !payload.venue || !payload.maxSeats) {
    toast('Please fill in all fields', 'error');
    return;
  }

  modalSubmit.disabled = true;
  modalSubmit.textContent = editingEventId ? 'Saving...' : 'Creating...';

  try {
    await createEvent(payload);
    toast(editingEventId ? 'Event updated successfully!' : 'Event created successfully!', 'success');
    closeEventModal();

    // Refresh relevant views
    await loadAllEvents();
    if (currentOrganizerId && !organizerResults.classList.contains('hidden')) {
      const allEvents = await fetchAllEvents();
      const orgEvents = allEvents.filter((ev) => {
        const orgIdField = ev.organizerId || ev.organizer_id || '';
        return String(orgIdField) === String(currentOrganizerId);
      });
      renderOrganizerEvents(orgEvents);
    }
  } catch (err) {
    toast('Failed to save event: ' + err.message, 'error');
  } finally {
    modalSubmit.disabled = false;
    modalSubmit.textContent = editingEventId ? 'Save Changes' : 'Create Event';
  }
});

/* ====================== Delete Event ====================== */
async function handleDeleteEvent(eventId) {
  if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) return;

  try {
    await deleteEvent(eventId);
    toast('Event deleted successfully!', 'success');
    await loadAllEvents();
    if (currentOrganizerId && !organizerResults.classList.contains('hidden')) {
      const allEvents = await fetchAllEvents();
      const orgEvents = allEvents.filter((ev) => {
        const orgIdField = ev.organizerId || ev.organizer_id || '';
        return String(orgIdField) === String(currentOrganizerId);
      });
      renderOrganizerEvents(orgEvents);
    }
  } catch (err) {
    toast('Failed to delete event: ' + err.message, 'error');
  }
}

/* ====================== Register Modal ====================== */
function openRegisterModal(eventId, eventTitle) {
  registerEventId = eventId;
  registerEventName.textContent = eventTitle;
  registerStudentIdInput.value = currentStudentId || '';
  registerModal.classList.add('open');
  registerModal.setAttribute('aria-hidden', 'false');
  setTimeout(() => registerStudentIdInput.focus(), 300);
}

function closeRegisterModal() {
  registerModal.classList.remove('open');
  registerModal.setAttribute('aria-hidden', 'true');
  registerEventId = null;
}

registerModalClose.addEventListener('click', closeRegisterModal);
registerCancel.addEventListener('click', closeRegisterModal);
registerModal.addEventListener('click', (e) => {
  if (e.target === registerModal) closeRegisterModal();
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const studentId = registerStudentIdInput.value.trim();
  if (!studentId || !registerEventId) {
    toast('Please enter your Student ID', 'error');
    return;
  }

  const submitBtn = registerForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Registering...';

  try {
    await registerForEvent(registerEventId, studentId);
    toast('Successfully registered for the event!', 'success');
    currentStudentId = studentId;
    closeRegisterModal();
    await loadAllEvents();
  } catch (err) {
    toast('Registration failed: ' + err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Confirm Registration';
  }
});

/* ====================== Browse Button Smooth Scroll ====================== */
browseBtn.addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('events-grid').scrollIntoView({ behavior: 'smooth' });
});

/* ====================== Escape to close modals ====================== */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (eventModal.classList.contains('open')) closeEventModal();
    if (registerModal.classList.contains('open')) closeRegisterModal();
    if (navLinks.classList.contains('open')) {
      navLinks.classList.remove('open');
      navToggle.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  }
});

/* ====================== Init ====================== */
observeReveals();
loadAllEvents();

/* ====================== Signup Logic ====================== */
const openStudentSignup = document.getElementById('openStudentSignup');
const openOrganizerSignup = document.getElementById('openOrganizerSignup');
const studentSignupModal = document.getElementById('studentSignupModal');
const organizerSignupModal = document.getElementById('organizerSignupModal');
const studentSignupClose = document.getElementById('studentSignupClose');
const organizerSignupClose = document.getElementById('organizerSignupClose');
const studentSignupForm = document.getElementById('studentSignupForm');
const organizerSignupForm = document.getElementById('organizerSignupForm');

if (openStudentSignup) {
  openStudentSignup.addEventListener('click', (e) => {
    e.preventDefault();
    studentSignupModal.classList.add('open');
  });
}
if (openOrganizerSignup) {
  openOrganizerSignup.addEventListener('click', (e) => {
    e.preventDefault();
    organizerSignupModal.classList.add('open');
  });
}
if (studentSignupClose) {
  studentSignupClose.addEventListener('click', () => {
    studentSignupModal.classList.remove('open');
  });
}
if (organizerSignupClose) {
  organizerSignupClose.addEventListener('click', () => {
    organizerSignupModal.classList.remove('open');
  });
}

if (studentSignupForm) {
  studentSignupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('signupStudentId').value.trim();
    const name = document.getElementById('signupStudentName').value.trim();
    const email = document.getElementById('signupStudentEmail').value.trim();
    try {
      const res = await fetch(API_BASE + '/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name, email })
      });
      if (res.ok) {
        toast('Account created! You can now log in.', 'success');
        studentSignupModal.classList.remove('open');
        document.getElementById('studentIdInput').value = id;
        studentSignupForm.reset();
      } else {
        toast('Failed to create account. Try again.', 'error');
      }
    } catch (err) {
      toast('Network error.', 'error');
    }
  });
}

if (organizerSignupForm) {
  organizerSignupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('signupOrganizerId').value.trim();
    const name = document.getElementById('signupOrganizerName').value.trim();
    const email = document.getElementById('signupOrganizerEmail').value.trim();
    try {
      const res = await fetch(API_BASE + '/api/organizers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name, email })
      });
      if (res.ok) {
        toast('Account created! You can now log in.', 'success');
        organizerSignupModal.classList.remove('open');
        document.getElementById('organizerIdInput').value = id;
        organizerSignupForm.reset();
      } else {
        toast('Failed to create account. Try again.', 'error');
      }
    } catch (err) {
      toast('Network error.', 'error');
    }
  });
}
