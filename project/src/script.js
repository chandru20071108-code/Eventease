/* ===========================
   Nebula — Interactions (optimized)
   =========================== */

/* ---- Cached elements ---- */
const navbar = document.getElementById('navbar');
const scrollProgress = document.getElementById('scrollProgress');
const backToTop = document.getElementById('backToTop');
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
const ctaForm = document.getElementById('ctaForm');
const ctaNote = document.getElementById('ctaNote');
const heroBg = document.querySelector('.hero-bg');
const orbs = document.querySelectorAll('.orb');
const revealElements = document.querySelectorAll('.reveal');
const statNumbers = document.querySelectorAll('.stat-number');
const sections = document.querySelectorAll('section[id]');
const navLinkEls = document.querySelectorAll('.nav-links .nav-link:not(.nav-cta)');

/* ---- Single rAF-throttled scroll handler ---- */
let ticking = false;

function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const scrollY = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;

    // Navbar glass background
    if (scrollY > 20) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    // Scroll progress bar
    scrollProgress.style.width = (scrollY / docHeight) * 100 + '%';

    // Back-to-top
    if (scrollY > 600) {
      backToTop.classList.add('visible');
    } else {
      backToTop.classList.remove('visible');
    }

    // Hero parallax (only while hero is visible)
    if (scrollY < window.innerHeight && heroBg) {
      heroBg.style.transform = `translateY(${scrollY * 0.4}px)`;
      heroBg.style.opacity = String(Math.max(0, 1 - scrollY / window.innerHeight));
    }

    // Active nav highlighting
    const checkY = scrollY + 120;
    sections.forEach((section) => {
      const top = section.offsetTop;
      const id = section.getAttribute('id');
      if (checkY >= top && checkY < top + section.offsetHeight) {
        navLinkEls.forEach((link) => {
          link.style.color = link.getAttribute('href') === '#' + id ? 'var(--text-primary)' : '';
        });
      }
    });

    ticking = false;
  });
}

window.addEventListener('scroll', onScroll, { passive: true });

/* ---- Back to top ---- */
backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ---- Mobile nav toggle ---- */
navToggle.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  navToggle.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', isOpen);
});

navLinks.querySelectorAll('.nav-link').forEach((link) => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

/* ---- Scroll reveal ---- */
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
);
revealElements.forEach((el) => revealObserver.observe(el));

/* ---- Animated stat counters ---- */
function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  const suffix = el.dataset.suffix || '';
  const duration = 1800;
  const startTime = performance.now();

  function update(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target).toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = target.toLocaleString() + suffix;
  }
  requestAnimationFrame(update);
}

const statObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        statObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.5 }
);
statNumbers.forEach((el) => statObserver.observe(el));

/* ---- Hero parallax orbs — only animate when hero is visible ---- */
let mouseX = 0, mouseY = 0, targetX = 0, targetY = 0;
let parallaxActive = true;

// Pause parallax when hero scrolls out of view
const heroSection = document.getElementById('hero');
const heroObserver = new IntersectionObserver(
  (entries) => {
    parallaxActive = entries[0].isIntersecting;
  },
  { threshold: 0 }
);
heroObserver.observe(heroSection);

window.addEventListener('mousemove', (e) => {
  targetX = (e.clientX / window.innerWidth - 0.5) * 2;
  targetY = (e.clientY / window.innerHeight - 0.5) * 2;
}, { passive: true });

function parallaxLoop() {
  if (parallaxActive) {
    mouseX += (targetX - mouseX) * 0.05;
    mouseY += (targetY - mouseY) * 0.05;
    orbs.forEach((orb, i) => {
      const depth = (i + 1) * 15;
      orb.style.translate = `${mouseX * depth}px ${mouseY * depth}px`;
    });
  }
  requestAnimationFrame(parallaxLoop);
}
parallaxLoop();

/* ---- CTA form ---- */
ctaForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const input = ctaForm.querySelector('.cta-input');
  if (input.value.trim()) {
    ctaNote.textContent = "You're on the list! Check your inbox for next steps.";
    ctaNote.style.color = 'var(--accent-teal-light)';
    input.value = '';
    setTimeout(() => { ctaNote.textContent = ''; }, 5000);
  }
});

/* ---- Smooth scroll for anchor links ---- */
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', (e) => {
    const href = anchor.getAttribute('href');
    if (href === '#') return;
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      window.scrollTo({
        top: target.getBoundingClientRect().top + window.scrollY - 80,
        behavior: 'smooth',
      });
    }
  });
});
