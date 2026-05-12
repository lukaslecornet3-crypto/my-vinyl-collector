// ============================================================
// api/musicbrainz.js — Recherche d'albums et détails (pistes, label)
// API publique, pas de clé
// ============================================================

const MB_BASE = 'https://musicbrainz.org/ws/2';
const HEADERS = { 'User-Agent': 'MyVinylCollector/1.0' };

export async function searchReleaseGroups(query, signal) {
  const res = await fetch(
    `${MB_BASE}/release-group/?query=${encodeURIComponent(query)}&type=album&limit=25&fmt=json`,
    { signal, headers: HEADERS }
  );
  const data = await res.json();
  return data['release-groups'] || [];
}

export async function fetchReleaseGroupDetails(mbid) {
  const rgData = await fetch(
    `${MB_BASE}/release-group/${mbid}?inc=releases&fmt=json`,
    { headers: HEADERS }
  ).then(r => r.json());

  const first = rgData.releases?.[0];
  if (!first) return null;

  return fetch(
    `${MB_BASE}/release/${first.id}?inc=recordings+labels&fmt=json`,
    { headers: HEADERS }
  ).then(r => r.json());
}

// Convertit la durée MusicBrainz (ms) en "M:SS"
export function formatDuration(ms) {
  if (!ms) return '—';
  return `${Math.floor(ms/60000)}:${String(Math.floor((ms%60000)/1000)).padStart(2,'0')}`;
}
