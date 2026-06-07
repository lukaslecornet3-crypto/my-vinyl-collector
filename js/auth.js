// ============================================================
// js/auth.js — Appels aux routes /api/auth + état utilisateur
// ============================================================

// État partagé : null si non connecté, sinon l'email
export const authState = { user: null };

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
  return data;
}

// Vérifie si on a déjà une session côté serveur (cookie)
export async function checkAuth() {
  try {
    const res = await fetch('/api/auth?action=me', { credentials: 'same-origin' });
    if (res.ok) {
      const data = await res.json();
      authState.user = data.email;
      return data.email;
    }
  } catch {}
  authState.user = null;
  return null;
}

export async function register(email, password) {
  const data = await postJson('/api/auth?action=register', { email, password });
  authState.user = data.email;
  return data.email;
}

export async function login(email, password) {
  const data = await postJson('/api/auth?action=login', { email, password });
  authState.user = data.email;
  return data.email;
}

export async function logout() {
  try { await postJson('/api/auth?action=logout'); } catch {}
  authState.user = null;
}

// Demande un email de réinitialisation (réponse toujours "ok" → anti-énumération)
export async function forgotPassword(email) {
  await postJson('/api/auth?action=forgot', { email });
}

// Définit un nouveau mot de passe à partir d'un jeton (lien email)
export async function resetPassword(token, password) {
  const data = await postJson('/api/auth?action=reset', { token, password });
  authState.user = data.email;
  return data.email;
}
