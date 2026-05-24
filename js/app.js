/* ════════════════════════════════════════
   Creador@s3D — app.js
   ════════════════════════════════════════ */

const WA_NUMBER   = '5492233422297';
const WA_BASE_URL = `https://wa.me/${WA_NUMBER}`;

/* ════════════════════════════════════════
   HEADER: scroll + menú mobile
   ════════════════════════════════════════ */
const header    = document.querySelector('.header');
const navToggle = document.querySelector('.nav__toggle');
const nav       = document.querySelector('.nav');

window.addEventListener('scroll', () => {
  header?.classList.toggle('is-scrolled', window.scrollY > 10);
}, { passive: true });

navToggle?.addEventListener('click', () => {
  const expanded = navToggle.getAttribute('aria-expanded') === 'true';
  navToggle.setAttribute('aria-expanded', String(!expanded));
  nav?.classList.toggle('is-open');
  document.body.style.overflow = expanded ? '' : 'hidden';
});

nav?.querySelectorAll('.nav__link').forEach((link) => {
  link.addEventListener('click', closeMenu);
});

function closeMenu() {
  navToggle?.setAttribute('aria-expanded', 'false');
  nav?.classList.remove('is-open');
  document.body.style.overflow = '';
}

document.addEventListener('click', (e) => {
  const isOpen = navToggle?.getAttribute('aria-expanded') === 'true';
  if (isOpen && !nav?.contains(e.target) && !navToggle?.contains(e.target)) {
    closeMenu();
  }
});

/* ════════════════════════════════════════
   FORMULARIO DE CONTACTO
   ════════════════════════════════════════ */
const form = document.getElementById('contact-form');

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm(form)) return;

    const data = Object.fromEntries(new FormData(form));

    try {
      const res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ 'form-name': 'contacto', ...data }).toString(),
      });

      if (!res.ok) throw new Error('Error al enviar');

      showToast('Mensaje enviado con éxito ✓ Te respondo pronto.');
      form.reset();
    } catch {
      showToast('No se pudo enviar. Intentalo de nuevo.');
    }
  });
}

function buildWhatsAppText({ name, email, service, message }) {
  const serviceLabel = {
    web:      'Diseño Web',
    branding: 'Identidad de Marca',
    '3d':     'Impresión 3D',
    software: 'Desarrollo de Software',
    otro:     'Otro',
  }[service] ?? service;

  const text = [
    `Hola! Soy *${name}*`,
    email   ? `📧 ${email}`                : '',
    service ? `🛠 Servicio: ${serviceLabel}` : '',
    message ? `\n${message}`               : '',
  ]
    .filter(Boolean)
    .join('\n');

  return encodeURIComponent(text);
}

function validateForm(form) {
  let valid = true;

  form.querySelectorAll('[required]').forEach((field) => {
    const group = field.closest('.form-group');
    const error = group?.querySelector('.form-group__error');

    if (!field.value.trim()) {
      group?.classList.add('has-error');
      if (error) error.textContent = 'Este campo es obligatorio.';
      valid = false;
    } else if (field.type === 'email' && !isValidEmail(field.value)) {
      group?.classList.add('has-error');
      if (error) error.textContent = 'Ingresa un email válido.';
      valid = false;
    } else {
      group?.classList.remove('has-error');
      if (error) error.textContent = '';
    }
  });

  return valid;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

form?.querySelectorAll('input, textarea').forEach((field) => {
  field.addEventListener('input', () => {
    const group = field.closest('.form-group');
    group?.classList.remove('has-error');
    const error = group?.querySelector('.form-group__error');
    if (error) error.textContent = '';
  });
});

/* ════════════════════════════════════════
   SMOOTH SCROLL
   ════════════════════════════════════════ */
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (e) => {
    const id     = link.getAttribute('href');
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    closeMenu();
    setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  });
});

/* ════════════════════════════════════════
   REVEAL ON SCROLL (Intersection Observer)
   ════════════════════════════════════════ */
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
);

document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

/* ════════════════════════════════════════
   TOAST
   ════════════════════════════════════════ */
let toastTimer = null;

function showToast(message) {
  const existing = document.querySelector('.toast');
  existing?.remove();
  clearTimeout(toastTimer);

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('toast--visible'));
  });

  toastTimer = setTimeout(() => {
    toast.classList.remove('toast--visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 4000);
}

/* ─── Año en el footer ─── */
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ─── Marcar JS disponible ─── */
document.documentElement.classList.replace('no-js', 'js');
