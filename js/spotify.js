// ============================================================
// js/spotify.js — Client Spotify côté navigateur
//   - Polling toutes les 10 secondes
//   - État partagé (spotifyState) + listeners pour le rafraîchissement UI
// ============================================================

export const spotifyState = {
  connected: false,
  playing:   false,
  track:     null, // { name, artists, album, albumImage, progress_ms, duration_ms, spotifyUrl }
  lastPolledAt: 0,
};

const POLL_INTERVAL_MS = 10000;

const listeners = new Set();
export function onSpotifyChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function notify() {
  for (const cb of listeners) {
    try { cb(spotifyState); } catch {}
  }
}

let pollTimer = null;

export async function fetchNowPlaying() {
  try {
    const res = await fetch('/api/spotify/now-playing', { credentials: 'same-origin' });
    if (!res.ok) return;
    const data = await res.json();
    spotifyState.connected = !!data.connected;
    spotifyState.playing   = !!data.playing;
    spotifyState.track     = data.track || null;
    spotifyState.lastPolledAt = Date.now();
    notify();
  } catch {
    // Silencieux : juste un cycle de polling raté
  }
}

export function startSpotifyPolling() {
  stopSpotifyPolling();
  fetchNowPlaying();
  pollTimer = setInterval(fetchNowPlaying, POLL_INTERVAL_MS);
  // Stoppe si l'onglet n'est pas visible (économise les requêtes)
  document.addEventListener('visibilitychange', onVisibility);
}

export function stopSpotifyPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  document.removeEventListener('visibilitychange', onVisibility);
}

function onVisibility() {
  if (document.hidden) {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  } else {
    if (!pollTimer) {
      fetchNowPlaying();
      pollTimer = setInterval(fetchNowPlaying, POLL_INTERVAL_MS);
    }
  }
}

export function connectSpotify() {
  // GET → redirection serveur vers Spotify
  location.href = '/api/spotify/login';
}

export async function disconnectSpotify() {
  const res = await fetch('/api/spotify/disconnect', {
    method: 'POST',
    credentials: 'same-origin',
  });
  spotifyState.connected = false;
  spotifyState.playing   = false;
  spotifyState.track     = null;
  notify();
  return res.ok;
}

// Détecte les query params "?spotify=connected" ou "?spotify=error..."
export function readSpotifyRedirectParams() {
  const p = new URLSearchParams(location.search);
  const status = p.get('spotify');
  if (!status) return null;
  // Nettoie l'URL pour ne pas garder le paramètre
  const url = new URL(location);
  url.searchParams.delete('spotify');
  url.searchParams.delete('reason');
  history.replaceState({}, '', url.toString());
  return { status, reason: p.get('reason') };
}
