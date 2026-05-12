// ============================================================
// /api/auth/register — Création de compte
// ============================================================

import { kv } from '../../lib/kv.js';
import {
  hashPassword, signSession, setSessionCookie,
  validEmail, validPassword,
} from '../../lib/auth.js';
import { applyRateLimit } from '../../lib/ratelimit.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limit : 3 inscriptions / heure par IP (anti-spam)
  if (await applyRateLimit(req, res, 'register')) return;

  const { email, password } = req.body || {};

  if (!validEmail(email))      return res.status(400).json({ error: 'Email invalide' });
  if (!validPassword(password)) return res.status(400).json({ error: 'Mot de passe trop court (8 caractères minimum)' });

  const key = `user:${email.toLowerCase()}`;
  const existing = await kv.get(key);
  if (existing) return res.status(409).json({ error: 'Cet email est déjà utilisé' });

  const passwordHash = await hashPassword(password);
  await kv.set(key, { passwordHash, createdAt: Date.now() });

  const token = await signSession(email.toLowerCase());
  setSessionCookie(res, token);

  return res.status(201).json({ email: email.toLowerCase() });
}
