// ============================================================
// state.js — Variables mutables partagées entre modules
// (index courants, vue active, recherche en cours, etc.)
// ============================================================

import { ALBUMS } from './storage.js';

export const state = {
  filteredAlbums: [...ALBUMS],
  currentView: 'list',
  colIdx: 0,
  valIdx: 0,
  ecoIdx: 0,
  selectedData: null,
  searchController: null,
};
