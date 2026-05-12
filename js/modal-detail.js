// ============================================================
// modal-detail.js — Modal "Détails d'un vinyle"
// ============================================================

import { ALBUMS } from './storage.js';
import { state } from './state.js';
import { CV, startLoop, isLoopRunning } from './loop.js';
import { preloadCover } from './canvas.js';

const detailOverlay = document.getElementById('detailOverlay');

export function openDetail(albumIdx) {
  const a = ALBUMS[albumIdx];
  if (!a) return;
  preloadCover(a.coverUrl);
  CV.det.album  = a;
  CV.det.active = true;

  document.getElementById('detailAlbumTitle').textContent = a.title;
  document.getElementById('detailArtist').textContent     = a.artist;
  document.getElementById('detailYear').textContent       = a.year      || '—';
  document.getElementById('detailLabel').textContent      = a.label     || '—';
  document.getElementById('detailCond').textContent       = a.condition || '—';
  document.getElementById('detailValue').textContent      = a.mid || a.value || '—';
  document.getElementById('detailNotes').textContent      = a.notes || 'Aucune note.';

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

  detailOverlay.classList.add('open');
  if (!isLoopRunning()) startLoop();
}

export function closeDetail() {
  detailOverlay.classList.remove('open');
  CV.det.active = false;
  CV.det.album  = null;
}

export function initModalDetail() {
  document.getElementById('closeDetail').onclick = closeDetail;
  detailOverlay.addEventListener('click', e => { if (e.target === detailOverlay) closeDetail(); });
  document.getElementById('detailBtn').onclick = () =>
    openDetail(ALBUMS.indexOf(state.filteredAlbums[state.colIdx]));
}
