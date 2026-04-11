/* ─────────────────────────────────────────────────────────────
   FeedDrop — app.js
   • Loads cards.json
   • 20 cards per page with numbered pagination
   • Filter chips (tag) + search bar (title, handle, tags)
───────────────────────────────────────────────────────────── */

const PAGE_SIZE = 20;

let allCards = [];
let filtered = [];
let currentPage = 1;

const feed       = document.getElementById('feed');
const emptyState = document.getElementById('emptyState');
const statusEl   = document.getElementById('filterStatus');
const searchEl   = document.getElementById('searchInput');
const pagination = document.getElementById('pagination');

const state = { tag: 'all', query: '' };

// ── Boot ───────────────────────────────────────────────────
fetch('/cards.json')
  .then(r => r.json())
  .then(data => {
    allCards = data;
    applyFilters();
  })
  .catch(err => console.error('Failed to load cards.json:', err));

// ── Render current page ────────────────────────────────────
function renderPage() {
  feed.innerHTML = '';

  const start = (currentPage - 1) * PAGE_SIZE;
  const end   = Math.min(start + PAGE_SIZE, filtered.length);
  const slice = filtered.slice(start, end);

  const frag = document.createDocumentFragment();
  slice.forEach((card, i) => frag.appendChild(buildCard(card, i)));
  feed.appendChild(frag);

  renderPagination();

  // Scroll to top of feed smoothly
  feed.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Build card DOM node ────────────────────────────────────
function buildCard(card, index) {
  const article = document.createElement('article');
  article.className = 'card';
  article.dataset.tags = card.tags.join(' ');
  article.style.animationDelay = (index * 0.04) + 's';

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

// ── Render pagination controls ─────────────────────────────
function renderPagination() {
  pagination.innerHTML = '';
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  if (totalPages <= 1) return;

  function btn(label, page, disabled, active) {
    const b = document.createElement('button');
    b.className = 'page-btn' + (active ? ' active' : '') + (disabled ? ' disabled' : '');
    b.textContent = label;
    b.disabled = disabled;
    if (!disabled && !active) {
      b.addEventListener('click', () => goToPage(page));
    }
    return b;
  }

  // Prev
  pagination.appendChild(btn('← Prev', currentPage - 1, currentPage === 1, false));

  // Page numbers with ellipsis
  const pages = getPageNumbers(currentPage, totalPages);
  pages.forEach(p => {
    if (p === '...') {
      const span = document.createElement('span');
      span.className = 'page-ellipsis';
      span.textContent = '…';
      pagination.appendChild(span);
    } else {
      pagination.appendChild(btn(p, p, false, p === currentPage));
    }
  });

  // Next
  pagination.appendChild(btn('Next →', currentPage + 1, currentPage === totalPages, false));
}

// Always show: first, last, current, and 1 either side of current
function getPageNumbers(current, total) {
  const pages = new Set([1, total, current, current - 1, current + 1].filter(p => p >= 1 && p <= total));
  const sorted = [...pages].sort((a, b) => a - b);
  const result = [];
  let prev = null;
  for (const p of sorted) {
    if (prev !== null && p - prev > 1) result.push('...');
    result.push(p);
    prev = p;
  }
  return result;
}

function goToPage(page) {
  currentPage = page;
  renderPage();
}

// ── Apply filter + search ──────────────────────────────────
function applyFilters() {
  const q = state.query.toLowerCase().trim();

  filtered = allCards.filter(card => {
    const tagMatch = state.tag === 'all' || card.tags.includes(state.tag);
    const qMatch   = !q
      || card.title.toLowerCase().includes(q)
      || card.handle.toLowerCase().includes(q)
      || card.tags.some(t => t.toLowerCase().includes(q));
    return tagMatch && qMatch;
  });

  currentPage = 1; // always reset to page 1 on filter change
  emptyState.classList.toggle('visible', filtered.length === 0);

  // Status pill
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

  renderPage();
}

// ── Filter toggle ──────────────────────────────────────────
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

// ── Search ─────────────────────────────────────────────────
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