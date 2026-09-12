/* Progressive enhancement: recipe links and text work without this file. */
(() => {
  'use strict';
  const normalise = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const grid = document.getElementById('recipeGrid');
  const input = document.getElementById('searchInput');
  const form = document.getElementById('searchForm');
  const category = document.getElementById('categoryFilter');
  const order = document.getElementById('sortFilter');
  const count = document.getElementById('count');
  const clear = document.getElementById('searchClear');
  const empty = document.getElementById('noResults');
  if (grid && input && form) {
    const cards = Array.from(grid.querySelectorAll('[data-recipe-card]'));
    const stop = new Set(['de','del','con','la','las','el','los','y','para','receta','recetas']);
    function apply() {
      const query = input.value.trim();
      const words = normalise(query).split(/\s+/).filter(w => w && !stop.has(w));
      const selected = category ? category.value : 'all';
      let found = 0;
      cards.forEach(card => {
        const matches = (selected === 'all' || card.dataset.category === selected) && words.every(w => card.dataset.search.includes(w));
        card.hidden = !matches;
        if (matches) found++;
      });
      count.textContent = `${found} ${found === 1 ? 'receta' : 'recetas'}${query ? ` para \u201c${query}\u201d` : ''}`;
      empty.hidden = found !== 0;
      clear.hidden = !query && selected === 'all';
      document.body.classList.toggle('is-searching', Boolean(query) || selected !== 'all');
    }
    function reset() {
      input.value = '';
      if (category) category.value = 'all';
      apply();
      input.focus({preventScroll:true});
    }
    input.addEventListener('input', apply);
    category?.addEventListener('change', apply);
    order?.addEventListener('change', () => {
      const sorted = cards.slice().sort((a,b) => order.value === 'az' ? a.dataset.name.localeCompare(b.dataset.name,'es') : Number(a.dataset.order) - Number(b.dataset.order));
      sorted.forEach(card => grid.appendChild(card));
    });
    form.addEventListener('submit', event => {
      event.preventDefault(); apply();
      document.getElementById('recetas').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    });
    clear.addEventListener('click', reset);
    document.querySelector('[data-reset-search]')?.addEventListener('click', reset);
    document.querySelectorAll('[data-search-suggestion]').forEach(button => button.addEventListener('click', () => {
      input.value = button.dataset.searchSuggestion; apply(); input.focus({preventScroll:true});
    }));
    const params = new URLSearchParams(location.search);
    if (params.has('q')) input.value = params.get('q');
    apply();
    if (location.hash === '#buscar') input.focus({preventScroll:true});
  }
  document.querySelector('[data-reset-ingredients]')?.addEventListener('click', () => {
    document.querySelectorAll('.ingredients input').forEach(box => box.checked=false);
  });
  document.querySelector('[data-print]')?.addEventListener('click', () => window.print());
  // Share a public recipe URL, never a file:// path from a local preview.
  const announce = value => {
    const status = document.getElementById('actionStatus');
    if (status) {
      const actions = document.querySelector('.recipe-actions');
      if (actions && status.previousElementSibling !== actions) actions.after(status);
      status.textContent = value;
    }
  };
  const localPreview = location.protocol === 'file:' ||
    ['localhost', '127.0.0.1', '[::1]', '::1'].includes(location.hostname) ||
    location.hostname.endsWith('.localhost');
  const publicUrl = () => {
    const candidates = [
      document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
      document.querySelector('meta[property="og:url"]')?.getAttribute('content'),
      localPreview ? null : location.href
    ];
    for (const value of candidates) {
      if (!value) continue;
      try {
        const url = new URL(value);
        if (!['http:', 'https:'].includes(url.protocol)) continue;
        if (['localhost', '127.0.0.1', '[::1]', '::1'].includes(url.hostname) ||
            url.hostname.endsWith('.localhost')) continue;
        url.hash = '';
        return url.href;
      } catch (_) { /* Try the next candidate, not a local filesystem path. */ }
    }
    return null;
  };
  let closeSharePanel = null;
  function sharePanel(data, trigger) {
    if (closeSharePanel) closeSharePanel(false);
    const layer = document.createElement('div');
    layer.className = 'share-layer';
    layer.innerHTML = `
      <section class="share-card" role="dialog" aria-modal="true" aria-labelledby="shareTitle" aria-describedby="shareDescription" tabindex="-1">
        <div class="share-heading">
          <p class="eyebrow">De tu cocina a la suya</p>
          <button type="button" class="share-close" data-share-close aria-label="Cerrar el panel de compartir">
            <svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>
          </button>
        </div>
        <h2 id="shareTitle">Compartir receta</h2>
        <p class="share-recipe-name"></p>
        <p id="shareDescription">Env\u00eda la receta o copia su enlace para tenerla a mano.</p>
        <label class="share-link-label" for="recipeShareUrl">Enlace p\u00fablico de la receta</label>
        <div class="share-link-row">
          <input id="recipeShareUrl" type="text" readonly inputmode="none" autocomplete="off" spellcheck="false" aria-describedby="shareStatus">
          <button type="button" class="button" data-copy-link>Copiar enlace</button>
        </div>
        <p id="shareStatus" class="share-status" role="status" aria-live="polite" aria-atomic="true"></p>
        <div class="share-channels" aria-label="Opciones para compartir">
          <a data-whatsapp target="_blank" rel="noopener noreferrer">WhatsApp <span aria-hidden="true">\u2197</span></a>
          <a data-email>Correo electr\u00f3nico <span aria-hidden="true">\u2197</span></a>
        </div>
        <p class="share-local-info" hidden>Est\u00e1s viendo una copia local. Se comparte el enlace de recetasderaiz.es, no el archivo de tu ordenador. Los cambios locales se ver\u00e1n cuando publiques la actualizaci\u00f3n.</p>
      </section>`;
    document.body.appendChild(layer);
    const card = layer.querySelector('.share-card');
    const field = layer.querySelector('#recipeShareUrl');
    const status = layer.querySelector('#shareStatus');
    const copyButton = layer.querySelector('[data-copy-link]');
    layer.querySelector('.share-recipe-name').textContent = data.title;
    field.value = data.url;
    layer.querySelector('[data-whatsapp]').href = 'https://wa.me/?text=' + encodeURIComponent(data.title + '\n' + data.url);
    layer.querySelector('[data-email]').href = 'mailto:?subject=' + encodeURIComponent(data.title) + '&body=' + encodeURIComponent(data.title + '\n\n' + data.url);
    layer.querySelector('.share-local-info').hidden = !localPreview;
    const originalOverflow = document.body.style.overflow;
    const siblings = Array.from(document.body.children).filter(node => node !== layer)
      .map(node => ({node, inert: node.inert}));
    // Keep keyboard and assistive-technology focus inside the dialog.
    layer.querySelector('[data-share-close]').focus({preventScroll:true});
    siblings.forEach(({node}) => { node.inert = true; });
    document.body.style.overflow = 'hidden';
    let isOpen = true;
    function close(restoreFocus = true) {
      if (!isOpen) return;
      isOpen = false;
      siblings.forEach(({node, inert}) => { node.inert = inert; });
      document.body.style.overflow = originalOverflow;
      layer.remove();
      closeSharePanel = null;
      if (restoreFocus && trigger?.isConnected) trigger.focus({preventScroll:true});
    }
    closeSharePanel = close;
    layer.querySelector('[data-share-close]').addEventListener('click', () => close());
    layer.addEventListener('click', event => { if (event.target === layer) close(); });
    layer.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (event.key !== 'Tab') return;
      const items = Array.from(card.querySelectorAll('a[href],button:not([disabled]),input:not([disabled])'));
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === card)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    });
    function selectLink() {
      field.focus({preventScroll:true});
      field.select();
      field.setSelectionRange(0, field.value.length);
    }
    field.addEventListener('click', selectLink);
    // Compatibility-only fallback for explicit clicks where Clipboard API is blocked.
    // If it fails, the selected URL stays visible for manual copying.
    function legacyCopy() {
      selectLink();
      try { return typeof document.execCommand === 'function' && document.execCommand('copy') === true; }
      catch (_) { return false; }
    }
    let copying = false;
    copyButton.addEventListener('click', async () => {
      if (copying) return;
      copying = true;
      copyButton.disabled = true;
      status.textContent = 'Copiando enlace\u2026';
      let copied = false;
      if (!localPreview && window.isSecureContext && typeof navigator.clipboard?.writeText === 'function') {
        try { await navigator.clipboard.writeText(data.url); copied = true; }
        catch (_) { /* A denial must still leave a usable manual alternative. */ }
      }
      if (!isOpen) return;
      if (!copied) copied = legacyCopy();
      copying = false;
      copyButton.disabled = false;
      copyButton.textContent = copied ? 'Copiado' : 'Copiar enlace';
      status.textContent = copied
        ? 'Enlace copiado. Ya puedes pegarlo donde quieras.'
        : 'El navegador no permite copiar autom\u00e1ticamente. El enlace est\u00e1 seleccionado: usa Ctrl+C o \u2318C; en el m\u00f3vil, mant\u00e9n pulsado el campo y elige Copiar.';
      if (copied) announce('Enlace de la receta copiado.');
    });
  }
  let nativeSharePending = false;
  document.querySelectorAll('[data-share]').forEach(button => button.addEventListener('click', async () => {
    if (nativeSharePending) return;
    const url = publicUrl();
    if (!url) {
      announce('No se ha encontrado un enlace p\u00fablico para esta receta. No se compartir\u00e1 la ruta local del ordenador.');
      return;
    }
    const data = {title: document.querySelector('h1')?.textContent?.trim() || document.title, url};
    announce('');
    let useNative = !localPreview && window.isSecureContext && typeof navigator.share === 'function';
    if (useNative && typeof navigator.canShare === 'function') {
      try { useNative = navigator.canShare(data); } catch (_) { useNative = false; }
    }
    if (!useNative) { sharePanel(data, button); return; }
    nativeSharePending = true;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    try {
      await navigator.share(data);
      announce('Se ha abierto el men\u00fa del dispositivo para compartir.');
    } catch (error) {
      if (error?.name === 'AbortError') announce('Se ha cancelado la acci\u00f3n de compartir.');
      else sharePanel(data, button);
    } finally {
      nativeSharePending = false;
      button.disabled = false;
      button.removeAttribute('aria-busy');
    }
  }));

  // Sticky section links never hide the underlying recipe content.
  const jump = document.querySelector('.recipe-jump');
  if (jump && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          jump.querySelectorAll('a').forEach(a => a.removeAttribute('aria-current'));
          jump.querySelector(`a[href="#${entry.target.id}"]`)?.setAttribute('aria-current','location');
        }
      });
    }, {rootMargin:'-25% 0px -60% 0px',threshold:0});
    ['ingredientes','pasos','consejos'].forEach(id => {const node=document.getElementById(id);if(node)observer.observe(node);});
  }
})();
