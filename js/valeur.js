// ============================================================
// valeur.js — Page Valeur (estimation Discogs / heuristique)
// ============================================================

import { ALBUMS, saveCollection } from './storage.js';
import { state } from './state.js';
import { CV } from './loop.js';
import { preloadCover } from './canvas.js';
import { addSwipe } from './swipe.js';
import { fetchDiscogsValue } from './api/discogs.js';

export async function setValAlbum(i) {
  if (!ALBUMS.length) return;
  state.valIdx = (i + ALBUMS.length) % ALBUMS.length;
  const a = ALBUMS[state.valIdx];
  preloadCover(a.coverUrl);
  CV.val.album = a;

  const card = document.querySelector('.price-card');

  document.getElementById('valName').textContent   = `${a.title} — ${a.artist}`;
  document.getElementById('valIdx').textContent    = state.valIdx + 1;
  document.getElementById('valTotal').textContent  = ALBUMS.length;

  // Affichage immédiat des valeurs sauvegardées (s'il y en a)
  if (a.low && a.low !== '—') {
    displayValeur(a.low, a.mid || a.value, a.high, 'collection');
  } else {
    // Sinon, on affiche le skeleton pendant le chargement
    card?.classList.add('loading');
  }

  // Tentative Discogs (toujours rafraîchir en arrière-plan)
  const v = await fetchDiscogsValue(a);
  card?.classList.remove('loading');
  displayValeur(v.low, v.mid, v.high, v.source);

  a.low = v.low; a.mid = v.mid; a.high = v.high;
  saveCollection();
}

function displayValeur(low, mid, high, source) {
  document.getElementById('valPrice').textContent = mid  || '—';
  document.getElementById('valLow').textContent   = low  || '—';
  document.getElementById('valMid').textContent   = mid  || '—';
  document.getElementById('valHigh').textContent  = high || '—';

  const lo  = parseInt(low)  || 0;
  const mi  = parseInt(mid)  || 0;
  const hi  = parseInt(high) || 0;
  const max = Math.max(hi, 100);

  document.getElementById('barLow').style.width  = Math.round(lo/max*100) + '%';
  document.getElementById('barMid').style.width  = Math.round(mi/max*100) + '%';
  document.getElementById('barHigh').style.width = Math.round(hi/max*100) + '%';

  const srcEl = document.getElementById('valSource');
  if (source === 'discogs')         srcEl.textContent = 'Source : Discogs marketplace';
  else if (source === 'collection') srcEl.textContent = 'Source : ta collection';
  else                              srcEl.textContent = 'Source : estimation locale';
}

export function initValeur() {
  document.getElementById('valPrev').onclick = () => setValAlbum(state.valIdx - 1);
  document.getElementById('valNext').onclick = () => setValAlbum(state.valIdx + 1);

  const valWrap = document.getElementById('valVinylWrap');
  if (valWrap) addSwipe(valWrap,
    () => setValAlbum(state.valIdx + 1),
    () => setValAlbum(state.valIdx - 1)
  );

  if (ALBUMS.length) setValAlbum(0);
}
