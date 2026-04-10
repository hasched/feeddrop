/* ─────────────────────────────────────────────────────────────
   FeedDrop — app.js
   Loads cards.json, renders 12 at a time, lazy loads on scroll,
   filters by tag, searches by title.
───────────────────────────────────────────────────────────── */

const BATCH      = 12;   // cards rendered per scroll trigger
const LOOKAHEAD  = 400;  // px before sentinel to start loading

let allCards     = [];   // full dataset from cards.json
let filtered     = [];   // current filtered+searched subset
let rendered     = 0;    // how many cards are currently in the DOM
let loading      = false;

const feed       = document.getElementById('feed');
const sentinel   = document.getElementById('sentinel');
const emptyState = document.getElementById('emptyState');
const statusEl   = document.getElementById('filterStatus');
const searchEl   = document.getElementById('searchInput');

// ── State ──────────────────────────────────────────────────
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

// ── Render a batch of cards ────────────────────────────────
function renderBatch() {
  if (loading || rendered >= filtered.length) return;
  loading = true;

  const end   = Math.min(rendered + BATCH, filtered.length);
  const frag  = document.createDocumentFragment();

  for (let i = rendered; i < end; i++) {
    frag.appendChild(buildCard(filtered[i], i));
  }

  feed.appendChild(frag);
  rendered = end;
  loading  = false;
}

// ── Build a single card DOM node ───────────────────────────
// Direct iframe embed — no dependency on TikTok's embed.js at all.
// embed.js only processes blockquotes present at script-load time,
// making it useless for lazy-injected cards. The /embed/v2/ URL
// works for every card immediately, no script required.
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
      '<span class="video-title">' + escHtml(card.title) + '</span>' +
      '<a class="handle" href="https://www.tiktok.com/@' + card.handle + '" target="_blank" rel="noopener">@' + escHtml(card.handle) + '</a>' +
    '</div>';

  return article;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Scroll observer ────────────────────────────────────────
function setupScrollObserver() {
  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) renderBatch();
  }, { rootMargin: LOOKAHEAD + 'px' });

  obs.observe(sentinel);
}

// ── Apply filters + search, reset render ──────────────────
function applyFilters() {
  const q = state.query.toLowerCase().trim();

  filtered = allCards.filter(card => {
    const tagMatch = state.tag === 'all' || card.tags.includes(state.tag);
    const qMatch   = !q || card.title.toLowerCase().includes(q) || card.handle.toLowerCase().includes(q);
    return tagMatch && qMatch;
  });

  // Clear DOM and reset counter
  feed.innerHTML = '';
  rendered = 0;

  emptyState.classList.toggle('visible', filtered.length === 0);

  // Update status pill
  if (state.tag === 'all' && !q) {
    statusEl.classList.remove('visible');
    statusEl.textContent = '';
  } else {
    const parts = [];
    if (state.tag !== 'all') parts.push(state.tag.charAt(0).toUpperCase() + state.tag.slice(1));
    if (q) parts.push('"' + q + '"');
    statusEl.textContent = parts.join(' · ') + ' · ' + filtered.length + ' creator' + (filtered.length !== 1 ? 's' : '');
    statusEl.classList.add('visible');
  }

  // Render first batch immediately
  renderBatch();
}

// ── Filter chips ───────────────────────────────────────────
const toggleBtn = document.getElementById('filterToggle');
const panel     = document.getElementById('filterPanel');

toggleBtn.addEventListener('click', () => {
  const open = panel.classList.toggle('open');
  toggleBtn.setAttribute('aria-expanded', String(open));
  toggleBtn.classList.toggle('active', open);
});

document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const v = chip.dataset.value;
    state.tag = v;
    document.querySelectorAll('.chip[data-filter="tag"]').forEach(c => {
      c.classList.toggle('active', c.dataset.value === v);
    });
    applyFilters();
  });
});

// ── Search ─────────────────────────────────────────────────
let searchTimer;
searchEl.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.query = searchEl.value;
    applyFilters();
  }, 200); // debounce 200ms
});

searchEl.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    searchEl.value = '';
    state.query = '';
    applyFilters();
  }
});

// ── Reset ──────────────────────────────────────────────────
window.resetFilters = function () {
  state.tag   = 'all';
  state.query = '';
  searchEl.value = '';
  document.querySelectorAll('.chip').forEach(c => {
    c.classList.toggle('active', c.dataset.value === 'all');
  });
  applyFilters();
};

// ── iframe fix — strip TikTok inline styles on inject ─────
(function () {
  function fixIframes() {
    document.querySelectorAll('.video-wrap iframe').forEach(el => {
      if (el.dataset.fixed) return;
      el.dataset.fixed = '1';
      el.style.cssText = '';
    });
  }
  const obs = new MutationObserver(fixIframes);
  obs.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('load', () => {
    fixIframes();
    setTimeout(fixIframes, 1500);
    setTimeout(fixIframes, 4000);
  });
})();