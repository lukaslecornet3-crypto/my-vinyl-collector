// ============================================================
// stats.js — Page Statistiques
// ============================================================

import { ALBUMS } from './storage.js';

export function buildStats() {
  if (!ALBUMS.length) {
    document.getElementById('statsEmpty').style.display = 'block';
    return;
  }
  document.getElementById('statsEmpty').style.display = 'none';

  // ---- KPIs ----
  const total = ALBUMS.reduce((s, a) => s + (parseInt(a.mid) || parseInt(a.value) || 0), 0);
  document.getElementById('statTotal').textContent = total ? `${total} €` : '—';
  document.getElementById('statCount').textContent = ALBUMS.length;

  // Artiste le + représenté
  const artistCount = {};
  ALBUMS.forEach(a => { artistCount[a.artist] = (artistCount[a.artist] || 0) + 1; });
  const topArtist = Object.entries(artistCount).sort((a, b) => b[1] - a[1])[0];
  document.getElementById('statTopArtist').textContent =
    topArtist ? `${topArtist[0]} (${topArtist[1]})` : '—';

  // État le + fréquent
  const condOrder = ['Mint (M)','Near Mint (NM)','Excellent (VG+)','Très bon (VG)','Bon (G+)','Passable (G)'];
  const condCount = {};
  ALBUMS.forEach(a => { if (a.condition) condCount[a.condition] = (condCount[a.condition] || 0) + 1; });
  const topCond = Object.entries(condCount).sort((a, b) => b[1] - a[1])[0];
  document.getElementById('statTopCond').textContent = topCond ? topCond[0] : '—';

  // ---- Liste par état ----
  const condList = document.getElementById('statCondList');
  condList.innerHTML = '';
  condOrder.forEach(c => {
    if (!condCount[c]) return;
    const pct = Math.round(condCount[c]/ALBUMS.length * 100);

    const row   = document.createElement('div'); row.className   = 'stat-cond-row';
    const name  = document.createElement('span'); name.className  = 'stat-cond-name'; name.textContent = c;
    const track = document.createElement('div'); track.className = 'stat-cond-track';
    const fill  = document.createElement('div'); fill.className  = 'stat-cond-fill'; fill.style.width = `${pct}%`;
    track.appendChild(fill);
    const pctEl = document.createElement('span'); pctEl.className = 'stat-cond-pct'; pctEl.textContent = condCount[c];

    row.append(name, track, pctEl);
    condList.appendChild(row);
  });
}
