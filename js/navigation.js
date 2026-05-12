// ============================================================
// navigation.js — Navigation entre pages + raccourcis clavier
// ============================================================

import { state } from './state.js';
import { CV, gridCanvases } from './loop.js';
import { setColAlbum } from './collection.js';
import { setValAlbum } from './valeur.js';
import { setEcoAlbum } from './ecouter.js';
import { buildStats } from './stats.js';
import { closeModal } from './modal-add.js';
import { closeDetail } from './modal-detail.js';

const pages    = document.querySelectorAll('.page');
const navLinks = document.querySelectorAll('.nav-link[data-page]');

export function getCurrentPage() {
  const p = document.querySelector('.page.active');
  return p ? p.id.replace('page-', '') : 'home';
}

function setActivePage(page) {
  CV.hero.active = page === 'home';
  CV.col.active  = page === 'collection';
  CV.val.active  = page === 'valeur';
  CV.eco.active  = page === 'ecouter';
  gridCanvases.forEach(gc => gc.active = page === 'collection' && state.currentView === 'grid');
}

export function navigateTo(page) {
  pages.forEach(p => p.classList.remove('active'));
  navLinks.forEach(l => l.classList.remove('active'));
  document.getElementById('page-' + page)?.classList.add('active');
  document.querySelectorAll(`.nav-link[data-page="${page}"]`).forEach(l => l.classList.add('active'));
  setActivePage(page);

  if (page === 'valeur')  setValAlbum(0);
  if (page === 'ecouter') setEcoAlbum(0);
  if (page === 'stats')   buildStats();
}

export function initNavigation() {
  navLinks.forEach(l => l.addEventListener('click', e => {
    e.preventDefault();
    const p = l.dataset.page;
    if (p) navigateTo(p);
  }));

  // Raccourcis clavier
  document.addEventListener('keydown', e => {
    // Échap : ferme la modal ouverte
    if (e.key === 'Escape') {
      if (document.getElementById('modalOverlay').classList.contains('open'))  closeModal();
      if (document.getElementById('detailOverlay').classList.contains('open')) closeDetail();
      return;
    }
    // Pas de navigation si on est dans un champ texte
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    const page = getCurrentPage();
    if (e.key === 'ArrowLeft') {
      if (page === 'collection') setColAlbum(state.colIdx - 1, -1);
      if (page === 'valeur')     setValAlbum(state.valIdx - 1);
      if (page === 'ecouter')    setEcoAlbum(state.ecoIdx - 1);
    }
    if (e.key === 'ArrowRight') {
      if (page === 'collection') setColAlbum(state.colIdx + 1,  1);
      if (page === 'valeur')     setValAlbum(state.valIdx + 1);
      if (page === 'ecouter')    setEcoAlbum(state.ecoIdx + 1);
    }
  });

  setActivePage('home');
}
