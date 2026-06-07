// ============================================================
// /api/auth?action=register|login|logout|me
// 4 routes regroupées en UNE fonction (limite Vercel Hobby : 12 fonctions)
// ============================================================

import { kv } from '../lib/kv.js';
import {
  hashPassword, verifyPassword, signSession, setSessionCookie,
  clearSessionCookie, getCurrentUser, validEmail, validPassword,
} from '../lib/auth.js';
import { applyRateLimit } from '../lib/ratelimit.js';

export default async function handler(req, res) {
  const action = req.query.action;
  switch (action) {
    case 'register': return register(req, res);
    case 'login':    return login(req, res);
    case 'logout':   return logout(req, res);
    case 'me':       return me(req, res);
    default:         return res.status(404).json({ error: 'Action inconnue' });
  }
}

// ---- Inscription ----
async function register(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (await applyRateLimit(req, res, 'register')) return;

  const { email, password } = req.body || {};
  if (!validEmail(email))       return res.status(400).json({ error: 'Email invalide' });
  if (!validPassword(password)) return res.status(400).json({ error: 'Mot de passe trop court (8 caractères minimum)' });

  const key = `user:${email.toLowerCase()}`;
  if (await kv.get(key)) return res.status(409).json({ error: 'Cet email est déjà utilisé' });

  const passwordHash = await hashPassword(password);
  await kv.set(key, { passwordHash, createdAt: Date.now() });

  setSessionCookie(res, await signSession(email.toLowerCase()));
  return res.status(201).json({ email: email.toLowerCase() });
}

// ---- Connexion ----
async function login(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (await applyRateLimit(req, res, 'login')) return;

  const { email, password } = req.body || {};
  if (!validEmail(email) || typeof password !== 'string') {
    return res.status(400).json({ error: 'Identifiants invalides' });
  }

  const user = await kv.get(`user:${email.toLowerCase()}`);
  // Même message si user inexistant OU mauvais mdp (anti-énumération)
  if (!user || !user.passwordHash) return res.status(401).json({ error: 'Identifiants invalides' });

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Identifiants invalides' });

  setSessionCookie(res, await signSession(email.toLowerCase()));
  return res.status(200).json({ email: email.toLowerCase() });
}

// ---- Déconnexion ----
async function logout(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  clearSessionCookie(res);
  return res.status(200).json({ ok: true });
}

// ---- Session courante (+ renouvellement glissant) ----
async function me(req, res) {
  const email = await getCurrentUser(req);
  if (!email) return res.status(401).json({ error: 'Non connecté' });
  try {
    setSessionCookie(res, await signSession(email)); // rallonge la session de 30j
  } catch {}
  return res.status(200).json({ email });
}
