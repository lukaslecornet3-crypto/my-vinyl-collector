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

  // ---- Graphique par décennie ----
  const decades = {};
  ALBUMS.forEach(a => {
    if (a.year) {
      const d = Math.floor(a.year/10) * 10;
      decades[d] = (decades[d] || 0) + 1;
    }
  });
  const sortedDecades = Object.entries(decades).sort((a, b) => a[0] - b[0]);
  const maxD = Math.max(...Object.values(decades), 1);

  const chart = document.getElementById('statsChart');
  chart.innerHTML = '';
  sortedDecades.forEach(([dec, count]) => {
    const bar = document.createElement('div'); bar.className = 'stat-bar-wrap';

    const track = document.createElement('div'); track.className = 'stat-bar-track';
    const fill  = document.createElement('div'); fill.className  = 'stat-bar-fill';
    fill.style.height = `${Math.round(count/maxD*100)}%`;
    track.appendChild(fill);

    const label = document.createElement('div'); label.className = 'stat-bar-label'; label.textContent = `${dec}s`;
    const cnt   = document.createElement('div'); cnt.className   = 'stat-bar-count'; cnt.textContent   = count;

    bar.append(track, label, cnt);
    chart.appendChild(bar);
  });

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
