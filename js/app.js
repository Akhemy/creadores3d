/* ════════════════════════════════════════
   Creador@s3D — app.js
   ════════════════════════════════════════ */

/* WhatsApp: +54 9 223 342-2297 */
const WA_NUMBER = '5492233422297';

const WA_BASE_URL = `https://wa.me/${WA_NUMBER}`;

/* ════════════════════════════════════════
   SERVICE WORKER
   ════════════════════════════════════════ */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      console.log('[SW] Registrado:', reg.scope);
    } catch (err) {
      console.error('[SW] Error al registrar:', err);
    }
  });

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'SYNC_COMPLETE') {
      showToast('Conexión restaurada — mensajes enviados ✓');
    }
  });
}

/* ════════════════════════════════════════
   HEADER: scroll + menú mobile
   ════════════════════════════════════════ */
const header  = document.querySelector('.header');
const navToggle = document.querySelector('.nav__toggle');
const nav     = document.querySelector('.nav');

window.addEventListener('scroll', () => {
  header?.classList.toggle('is-scrolled', window.scrollY > 10);
}, { passive: true });

navToggle?.addEventListener('click', () => {
  const expanded = navToggle.getAttribute('aria-expanded') === 'true';
  navToggle.setAttribute('aria-expanded', String(!expanded));
  nav?.classList.toggle('is-open');
  document.body.style.overflow = expanded ? '' : 'hidden';
});

// Cerrar menú al hacer click en un link
nav?.querySelectorAll('.nav__link').forEach((link) => {
  link.addEventListener('click', closeMenu);
});

function closeMenu() {
  navToggle?.setAttribute('aria-expanded', 'false');
  nav?.classList.remove('is-open');
  document.body.style.overflow = '';
}

// Cerrar menú al tocar fuera
document.addEventListener('click', (e) => {
  const isOpen = navToggle?.getAttribute('aria-expanded') === 'true';
  if (isOpen && !nav?.contains(e.target) && !navToggle?.contains(e.target)) {
    closeMenu();
  }
});

/* ════════════════════════════════════════
   OFFLINE / ONLINE DETECTION
   ════════════════════════════════════════ */
const offlineBanner = document.querySelector('.offline-banner');

function setOnlineState(isOnline) {
  document.documentElement.classList.toggle('is-offline', !isOnline);
  if (offlineBanner) {
    offlineBanner.setAttribute('aria-hidden', String(isOnline));
  }
}

window.addEventListener('online',  () => {
  setOnlineState(true);
  showToast('Conexión restaurada.');
  triggerBackgroundSync();
});

window.addEventListener('offline', () => {
  setOnlineState(false);
  showToast('Sin señal — tus mensajes se enviarán al reconectar.');
});

// Estado inicial
setOnlineState(navigator.onLine);

async function triggerBackgroundSync() {
  if (!('serviceWorker' in navigator) || !('SyncManager' in window)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.sync.register('sync-contact-messages');
  } catch { /* Background Sync no soportado, silencioso */ }
}

/* ════════════════════════════════════════
   FORMULARIO DE CONTACTO
   ════════════════════════════════════════ */
const form = document.getElementById('contact-form');

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm(form)) return;

    const data = Object.fromEntries(new FormData(form));

    if (!navigator.onLine) {
      await queueMessage(data);
      showToast('Sin señal — el mensaje se guardó y se enviará al reconectar.');
      form.reset();
      return;
    }

    const text = buildWhatsAppText(data);
    window.open(`${WA_BASE_URL}?text=${text}`, '_blank', 'noopener,noreferrer');
    showToast('Abriendo WhatsApp ✓');
    form.reset();
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
    email   ? `📧 ${email}`            : '',
    service ? `🛠 Servicio: ${serviceLabel}` : '',
    message ? `\n${message}`            : '',
  ]
    .filter(Boolean)
    .join('\n');

  return encodeURIComponent(text);
}

/* ─── Validación básica ─── */
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

// Limpiar errores al tipear
form?.querySelectorAll('input, textarea').forEach((field) => {
  field.addEventListener('input', () => {
    const group = field.closest('.form-group');
    group?.classList.remove('has-error');
    const error = group?.querySelector('.form-group__error');
    if (error) error.textContent = '';
  });
});

/* ════════════════════════════════════════
   INDEXEDDB — cola de mensajes offline
   ════════════════════════════════════════ */
const DB_NAME    = 'creadores3d-db';
const DB_VERSION = 1;
const STORE_NAME = 'pending-messages';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };

    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

async function queueMessage(data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.add({ ...data, timestamp: Date.now() });
    tx.oncomplete = resolve;
    tx.onerror    = reject;
  });
}

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
