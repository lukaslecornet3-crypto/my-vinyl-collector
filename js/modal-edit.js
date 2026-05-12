// ============================================================
// js/modal-edit.js — Modal "Modifier un vinyle"
// ============================================================

import { ALBUMS, saveCollection } from './storage.js';
import { state } from './state.js';
import { applyFilters } from './search.js';
import { toast } from './toast.js';
import { sharedView } from './share-view.js';

const overlay = document.getElementById('editOverlay');
const closeBtn = document.getElementById('closeEdit');
const cancelBtn = document.getElementById('editCancel');
const form    = document.getElementById('editForm');

const F = {
  title:     document.getElementById('editTitle'),
  artist:    document.getElementById('editArtist'),
  year:      document.getElementById('editYear'),
  label:     document.getElementById('editLabel'),
  condition: document.getElementById('editCondition'),
  low:       document.getElementById('editLow'),
  mid:       document.getElementById('editMid'),
  high:      document.getElementById('editHigh'),
  notes:     document.getElementById('editNotes'),
  coverUrl:  document.getElementById('editCoverUrl'),
};

let currentAlbumIdx = -1;

// Helper : sépare "45 €" en { num: 45, suffix: " €" }
function parsePrice(str) {
  if (str == null) return '';
  const m = String(str).match(/^[~]?\s*(\d+(?:[.,]\d+)?)/);
  return m ? m[1].replace(',', '.') : '';
}

function priceToString(input) {
  const v = String(input || '').trim();
  if (!v) return '';
  const n = parseFloat(v.replace(',', '.'));
  if (isNaN(n)) return '';
  return `${Math.round(n)} €`;
}

export function openEdit(albumIdx) {
  if (sharedView.active) {
    toast.warn('Mode lecture seule — édition désactivée');
    return;
  }
  const a = ALBUMS[albumIdx];
  if (!a) return;
  currentAlbumIdx = albumIdx;

  F.title.value     = a.title || '';
  F.artist.value    = a.artist || '';
  F.year.value      = a.year || '';
  F.label.value     = a.label || '';
  F.condition.value = a.condition || 'Excellent (VG+)';
  F.low.value       = parsePrice(a.low);
  F.mid.value       = parsePrice(a.mid || a.value);
  F.high.value      = parsePrice(a.high);
  F.notes.value     = a.notes || '';
  F.coverUrl.value  = a.coverUrl || '';

  overlay.classList.add('open');
  setTimeout(() => F.title.focus(), 100);
}

function closeEdit() {
  overlay.classList.remove('open');
  currentAlbumIdx = -1;
}

async function handleSubmit(e) {
  e.preventDefault();
  if (currentAlbumIdx < 0) return;
  const a = ALBUMS[currentAlbumIdx];
  if (!a) return;

  a.title     = F.title.value.trim();
  a.artist    = F.artist.value.trim();
  a.year      = F.year.value ? parseInt(F.year.value) : '';
  a.label     = F.label.value.trim();
  a.condition = F.condition.value;
  a.notes     = F.notes.value.trim();
  a.coverUrl  = F.coverUrl.value.trim();

  const low  = priceToString(F.low.value);
  const mid  = priceToString(F.mid.value);
  const high = priceToString(F.high.value);
  if (low)  a.low  = low;
  if (mid)  { a.mid = mid; a.value = mid; }
  if (high) a.high = high;

  saveCollection();
  state.filteredAlbums = [...ALBUMS];
  applyFilters();
  closeEdit();
  toast.success('Modifications enregistrées');
}

export function initModalEdit() {
  closeBtn.addEventListener('click', closeEdit);
  cancelBtn.addEventListener('click', closeEdit);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeEdit(); });
  form.addEventListener('submit', handleSubmit);
}
