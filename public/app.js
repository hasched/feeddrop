/* ─────────────────────────────────────────────────────────────
   FeedDrop — app.js
   • Loads cards.json
   • Renders 12 cards at a time, lazy-loads on scroll
   • Filter chips (tag) + search bar (title, handle, tags) combined
───────────────────────────────────────────────────────────── */

const BATCH     = 12;
const LOOKAHEAD = 400; // px before sentinel triggers next load

let allCards = [];
let filtered = [];
let rendered = 0;
let loading  = false;

const feed       = document.getElementById('feed');
const sentinel   = document.getElementById('sentinel');
const emptyState = document.getElementById('emptyState');
const statusEl   = document.getElementById('filterStatus');
const searchEl   = document.getElementById('searchInput');

const state = { tag: 'all', query: '' };

// ── Boot ───────────────────────────────────────────────────
fetch('/cards.json')
  .then(r => r.json())
  .then(data => {
    allCards = data;
    applyFilters();
    setupScrollObserver();
  })
  .catch(err => console.error('Failed to load cards.json:', err));

// ── Render next batch ──────────────────────────────────────
function renderBatch() {
  if (loading || rendered >= filtered.length) return;
  loading = true;

  const end  = Math.min(rendered + BATCH, filtered.length);
  const frag = document.createDocumentFragment();

  for (let i = rendered; i < end; i++) {
    frag.appendChild(buildCard(filtered[i], i));
  }

  feed.appendChild(frag);
  rendered = end;
  loading  = false;
}

// ── Build card DOM node ────────────────────────────────────
// Uses TikTok's /embed/v2/ URL directly — no embed.js needed,
// works for every card regardless of when it's injected.
function buildCard(card, index) {
  const article = document.createElement('article');
  article.className = 'card';
  article.dataset.tags = card.tags.join(' ');
  article.style.animationDelay = ((index % BATCH) * 0.04) + 's';

  const src = 'https://www.tiktok.com/embed/v2/' + card.id + '?lang=en';

  article.innerHTML =
    '<div class="video-wrap">' +
      '<iframe' +
        ' src="' + src + '"' +
        ' allowfullscreen' +
        ' allow="encrypted-media; fullscreen; autoplay"' +
        ' loading="lazy"' +
        ' frameborder="0"' +
        ' scrolling="no">' +
      '</iframe>' +
    '</div>' +
    '<div class="card-meta">' +
      '<span class="video-title">' + esc(card.title) + '</span>' +
      '<a class="handle" href="https://www.tiktok.com/@' + card.handle + '" target="_blank" rel="noopener">@' + esc(card.handle) + '</a>' +
    '</div>';

  return article;
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Scroll observer ────────────────────────────────────────
function setupScrollObserver() {
  const obs = new IntersectionObserver(
    entries => { if (entries[0].isIntersecting) renderBatch(); },
    { rootMargin: LOOKAHEAD + 'px' }
  );
  obs.observe(sentinel);
}

// ── Apply filter + search, rebuild DOM ────────────────────
function applyFilters() {
  const q = state.query.toLowerCase().trim();

  filtered = allCards.filter(card => {
    // chip filter
    const tagMatch = state.tag === 'all' || card.tags.includes(state.tag);
    // search: title, handle, or any tag
    const qMatch = !q
      || card.title.toLowerCase().includes(q)
      || card.handle.toLowerCase().includes(q)
      || card.tags.some(t => t.toLowerCase().includes(q));
    return tagMatch && qMatch;
  });

  feed.innerHTML = '';
  rendered = 0;

  emptyState.classList.toggle('visible', filtered.length === 0);

  // status pill
  const parts = [];
  if (state.tag !== 'all') parts.push(state.tag.charAt(0).toUpperCase() + state.tag.slice(1));
  if (q) parts.push('"' + q + '"');

  if (parts.length === 0) {
    statusEl.classList.remove('visible');
    statusEl.textContent = '';
  } else {
    statusEl.textContent = parts.join(' · ') + ' · ' + filtered.length + ' creator' + (filtered.length !== 1 ? 's' : '');
    statusEl.classList.add('visible');
  }

  renderBatch();
}

// ── Filter toggle (open/close panel) ──────────────────────
const toggleBtn = document.getElementById('filterToggle');
const panel     = document.getElementById('filterPanel');

toggleBtn.addEventListener('click', () => {
  const open = panel.classList.toggle('open');
  toggleBtn.setAttribute('aria-expanded', String(open));
  toggleBtn.classList.toggle('active', open);
});

// ── Chip clicks ────────────────────────────────────────────
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    state.tag = chip.dataset.value;
    document.querySelectorAll('.chip[data-filter="tag"]').forEach(c => {
      c.classList.toggle('active', c.dataset.value === state.tag);
    });
    applyFilters();
  });
});

// ── Search input ───────────────────────────────────────────
let searchTimer;
searchEl.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.query = searchEl.value;
    applyFilters();
  }, 200);
});

searchEl.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    searchEl.value = '';
    state.query = '';
    applyFilters();
  }
});

// ── Reset (called by empty-state button) ──────────────────
window.resetFilters = function () {
  state.tag   = 'all';
  state.query = '';
  searchEl.value = '';
  document.querySelectorAll('.chip').forEach(c => {
    c.classList.toggle('active', c.dataset.value === 'all');
  });
  applyFilters();
};