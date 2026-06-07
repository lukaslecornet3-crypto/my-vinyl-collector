// ============================================================
// badges.js — Niveaux de collectionneur + trophées
//   - Tout est DÉRIVÉ de la collection (source unique : ALBUMS)
//     → donc automatiquement cohérent sur tous tes appareils
//   - Les trophées débloqués sont mémorisés (pour l'effet "nouveau !")
// ============================================================

import { ALBUMS, loadStorage, saveStorage } from './storage.js';
import { toast } from './toast.js';

// ---------- NIVEAUX ----------
// XP = (nombre de vinyles × 10) + (valeur totale ÷ 10)
export const LEVELS = [
  { min: 0,    name: 'Débutant',         icon: '🌱' },
  { min: 50,   name: 'Amateur',          icon: '🎧' },
  { min: 150,  name: 'Collectionneur',   icon: '💿' },
  { min: 350,  name: 'Connaisseur',      icon: '🎯' },
  { min: 700,  name: 'Expert',           icon: '⭐' },
  { min: 1200, name: 'Maître disquaire', icon: '👑' },
];

// ---------- STATISTIQUES DÉRIVÉES ----------
function albumValue(a) {
  return parseInt(a.mid) || parseInt(a.value) || 0;
}

export function computeStats(albums = ALBUMS) {
  const count = albums.length;
  const totalValue = albums.reduce((s, a) => s + albumValue(a), 0);

  // Compteur par artiste
  const artistCount = {};
  albums.forEach(a => { if (a.artist) artistCount[a.artist] = (artistCount[a.artist] || 0) + 1; });
  const maxSameArtist = Object.values(artistCount).reduce((m, n) => Math.max(m, n), 0);
  const distinctArtists = Object.keys(artistCount).length;

  // Décennies distinctes + vinyle "vintage"
  const decades = new Set();
  let hasVintage = false;
  albums.forEach(a => {
    if (a.year) {
      decades.add(Math.floor(a.year / 10) * 10);
      if (a.year < 1970) hasVintage = true;
    }
  });

  const hasMint = albums.some(a => a.condition === 'Mint (M)');

  return {
    count, totalValue, maxSameArtist, distinctArtists,
    decades: decades.size, hasVintage, hasMint,
    xp: count * 10 + Math.floor(totalValue / 10),
  };
}

// ---------- NIVEAU COURANT ----------
export function getLevel(albums = ALBUMS) {
  const { xp } = computeStats(albums);
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].min) idx = i;
  const current = LEVELS[idx];
  const next = LEVELS[idx + 1] || null;
  const progress = next
    ? Math.round(((xp - current.min) / (next.min - current.min)) * 100)
    : 100;
  return { xp, current, next, progress, level: idx + 1 };
}

// ---------- TROPHÉES ----------
// check(stats) → débloqué ?   progress(stats) → { current, target } | null
export const BADGES = [
  // Quantité
  { id:'q1',  icon:'🥉', name:'Premier vinyle',     desc:'Ajoute ton 1er vinyle',
    check:s=>s.count>=1,  progress:s=>({current:Math.min(s.count,1),  target:1}) },
  { id:'q5',  icon:'🥈', name:'Petite collection',  desc:'Atteins 5 vinyles',
    check:s=>s.count>=5,  progress:s=>({current:Math.min(s.count,5),  target:5}) },
  { id:'q10', icon:'🥇', name:'Collectionneur',     desc:'Atteins 10 vinyles',
    check:s=>s.count>=10, progress:s=>({current:Math.min(s.count,10), target:10}) },
  { id:'q25', icon:'💎', name:'Grande collection',  desc:'Atteins 25 vinyles',
    check:s=>s.count>=25, progress:s=>({current:Math.min(s.count,25), target:25}) },
  { id:'q50', icon:'🏆', name:'Mélomane',           desc:'Atteins 50 vinyles',
    check:s=>s.count>=50, progress:s=>({current:Math.min(s.count,50), target:50}) },

  // Valeur
  { id:'v100',  icon:'💵', name:'Premier trésor',   desc:'Collection estimée à 100 €',
    check:s=>s.totalValue>=100,  progress:s=>({current:Math.min(s.totalValue,100),  target:100}) },
  { id:'v500',  icon:'💰', name:'Belle valeur',     desc:'Collection estimée à 500 €',
    check:s=>s.totalValue>=500,  progress:s=>({current:Math.min(s.totalValue,500),  target:500}) },
  { id:'v1000', icon:'🤑', name:'Patrimoine',       desc:'Collection estimée à 1000 €',
    check:s=>s.totalValue>=1000, progress:s=>({current:Math.min(s.totalValue,1000), target:1000}) },

  // Décennies
  { id:'vintage',   icon:'📻', name:'Vintage',         desc:'Un vinyle d\'avant 1970',
    check:s=>s.hasVintage, progress:null },
  { id:'dec3', icon:'🌈', name:'Voyageur du temps', desc:'3 décennies différentes',
    check:s=>s.decades>=3, progress:s=>({current:Math.min(s.decades,3), target:3}) },
  { id:'dec5', icon:'⌛', name:'Archiviste',         desc:'5 décennies différentes',
    check:s=>s.decades>=5, progress:s=>({current:Math.min(s.decades,5), target:5}) },

  // Artistes
  { id:'fan',     icon:'❤️', name:'Fan',           desc:'3 albums du même artiste',
    check:s=>s.maxSameArtist>=3, progress:s=>({current:Math.min(s.maxSameArtist,3), target:3}) },
  { id:'superfan',icon:'🔥', name:'Superfan',      desc:'5 albums du même artiste',
    check:s=>s.maxSameArtist>=5, progress:s=>({current:Math.min(s.maxSameArtist,5), target:5}) },
  { id:'eclectic',icon:'🎭', name:'Éclectique',    desc:'10 artistes différents',
    check:s=>s.distinctArtists>=10, progress:s=>({current:Math.min(s.distinctArtists,10), target:10}) },

  // État
  { id:'mint', icon:'🆕', name:'État neuf',        desc:'Possède un vinyle Mint (M)',
    check:s=>s.hasMint, progress:null },
];

// Ensemble des trophées actuellement mérités
export function earnedBadgeIds(albums = ALBUMS) {
  const stats = computeStats(albums);
  return BADGES.filter(b => b.check(stats)).map(b => b.id);
}

// Vérifie + notifie les nouveaux trophées. Renvoie la liste à jour (ids).
// Au tout premier appel, on enregistre sans notifier (évite un flot de toasts).
export function checkBadges() {
  const earned    = new Set(earnedBadgeIds());
  const firstTime = localStorage.getItem('mvcBadges') === null;
  const stored    = new Set(loadStorage('mvcBadges', []));

  const newly = [...earned].filter(id => !stored.has(id));
  const union = [...new Set([...stored, ...earned])]; // les trophées restent acquis
  saveStorage('mvcBadges', union);

  if (!firstTime && newly.length) {
    newly.forEach(id => {
      const b = BADGES.find(x => x.id === id);
      if (b) toast.success(`🏆 Trophée débloqué : ${b.name}`);
    });
  }
  return union;
}

// Liste des ids déjà débloqués (persistés) — pour l'affichage
export function unlockedBadgeIds() {
  // On fusionne le persisté avec le mérité courant (au cas où)
  return new Set([...loadStorage('mvcBadges', []), ...earnedBadgeIds()]);
}
