/**
 * Tropical Cyclone Database - Contact Page Logic (contact.html)
 */

document.addEventListener('DOMContentLoaded', () => {
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const statusEl = document.getElementById('formStatus');
      if (statusEl) {
        statusEl.textContent = 'Thank you! Your message has been prepared.';
        statusEl.style.color = 'var(--c-ts)';
      }
    });
  }
});
