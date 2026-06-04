// ============================================================
// js/sensations.js — Haptique (vibrations) au toucher
//   haptic(type) : vibration courte (Android ; no-op si non supporté, ex iOS)
// ============================================================

import { loadStorage } from './storage.js';

let hapticsOn = loadStorage('hapticsOn', true);

const PATTERNS = {
  tick:    8,
  select:  5,
  success: [10, 40, 20],
  warn:    [20, 30, 25],
  delete:  [15, 30, 15],
};

export function haptic(type = 'tick') {
  if (!hapticsOn) return;
  if (!('vibrate' in navigator)) return; // iOS Safari : pas supporté → ignoré
  try { navigator.vibrate(PATTERNS[type] ?? 8); } catch {}
}

// Rien à initialiser pour l'instant (l'haptique est sans état persistant côté UI)
export function initSensations() {}
