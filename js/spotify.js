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

// Intervalles adaptatifs (économise le quota Upstash + l'API Spotify)
const INTERVAL_PLAYING   = 10_000; // 10s quand Spotify joue
const INTERVAL_IDLE      = 30_000; // 30s quand pas de lecture
const INTERVAL_DISCONNECTED = 60_000; // 1min si pas connecté à Spotify Live

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
let pollingActive = false;

function nextInterval() {
  if (!spotifyState.connected) return INTERVAL_DISCONNECTED;
  if (spotifyState.playing)    return INTERVAL_PLAYING;
  return INTERVAL_IDLE;
}

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

function scheduleNext() {
  if (!pollingActive) return;
  if (pollTimer) clearTimeout(pollTimer);
  pollTimer = setTimeout(async () => {
    if (!pollingActive) return;
    await fetchNowPlaying();
    scheduleNext();
  }, nextInterval());
}

export function startSpotifyPolling() {
  stopSpotifyPolling();
  pollingActive = true;
  fetchNowPlaying().then(scheduleNext);
  document.addEventListener('visibilitychange', onVisibility);
}

export function stopSpotifyPolling() {
  pollingActive = false;
  if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
  document.removeEventListener('visibilitychange', onVisibility);
}

function onVisibility() {
  if (document.hidden) {
    // Onglet en arrière-plan : on pause le polling
    if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
  } else {
    // Onglet revient au premier plan : on relance
    if (pollingActive) {
      fetchNowPlaying().then(scheduleNext);
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
