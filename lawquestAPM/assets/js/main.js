// Hero Slider
(function () {
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.hero-dot');
  let current = 0, timer;

  function goTo(n) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = (n + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  function start() { timer = setInterval(next, 5500); }
  function reset() { clearInterval(timer); start(); }

  document.querySelector('.hero-next')?.addEventListener('click', () => { next(); reset(); });
  document.querySelector('.hero-prev')?.addEventListener('click', () => { prev(); reset(); });
  dots.forEach((d, i) => d.addEventListener('click', () => { goTo(i); reset(); }));

  start();
})();

// Sticky header shadow
window.addEventListener('scroll', () => {
  const header = document.querySelector('.header');
  header?.classList.toggle('scrolled', window.scrollY > 60);

  const btn = document.querySelector('.back-top');
  btn?.classList.toggle('visible', window.scrollY > 400);
});

// Back to top
document.querySelector('.back-top')?.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Mobile nav
document.querySelector('.hamburger')?.addEventListener('click', () => {
  document.querySelector('.mobile-nav').classList.add('open');
});
document.querySelector('.mobile-close')?.addEventListener('click', () => {
  document.querySelector('.mobile-nav').classList.remove('open');
});
document.querySelectorAll('.mobile-link').forEach(l => {
  l.addEventListener('click', () => document.querySelector('.mobile-nav').classList.remove('open'));
});

// Animate stats on scroll
(function () {
  const items = document.querySelectorAll('.stat-num[data-target]');
  if (!items.length) return;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseFloat(el.dataset.target);
      const isDecimal = String(target).includes('.');
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      const duration = 2000;
      const start = performance.now();

      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const val = target * eased;
        el.textContent = prefix + (isDecimal ? val.toFixed(1) : Math.floor(val).toLocaleString()) + suffix;
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      obs.unobserve(el);
    });
  }, { threshold: 0.5 });

  items.forEach(i => obs.observe(i));
})();

// Fade-in on scroll
(function () {
  const els = document.querySelectorAll('.fade-in');
  if (!els.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  els.forEach(el => obs.observe(el));
})();

// Newsletter form
document.querySelector('.newsletter-form')?.addEventListener('submit', function (e) {
  e.preventDefault();
  const input = this.querySelector('.newsletter-input');
  if (input.value.trim()) {
    input.value = '';
    const btn = this.querySelector('.newsletter-btn');
    btn.textContent = '✓ Subscribed';
    setTimeout(() => btn.textContent = 'Subscribe', 3000);
  }
});
