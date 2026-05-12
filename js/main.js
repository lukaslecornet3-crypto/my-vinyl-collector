// ============================================================
// main.js — Point d'entrée de l'application
// Import et orchestration de tous les modules
// ============================================================

import { ALBUMS } from './storage.js';
import { initTheme } from './theme.js';
import { preloadCover } from './canvas.js';
import { CV, initCV, startLoop } from './loop.js';
import { initSearch } from './search.js';
import { initCollection } from './collection.js';
import { initValeur } from './valeur.js';
import { initEcouter } from './ecouter.js';
import { initCSV } from './csv.js';
import { initModalAdd } from './modal-add.js';
import { initModalDetail } from './modal-detail.js';
import { initModalEdit } from './modal-edit.js';
import { initModalShare } from './modal-share.js';
import { initNavigation } from './navigation.js';
import { initAuth } from './modal-auth.js';
import { maybeInitSharedView, sharedView } from './share-view.js';
import { initSpotifyUI } from './spotify-ui.js';

// ---- Service worker ----
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () =>
    navigator.serviceWorker.register('/sw.js').catch(e => console.warn('SW:', e))
  );
}

// ---- Préchargement des pochettes ----
ALBUMS.forEach(a => preloadCover(a.coverUrl));

// ---- Init des canvas (associe chaque clé à son <canvas>) ----
initCV('hero', 'heroVinyl');
initCV('col',  'colVinyl');
initCV('val',  'valVinyl');
initCV('eco',  'ecoVinyl');
initCV('prev', 'previewVinyl');
initCV('det',  'detailVinyl');

// ---- Thème ----
initTheme();

// ---- Drag du vinyle hero (souris + tactile) ----
(function initHeroDrag() {
  let down = false, lastX = 0;
  const heroEl = CV.hero.el;
  if (!heroEl) return;

  heroEl.addEventListener('mousedown', e => { down = true; lastX = e.clientX; CV.hero.speed = 0; });
  document.addEventListener('mousemove', e => {
    if (!down) return;
    CV.hero.angle += (e.clientX - lastX) * .015;
    lastX = e.clientX;
  });
  document.addEventListener('mouseup', () => {
    if (!down) return;
    down = false; CV.hero.speed = .004;
  });

  heroEl.addEventListener('touchstart', e => {
    down = true; lastX = e.touches[0].clientX; CV.hero.speed = 0;
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!down) return;
    CV.hero.angle += (e.touches[0].clientX - lastX) * .015;
    lastX = e.touches[0].clientX;
  }, { passive: true });
  document.addEventListener('touchend', () => {
    if (!down) return;
    down = false; CV.hero.speed = .004;
  });
})();

// ---- Init des pages ----
initSearch();
initCollection();
initValeur();
initEcouter();
initCSV();
initModalAdd();
initModalDetail();
initModalEdit();
initModalShare();
initNavigation();

// ---- Mode partage public : /share/CODE ?
//      Si oui, on charge la collection partagée AVANT d'init l'auth.
await maybeInitSharedView();

// ---- Auth : vérifie la session + charge la collection cloud si connecté
//      (skip si on est en mode lecture publique)
if (!sharedView.active) {
  await initAuth();
  // Spotify UI (polling demarre si l'utilisateur est connecté à l'app)
  initSpotifyUI();
}

// ---- Hero vinyle = premier album ----
if (ALBUMS.length) {
  CV.hero.album = ALBUMS[0];
  preloadCover(ALBUMS[0].coverUrl);
}

// ---- Lance la boucle d'animation ----
startLoop();

// ---- Active les transitions de thème après chargement (évite le flash) ----
requestAnimationFrame(() => document.body.classList.add('theme-ready'));
