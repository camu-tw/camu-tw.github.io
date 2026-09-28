'use strict';

(() => {
  const root = document.documentElement;
  const themeButton = document.getElementById('theme-toggle');
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  const hoverPointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const storage = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* Private browsing: session-only preferences. */ } }
  };
  let manualTheme = ['light', 'dark'].includes(storage.get('savenTheme'));

  function updateThemeLabel() {
    const dark = root.dataset.theme === 'dark';
    themeButton.setAttribute('aria-pressed', String(dark));
    themeButton.setAttribute('aria-label', root.dataset.lang === 'fr'
      ? `Activer le mode ${dark ? 'clair' : 'sombre'}`
      : `Switch to ${dark ? 'light' : 'dark'} mode`);
  }

  function setTheme(theme) {
    root.dataset.theme = theme;
    updateThemeLabel();
  }

  function setLanguage(language) {
    root.dataset.lang = language;
    root.lang = language;
    document.querySelectorAll('[data-language]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.language === language));
    });
    document.querySelectorAll('[data-label-fr]').forEach(element => {
      element.setAttribute('aria-label', element.getAttribute(`data-label-${language}`));
    });
    updateThemeLabel();
  }

  setLanguage(storage.get('savenLang') === 'en' ? 'en' : 'fr');
  setTheme(manualTheme ? storage.get('savenTheme') : (systemTheme.matches ? 'dark' : 'light'));
  themeButton.addEventListener('click', () => {
    manualTheme = true;
    setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
    storage.set('savenTheme', root.dataset.theme);
  });
  systemTheme.addEventListener('change', event => {
    if (!manualTheme) setTheme(event.matches ? 'dark' : 'light');
  });
  document.querySelectorAll('[data-language]').forEach(button => {
    button.addEventListener('click', () => {
      setLanguage(button.dataset.language);
      storage.set('savenLang', button.dataset.language);
    });
  });

  const menu = document.getElementById('logo-menu');
  const logo = document.getElementById('logo-link');
  const navigation = document.getElementById('bubble-nav');
  let closeTimer;
  let menuOpen = false;
  let lastPointer = '';
  function toggleMenu(open) {
    clearTimeout(closeTimer);
    menuOpen = open;
    menu.classList.toggle('menu-open', open);
    logo.setAttribute('aria-expanded', String(open));
    navigation.inert = !open;
  }
  function delayedClose() {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      if (!menu.contains(document.activeElement)) toggleMenu(false);
    }, 250);
  }
  menu.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse' && hoverPointer.matches) toggleMenu(true);
  });
  menu.addEventListener('pointerleave', event => {
    if (event.pointerType === 'mouse') delayedClose();
  });
  menu.addEventListener('focusin', () => { clearTimeout(closeTimer); });
  menu.addEventListener('focusout', event => {
    if (!menu.contains(event.relatedTarget)) {
      clearTimeout(closeTimer);
      closeTimer = setTimeout(() => toggleMenu(false), 250);
    }
  });
  logo.addEventListener('pointerdown', event => { lastPointer = event.pointerType; });
  logo.addEventListener('click', event => {
    if (lastPointer === 'touch' || (event.detail !== 0 && !hoverPointer.matches)) {
      event.preventDefault();
      toggleMenu(!menuOpen);
    } else {
      toggleMenu(false);
    }
    lastPointer = '';
  });
  logo.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === ' ') {
      event.preventDefault();
      toggleMenu(true);
      navigation.querySelector('a').focus();
    }
    if (event.key === 'Tab' && !event.shiftKey) toggleMenu(true);
  });
  navigation.addEventListener('click', event => {
    const anchor = event.target.closest('a');
    if (!anchor) return;
    toggleMenu(false);
    // Move keyboard focus to the destination rather than leaving it in inert navigation.
    const section = document.querySelector(anchor.getAttribute('href'));
    section.setAttribute('tabindex', '-1');
    section.focus({ preventScroll: true });
  });
  document.addEventListener('pointerdown', event => {
    if (!menu.contains(event.target)) toggleMenu(false);
  });

  /* ── physique des bulles : ressort + flottement + magnétique + inertie scroll ── */
  const bubbles = Array.from(navigation.querySelectorAll('.bubble'));
  const ARC = [0, 7, 11, 7, 0];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const kick = { x: 0, y: 0, last: window.scrollY };
  const mouse = { x: 0, y: 0, active: false };
  const parts = bubbles.map((el, i) => ({ el, x: 0, y: 0, vx: 0, vy: 0, s: 0, vs: 0, phase: Math.random() * Math.PI * 2, arc: ARC[i] || 0, cx: 0, cy: 0 }));

  function cacheCenters() {
    const nav = navigation.getBoundingClientRect();
    parts.forEach(p => {
      p.cx = nav.left + p.el.offsetLeft + p.el.offsetWidth / 2;
      p.cy = nav.top + p.el.offsetTop + p.el.offsetHeight / 2;
    });
  }
  menu.addEventListener('pointermove', e => { mouse.active = true; mouse.x = e.clientX; mouse.y = e.clientY; });
  menu.addEventListener('pointerleave', () => { mouse.active = false; });
  window.addEventListener('scroll', () => {
    kick.y += (window.scrollY - kick.last) * 0.22;
    kick.last = window.scrollY;
  }, { passive: true });

  let openAt = -1e9, wasOpen = false;
  function physics() {
    const t = performance.now() / 1000;
    const open = menu.classList.contains('menu-open');
    if (open && !wasOpen) { openAt = performance.now(); cacheCenters(); }
    wasOpen = open;
    parts.forEach((p, i) => {
      const target = open && (performance.now() - openAt > i * 60) ? 1 : 0;
      let tx = 0, ty = p.arc;
      if (open) {
        const spd = 0.9 + (i % 3) * 0.18;
        ty += Math.sin(t * spd + p.phase) * 3.2;
        tx += Math.cos(t * spd * 0.7 + p.phase) * 1.8;
        if (mouse.active) {
          const dx = p.cx - mouse.x, dy = p.cy - mouse.y;
          const d = Math.hypot(dx, dy) || 1, R = 150;
          if (d < R) { const f = (1 - d / R) * 15; tx += (dx / d) * f; ty += (dy / d) * f; }
        }
      }
      if (reduceMotion) {
        p.s = target; p.x = tx; p.y = ty; p.vx = p.vy = p.vs = 0;
      } else {
        p.vs += (target - p.s) * 0.18; p.vs *= 0.82; p.s += p.vs;
        p.vx += kick.x; p.vy += kick.y;
        p.vx += (tx - p.x) * 0.12; p.vx *= 0.78;
        p.vy += (ty - p.y) * 0.12; p.vy *= 0.78;
        p.x += p.vx; p.y += p.vy;
      }
      p.el.style.transform = `translate(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px) scale(${Math.max(0, p.s).toFixed(3)})`;
      p.el.style.opacity = p.s <= 0.02 ? '0' : Math.min(1, p.s).toFixed(3);
    });
    kick.x *= 0.88; kick.y *= 0.88;
    requestAnimationFrame(physics);
  }
  cacheCenters();
  window.addEventListener('resize', cacheCenters);
  physics();

  const background = [document.getElementById('header'), document.getElementById('main'), document.getElementById('footer'), document.querySelector('.skip-link')];
  let activeOverlay = null;
  let returnFocus = null;
  let originalPadding = '';
  const focusableSelector = 'a[href], button:not([disabled]), [tabindex="0"]';

  function openProject(id, trigger) {
    const overlay = document.getElementById(`project-${id}`);
    if (!overlay || activeOverlay) return;
    toggleMenu(false);
    returnFocus = trigger;
    activeOverlay = overlay;
    const scrollbarWidth = window.innerWidth - root.clientWidth;
    originalPadding = document.body.style.paddingRight;
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    document.body.classList.add('overlay-open');
    background.forEach(element => { element.inert = true; });
    overlay.hidden = false;
    overlay.scrollTop = 0;
    overlay.querySelector('[data-close]').focus({ preventScroll: true });
  }

  function closeProject() {
    if (!activeOverlay) return;
    activeOverlay.hidden = true;
    activeOverlay = null;
    background.forEach(element => { element.inert = false; });
    document.body.classList.remove('overlay-open');
    document.body.style.paddingRight = originalPadding;
    if (returnFocus) returnFocus.focus({ preventScroll: true });
    returnFocus = null;
  }

  document.querySelectorAll('[data-project]').forEach(button => {
    button.addEventListener('click', () => openProject(button.dataset.project, button));
  });
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', closeProject));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (activeOverlay) {
        event.preventDefault();
        closeProject();
      } else if (menuOpen) {
        logo.focus();
        toggleMenu(false);
      }
    }
    if (event.key !== 'Tab' || !activeOverlay) return;
    const focusables = Array.from(activeOverlay.querySelectorAll(focusableSelector)).filter(element => element.getClientRects().length > 0);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!first) { event.preventDefault(); activeOverlay.focus(); return; }
    if (event.shiftKey && (document.activeElement === first || !activeOverlay.contains(document.activeElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !activeOverlay.contains(document.activeElement))) {
      event.preventDefault(); first.focus();
    }
  });
})();

/* ── reveal au scroll ── */
(() => {
  const targets = document.querySelectorAll('.section-heading, .section-intro, .project-card, .skills-list li, .about-text, .contact-heading, .contact-email, .text-link.github');
  targets.forEach(el => el.classList.add('reveal'));
  if (!('IntersectionObserver' in window)) { targets.forEach(el => el.classList.add('is-visible')); return; }
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } });
  }, { threshold: 0.1, rootMargin: '0px 0px -8% 0px' });
  targets.forEach(el => io.observe(el));
})();

/* ── pro UI : barre de progression, spotlight, boutons magnétiques ── */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const progress = document.querySelector('.scroll-progress');
  if (progress) {
    const update = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      progress.style.transform = `scaleX(${p.toFixed(4)})`;
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  document.querySelectorAll('.cover img').forEach(img => {
    const cover = img.parentElement;
    const spot = document.createElement('span');
    spot.className = 'spotlight';
    spot.setAttribute('aria-hidden', 'true');
    cover.appendChild(spot);
    if (reduceMotion) return;
    cover.addEventListener('pointermove', e => {
      const r = cover.getBoundingClientRect();
      spot.style.setProperty('--sx', (e.clientX - r.left) + 'px');
      spot.style.setProperty('--sy', (e.clientY - r.top) + 'px');
    });
  });

  if (!reduceMotion) {
    document.querySelectorAll('.pill-link, .contact-email, .github').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const mx = Math.max(-7, Math.min(7, (e.clientX - r.left - r.width / 2) * 0.12));
        const my = Math.max(-7, Math.min(7, (e.clientY - r.top - r.height / 2) * 0.12));
        el.style.transition = 'transform .08s ease-out';
        el.style.transform = `translate(${mx}px, ${my}px)`;
      });
      el.addEventListener('pointerleave', () => {
        el.style.transition = 'transform .5s cubic-bezier(.22,1,.36,1)';
        el.style.transform = 'translate(0,0)';
      });
    });
  }
})();
