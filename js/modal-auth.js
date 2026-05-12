// ============================================================
// js/modal-auth.js — Modal "Se connecter / Créer un compte"
//   + bouton de la navbar (login ↔ logout)
// ============================================================

import { state } from './state.js';
import { ALBUMS, replaceCollection, saveCollection } from './storage.js';
import { authState, checkAuth, login, register, logout } from './auth.js';
import { loadCloudCollection, saveCloudCollection, flushCloudSave } from './cloud-sync.js';
import { applyFilters } from './search.js';

const overlay   = document.getElementById('authOverlay');
const form      = document.getElementById('authForm');
const emailEl   = document.getElementById('authEmail');
const passEl    = document.getElementById('authPassword');
const errorEl   = document.getElementById('authError');
const titleEl   = document.getElementById('authTitle');
const submitEl  = document.getElementById('authSubmit');
const toggleTxt = document.getElementById('authToggleText');
const toggleBtn = document.getElementById('authToggleBtn');
const closeBtn  = document.getElementById('closeAuth');
const authBtn   = document.getElementById('authBtn');

let mode = 'login'; // 'login' | 'register'

function openAuth() {
  overlay.classList.add('open');
  errorEl.textContent = '';
  setTimeout(() => emailEl.focus(), 100);
}

function closeAuth() {
  overlay.classList.remove('open');
}

function setMode(m) {
  mode = m;
  if (m === 'login') {
    titleEl.textContent   = 'Se connecter';
    submitEl.textContent  = 'Se connecter';
    toggleTxt.textContent = 'Pas encore de compte ?';
    toggleBtn.textContent = 'Créer un compte';
  } else {
    titleEl.textContent   = 'Créer un compte';
    submitEl.textContent  = 'Créer mon compte';
    toggleTxt.textContent = 'Déjà inscrit ?';
    toggleBtn.textContent = 'Se connecter';
  }
  errorEl.textContent = '';
}

// Met à jour l'apparence du bouton navbar selon l'état
export function refreshAuthUI() {
  if (authState.user) {
    authBtn.classList.add('logged-in');
    authBtn.textContent = '⏏ ' + authState.user;
    authBtn.title = `Déconnexion (${authState.user})`;
  } else {
    authBtn.classList.remove('logged-in');
    authBtn.textContent = 'Se connecter';
    authBtn.title = 'Se connecter';
  }
}

async function handleSubmit(e) {
  e.preventDefault();
  errorEl.textContent = '';
  submitEl.disabled = true;
  const email    = emailEl.value.trim();
  const password = passEl.value;

  try {
    if (mode === 'register') {
      await register(email, password);
      // Première inscription : si on a déjà une collection locale, on l'envoie au cloud
      if (ALBUMS.length) await saveCloudCollection([...ALBUMS]);
    } else {
      await login(email, password);
      // Connexion : on charge la collection cloud (et on écrase la locale)
      const cloud = await loadCloudCollection();
      if (cloud && cloud.length) {
        replaceCollection(cloud);
        state.filteredAlbums = [...ALBUMS];
        applyFilters();
      } else if (ALBUMS.length) {
        // Cloud vide → on pousse la collection locale
        await saveCloudCollection([...ALBUMS]);
      }
    }
    refreshAuthUI();
    closeAuth();
    form.reset();
  } catch (err) {
    errorEl.textContent = err.message || 'Erreur';
  } finally {
    submitEl.disabled = false;
  }
}

async function handleLogout() {
  if (!confirm('Se déconnecter ? Ta collection locale restera mais ne sera plus synchronisée.')) return;
  // On flush un dernier save avant de partir
  await flushCloudSave(ALBUMS);
  await logout();
  refreshAuthUI();
}

export async function initAuth() {
  // 1) On vérifie la session côté serveur
  const email = await checkAuth();
  refreshAuthUI();

  // 2) Si déjà connecté, on rapatrie la collection cloud
  if (email) {
    const cloud = await loadCloudCollection();
    if (cloud && cloud.length) {
      replaceCollection(cloud);
      state.filteredAlbums = [...ALBUMS];
      applyFilters();
    } else if (ALBUMS.length) {
      // Cloud vide → on initialise avec la locale
      saveCollection();
    }
  }

  // 3) Listeners UI
  authBtn.addEventListener('click', () => {
    if (authState.user) handleLogout();
    else { setMode('login'); openAuth(); }
  });
  closeBtn.addEventListener('click', closeAuth);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeAuth(); });
  toggleBtn.addEventListener('click', () => setMode(mode === 'login' ? 'register' : 'login'));
  form.addEventListener('submit', handleSubmit);
}
