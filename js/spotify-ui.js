// ============================================================
// js/spotify-ui.js — Brancher le module Spotify à l'UI
//   - Bouton "Connecter Spotify" dans la modal d'auth
//   - Indicateur "Now playing" dans la navbar
//   - Sync de la page Écouter (matching album + vinyle live)
// ============================================================

import { authState } from './auth.js';
import { ALBUMS } from './storage.js';
import { state } from './state.js';
import { CV } from './loop.js';
import { preloadCover } from './canvas.js';
import {
  spotifyState, onSpotifyChange, startSpotifyPolling,
  fetchNowPlaying, connectSpotify, disconnectSpotify,
  readSpotifyRedirectParams,
} from './spotify.js';
import { toast } from './toast.js';

// ---- Indicateur "Now playing" : icône en bas à gauche, click → affiche le titre ----
function ensureNowPlayingEl() {
  let el = document.getElementById('nowPlaying');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'nowPlaying';
  el.className = 'now-playing hidden';
  el.innerHTML = `
    <button class="np-icon" id="npIconBtn" title="Voir ce qui joue" aria-label="Voir ce qui joue">
      <span class="np-pulse"></span>
    </button>
    <div class="np-expand">
      <span class="np-text">—</span>
      <button class="np-close" id="npCloseBtn" title="Déconnecter Spotify" aria-label="Déconnecter Spotify">✕</button>
    </div>
  `;
  document.body.appendChild(el);

  // Click sur l'icône → toggle l'affichage du titre
  el.querySelector('#npIconBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    el.classList.toggle('expanded');
  });

  // Click hors du widget → referme
  document.addEventListener('click', (e) => {
    if (!el.contains(e.target)) el.classList.remove('expanded');
  });

  // Bouton "×" → déconnexion Spotify
  el.querySelector('#npCloseBtn').addEventListener('click', async (e) => {
    e.stopPropagation();
    const ok = await toast.confirm('Déconnecter Spotify ?');
    if (!ok) return;
    await disconnectSpotify();
    toast.info('Spotify déconnecté');
    el.classList.remove('expanded');
  });
  return el;
}

function refreshNavbarIndicator() {
  const el = ensureNowPlayingEl();
  if (!spotifyState.connected || !spotifyState.playing || !spotifyState.track) {
    el.classList.add('hidden');
    return;
  }
  el.classList.remove('hidden');
  el.querySelector('.np-text').textContent =
    `${spotifyState.track.name} — ${spotifyState.track.artists.join(', ')}`;
  el.title = `${spotifyState.track.name} — ${spotifyState.track.artists.join(', ')} (Spotify)`;
}

// ---- Matching automatique : album Spotify → vinyle de la collection ----
function findMatchingAlbumIndex(track) {
  if (!track) return -1;
  const wantedAlbum  = track.album.toLowerCase().trim();
  const wantedArtist = (track.artists[0] || '').toLowerCase().trim();
  return ALBUMS.findIndex(a => {
    const t = (a.title || '').toLowerCase().trim();
    const ar = (a.artist || '').toLowerCase().trim();
    return t && wantedAlbum && (t === wantedAlbum || wantedAlbum.includes(t) || t.includes(wantedAlbum))
        && (!wantedArtist || ar.includes(wantedArtist) || wantedArtist.includes(ar));
  });
}

// ---- Sync de la page Écouter ----
let lastSyncedTrackKey = null;

function syncEcouterPage() {
  if (!spotifyState.connected) return;
  const isOnEcouter = document.querySelector('.page.active')?.id === 'page-ecouter';

  // 1) Vitesse du vinyle : freeze si pas en lecture (mis à jour à chaque polling)
  CV.eco.speed = spotifyState.playing ? .006 : 0;

  if (!spotifyState.track) return;

  // 2) On ne re-sync l'album QUE quand Spotify change de titre
  //    (évite d'écraser un choix manuel toutes les 10 secondes)
  const trackKey = `${spotifyState.track.name}|${spotifyState.track.artists.join(',')}`;
  if (trackKey === lastSyncedTrackKey) return;
  lastSyncedTrackKey = trackKey;

  const idx = findMatchingAlbumIndex(spotifyState.track);
  if (idx >= 0 && idx !== state.ecoIdx) {
    state.ecoIdx = idx;
    const album = ALBUMS[idx];
    preloadCover(album.coverUrl);
    CV.eco.album = album;
    if (isOnEcouter) {
      document.getElementById('ecoTitle').textContent  = album.title;
      document.getElementById('ecoArtist').textContent = album.artist;
    }
  }
}

// ---- Hijack du bouton streaming Spotify : devient connect/disconnect Spotify Live ----
//      Si pas connecté → click connecte. Si connecté → ouvre Spotify search (comportement original)
function ensureSpotifyButton() {
  const btn = document.getElementById('spotifyBtn');
  if (!btn) return null;
  if (btn.dataset.liveBound) return btn;
  btn.dataset.liveBound = '1';

  btn.addEventListener('click', (e) => {
    // Si l'utilisateur est connecté à Spotify Live → laisse passer le clic (ouverture Spotify)
    if (spotifyState.connected) return;
    // Sinon → intercepte et lance la connexion
    e.preventDefault();
    if (!authState.user) {
      toast.warn('Connecte-toi d\'abord pour utiliser Spotify Live');
      return;
    }
    connectSpotify();
  });
  return btn;
}

function refreshSpotifyButton() {
  const btn = document.getElementById('spotifyBtn');
  if (!btn) return;

  // Visuel : badge "live" si connecté
  btn.classList.toggle('live-connected', spotifyState.connected);
  // Tooltip dynamique
  if (!authState.user)             btn.title = 'Spotify (connecte-toi pour activer Live)';
  else if (spotifyState.connected) btn.title = 'Ouvrir dans Spotify · ⚡ Live activé';
  else                             btn.title = 'Connecter Spotify Live';
}

// ---- Init ----
export async function initSpotifyUI() {
  ensureNowPlayingEl();
  ensureSpotifyButton();
  refreshSpotifyButton();

  // Lit "?spotify=connected" ou "?spotify=error..." de l'URL
  const params = readSpotifyRedirectParams();
  if (params) {
    if (params.status === 'connected') {
      toast.success('Spotify connecté !');
    } else if (params.status === 'error') {
      toast.error('Erreur de connexion Spotify' + (params.reason ? ` (${params.reason})` : ''));
    }
  }

  // Réagit aux mises à jour du state
  onSpotifyChange(() => {
    refreshNavbarIndicator();
    syncEcouterPage();
    refreshSpotifyButton();
  });

  // Démarre le polling uniquement si l'utilisateur est connecté à l'app
  if (authState.user) {
    startSpotifyPolling();
  }
}

// Appelé après login/logout pour réagir
export async function onAuthChange() {
  refreshSpotifyButton();
  if (authState.user) {
    await fetchNowPlaying();
    startSpotifyPolling();
  } else {
    // Logout : on stoppe et on reset
    spotifyState.connected = false;
    spotifyState.playing = false;
    spotifyState.track = null;
    refreshNavbarIndicator();
  }
}
