'use strict';
(() => {
  const clock = document.querySelector('[data-clock]');
  const period = document.querySelector('[data-period]');
  function tick() {
    if (!clock || !period) return;
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    }).formatToParts(new Date());
    const data = Object.fromEntries(parts.map(part => [part.type, part.value]));
    clock.textContent = `${data.hour}:${data.minute}:${data.second}`;
    period.textContent = data.dayPeriod || '';
  }
  tick();
  setInterval(tick, 1000);

  const works = document.querySelector('.home-works');
  if (!works) return;
  const cards = [...works.querySelectorAll('.work-card')];
  const rows = [...document.querySelectorAll('.slider-index li')];
  const current = document.querySelector('[data-current]');
  const viewButtons = [...document.querySelectorAll('[data-view]')];
  let active = 0;

  function show(index) {
    active = (index + cards.length) % cards.length;
    cards.forEach((card, i) => card.classList.toggle('is-active', i === active));
    rows.forEach((row, i) => row.classList.toggle('active', i === active));
    if (current) current.textContent = String(active + 1).padStart(2, '0');
  }

  function setView(view) {
    works.classList.toggle('view-carousel', view === 'carousel');
    works.classList.toggle('view-album', view === 'album');
    viewButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === view)));
  }

  document.querySelectorAll('[data-go]').forEach(button => {
    button.addEventListener('click', () => {
      setView('carousel');
      show(Number(button.dataset.go));
      works.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  viewButtons.forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
  document.addEventListener('keydown', event => {
    if (!works.classList.contains('view-carousel')) return;
    if (event.key === 'ArrowRight') show(active + 1);
    if (event.key === 'ArrowLeft') show(active - 1);
  });
  show(0);
  setView('carousel');
})();
