// ============================================================
// api/discogs.js (client) — Appelle le proxy serverless /api/discogs
// Le vrai token Discogs reste côté serveur (Vercel env var).
// ============================================================

import { CONFIG } from '../config.js';

const valCache = {};

// Multiplicateurs de prix selon l'état du disque
const CONDITION_FACTOR = {
  'Mint (M)':         1.8,
  'Near Mint (NM)':   1.4,
  'Excellent (VG+)':  1.0,
  'Très bon (VG)':    0.65,
  'Bon (G+)':         0.35,
  'Passable (G)':     0.15,
};

// Estimation heuristique quand Discogs ne donne rien
export function estimateValue(album) {
  const yearFactor = album.year ? Math.max(0.5, (2024 - album.year)/20) : 1;
  const condFactor = CONDITION_FACTOR[album.condition] || 1;
  const base = 15 + yearFactor * 12;
  const mid  = Math.round(base * condFactor);
  return {
    low:  `${Math.round(mid*.6)} €`,
    mid:  `${mid} €`,
    high: `${Math.round(mid*1.8)} €`,
    source: 'estimate',
  };
}

// Construit l'URL du proxy avec un endpoint Discogs en paramètre
function proxyUrl(path, params = {}) {
  const url = new URL(CONFIG.DISCOGS_PROXY, location.origin);
  url.searchParams.set('path', path);
  for (const [k, v] of Object.entries(params)) {
    if (v != null) url.searchParams.append(k, String(v));
  }
  return url.toString();
}

export async function fetchDiscogsValue(album) {
  const cacheKey = `${album.artist}__${album.title}`;
  if (valCache[cacheKey]) return valCache[cacheKey];

  try {
    // 1) Recherche d'un release vinyle correspondant
    const searchRes = await fetch(proxyUrl('/database/search', {
      q: `${album.artist} ${album.title}`,
      type: 'release',
      format: 'vinyl',
      per_page: 5,
    }));
    if (!searchRes.ok) throw new Error('Discogs indisponible');
    const data = await searchRes.json();
    const results = data.results || [];
    if (!results.length) throw new Error('Pas de résultat');

    // 2) Pour le premier résultat valide : on cherche les prix marketplace
    for (const r of results) {
      if (!r.id) continue;
      const priceRes = await fetch(proxyUrl(`/marketplace/price_suggestions/${r.id}`));
      if (!priceRes.ok) continue;
      const prices = await priceRes.json();

      const condMap = {
        'Mint (M)':        prices['Mint (M)'],
        'Near Mint (NM)':  prices['Near Mint (NM-)'],
        'Excellent (VG+)': prices['Very Good Plus (VG+)'],
        'Très bon (VG)':   prices['Very Good (VG)'],
        'Bon (G+)':        prices['Good Plus (G+)'],
        'Passable (G)':    prices['Good (G)'],
      };
      const cond     = album.condition || 'Excellent (VG+)';
      const priceObj = condMap[cond];
      if (!priceObj) continue;

      const mid = Math.round(priceObj.value || 0);
      if (!mid) continue;

      const result = {
        low:      `${Math.round(mid*.6)} €`,
        mid:      `${mid} €`,
        high:     `${Math.round(mid*1.7)} €`,
        source:   'discogs',
        currency: priceObj.currency || 'EUR',
      };
      valCache[cacheKey] = result;
      return result;
    }
  } catch { /* Discogs KO : on bascule sur l'estimation */ }

  const est = estimateValue(album);
  valCache[cacheKey] = est;
  return est;
}
