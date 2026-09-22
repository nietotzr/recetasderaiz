/* V17. No autoplay, network feeds, dependencies, storage or tracking.
 * The full catalogue already consists of real links in #recipeGrid.
 * With no JavaScript, six linked recipes remain in a native scroll-snap strip.
 */
(() => {
  'use strict';
  const carousel = document.getElementById('homeCarousel');
  const grid = document.getElementById('recipeGrid');
  if (!carousel || !grid) return;
  const track = carousel.querySelector('.feature-slides');
  const controls = carousel.querySelector('.feature-controls');
  const status = carousel.querySelector('[data-feature-status]');
  const counter = carousel.querySelector('.feature-count');
  const cards = Array.from(grid.querySelectorAll('[data-recipe-card]'));
  const unique = new Set();
  const catalogue = cards.flatMap(card => {
    const link = card.querySelector('h3 a[href]');
    const image = card.querySelector('.card-image img');
    if (!link || !image) return [];
    const href = link.getAttribute('href');
    // Only known local HTML recipes may become carousel destinations.
    if (!/^recetas\/[a-z0-9-]+\.html$/.test(href || '') || unique.has(href)) return [];
    unique.add(href);
    return [{href, name: link.textContent.trim(), image: {
      src: image.getAttribute('src'), srcset: image.getAttribute('srcset'),
      alt: image.getAttribute('alt') || link.textContent.trim(),
      width: image.getAttribute('width'), height: image.getAttribute('height')
    }}];
  });
  if (catalogue.length < 2 || !track || !controls) return;
  let selected = [], slides = [], position = 0;
  let lastFirst = null;
  function random() {
    // Rejection sampling is unnecessary for this non-security use.
    if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
      const value = new Uint32Array(1);
      window.crypto.getRandomValues(value);
      return value[0] / 4294967296;
    }
    return Math.random();
  }
  function shuffled(values) {
    const copy = values.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  function slide(item, index, total) {
    const node = document.createElement('article');
    node.className = 'feature-slide';
    node.hidden = index !== 0;
    node.setAttribute('role', 'group');
    node.setAttribute('aria-roledescription', 'diapositiva');
    node.setAttribute('aria-label', `${index + 1} de ${total}`);
    const photo = document.createElement('a');
    photo.className = 'feature-image';
    photo.href = item.href;
    photo.tabIndex = -1;
    photo.setAttribute('aria-hidden', 'true');
    const caption = document.createElement('div');
    caption.className = 'feature-caption';
    const eyebrow = document.createElement('p');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = 'Hoy, del recetario';
    const heading = document.createElement('h2');
    const link = document.createElement('a');
    link.href = item.href;
    link.textContent = item.name;
    heading.append(link);
    caption.append(eyebrow, heading);
    node.append(photo, caption);
    return node;
  }
  function loadImage(index) {
    const container = slides[index].querySelector('.feature-image');
    if (container.querySelector('img')) return;
    const data = selected[index].image;
    const img = document.createElement('img');
    img.alt = data.alt;
    if (data.width) img.setAttribute('width', data.width);
    if (data.height) img.setAttribute('height', data.height);
    img.decoding = 'async';
    img.loading = 'eager'; // Only the active slide is instantiated.
    img.setAttribute('fetchpriority', 'high');
    img.sizes = '(min-width: 860px) 440px, (min-width: 600px) 45vw, 92vw';
    if (data.srcset) img.srcset = data.srcset;
    img.src = data.src;
    container.append(img);
  }
  function show(next, announce = true) {
    const focusInSlide = slides[position]?.contains(document.activeElement);
    position = (next + selected.length) % selected.length;
    loadImage(position);
    slides.forEach((node, index) => { node.hidden = index !== position; });
    carousel.dataset.activeRecipe = selected[position].href;
    counter.textContent = `${position + 1} / ${selected.length}`;
    if (announce) status.textContent = `Receta ${position + 1} de ${selected.length}: ${selected[position].name}`;
    if (focusInSlide) slides[position].querySelector('h2 a').focus({preventScroll: true});
  }
  function select(announce) {
    const previous = new Set(selected.map(item => item.href));
    // Prefer unseen recipes on "Otra seleccion"; do not store visitor preferences.
    const pool = shuffled(catalogue);
    const fresh = pool.filter(item => !previous.has(item.href));
    const repeated = pool.filter(item => previous.has(item.href));
    selected = fresh.concat(repeated).slice(0, Math.min(6, catalogue.length));
    if (selected[0].href === lastFirst && selected.length > 1) [selected[0], selected[1]] = [selected[1], selected[0]];
    lastFirst = selected[0].href;
    slides = selected.map((item, index) => slide(item, index, selected.length));
    const fragment = document.createDocumentFragment();
    slides.forEach(node => fragment.append(node));
    track.replaceChildren(fragment);
    track.classList.add('is-enhanced');
    position = 0;
    show(0, announce);
  }
  try {
    select(false);
    controls.hidden = false;
    carousel.dataset.enhanced = 'true';
    carousel.dataset.poolSize = String(catalogue.length);
  } catch (_) {
    // If enhancement fails, keep the links that are present; never break the search.
    return;
  }
  carousel.querySelector('[data-feature-prev]').addEventListener('click', () => show(position - 1));
  carousel.querySelector('[data-feature-next]').addEventListener('click', () => show(position + 1));
  carousel.querySelector('[data-feature-shuffle]').addEventListener('click', () => select(true));
  carousel.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const actions = {ArrowLeft: () => show(position - 1), ArrowRight: () => show(position + 1),
      Home: () => show(0), End: () => show(selected.length - 1)};
    if (!actions[event.key]) return;
    event.preventDefault();
    actions[event.key]();
  });
})();
