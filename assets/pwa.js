/* Recetas de Raiz: same website content in the installed PWA. */
(() => {
  'use strict';
  const script = document.currentScript;
  if (!script || !script.src) return;
  const root = new URL('../', script.src);
  const worker = new URL('sw.js', root);
  const guideUrl = new URL('instalar-app.html', root).href;
  const promoStyleUrl = new URL('assets/pwa-promo.css', root).href;

  const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  // Both the permanent link and invitation are mobile-only.
  const isMobile = () => window.matchMedia('(max-width: 699px) and (hover: none)').matches;

  // The PWA is the same website: the service worker requests fresh pages online.
  if ('serviceWorker' in navigator &&
      (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(worker.href, {
        scope: root.pathname,
        updateViaCache: 'none'
      }).then((registration) => {
        registration.update().catch(() => {});
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) registration.update().catch(() => {});
        });
      }).catch((error) => {
        console.warn('Recetas de Raíz: no se pudo activar la PWA.', error);
      });
    });
  }

  let installEvent = null;
  const guideButton = document.querySelector('[data-pwa-install]');
  const info = document.querySelector('[data-pwa-status]');
  if (isStandalone() && info) {
    info.textContent = 'Esta aplicación ya está instalada y abierta en modo app.';
  }

  // Android/Chromium can offer native one-tap installation. iOS uses the guide.
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installEvent = event;
    if (guideButton && !isStandalone()) guideButton.hidden = false;
  });
  const attemptNativeInstall = async () => {
    if (!installEvent) return false;
    const prompt = installEvent;
    installEvent = null;
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch (_) {
      // Browser-specific prompt failures should not affect the site.
    }
    if (guideButton) guideButton.hidden = true;
    return true;
  };
  if (guideButton) {
    guideButton.addEventListener('click', () => { attemptNativeInstall(); });
  }
  window.addEventListener('appinstalled', () => {
    if (guideButton) guideButton.hidden = true;
    if (info) info.textContent = '¡App instalada! Ya puedes abrir Recetas de Raíz desde tu móvil.';
    document.querySelector('.pwa-promo-invite')?.remove();
    document.querySelector('.pwa-mobile-shortcut')?.remove();
  });

  // Leave the install guide accessible on *every mobile page*, even after dismissing
  // the Google-entry invitation. The guide itself does not need a link to itself.
  if (isStandalone()) return;
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = promoStyleUrl;
  document.head.appendChild(style);

  if (!location.pathname.endsWith('/instalar-app.html')) {
    const header = document.querySelector('.site-header');
    if (header) {
      const shortcut = document.createElement('div');
      shortcut.className = 'pwa-mobile-shortcut';
      shortcut.innerHTML = '<a class="pwa-shortcut-link" href="' + guideUrl +
        '"><span aria-hidden="true">📲</span><span>Instala gratis nuestra app</span>' +
        '<span aria-hidden="true">→</span></a>';
      header.appendChild(shortcut);
    }
  }

  // Show the optional invitation only on first arrival from Google in a browser
  // session. Internal navigation, direct visits and desktop visits never trigger it.
  // After an explicit dismissal, respect the decision for seven days.
  const SESSION_KEY = 'rdr_pwa_invite_seen_v1';
  const DISMISSED_KEY = 'rdr_pwa_invite_dismissed_v1';
  const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;
  const storageGet = (store, key) => {
    try { return store.getItem(key); } catch (_) { return null; }
  };
  const storageSet = (store, key, value) => {
    try { store.setItem(key, value); } catch (_) { /* Private mode fallback. */ }
  };
  const cameFromGoogle = () => {
    if (!document.referrer) return false;
    try {
      const host = new URL(document.referrer).hostname.toLowerCase();
      return /^(?:[a-z0-9-]+\.)*google\.[a-z.]+$/.test(host);
    } catch (_) { return false; }
  };

  if (!isMobile() || location.pathname.endsWith('/instalar-app.html') ||
      !cameFromGoogle() || storageGet(sessionStorage, SESSION_KEY)) return;

  // Record first entry immediately so moving through recipes cannot repeat it.
  storageSet(sessionStorage, SESSION_KEY, '1');
  const dismissed = Number(storageGet(localStorage, DISMISSED_KEY) || 0);
  if (dismissed && Date.now() - dismissed < DISMISS_MS) return;

  const showInvitation = () => {
    if (!isMobile() || isStandalone() || document.querySelector('.pwa-promo-invite')) return;
    const popup = document.createElement('aside');
    popup.className = 'pwa-promo-invite';
    popup.setAttribute('aria-labelledby', 'pwa-promo-title');
    popup.innerHTML = `
      <button class="pwa-promo-close" type="button" aria-label="Cerrar aviso para instalar la app">×</button>
      <div class="pwa-promo-head">
        <img class="pwa-promo-logo" src="${new URL('assets/pwa/icon-192.png', root).href}"
             alt="" width="52" height="52" loading="lazy">
        <div>
          <p class="pwa-promo-eyebrow">LA COCINA EN TU MÓVIL</p>
          <h2 id="pwa-promo-title">Tus recetas, siempre a mano</h2>
        </div>
      </div>
      <p class="pwa-promo-copy">Instala gratis Recetas de Raíz. Cada receta nueva estará también en tu app.</p>
      <a class="pwa-promo-action" href="${guideUrl}">Instalar app gratis <span aria-hidden="true">→</span></a>
      <button class="pwa-promo-later" type="button">Ahora no</button>
    `;
    document.body.appendChild(popup);
    const dismiss = () => {
      storageSet(localStorage, DISMISSED_KEY, String(Date.now()));
      popup.remove();
    };
    popup.querySelector('.pwa-promo-close').addEventListener('click', dismiss);
    popup.querySelector('.pwa-promo-later').addEventListener('click', dismiss);
    popup.querySelector('.pwa-promo-action').addEventListener('click', async (event) => {
      // A regular link works on iPhone (guide). If Android offers native install,
      // the same button can open the installation prompt immediately.
      if (installEvent) {
        event.preventDefault();
        dismiss();
        await attemptNativeInstall();
      } else {
        dismiss();
      }
    });
    popup.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') dismiss();
    });
  };

  // The existing cookie-consent modal takes priority. Never stack two prompts.
  const scheduleInvite = () => window.setTimeout(showInvitation, 950);
  if (document.querySelector('.consent-layer')) {
    const observer = new MutationObserver(() => {
      if (!document.querySelector('.consent-layer')) {
        observer.disconnect();
        scheduleInvite();
      }
    });
    observer.observe(document.body, { childList: true });
  } else {
    scheduleInvite();
  }
})();
