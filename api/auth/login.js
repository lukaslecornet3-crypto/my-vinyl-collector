// ============================================================
// /api/auth/login — Connexion
// ============================================================

import { kv } from '../../lib/kv.js';
import {
  verifyPassword, signSession, setSessionCookie,
  validEmail,
} from '../../lib/auth.js';
import { applyRateLimit } from '../../lib/ratelimit.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limit : 5 essais / 5 min par IP (anti-brute-force)
  if (await applyRateLimit(req, res, 'login')) return;

  const { email, password } = req.body || {};
  if (!validEmail(email) || typeof password !== 'string') {
    return res.status(400).json({ error: 'Identifiants invalides' });
  }

  const key = `user:${email.toLowerCase()}`;
  const user = await kv.get(key);
  // Même message d'erreur si user inexistant OU mauvais mdp (anti-énumération)
  if (!user) return res.status(401).json({ error: 'Identifiants invalides' });

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok)  return res.status(401).json({ error: 'Identifiants invalides' });

  const token = await signSession(email.toLowerCase());
  setSessionCookie(res, token);

  return res.status(200).json({ email: email.toLowerCase() });
}
