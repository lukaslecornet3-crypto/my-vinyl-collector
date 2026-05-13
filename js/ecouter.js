// ============================================================
// ecouter.js — Page Écouter (liens streaming + sync vinyle d'accueil)
// ============================================================

import { ALBUMS } from './storage.js';
import { state } from './state.js';
import { CV } from './loop.js';
import { preloadCover } from './canvas.js';
import { addSwipe } from './swipe.js';

// Met à jour les liens Spotify / YouTube Music / Apple Music
export function updateStreaming(album) {
  const els = {
    spotify: document.getElementById('spotifyBtn'),
    youtube: document.getElementById('youtubeBtn'),
    apple:   document.getElementById('appleBtn'),
  };
  if (!album) {
    Object.values(els).forEach(b => b && b.classList.add('disabled'));
    return;
  }
  const q = encodeURIComponent(`${album.artist} ${album.title}`);
  if (els.spotify) els.spotify.href = `https://open.spotify.com/search/${q}/albums`;
  if (els.youtube) els.youtube.href = `https://music.youtube.com/search?q=${encodeURIComponent(album.artist + ' ' + album.title + ' full album')}`;
  if (els.apple)   els.apple.href   = `https://music.apple.com/search?term=${q}`;
  Object.values(els).forEach(b => b && b.classList.remove('disabled'));
}

// Synchronise le vinyle d'accueil + le titre/artiste affichés sur le hero
function syncHero(album) {
  CV.hero.album = album;
  const t = document.getElementById('heroEcoTitle');
  const a = document.getElementById('heroEcoArtist');
  if (t) t.textContent = album.title  || '';
  if (a) a.textContent = album.artist || '';
}

export function setEcoAlbum(i) {
  if (!ALBUMS.length) return;
  state.ecoIdx = (i + ALBUMS.length) % ALBUMS.length;
  const a = ALBUMS[state.ecoIdx];
  preloadCover(a.coverUrl);
  CV.eco.album = a;

  document.getElementById('ecoTitle').textContent  = a.title;
  document.getElementById('ecoArtist').textContent = a.artist;
  updateStreaming(a);

  // Hero (accueil) suit l'écouter
  syncHero(a);
}

export function initEcouter() {
  document.getElementById('ecoPrev').onclick = () => setEcoAlbum(state.ecoIdx - 1);
  document.getElementById('ecoNext').onclick = () => setEcoAlbum(state.ecoIdx + 1);

  const ecoWrap = document.getElementById('ecoVinylWrap');
  if (ecoWrap) addSwipe(ecoWrap,
    () => setEcoAlbum(state.ecoIdx + 1),
    () => setEcoAlbum(state.ecoIdx - 1)
  );

  if (ALBUMS.length) setEcoAlbum(0);
}
