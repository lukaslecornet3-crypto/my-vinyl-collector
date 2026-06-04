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
import { fetchDiscogsValue, searchDiscogs, searchDiscogsByBarcode, fetchDiscogsRelease } from './api/discogs.js';
import { startScanner, stopScanner } from './barcode-scanner.js';
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
  stopScanner();
  const ov = document.getElementById('scannerOverlay');
  if (ov) ov.classList.add('hidden');
}

function resetModal() {
  document.getElementById('step1').classList.remove('hidden');
  document.getElementById('step2').classList.add('hidden');
  document.getElementById('searchInput').value      = '';
  document.getElementById('searchResults').innerHTML = '';
  document.getElementById('searchStatus').textContent = '';
  state.selectedData = null;
}

let searchTimer = null;

// Normalise les résultats MusicBrainz vers le format commun
function normalizeMb(rg, i) {
  const mbid = rg.id;
  return {
    source: 'mb',
    mbid,
    title:  rg.title || 'Inconnu',
    artist: rg['artist-credit']?.[0]?.name || 'Inconnu',
    year:   rg['first-release-date']?.slice(0, 4) || '—',
    coverUrl: `https://coverartarchive.org/release-group/${mbid}/front-250`,
  };
}

// Déduplication grossière par "artiste|titre"
function dedupe(items) {
  const seen = new Set();
  return items.filter(it => {
    const key = `${(it.artist || '').toLowerCase()}|${(it.title || '').toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function searchAlbums() {
  const q = document.getElementById('searchInput').value.trim();
  if (q.length < 2) return;
  if (state.searchController) state.searchController.abort();
  state.searchController = new AbortController();
  const signal = state.searchController.signal;

  const statusEl  = document.getElementById('searchStatus');
  statusEl.textContent = 'Recherche en cours...';
  document.getElementById('searchResults').innerHTML = '';

  try {
    // Discogs (meilleure couverture vinyle) + MusicBrainz en parallèle
    const [discogs, mbRaw] = await Promise.all([
      searchDiscogs(q, signal).catch(() => []),
      searchReleaseGroups(q, signal).catch(() => []),
    ]);
    const mb = mbRaw.map(normalizeMb);

    // Discogs d'abord (vinyles), puis MusicBrainz, dédupliqués
    const results = dedupe([...discogs, ...mb]).slice(0, 30);

    if (!results.length) {
      statusEl.textContent = 'Aucun résultat. Essaie le scan code-barres ou un autre orthographe.';
      return;
    }
    statusEl.textContent = `${results.length} résultats — clique pour sélectionner`;
    renderResults(results);
  } catch (err) {
    if (err.name === 'AbortError') return;
    statusEl.textContent = 'Erreur de connexion.';
  }
}

// Rendu unifié d'une liste de résultats normalisés
function renderResults(results) {
  const resultsEl = document.getElementById('searchResults');
  resultsEl.innerHTML = '';
  const frag = document.createDocumentFragment();

  results.forEach((r, i) => {
    const colorPair = COLORS[i % COLORS.length];
    const item = document.createElement('div'); item.className = 'result-item';

    const img = document.createElement('img');
    img.className   = 'result-thumb';
    img.alt         = r.title;
    img.loading     = 'lazy';
    img.src         = r.coverUrl || '';
    img.onerror = () => {
      const ph = document.createElement('div');
      ph.className   = 'result-thumb-placeholder';
      ph.textContent = '💿';
      img.replaceWith(ph);
    };

    const info = document.createElement('div'); info.className = 'result-info';
    const t    = document.createElement('div'); t.className    = 'result-title'; t.textContent = r.title;
    const sub  = `${r.artist || 'Inconnu'} · ${r.year}` + (r.source === 'discogs' ? ' · Discogs' : '');
    const s    = document.createElement('div'); s.className    = 'result-sub';   s.textContent = sub;
    info.append(t, s);

    const arr = document.createElement('span'); arr.className = 'result-arrow'; arr.textContent = '→';

    item.append(img, info, arr);
    item.onclick = () => {
      if (r.source === 'discogs') selectDiscogsAlbum({ ...r, colorPair });
      else selectAlbum({ title: r.title, artist: r.artist, year: r.year, mbid: r.mbid, colorPair, coverUrl: r.coverUrl });
    };
    frag.appendChild(item);
  });
  resultsEl.appendChild(frag);
}

// Sélection d'un résultat Discogs → récupère les détails complets
async function selectDiscogsAlbum({ discogsId, title, artist, year, label, coverUrl, colorPair }) {
  state.selectedData = { title, artist, year, colorPair, coverUrl, label: label || '—', tracks: [], durations: [] };
  try {
    const [rel] = await Promise.all([
      fetchDiscogsRelease(discogsId),
      fetchDiscogsValue({ artist, title, year: parseInt(year), condition: 'Excellent (VG+)' }).catch(() => null),
    ]);
    if (rel) {
      state.selectedData.title     = rel.title    || title;
      state.selectedData.artist    = rel.artist   || artist;
      state.selectedData.year      = rel.year     || year;
      state.selectedData.label     = rel.label    || label || '—';
      state.selectedData.coverUrl  = rel.coverUrl || coverUrl;
      state.selectedData.tracks    = rel.tracks    || [];
      state.selectedData.durations = rel.durations || [];
    }
  } catch (e) {
    console.warn('Détails Discogs non disponibles', e);
  }
  showStep2();
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

  const v = await fetchDiscogsValue({ artist, title, year: parseInt(year), condition });

  const newAlbum = {
    title, artist, year: parseInt(year) || year, label, condition,
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

// ---- Scanner code-barres ----
let scanning = false;

function openScanner() {
  const overlay = document.getElementById('scannerOverlay');
  const video   = document.getElementById('scannerVideo');
  const hint    = document.getElementById('scannerHint');
  overlay.classList.remove('hidden');
  hint.textContent = 'Démarrage de la caméra…';
  scanning = true;

  startScanner(video, async (barcode) => {
    if (!scanning) return;
    scanning = false;            // évite les lectures multiples
    hint.textContent = `Code détecté : ${barcode} — recherche…`;
    try {
      const results = await searchDiscogsByBarcode(barcode);
      closeScanner();
      if (!results.length) {
        toast.warn('Code-barres non trouvé sur Discogs. Essaie la recherche texte.');
        return;
      }
      if (results.length === 1) {
        const r = results[0];
        selectDiscogsAlbum({ ...r, colorPair: COLORS[0] });
      } else {
        document.getElementById('searchStatus').textContent =
          `${results.length} pressages trouvés — choisis le bon`;
        renderResults(results);
      }
    } catch {
      closeScanner();
      toast.error('Erreur pendant la recherche du code-barres');
    }
  }, (err) => {
    hint.textContent = 'Caméra inaccessible. Autorise l\'accès ou utilise la recherche texte.';
    console.warn('Scanner error', err);
  });
}

function closeScanner() {
  scanning = false;
  stopScanner();
  document.getElementById('scannerOverlay').classList.add('hidden');
}

export function initModalAdd() {
  document.getElementById('openAddModal').onclick = openModal;
  document.getElementById('closeModal').onclick   = () => { closeScanner(); closeModal(); };
  modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) { closeScanner(); closeModal(); } });

  document.getElementById('scanBtn').onclick       = openScanner;
  document.getElementById('scanCancelBtn').onclick = closeScanner;

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
