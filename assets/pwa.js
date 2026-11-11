/* PWA registration. Uses the SAME pages and recipe URLs as the website. */
(() => {
  'use strict';
  const script = document.currentScript;
  if (!script || !script.src) return;
  const root = new URL('../', script.src);
  const worker = new URL('sw.js', root);

  if ('serviceWorker' in navigator &&
      (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(worker.href, {
        scope: root.pathname,
        updateViaCache: 'none'
      }).then((registration) => {
        registration.update().catch(() => {});
        // Check for service-worker updates when returning to the installed app.
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) registration.update().catch(() => {});
        });
      }).catch((error) => {
        // A registration error must never break recipes or search.
        console.warn('Recetas de Raíz: no se pudo activar la PWA.', error);
      });
    });
  }

  let installEvent = null;
  const button = document.querySelector('[data-pwa-install]');
  const info = document.querySelector('[data-pwa-status]');
  const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  if (isStandalone() && info) {
    info.textContent = 'Esta aplicación ya está instalada y abierta en modo app.';
  }
  window.addEventListener('beforeinstallprompt', (event) => {
    // Only suppress the default prompt where the page offers its own install button.
    if (!button) return;
    event.preventDefault();
    installEvent = event;
    if (button && !isStandalone()) button.hidden = false;
  });
  if (button) {
    button.addEventListener('click', async () => {
      if (!installEvent) return;
      installEvent.prompt();
      await installEvent.userChoice;
      installEvent = null;
      button.hidden = true;
    });
  }
  window.addEventListener('appinstalled', () => {
    if (button) button.hidden = true;
    if (info) info.textContent = '¡App instalada! Ya puedes abrir Recetas de Raíz desde tu móvil.';
  });
})();
