// ============================================================
// collection.js — Page Collection (vue liste + vue grille)
// ============================================================

import { ALBUMS, saveCollection } from './storage.js';
import { state } from './state.js';
import { CV, gridCanvases, startLoop, isLoopRunning } from './loop.js';
import { preloadCover } from './canvas.js';
import { addSwipe } from './swipe.js';
import { applyFilters, updateColCount } from './search.js';
import { openDetail } from './modal-detail.js';
import { openEdit } from './modal-edit.js';
import { toast } from './toast.js';

let gridObserver = null;

// ---- Vue liste / grille ----
export function switchView(v) {
  state.currentView = v;
  document.getElementById('viewList').classList.toggle('active', v === 'list');
  document.getElementById('viewGrid').classList.toggle('active', v === 'grid');
  document.getElementById('viewListContainer').style.display = v === 'list' ? '' : 'none';
  document.getElementById('viewGridContainer').style.display = v === 'grid' ? '' : 'none';
  if (v === 'grid') buildGrid();
  gridCanvases.forEach(gc => gc.active = v === 'grid');
}

// ---- Anime uniquement les canvas visibles à l'écran ----
function setupGridObserver() {
  if (gridObserver) gridObserver.disconnect();
  gridObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const gc = gridCanvases.find(g => g.el === entry.target);
      if (gc) gc.visible = entry.isIntersecting;
    });
  }, { threshold: 0.1 });
  gridCanvases.forEach(gc => gridObserver.observe(gc.el));
}

function buildGrid() {
  const container = document.getElementById('viewGridContainer');
  container.innerHTML = '';
  gridCanvases.length = 0;
  if (gridObserver) { gridObserver.disconnect(); gridObserver = null; }
  if (!state.filteredAlbums.length) return;

  const frag = document.createDocumentFragment();
  state.filteredAlbums.forEach((album, i) => {
    preloadCover(album.coverUrl);

    const item   = document.createElement('div'); item.className = 'grid-item';
    const wrap   = document.createElement('div'); wrap.className = 'grid-vinyl-wrap';
    const canvas = document.createElement('canvas'); canvas.width = 140; canvas.height = 140;
    wrap.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    gridCanvases.push({ el: canvas, ctx, album, angle: Math.random()*Math.PI*2, visible: false });

    const titleEl  = document.createElement('div');  titleEl.className  = 'grid-item-title';  titleEl.textContent  = album.title;
    const artistEl = document.createElement('div'); artistEl.className = 'grid-item-artist'; artistEl.textContent = album.artist;
    const yearEl   = document.createElement('div');   yearEl.className   = 'grid-item-year';    yearEl.textContent   = album.year || '';

    item.append(wrap, titleEl, artistEl, yearEl);
    item.onclick = () => {
      const realIdx = ALBUMS.indexOf(album);
      openDetail(realIdx >= 0 ? realIdx : i);
    };
    frag.appendChild(item);
  });
  container.appendChild(frag);
  setupGridObserver();
  if (!isLoopRunning()) startLoop();
}

// ---- Navigation dans la vue liste ----
export function setColAlbum(i, dir = 1) {
  if (!state.filteredAlbums.length) return;
  state.colIdx = (i + state.filteredAlbums.length) % state.filteredAlbums.length;
  const album = state.filteredAlbums[state.colIdx];
  preloadCover(album.coverUrl);
  CV.col.album = album;

  // Animation de glissement
  const canvasEl = CV.col.el;
  canvasEl.classList.remove('slide-active', 'slide-in-left', 'slide-in-right');
  canvasEl.classList.add(dir > 0 ? 'slide-in-left' : 'slide-in-right');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    canvasEl.classList.remove('slide-in-left', 'slide-in-right');
    canvasEl.classList.add('slide-active');
  }));

  document.getElementById('colTitle').textContent     = album.title;
  document.getElementById('colArtist').textContent    = album.artist;
  document.getElementById('colYear').textContent      = album.year      || '—';
  document.getElementById('colLabel').textContent     = album.label     || '—';
  document.getElementById('colCondition').textContent = album.condition || '—';
  document.querySelectorAll('#colDots .dot').forEach((d, j) =>
    d.classList.toggle('active', j === state.colIdx)
  );
}

export function rebuildCollection() {
  const empty = document.getElementById('emptyState');
  const listC = document.getElementById('viewListContainer');
  const gridC = document.getElementById('viewGridContainer');

  if (!state.filteredAlbums.length) {
    empty.style.display = 'flex';
    listC.style.display = 'none';
    gridC.style.display = 'none';
    updateStreaming(null);
    return;
  }
  empty.style.display = 'none';
  if (state.currentView === 'list') {
    listC.style.display = ''; gridC.style.display = 'none';
  } else {
    listC.style.display = 'none'; gridC.style.display = ''; buildGrid();
  }

  // Reconstruit les "dots" de navigation
  const dots = document.getElementById('colDots');
  dots.innerHTML = '';
  state.filteredAlbums.forEach((a, i) => {
    const d = document.createElement('button');
    d.className = 'dot';
    d.setAttribute('aria-label', a.title);
    d.onclick = () => setColAlbum(i);
    dots.appendChild(d);
  });
  setColAlbum(Math.min(state.colIdx, state.filteredAlbums.length - 1));
}

export function initCollection() {
  document.getElementById('viewList').onclick = () => switchView('list');
  document.getElementById('viewGrid').onclick = () => switchView('grid');
  document.getElementById('colPrev').onclick  = () => setColAlbum(state.colIdx - 1, -1);
  document.getElementById('colNext').onclick  = () => setColAlbum(state.colIdx + 1,  1);

  const colWrap = document.getElementById('colVinylWrap');
  if (colWrap) addSwipe(colWrap,
    () => setColAlbum(state.colIdx + 1,  1),
    () => setColAlbum(state.colIdx - 1, -1)
  );

  document.getElementById('editBtn').onclick = () => {
    const album = state.filteredAlbums[state.colIdx];
    if (!album) return;
    openEdit(ALBUMS.indexOf(album));
  };

  document.getElementById('deleteBtn').onclick = async () => {
    const album = state.filteredAlbums[state.colIdx];
    if (!album) return;
    const ok = await toast.confirm(`Supprimer "${album.title}" ?`);
    if (!ok) return;
    const idx = ALBUMS.indexOf(album);
    if (idx >= 0) ALBUMS.splice(idx, 1);
    saveCollection();
    state.filteredAlbums = [...ALBUMS];
    applyFilters();
    toast.success(`"${album.title}" supprimé`);
  };

  state.filteredAlbums = [...ALBUMS];
  updateColCount();
  rebuildCollection();
}
