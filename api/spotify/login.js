// ============================================================
// /api/spotify/login — Redirige vers l'autorisation Spotify
// ============================================================

import crypto from 'node:crypto';
import { getCurrentUser } from '../../lib/auth.js';
import { buildAuthorizeUrl } from '../../lib/spotify.js';
import { kv } from '../../lib/kv.js';

export default async function handler(req, res) {
  const email = await getCurrentUser(req);
  if (!email) return res.status(401).json({ error: 'Connecte-toi d\'abord' });

  // State token anti-CSRF : on le sauve avec l'email associé
  const state = crypto.randomBytes(16).toString('hex');
  await kv.set(`spotify-state:${state}`, email, { ex: 600 }); // 10 min

  const url = buildAuthorizeUrl(req, state);
  res.writeHead(302, { Location: url });
  res.end();
}
