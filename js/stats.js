// ============================================================
// stats.js — Page Statistiques (+ niveau & trophées)
// ============================================================

import { ALBUMS } from './storage.js';
import { getLevel, BADGES, computeStats, unlockedBadgeIds } from './badges.js';

export function buildStats() {
  if (!ALBUMS.length) {
    document.getElementById('statsEmpty').style.display = 'block';
    return;
  }
  document.getElementById('statsEmpty').style.display = 'none';

  buildLevel();
  buildBadges();

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

// ---- Niveau de collectionneur ----
function buildLevel() {
  const { current, next, progress, level, xp } = getLevel();
  document.getElementById('levelIcon').textContent = current.icon;
  document.getElementById('levelName').textContent = current.name;
  document.getElementById('levelRank').textContent = `Niveau ${level}`;
  document.getElementById('levelBarFill').style.width = `${progress}%`;
  document.getElementById('levelXp').textContent =
    next ? `${xp} / ${next.min} XP — plus que ${next.min - xp} avant ${next.name}`
         : `${xp} XP — niveau maximum atteint 👑`;
}

// ---- Grille de trophées ----
function buildBadges() {
  const stats    = computeStats();
  const unlocked = unlockedBadgeIds();
  const grid     = document.getElementById('badgesGrid');
  const counter  = document.getElementById('badgesCounter');
  grid.innerHTML = '';

  counter.textContent = `${unlocked.size}/${BADGES.length} débloqués`;

  BADGES.forEach(b => {
    const earned = unlocked.has(b.id);
    const card = document.createElement('div');
    card.className = 'badge-card' + (earned ? ' earned' : '');

    const icon = document.createElement('div');
    icon.className = 'badge-icon';
    icon.textContent = earned ? b.icon : '🔒';

    const name = document.createElement('div');
    name.className = 'badge-name';
    name.textContent = b.name;

    const desc = document.createElement('div');
    desc.className = 'badge-desc';
    desc.textContent = b.desc;

    card.append(icon, name, desc);

    // Barre de progression (uniquement si verrouillé et mesurable)
    if (!earned && b.progress) {
      const p = b.progress(stats);
      const track = document.createElement('div'); track.className = 'badge-prog-track';
      const fill  = document.createElement('div'); fill.className  = 'badge-prog-fill';
      fill.style.width = `${Math.round((p.current / p.target) * 100)}%`;
      track.appendChild(fill);
      const lbl = document.createElement('div'); lbl.className = 'badge-prog-label';
      lbl.textContent = `${p.current}/${p.target}`;
      card.append(track, lbl);
    }

    grid.appendChild(card);
  });
}
