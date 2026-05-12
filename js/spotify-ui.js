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

// ---- Indicateur navbar "Now playing" ----
function ensureNowPlayingEl() {
  let el = document.getElementById('nowPlaying');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'nowPlaying';
  el.className = 'now-playing hidden';
  el.innerHTML = `
    <span class="np-pulse"></span>
    <span class="np-text">—</span>
  `;
  // Insère avant le theme toggle
  const themeToggle = document.getElementById('themeToggle');
  themeToggle?.parentNode.insertBefore(el, themeToggle);
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

// ---- Bouton "Connecter Spotify" dans la page Écouter ----
function ensureSpotifyButton() {
  let btn = document.getElementById('spotifyConnectBtn');
  if (btn) return btn;

  // Injecte une mini-barre Spotify EN HAUT de la page Écouter
  const target = document.querySelector('#page-ecouter .ecouter-content');
  if (!target) return null;

  const wrap = document.createElement('div');
  wrap.id = 'spotifyConnectWrap';
  wrap.className = 'spotify-bar hidden';
  wrap.innerHTML = `
    <div class="spotify-bar-status" id="spotifyBarStatus">—</div>
    <button type="button" id="spotifyConnectBtn" class="spotify-btn">
      <svg viewBox="0 0 24 24" fill="currentColor" class="spotify-icon">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
      </svg>
      <span id="spotifyBtnLabel">Connecter Spotify</span>
    </button>
  `;
  // Insère TOUT EN HAUT du contenu de la page écouter
  target.insertBefore(wrap, target.firstChild);

  btn = document.getElementById('spotifyConnectBtn');
  btn.addEventListener('click', async () => {
    if (!authState.user) {
      toast.warn('Connecte-toi d\'abord pour utiliser Spotify Live');
      return;
    }
    if (spotifyState.connected) {
      const ok = await toast.confirm('Déconnecter Spotify ?');
      if (!ok) return;
      await disconnectSpotify();
      toast.info('Spotify déconnecté');
      refreshSpotifyButton();
    } else {
      connectSpotify();
    }
  });
  return btn;
}

function refreshSpotifyButton() {
  const wrap = document.getElementById('spotifyConnectWrap');
  if (!wrap) return;

  const label  = document.getElementById('spotifyBtnLabel');
  const status = document.getElementById('spotifyBarStatus');
  const btn    = document.getElementById('spotifyConnectBtn');

  wrap.classList.remove('hidden');

  if (!authState.user) {
    status.textContent = '🔒 Connecte-toi pour utiliser Spotify Live';
    label.textContent  = 'Connecter Spotify';
    btn.classList.remove('connected');
    btn.disabled = true;
    return;
  }
  btn.disabled = false;

  if (spotifyState.connected) {
    if (spotifyState.playing && spotifyState.track) {
      status.innerHTML = `🎵 Sur Spotify : <strong>${spotifyState.track.name}</strong> — ${spotifyState.track.artists.join(', ')}`;
    } else {
      status.textContent = '✓ Spotify connecté · rien en lecture pour le moment';
    }
    label.textContent = 'Déconnecter';
    btn.classList.add('connected');
  } else {
    status.textContent = 'Synchronise le vinyle en lecture avec Spotify';
    label.textContent = 'Connecter Spotify';
    btn.classList.remove('connected');
  }
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
