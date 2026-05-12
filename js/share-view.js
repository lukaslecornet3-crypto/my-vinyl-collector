// ============================================================
// js/share-view.js — Vue "lecture publique" quand URL = /share/CODE
// Détecte le mode, fetch la collection, désactive l'édition
// ============================================================

import { fetchSharedCollection } from './share.js';
import { replaceCollection } from './storage.js';
import { state } from './state.js';
import { toast } from './toast.js';
import { applyFilters } from './search.js';

// Vrai quand on est dans /share/CODE — exporté pour que les autres modules adaptent leur comportement
export const sharedView = { active: false, displayName: null };

function getShareCodeFromUrl() {
  const m = location.pathname.match(/^\/share\/([A-Za-z0-9_-]{8,})\/?$/);
  return m ? m[1] : null;
}

function lockUI() {
  // Cache tous les boutons d'action qui ne servent à rien en lecture seule
  const hideIds = [
    'authBtn', 'openAddModal', 'importBtn', 'exportBtn',
    'deleteBtn', 'editBtn', 'shareBtn',
  ];
  for (const id of hideIds) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }

  // Bandeau "Collection partagée par X"
  const banner = document.createElement('div');
  banner.className = 'share-banner';
  banner.innerHTML = `
    <span class="share-banner-icon">👁</span>
    <span class="share-banner-text">Collection partagée par <strong>${sharedView.displayName}</strong> · lecture seule</span>
    <a href="/" class="share-banner-link">Créer ma collection →</a>
  `;
  document.body.insertBefore(banner, document.body.firstChild);

  // On n'affiche que les pages Collection / Valeur / Écouter / Stats (pas l'accueil)
  // Et on cache le menu d'ajout
  const accueilLink = document.querySelector('.nav-link[data-page="home"]');
  if (accueilLink) accueilLink.parentElement.style.display = 'none';
}

export async function maybeInitSharedView() {
  const code = getShareCodeFromUrl();
  if (!code) return false;

  sharedView.active = true;
  try {
    const data = await fetchSharedCollection(code);
    sharedView.displayName = data.displayName || 'Anonyme';

    // Remplace la collection locale par celle partagée (sans toucher au localStorage)
    replaceCollection(data.collection, { skipPersist: true });
    state.filteredAlbums = [...data.collection];

    lockUI();
    // Re-render avec la nouvelle collection
    applyFilters();
    return true;
  } catch (e) {
    toast.error(e.message || 'Lien de partage invalide');
    setTimeout(() => location.href = '/', 2500);
    return true;
  }
}
