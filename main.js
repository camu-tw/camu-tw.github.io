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

  // Menu bulles allégé : ouverture/fermeture via CSS, sans boucle physique continue.

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


/* ── embedded STL viewer ── */
(() => {
  const holder = document.getElementById('stl-data');
  const canvas = document.getElementById('stl-canvas');
  if (!holder || !canvas) return;
  const ctx = canvas.getContext('2d');
  const data = JSON.parse(holder.textContent);
  const buttons = Array.from(document.querySelectorAll('[data-stl]'));
  let triangles = [], angle = 0;
  function decode(name) {
    const bin = atob(data[name]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const view = new DataView(bytes.buffer);
    const declared = bytes.length >= 84 ? view.getUint32(80, true) : 0;
    const binarySize = 84 + declared * 50;
    const tris = [];
    if (declared && binarySize <= bytes.length + 84) {
      const step = Math.max(1, Math.ceil(declared / 9000));
      for (let i = 0, off = 84; i < declared && off + 50 <= bytes.length; i++, off += 50) {
        if (i % step) continue;
        const tri = [];
        for (let v = 0; v < 3; v++) tri.push([view.getFloat32(off + 12 + v * 12, true), view.getFloat32(off + 16 + v * 12, true), view.getFloat32(off + 20 + v * 12, true)]);
        tris.push(tri);
      }
      return tris;
    }
    const text = new TextDecoder().decode(bytes);
    const nums = [...text.matchAll(/vertex\s+([\-\d.eE]+)\s+([\-\d.eE]+)\s+([\-\d.eE]+)/g)].map(m => [+m[1], +m[2], +m[3]]);
    for (let i = 0; i + 2 < nums.length; i += 3) tris.push([nums[i], nums[i + 1], nums[i + 2]]);
    return tris;
  }
  function load(name) {
    triangles = decode(name);
    buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.stl === name)));
  }
  function draw() {
    if (!triangles.length) return requestAnimationFrame(draw);
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--soft') || '#f4f4f4';
    ctx.fillRect(0, 0, w, h);
    const pts = triangles.flat();
    let cx = 0, cy = 0, cz = 0;
    pts.forEach(p => { cx += p[0]; cy += p[1]; cz += p[2]; });
    cx /= pts.length; cy /= pts.length; cz /= pts.length;
    let max = 1;
    pts.forEach(p => { max = Math.max(max, Math.hypot(p[0] - cx, p[1] - cy, p[2] - cz)); });
    const ca = Math.cos(angle), sa = Math.sin(angle), cb = Math.cos(-0.6), sb = Math.sin(-0.6), scale = Math.min(w, h) * .42 / max;
    function project(p) {
      const x = p[0] - cx, y = p[1] - cy, z = p[2] - cz;
      const x1 = x * ca - z * sa, z1 = x * sa + z * ca;
      const y1 = y * cb - z1 * sb, z2 = y * sb + z1 * cb;
      return [w / 2 + x1 * scale, h / 2 - y1 * scale, z2];
    }
    const fg = getComputedStyle(document.documentElement).getPropertyValue('--fg') || '#000';
    const faces = triangles.map(tri => {
      const a = project(tri[0]), b = project(tri[1]), c = project(tri[2]);
      const shade = Math.max(.18, Math.min(.62, .38 + ((a[2] + b[2] + c[2]) / (3 * max)) * .22));
      return { a, b, c, z: (a[2] + b[2] + c[2]) / 3, shade };
    }).sort((u, v) => u.z - v.z);
    faces.forEach(f => {
      ctx.beginPath(); ctx.moveTo(f.a[0], f.a[1]); ctx.lineTo(f.b[0], f.b[1]); ctx.lineTo(f.c[0], f.c[1]); ctx.closePath();
      ctx.globalAlpha = f.shade; ctx.fillStyle = fg; ctx.fill();
      ctx.globalAlpha = .18; ctx.strokeStyle = fg; ctx.lineWidth = .7; ctx.stroke();
    });
    ctx.globalAlpha = 1; angle += .007; requestAnimationFrame(draw);
  }
  buttons.forEach(button => button.addEventListener('click', () => load(button.dataset.stl)));
  load(buttons[0]?.dataset.stl || Object.keys(data)[0]); draw();
})();


/* ── DUA two-axis thrust comparison ── */
(() => {
  const canvas = document.getElementById('dua-cmpcv');
  const slider = document.getElementById('dua-cmp-slider');
  const label = document.getElementById('dua-cmp-val');
  if (!canvas || !slider || !label) return;
  const ctx = canvas.getContext('2d');
  const isFr = () => document.documentElement.dataset.lang !== 'en';
  const n2 = (x, k) => {
    const s = x.toFixed(k);
    return isFr() ? s.replace('.', ',') : s;
  };
  function frontal(theta) {
    const chord = 0.20, thickness = 0.03;
    return (chord * Math.sin(theta) + thickness * Math.cos(theta)) / thickness;
  }
  function arrow(c, x, y, dx, dy, color, width = 2.4) {
    c.strokeStyle = color; c.fillStyle = color; c.lineWidth = width;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + dx, y + dy); c.stroke();
    const a = Math.atan2(dy, dx), h = 9;
    c.beginPath(); c.moveTo(x + dx, y + dy);
    c.lineTo(x + dx - h * Math.cos(a - 0.42), y + dy - h * Math.sin(a - 0.42));
    c.lineTo(x + dx - h * Math.cos(a + 0.42), y + dy - h * Math.sin(a + 0.42));
    c.closePath(); c.fill();
  }
  function panel(ox, oy, w, bodyAngle, thrustAngle, number, title, subtitle, lines, badge) {
    const c = ctx, cx = ox + w / 2, cy = oy + 126, L = Math.min(62, w * 0.27);
    c.save();
    c.fillStyle = badge; c.beginPath(); c.arc(ox + 9, oy + 14, 9, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff'; c.font = '600 11px ui-sans-serif,system-ui,sans-serif'; c.textAlign = 'center'; c.fillText(number, ox + 9, oy + 18); c.textAlign = 'left';
    c.font = '600 12.5px ui-sans-serif,system-ui,sans-serif'; c.fillStyle = '#1c1b19'; c.fillText(title, ox + 25, oy + 18);
    c.font = '11.5px ui-sans-serif,system-ui,sans-serif'; c.fillStyle = '#6f6d68'; c.fillText(subtitle, ox, oy + 40);
    c.strokeStyle = '#e7e4e0'; c.lineWidth = 1; c.beginPath(); c.moveTo(ox, cy); c.lineTo(ox + w - 14, cy); c.stroke();
    const co = Math.cos(bodyAngle), si = Math.sin(bodyAngle);
    c.strokeStyle = '#3a3835'; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx - L * co, cy - L * si); c.lineTo(cx + L * co, cy + L * si); c.stroke();
    const axis = -Math.PI / 2 + thrustAngle;
    [-1, 1].forEach(side => {
      const bx = cx + side * L * co, by = cy + side * L * si;
      c.strokeStyle = '#8d9aa6'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + 15 * Math.cos(axis), by + 15 * Math.sin(axis)); c.stroke();
      const px = bx + 15 * Math.cos(axis), py = by + 15 * Math.sin(axis);
      c.strokeStyle = '#c4552a'; c.lineWidth = 3.5; c.beginPath();
      c.moveTo(px - 12 * Math.cos(axis + Math.PI / 2), py - 12 * Math.sin(axis + Math.PI / 2));
      c.lineTo(px + 12 * Math.cos(axis + Math.PI / 2), py + 12 * Math.sin(axis + Math.PI / 2)); c.stroke();
    });
    const T = 74;
    arrow(c, cx, cy, T * Math.cos(axis), T * Math.sin(axis), '#c4552a', 2.6);
    const hx = T * Math.sin(thrustAngle);
    if (Math.abs(hx) > 2) {
      c.setLineDash([4, 3]); arrow(c, cx, cy + 52, hx, 0, '#b03a2e', 2); c.setLineDash([]);
    }
    let y = oy + 186;
    lines.forEach(line => {
      c.font = `${line[2] ? '600 ' : ''}11.5px ui-sans-serif,system-ui,sans-serif`;
      c.fillStyle = line[1]; c.fillText(line[0], ox, y); y += 17;
    });
    c.restore();
  }
  function draw() {
    const rect = canvas.getBoundingClientRect();
    const W = Math.max(320, Math.round(rect.width || canvas.parentElement.clientWidth || 900));
    const stacked = W < 760;
    const H = stacked ? 760 : 300;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * ratio; canvas.height = H * ratio;
    canvas.style.height = `${H}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#fbfaf9'; ctx.fillRect(0, 0, W, H);
    const degrees = Number(slider.value);
    const theta = degrees * Math.PI / 180;
    const fr = isFr(), g = 9.81 * Math.tan(theta), thrust = Math.sin(theta), base = frontal(0), tilted = frontal(theta);
    label.textContent = `${degrees}°`;
    const boxes = stacked ? [[14, 0, W - 28], [14, 250, W - 28], [14, 500, W - 28]] : [[14, 0, W / 3 - 14], [W / 3 + 7, 0, W / 3 - 14], [2 * W / 3 + 7, 0, W / 3 - 21]];
    panel(boxes[0][0], boxes[0][1], boxes[0][2], theta, theta, '1', fr ? 'Multirotor classique' : 'Conventional multirotor', fr ? 'la poussée est solidaire du corps' : 'thrust is rigid with the body', [
      [`${fr ? 'châssis à ' : 'airframe at '}${degrees}°`, '#1c1b19', true],
      [`${fr ? 'accélération latérale ' : 'lateral acceleration '}${n2(g, 1)} m/s²`, '#b03a2e', true],
      [`${fr ? 'surface frontale ×' : 'frontal area ×'}${n2(tilted / base, 1)}`, '#b03a2e', false],
      [fr ? 'capteurs et charge inclinés' : 'sensors and payload tilted', '#6f6d68', false]
    ], '#8d9aa6');
    panel(boxes[1][0], boxes[1][1], boxes[1][2], theta, 0, '2', fr ? 'Bras à 2 axes — maintien' : '2-axis arm — station keeping', fr ? 'les cardans redressent la poussée' : 'gimbals keep thrust upright', [
      [`${fr ? 'châssis à ' : 'airframe at '}${degrees}°`, '#1c1b19', true],
      [`${fr ? 'accélération latérale ' : 'lateral acceleration '}0${fr ? ',0' : '.0'} m/s²`, '#3f7a52', true],
      [fr ? 'poussée verticale conservée à 100 %' : 'vertical thrust kept at 100%', '#3f7a52', false],
      [fr ? 'le drone ne bouge pas' : 'the aircraft does not move', '#6f6d68', false]
    ], '#c4552a');
    panel(boxes[2][0], boxes[2][1], boxes[2][2], 0, theta, '3', fr ? 'Bras à 2 axes — vol rapide' : '2-axis arm — fast cruise', fr ? 'le corps reste à plat, les moteurs pointent devant' : 'body stays level, motors point forward', [
      [fr ? 'châssis à 0°' : 'airframe at 0°', '#1c1b19', true],
      [`${fr ? 'poussée propulsive ' : 'propulsive thrust '}${n2(thrust * 100, 0)} % ${fr ? 'de T, identique au cas 1' : 'of T, same as case 1'}`, '#3f7a52', true],
      [`${fr ? 'surface frontale ×' : 'frontal area ×'}1${fr ? ',0  au lieu de ×' : '.0  instead of ×'}${n2(tilted / base, 1)}`, '#3f7a52', false],
      [fr ? 'capteurs, caméra et treuil à plat' : 'sensors, camera and winch level', '#6f6d68', false]
    ], '#3f7a52');
  }
  slider.addEventListener('input', draw);
  window.addEventListener('resize', draw);
  document.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click', () => setTimeout(draw, 20)));
  document.querySelector('[data-project="dua"]')?.addEventListener('click', () => setTimeout(draw, 120));
  setTimeout(draw, 0);
})();
