// ============================================================
// storage.js — Wrapper localStorage + état global de la collection
// + sync cloud quand l'utilisateur est connecté
// ============================================================

import { DEFAULT_ALBUMS } from './data.js';
import { authState } from './auth.js';
import { scheduleCloudSave } from './cloud-sync.js';

export function loadStorage(key, fallback) {
  try {
    const d = localStorage.getItem(key);
    return d ? JSON.parse(d) : fallback;
  } catch {
    return fallback;
  }
}

export function saveStorage(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.warn('localStorage indisponible', e);
  }
}

// La collection est exportée comme un tableau mutable.
// Pour la "remplacer", on utilise replaceCollection() ci-dessous.
export const ALBUMS = loadStorage('myVinylCollection', null) || [...DEFAULT_ALBUMS];

if (!loadStorage('myVinylCollection', null)) {
  saveStorage('myVinylCollection', ALBUMS);
}

export function saveCollection() {
  saveStorage('myVinylCollection', ALBUMS);
  // Si connecté, on synchronise dans le cloud (débouncé)
  if (authState.user) scheduleCloudSave(ALBUMS);
}

// Remplace le contenu de ALBUMS sans casser les références
// { skipPersist: true } → ne touche pas au localStorage (utile en mode partage public)
export function replaceCollection(newAlbums, opts = {}) {
  ALBUMS.splice(0, ALBUMS.length, ...newAlbums);
  if (!opts.skipPersist) {
    saveStorage('myVinylCollection', ALBUMS);
  }
}
