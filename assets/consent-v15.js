/* Recetas de Raíz: Google Analytics 4 after explicit analytics consent only. */
(() => {
  'use strict';
  const KEY = 'rdr_consent_v2'; // Prior choices predated live analytics: ask again.
  const GA_ID = 'G-5KEGCBDWBY';
  const GA_DISABLE = 'ga-disable-' + GA_ID;
  const denied = {
    analytics_storage: 'denied', ad_storage: 'denied',
    ad_user_data: 'denied', ad_personalization: 'denied'
  };
  let opener = null;
  let analyticsStarted = false;

  function getChoice() {
    try {
      const choice = JSON.parse(localStorage.getItem(KEY) || 'null');
      return choice && typeof choice.analytics === 'boolean' ? choice : null;
    } catch (_) { return null; }
  }

  function startAnalytics() {
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
    window[GA_DISABLE] = false;
    if (analyticsStarted) {
      if (typeof window.gtag === 'function') {
        window.gtag('consent', 'update', {...denied, analytics_storage: 'granted'});
      }
      return;
    }
    analyticsStarted = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', denied);
    window.gtag('js', new Date());
    window.gtag('consent', 'update', {...denied, analytics_storage: 'granted'});
    window.gtag('config', GA_ID, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    document.head.appendChild(script);
  }

  function eraseGaCookies() {
    const cookieNames = document.cookie.split(';').map(x => x.trim().split('=')[0])
      .filter(name => /^_ga(?:_|$)/.test(name));
    const hosts = [null, location.hostname, '.' + location.hostname, 'recetasderaiz.es', '.recetasderaiz.es'];
    const seen = new Set();
    for (const name of cookieNames) {
      for (const host of hosts) {
        const key = name + '|' + host;
        if (seen.has(key)) continue;
        seen.add(key);
        document.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax' + (host ? '; Domain=' + host : '');
      }
    }
  }

  function stopAnalytics() {
    window[GA_DISABLE] = true;
    if (analyticsStarted && typeof window.gtag === 'function') {
      window.gtag('consent', 'update', denied);
    }
    eraseGaCookies();
  }

  function close() {
    document.querySelector('.consent-layer')?.remove();
    if (opener?.isConnected) opener.focus();
  }

  function save(choice) {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        necessary: true, analytics: !!choice.analytics, updated: new Date().toISOString()
      }));
    } catch (_) { /* Browsers may disable local storage; consent applies to this page. */ }
    if (choice.analytics) startAnalytics(); else stopAnalytics();
    close();
  }

  function panel(trigger = null) {
    close();
    opener = trigger || document.activeElement;
    const prefix = document.body.dataset.prefix || '';
    const layer = document.createElement('div');
    layer.className = 'consent-layer';
    layer.innerHTML = `<section class="consent-card" role="dialog" aria-modal="true" aria-labelledby="consent-title">
      <p class="eyebrow">Tu privacidad</p><h2 id="consent-title">Tú eliges.</h2>
      <p>Usamos almacenamiento local para recordar tu elección. Solo si lo autorizas, Google Analytics nos ayudará a saber qué recetas se consultan, sin utilizar publicidad personalizada.</p>
      <div class="consent-options">
        <label><span><b>Necesarias</b><small>Recuerdan tu elección de privacidad.</small></span><input type="checkbox" checked disabled></label>
        <label><span><b>Analítica (Google Analytics)</b><small>Medición de visitas y páginas consultadas. Desactivada por defecto.</small></span><input id="consentAnalytics" type="checkbox"></label>
      </div>
      <div class="consent-actions">
        <button type="button" data-reject>Rechazar opcionales</button>
        <button type="button" data-save>Guardar selección</button>
        <button type="button" data-accept>Aceptar analítica</button>
      </div>
      <a class="consent-policy" href="${prefix}cookies.html">Política de cookies</a>
      <button type="button" class="consent-close" data-close>Cerrar sin cambiar</button>
    </section>`;
    document.body.appendChild(layer);
    layer.querySelector('#consentAnalytics').checked = !!getChoice()?.analytics;
    layer.querySelector('[data-reject]').addEventListener('click', () => save({analytics: false}));
    layer.querySelector('[data-accept]').addEventListener('click', () => save({analytics: true}));
    layer.querySelector('[data-save]').addEventListener('click', () => save({
      analytics: layer.querySelector('#consentAnalytics').checked
    }));
    layer.querySelector('[data-close]').addEventListener('click', close);
    layer.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key === 'Tab') {
        const focusable = Array.from(layer.querySelectorAll('button,a,input:not([disabled])'));
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    layer.querySelector('[data-reject]').focus({preventScroll: true});
  }

  const choice = getChoice();
  if (choice?.analytics) startAnalytics(); else stopAnalytics();
  document.addEventListener('click', e => {
    const button = e.target.closest('[data-cookie-settings]');
    if (button) panel(button);
  });
  if (!choice) panel();
})();
