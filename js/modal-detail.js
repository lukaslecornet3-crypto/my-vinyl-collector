// ============================================================
// modal-detail.js — Modal "Détails d'un vinyle"
//   + boutons Modifier / Supprimer (utiles depuis la vue grille)
// ============================================================

import { ALBUMS, saveCollection } from './storage.js';
import { state } from './state.js';
import { CV, startLoop, isLoopRunning } from './loop.js';
import { preloadCover } from './canvas.js';
import { openEdit } from './modal-edit.js';
import { applyFilters } from './search.js';
import { toast } from './toast.js';
import { sharedView } from './share-view.js';

const detailOverlay = document.getElementById('detailOverlay');
let currentDetailIdx = -1;

export function openDetail(albumIdx) {
  const a = ALBUMS[albumIdx];
  if (!a) return;
  currentDetailIdx = albumIdx;

  preloadCover(a.coverUrl);
  CV.det.album  = a;
  CV.det.active = true;

  document.getElementById('detailAlbumTitle').textContent = a.title;
  document.getElementById('detailArtist').textContent     = a.artist;
  document.getElementById('detailYear').textContent       = a.year      || '—';
  document.getElementById('detailLabel').textContent      = a.label     || '—';
  document.getElementById('detailCond').textContent       = a.condition || '—';
  document.getElementById('detailValue').textContent      = a.mid || a.value || '—';

  const dt = document.getElementById('detailTracks');
  dt.innerHTML = '';
  (a.tracks || []).forEach((t, j) => {
    const r    = document.createElement('div'); r.className    = 'detail-track-row';
    const num  = document.createElement('span'); num.className  = 'detail-track-num';  num.textContent  = j + 1;
    const name = document.createElement('span'); name.className = 'detail-track-name'; name.textContent = t;
    const dur  = document.createElement('span'); dur.className  = 'detail-track-dur';  dur.textContent  = (a.durations || [])[j] || '—';
    r.append(num, name, dur);
    dt.appendChild(r);
  });

  // Cache les boutons d'action en mode lecture publique
  const actions = document.querySelector('.detail-actions');
  if (actions) actions.style.display = sharedView.active ? 'none' : '';

  detailOverlay.classList.add('open');
  if (!isLoopRunning()) startLoop();
}

export function closeDetail() {
  detailOverlay.classList.remove('open');
  CV.det.active = false;
  CV.det.album  = null;
  currentDetailIdx = -1;
}

export function initModalDetail() {
  document.getElementById('closeDetail').onclick = closeDetail;
  detailOverlay.addEventListener('click', e => { if (e.target === detailOverlay) closeDetail(); });

  // Bouton "Détails" de la vue liste
  document.getElementById('detailBtn').onclick = () =>
    openDetail(ALBUMS.indexOf(state.filteredAlbums[state.colIdx]));

  // Bouton "Modifier" dans la modal de détail
  document.getElementById('detailEditBtn')?.addEventListener('click', () => {
    if (currentDetailIdx < 0) return;
    const idx = currentDetailIdx;
    closeDetail();
    openEdit(idx);
  });

  // Bouton "Supprimer" dans la modal de détail
  document.getElementById('detailDeleteBtn')?.addEventListener('click', async () => {
    if (currentDetailIdx < 0) return;
    const album = ALBUMS[currentDetailIdx];
    if (!album) return;
    const ok = await toast.confirm(`Supprimer "${album.title}" ?`);
    if (!ok) return;
    ALBUMS.splice(currentDetailIdx, 1);
    saveCollection();
    state.filteredAlbums = [...ALBUMS];
    applyFilters();
    closeDetail();
    toast.success(`"${album.title}" supprimé`);
  });
}
