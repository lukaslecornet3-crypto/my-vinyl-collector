// ============================================================
// js/modal-share.js — Modal "Partager ma collection"
// ============================================================

import { authState } from './auth.js';
import { getMyShareCode, enableShare, disableShare, buildShareUrl } from './share.js';
import { toast } from './toast.js';

const overlay   = document.getElementById('shareOverlay');
const closeBtn  = document.getElementById('closeShare');
const statusEl  = document.getElementById('shareStatus');
const urlBox    = document.getElementById('shareUrlBox');
const urlInput  = document.getElementById('shareUrl');
const copyBtn   = document.getElementById('shareCopyBtn');
const enableBtn = document.getElementById('shareEnableBtn');
const regenBtn  = document.getElementById('shareRegenBtn');
const disableBtn = document.getElementById('shareDisableBtn');

function openShare() {
  overlay.classList.add('open');
  refreshUI();
}
function closeShare() {
  overlay.classList.remove('open');
}

async function refreshUI() {
  if (!authState.user) {
    statusEl.textContent = 'Connecte-toi pour partager ta collection.';
    urlBox.classList.add('hidden');
    enableBtn.classList.add('hidden');
    regenBtn.classList.add('hidden');
    disableBtn.classList.add('hidden');
    return;
  }
  statusEl.textContent = 'Chargement…';
  const code = await getMyShareCode();
  if (code) {
    statusEl.textContent = 'Partage activé : n\'importe qui avec ce lien peut voir ta collection (lecture seule).';
    urlInput.value = buildShareUrl(code);
    urlBox.classList.remove('hidden');
    enableBtn.classList.add('hidden');
    regenBtn.classList.remove('hidden');
    disableBtn.classList.remove('hidden');
  } else {
    statusEl.textContent = 'Le partage est désactivé. Active-le pour générer un lien public.';
    urlBox.classList.add('hidden');
    enableBtn.classList.remove('hidden');
    regenBtn.classList.add('hidden');
    disableBtn.classList.add('hidden');
  }
}

async function handleEnable() {
  try {
    enableBtn.disabled = true;
    await enableShare();
    toast.success('Lien de partage créé');
    refreshUI();
  } catch (e) {
    toast.error(e.message);
  } finally {
    enableBtn.disabled = false;
  }
}

async function handleRegen() {
  const ok = await toast.confirm('Régénérer le lien va invalider l\'ancien. Continuer ?');
  if (!ok) return;
  try {
    regenBtn.disabled = true;
    await enableShare();
    toast.success('Nouveau lien généré');
    refreshUI();
  } catch (e) {
    toast.error(e.message);
  } finally {
    regenBtn.disabled = false;
  }
}

async function handleDisable() {
  const ok = await toast.confirm('Désactiver le partage ? Le lien ne fonctionnera plus.');
  if (!ok) return;
  try {
    disableBtn.disabled = true;
    await disableShare();
    toast.info('Partage désactivé');
    refreshUI();
  } catch (e) {
    toast.error(e.message);
  } finally {
    disableBtn.disabled = false;
  }
}

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(urlInput.value);
    toast.success('Lien copié');
  } catch {
    // Fallback : sélection manuelle
    urlInput.select();
    document.execCommand?.('copy');
    toast.info('Lien sélectionné, copie avec Ctrl+C');
  }
}

export function initModalShare() {
  // Bouton dans la collection page-header
  const shareBtn = document.getElementById('shareBtn');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      if (!authState.user) {
        toast.warn('Connecte-toi pour partager ta collection');
        return;
      }
      openShare();
    });
  }

  closeBtn.addEventListener('click', closeShare);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeShare(); });
  enableBtn.addEventListener('click', handleEnable);
  regenBtn.addEventListener('click', handleRegen);
  disableBtn.addEventListener('click', handleDisable);
  copyBtn.addEventListener('click', handleCopy);
}
