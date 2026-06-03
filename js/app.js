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
    web:            'Diseño Web',
    branding:       'Identidad de Marca',
    'branding-numer': 'Branding + Análisis Numerológico',
    '3d':           'Impresión 3D',
    software:       'Desarrollo de Software',
    otro:           'Otro',
    auditoria:      'Auditoría Web (Accesibilidad + CO₂)',
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

/* ════════════════════════════════════════
   TOOLTIPS DE PILLS (toque deliberado)
   ════════════════════════════════════════ */
(function () {
  const tip = document.createElement('div');
  tip.className = 'pill-tip';
  document.body.appendChild(tip);

  let activePill = null;

  function showTip(pill) {
    if (activePill) activePill.classList.remove('tip--active');
    activePill = pill;
    pill.classList.add('tip--active');

    tip.textContent = pill.dataset.tip;
    tip.classList.remove('is-visible');

    const rect = pill.getBoundingClientRect();
    const tipW  = 220;
    let left = rect.left + rect.width / 2 - tipW / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tipW - 8));
    const top = rect.top - 8;

    tip.style.left   = left + 'px';
    tip.style.top    = top + 'px';
    tip.style.transform = 'translateY(calc(-100% + 4px))';

    requestAnimationFrame(() => tip.classList.add('is-visible'));
  }

  function hideTip() {
    tip.classList.remove('is-visible');
    if (activePill) { activePill.classList.remove('tip--active'); activePill = null; }
  }

  document.querySelectorAll('.card__tags li[data-tip], .skill-pill[data-tip]').forEach((pill) => {
    pill.addEventListener('click', (e) => {
      e.stopPropagation();
      if (activePill === pill) { hideTip(); return; }
      showTip(pill);
    });
  });

  document.addEventListener('click', hideTip);
  document.addEventListener('scroll', hideTip, { passive: true });
})();

/* ════════════════════════════════════════
   GOOGLE MAPS — Fotos y Reseñas
   ════════════════════════════════════════ */
(async function () {
  let data;
  try {
    const res = await fetch('data/google-places.json');
    if (!res.ok) return;
    data = await res.json();
  } catch { return; }

  /* ── Carrusel de fotos ── */
  const gmapSection = document.getElementById('galeria');
  const track   = document.getElementById('gmap-track');
  const dotsEl  = document.getElementById('gmap-dots');
  const prevBtn = document.getElementById('gmap-prev');
  const nextBtn = document.getElementById('gmap-next');

  if (data.photos?.length && gmapSection && track) {
    gmapSection.removeAttribute('hidden');

    data.photos.forEach((src, i) => {
      const slide = document.createElement('div');
      slide.className = 'gmap-carousel__slide';
      const img = document.createElement('img');
      img.src = src;
      img.alt = `Foto ${i + 1} — Creador@s3D`;
      img.loading = 'lazy';
      slide.appendChild(img);
      track.appendChild(slide);

      const dot = document.createElement('button');
      dot.className = 'gmap-dot' + (i === 0 ? ' is-active' : '');
      dot.setAttribute('aria-label', `Foto ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dotsEl?.appendChild(dot);
    });

    let current = 0;
    const total = data.photos.length;

    function goTo(n) {
      current = (n + total) % total;
      track.style.transform = `translateX(-${current * 100}%)`;
      dotsEl?.querySelectorAll('.gmap-dot').forEach((d, idx) =>
        d.classList.toggle('is-active', idx === current));
    }

    prevBtn?.addEventListener('click', () => goTo(current - 1));
    nextBtn?.addEventListener('click', () => goTo(current + 1));
    setInterval(() => goTo(current + 1), 5000);
  }

  /* ── Reseñas ── */
  const reviewsSection = document.getElementById('resenas');
  const reviewsGrid    = document.getElementById('reviews-grid');

  if (data.reviews?.length && reviewsSection && reviewsGrid) {
    reviewsSection.removeAttribute('hidden');

    data.reviews.forEach(r => {
      const card     = document.createElement('article');
      card.className = 'review-card reveal';

      const stars    = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
      const initials = r.author.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

      card.innerHTML = `
        <div class="review-card__header">
          ${r.photo
            ? `<img src="${r.photo}" alt="${r.author}" class="review-card__avatar" loading="lazy">`
            : `<div class="review-card__avatar review-card__avatar--placeholder" aria-hidden="true">${initials}</div>`}
          <div class="review-card__meta">
            <p class="review-card__name">${r.author}</p>
            <p class="review-card__time">${r.time}</p>
          </div>
        </div>
        <p class="review-card__stars" aria-label="${r.rating} estrellas">${stars}</p>
        <p class="review-card__text">${r.text}</p>
      `;

      reviewsGrid.appendChild(card);
    });

    reviewsGrid.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
  }
})();

/* ─── Año en el footer ─── */
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ─── Marcar JS disponible ─── */
document.documentElement.classList.replace('no-js', 'js');
