// ============================================================
// js/modal-auth.js — Modal "Se connecter / Créer un compte"
//   + bouton de la navbar (login ↔ logout)
// ============================================================

import { state } from './state.js';
import { ALBUMS, replaceCollection, saveCollection } from './storage.js';
import { authState, checkAuth, login, register, logout, forgotPassword } from './auth.js';
import { loadCloudCollection, saveCloudCollection, flushCloudSave } from './cloud-sync.js';
import { applyFilters } from './search.js';
import { toast } from './toast.js';
import { onAuthChange as spotifyOnAuthChange } from './spotify-ui.js';

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

let mode = 'login'; // 'login' | 'register' | 'forgot'

const passLabel  = passEl.closest('label');           // pour masquer le champ mdp en mode forgot
const forgotBtn  = document.getElementById('authForgotBtn');

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
  // Éléments visibles selon le mode
  const isForgot = m === 'forgot';
  if (passLabel) passLabel.style.display = isForgot ? 'none' : '';
  passEl.required = !isForgot;
  if (forgotBtn) forgotBtn.style.display = m === 'login' ? '' : 'none';

  if (m === 'login') {
    titleEl.textContent   = 'Se connecter';
    submitEl.textContent  = 'Se connecter';
    toggleTxt.textContent = 'Pas encore de compte ?';
    toggleBtn.textContent = 'Créer un compte';
  } else if (m === 'register') {
    titleEl.textContent   = 'Créer un compte';
    submitEl.textContent  = 'Créer mon compte';
    toggleTxt.textContent = 'Déjà inscrit ?';
    toggleBtn.textContent = 'Se connecter';
  } else { // forgot
    titleEl.textContent   = 'Mot de passe oublié';
    submitEl.textContent  = 'Envoyer le lien';
    toggleTxt.textContent = 'Tu t\'en souviens ?';
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
    if (mode === 'forgot') {
      await forgotPassword(email);
      toast.success('Si un compte existe, un email vient d\'être envoyé.');
      setMode('login');
      closeAuth();
      form.reset();
      return;
    }
    if (mode === 'register') {
      await register(email, password);
      if (ALBUMS.length) await saveCloudCollection([...ALBUMS]);
      toast.success('Compte créé !');
    } else {
      await login(email, password);
      const cloud = await loadCloudCollection();
      if (cloud && cloud.length) {
        replaceCollection(cloud);
        state.filteredAlbums = [...ALBUMS];
        applyFilters();
      } else if (ALBUMS.length) {
        await saveCloudCollection([...ALBUMS]);
      }
      toast.success(`Bienvenue ${authState.user}`);
    }
    refreshAuthUI();
    closeAuth();
    form.reset();
    spotifyOnAuthChange();
  } catch (err) {
    errorEl.textContent = err.message || 'Erreur';
  } finally {
    submitEl.disabled = false;
  }
}

async function handleLogout() {
  const ok = await toast.confirm('Se déconnecter ? Ta collection locale restera mais ne sera plus synchronisée.');
  if (!ok) return;
  // On flush un dernier save avant de partir
  await flushCloudSave(ALBUMS);
  await logout();
  refreshAuthUI();
  spotifyOnAuthChange();
  toast.info('Déconnecté');
}

// Gère le retour de l'OAuth Discord (paramètres ?auth=...)
function handleAuthRedirect() {
  const p = new URLSearchParams(location.search);
  const status = p.get('auth');
  if (!status) return;

  // Nettoie l'URL (retire ?auth=... &reason=...)
  const url = new URL(location);
  url.searchParams.delete('auth');
  url.searchParams.delete('reason');
  history.replaceState({}, '', url.toString());

  if (status === 'discord') {
    // checkAuth() a déjà détecté la session + chargé la collection au démarrage
    refreshAuthUI();
    spotifyOnAuthChange();
    toast.success(`Connecté avec Discord${authState.user ? ' · ' + authState.user : ''}`);
  } else if (status === 'error') {
    const reason = p.get('reason');
    const msg = reason === 'no_email'
      ? 'Ton compte Discord n\'a pas d\'email vérifié.'
      : 'Échec de la connexion Discord.';
    toast.error(msg);
  }
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
  // Toggle : depuis login → register ; depuis register/forgot → login
  toggleBtn.addEventListener('click', () => setMode(mode === 'login' ? 'register' : 'login'));
  forgotBtn?.addEventListener('click', () => setMode('forgot'));
  form.addEventListener('submit', handleSubmit);

  // Bouton "Continuer avec Discord" → redirection OAuth serveur
  document.getElementById('discordLoginBtn')?.addEventListener('click', () => {
    location.href = '/api/discord';
  });

  // 3bis) Retour d'un login Discord (?auth=discord ou ?auth=error)
  handleAuthRedirect();

  // 4) Sync auto entre appareils : quand l'onglet redevient visible,
  //    on re-fetch la collection cloud pour récupérer les changements
  //    faits depuis un autre device (téléphone <-> ordi)
  document.addEventListener('visibilitychange', async () => {
    if (document.hidden || !authState.user) return;
    try {
      const cloud = await loadCloudCollection();
      if (!cloud) return;
      // Diff simple : on compare juste la longueur + hash rapide du JSON
      const localKey = JSON.stringify(ALBUMS.map(a => `${a.title}|${a.artist}`));
      const cloudKey = JSON.stringify(cloud.map(a => `${a.title}|${a.artist}`));
      if (localKey === cloudKey) return; // pas de changement
      replaceCollection(cloud);
      state.filteredAlbums = [...ALBUMS];
      applyFilters();
      toast.info('Collection synchronisée');
    } catch {}
  });
}
