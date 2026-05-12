// ============================================================
// search.js — Scoring de pertinence + filtres + tri
// ============================================================

import { ALBUMS } from './storage.js';
import { state } from './state.js';
import { rebuildCollection } from './collection.js';

// Score selon où la requête matche : titre > artiste > label > année
export function scoreAlbum(album, q) {
  if (!q) return 1;
  const qLow   = q.toLowerCase();
  const title  = album.title.toLowerCase();
  const artist = album.artist.toLowerCase();
  const label  = (album.label || '').toLowerCase();
  const year   = String(album.year || '');
  let score = 0;

  if (title === qLow)              score += 100;
  else if (title.startsWith(qLow)) score += 60;
  else if (title.includes(qLow))   score += 30;

  if (artist === qLow)              score += 50;
  else if (artist.startsWith(qLow)) score += 30;
  else if (artist.includes(qLow))   score += 15;

  if (label.includes(qLow)) score += 8;
  if (year.includes(qLow))  score += 5;

  return score;
}

export function applyFilters() {
  const q     = document.getElementById('colSearch').value.trim();
  const sort  = document.getElementById('filterSort').value;
  const stateF = document.getElementById('filterState').value;
  const qLow  = q.toLowerCase();

  // 1) Filtrage (état + recherche)
  let result = ALBUMS.filter(a => {
    if (stateF && a.condition !== stateF) return false;
    if (!q) return true;
    return `${a.title} ${a.artist} ${a.label} ${a.year}`.toLowerCase().includes(qLow);
  });

  // 2) Tri : pertinence si recherche active + tri "défaut", sinon critère choisi
  if (q && sort === 'default') {
    result.sort((a, b) => scoreAlbum(b, q) - scoreAlbum(a, q));
  } else {
    result.sort((a, b) => {
      if (sort === 'title')     return a.title.localeCompare(b.title);
      if (sort === 'artist')    return a.artist.localeCompare(b.artist);
      if (sort === 'year-asc')  return (a.year || 0) - (b.year || 0);
      if (sort === 'year-desc') return (b.year || 0) - (a.year || 0);
      return 0;
    });
  }

  state.filteredAlbums = result;
  state.colIdx = 0;
  updateColCount();
  rebuildCollection();
}

export function updateColCount() {
  const total = ALBUMS.length;
  const shown = state.filteredAlbums.length;
  document.getElementById('colCount').textContent =
    total === shown
      ? `${total} vinyle${total > 1 ? 's' : ''}`
      : `${shown} / ${total} vinyle${total > 1 ? 's' : ''}`;
}

export function initSearch() {
  document.getElementById('colSearch').addEventListener('input', applyFilters);
  document.getElementById('filterSort').addEventListener('change', applyFilters);
  document.getElementById('filterState').addEventListener('change', applyFilters);
}
