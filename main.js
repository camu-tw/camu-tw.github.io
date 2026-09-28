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
