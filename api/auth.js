// ============================================================
// /api/auth?action=register|login|logout|me
// 4 routes regroupées en UNE fonction (limite Vercel Hobby : 12 fonctions)
// ============================================================

import crypto from 'node:crypto';
import { kv } from '../lib/kv.js';
import {
  hashPassword, verifyPassword, signSession, setSessionCookie,
  clearSessionCookie, getCurrentUser, validEmail, validPassword,
} from '../lib/auth.js';
import { applyRateLimit } from '../lib/ratelimit.js';
import { sendResetEmail, emailConfigured } from '../lib/email.js';

export default async function handler(req, res) {
  const action = req.query.action;
  switch (action) {
    case 'register': return register(req, res);
    case 'login':    return login(req, res);
    case 'logout':   return logout(req, res);
    case 'me':       return me(req, res);
    case 'forgot':   return forgot(req, res);
    case 'reset':    return reset(req, res);
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

// ---- Demande de réinitialisation (envoie un email) ----
async function forgot(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (await applyRateLimit(req, res, 'forgot')) return;

  const { email } = req.body || {};
  if (!validEmail(email)) return res.status(400).json({ error: 'Email invalide' });

  const addr = email.toLowerCase();
  const user = await kv.get(`user:${addr}`);

  // On n'envoie un email QUE si le compte existe ET a un mot de passe
  // (les comptes 100% Discord n'ont pas de mot de passe à réinitialiser).
  // Réponse identique dans tous les cas → anti-énumération.
  if (user && user.passwordHash) {
    if (!emailConfigured()) {
      return res.status(500).json({ error: 'Envoi d\'email non configuré côté serveur' });
    }
    const token = crypto.randomBytes(32).toString('base64url');
    await kv.set(`reset:${token}`, addr, { ex: 3600 }); // 1 heure

    const host  = req.headers['x-forwarded-host'] || req.headers.host;
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const link  = `${proto}://${host}/reset/${token}`;

    try { await sendResetEmail(addr, link); }
    catch (e) { console.error('[forgot] email', e); }
  }

  return res.status(200).json({ ok: true });
}

// ---- Réinitialisation effective (nouveau mot de passe) ----
async function reset(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { token, password } = req.body || {};
  if (!token || typeof token !== 'string') return res.status(400).json({ error: 'Lien invalide' });
  if (!validPassword(password))            return res.status(400).json({ error: 'Mot de passe trop court (8 caractères minimum)' });

  const tokenKey = `reset:${token}`;
  const email = await kv.get(tokenKey);
  if (!email) return res.status(400).json({ error: 'Lien expiré ou invalide' });

  const user = await kv.get(`user:${email}`);
  if (!user) return res.status(400).json({ error: 'Compte introuvable' });

  user.passwordHash = await hashPassword(password);
  await kv.set(`user:${email}`, user);
  await kv.del(tokenKey); // jeton à usage unique

  // Connecte directement l'utilisateur
  setSessionCookie(res, await signSession(email));
  return res.status(200).json({ email });
}
