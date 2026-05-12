// ============================================================
// modal-add.js — Modal "Ajouter un vinyle" (recherche MusicBrainz)
// ============================================================

import { ALBUMS, saveCollection } from './storage.js';
import { state } from './state.js';
import { COLORS } from './data.js';
import { CV, startLoop, isLoopRunning } from './loop.js';
import { preloadCover } from './canvas.js';
import { applyFilters } from './search.js';
import { navigateTo } from './navigation.js';
import { searchReleaseGroups, fetchReleaseGroupDetails, formatDuration } from './api/musicbrainz.js';
import { fetchDiscogsValue } from './api/discogs.js';
import { toast } from './toast.js';

const modalOverlay = document.getElementById('modalOverlay');

export function openModal() {
  modalOverlay.classList.add('open');
  resetModal();
  setTimeout(() => document.getElementById('searchInput').focus(), 100);
}

export function closeModal() {
  modalOverlay.classList.remove('open');
  CV.prev.active = false;
  CV.prev.album  = null;
  if (state.searchController) { state.searchController.abort(); state.searchController = null; }
}

function resetModal() {
  document.getElementById('step1').classList.remove('hidden');
  document.getElementById('step2').classList.add('hidden');
  document.getElementById('searchInput').value      = '';
  document.getElementById('searchResults').innerHTML = '';
  document.getElementById('searchStatus').textContent = '';
  document.getElementById('notesInput').value       = '';
  state.selectedData = null;
}

let searchTimer = null;

async function searchAlbums() {
  const q = document.getElementById('searchInput').value.trim();
  if (q.length < 2) return;
  if (state.searchController) state.searchController.abort();
  state.searchController = new AbortController();

  const statusEl  = document.getElementById('searchStatus');
  const resultsEl = document.getElementById('searchResults');
  statusEl.textContent = 'Recherche en cours...';
  resultsEl.innerHTML  = '';

  try {
    const rgs = await searchReleaseGroups(q, state.searchController.signal);
    if (!rgs.length) { statusEl.textContent = 'Aucun résultat.'; return; }
    statusEl.textContent = `${rgs.length} résultats — clique pour sélectionner`;

    const frag = document.createDocumentFragment();
    rgs.forEach((rg, i) => {
      const title  = rg.title || 'Inconnu';
      const artist = rg['artist-credit']?.[0]?.name || 'Inconnu';
      const year   = rg['first-release-date']?.slice(0, 4) || '—';
      const mbid   = rg.id;
      const colorPair = COLORS[i % COLORS.length];
      const coverUrl  = `https://coverartarchive.org/release-group/${mbid}/front-250`;

      const item = document.createElement('div'); item.className = 'result-item';

      const img = document.createElement('img');
      img.className   = 'result-thumb';
      img.crossOrigin = 'anonymous';
      img.alt         = title;
      img.loading     = 'lazy';
      img.src         = coverUrl;
      img.onerror = () => {
        const ph = document.createElement('div');
        ph.className   = 'result-thumb-placeholder';
        ph.textContent = '💿';
        img.replaceWith(ph);
      };

      const info = document.createElement('div'); info.className = 'result-info';
      const t    = document.createElement('div'); t.className    = 'result-title'; t.textContent = title;
      const s    = document.createElement('div'); s.className    = 'result-sub';   s.textContent = `${artist} · ${year}`;
      info.append(t, s);

      const arr = document.createElement('span'); arr.className = 'result-arrow'; arr.textContent = '→';

      item.append(img, info, arr);
      item.onclick = () => selectAlbum({ title, artist, year, mbid, colorPair, coverUrl });
      frag.appendChild(item);
    });
    resultsEl.appendChild(frag);
  } catch (err) {
    if (err.name === 'AbortError') return;
    statusEl.textContent = 'Erreur de connexion.';
  }
}

// Récupère les détails MusicBrainz + précharge l'estimation Discogs en parallèle
async function selectAlbum({ title, artist, year, mbid, colorPair, coverUrl }) {
  state.selectedData = { title, artist, year, colorPair, coverUrl, label:'—', tracks:[], durations:[] };
  try {
    const [relData] = await Promise.all([
      fetchReleaseGroupDetails(mbid),
      fetchDiscogsValue({ artist, title, year: parseInt(year), condition: 'Excellent (VG+)' }).catch(() => null),
    ]);
    if (relData) {
      state.selectedData.tracks    = relData.media?.[0]?.tracks?.map(t => t.title) || [];
      state.selectedData.durations = relData.media?.[0]?.tracks?.map(t => formatDuration(t.length || 0)) || [];
      state.selectedData.label     = relData['label-info']?.[0]?.label?.name || '—';
    }
  } catch (e) {
    console.warn('Détails non disponibles', e);
  }
  showStep2();
}

function showStep2() {
  document.getElementById('step1').classList.add('hidden');
  document.getElementById('step2').classList.remove('hidden');
  const { title, artist, year, label, colorPair, coverUrl } = state.selectedData;
  document.getElementById('confirmTitle').textContent  = title;
  document.getElementById('confirmArtist').textContent = artist;
  document.getElementById('confirmMeta').textContent   = `${year}${label !== '—' ? ' · ' + label : ''}`;
  preloadCover(coverUrl);
  CV.prev.album  = { color: colorPair.color, rim: colorPair.rim, coverUrl };
  CV.prev.active = true;
  if (!isLoopRunning()) startLoop();
}

async function confirmAdd() {
  const { title, artist, year, colorPair, coverUrl, label, tracks, durations } = state.selectedData;
  const condition = document.getElementById('conditionSelect').value;
  const notes     = document.getElementById('notesInput').value.trim();

  const v = await fetchDiscogsValue({ artist, title, year: parseInt(year), condition });

  const newAlbum = {
    title, artist, year: parseInt(year) || year, label, condition, notes,
    value: v.mid, low: v.low, mid: v.mid, high: v.high,
    color: colorPair.color, rim: colorPair.rim, coverUrl,
    tracks:    tracks.length    ? tracks    : ['Piste 1','Piste 2','Piste 3'],
    durations: durations.length ? durations : [],
  };
  preloadCover(coverUrl);
  ALBUMS.push(newAlbum);
  saveCollection();
  if (ALBUMS.length === 1) CV.hero.album = ALBUMS[0];
  state.filteredAlbums = [...ALBUMS];
  applyFilters();
  closeModal();
  navigateTo('collection');
  toast.success(`"${title}" ajouté à ta collection`);
}

export function initModalAdd() {
  document.getElementById('openAddModal').onclick = openModal;
  document.getElementById('closeModal').onclick   = closeModal;
  modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });

  document.getElementById('searchBtn').onclick = searchAlbums;
  document.getElementById('searchInput').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(searchAlbums, 400);
  });
  document.getElementById('searchInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') { clearTimeout(searchTimer); searchAlbums(); }
  });

  document.getElementById('backBtn').onclick = () => {
    CV.prev.active = false; CV.prev.album = null;
    document.getElementById('step1').classList.remove('hidden');
    document.getElementById('step2').classList.add('hidden');
  };

  document.getElementById('confirmAddBtn').onclick = confirmAdd;
}
