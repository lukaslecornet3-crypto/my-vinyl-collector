// ============================================================
// js/reset-view.js — Page de réinitialisation du mot de passe
// Active quand l'URL est /reset/TOKEN (rewrite Vercel → index.html)
// ============================================================

import { resetPassword } from './auth.js';
import { toast } from './toast.js';

function getResetToken() {
  const m = location.pathname.match(/^\/reset\/([A-Za-z0-9_-]{10,})\/?$/);
  return m ? m[1] : null;
}

export function maybeInitResetView() {
  const token = getResetToken();
  if (!token) return false;

  const overlay = document.getElementById('resetOverlay');
  const form    = document.getElementById('resetForm');
  const pass    = document.getElementById('resetPassword');
  const errorEl = document.getElementById('resetError');
  const submit  = document.getElementById('resetSubmit');

  overlay.classList.add('open');
  setTimeout(() => pass.focus(), 100);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';
    submit.disabled = true;
    try {
      await resetPassword(token, pass.value);
      toast.success('Mot de passe modifié — tu es connecté !');
      // Nettoie l'URL et recharge l'app normalement
      setTimeout(() => { location.href = '/'; }, 1200);
    } catch (err) {
      errorEl.textContent = err.message || 'Erreur';
      submit.disabled = false;
    }
  });

  return true;
}
