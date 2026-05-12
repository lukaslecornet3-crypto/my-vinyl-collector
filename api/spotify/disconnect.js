// ============================================================
// /api/spotify/disconnect — Supprime les tokens Spotify de l'utilisateur
// ============================================================

import { getCurrentUser } from '../../lib/auth.js';
import { deleteTokens } from '../../lib/spotify.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const email = await getCurrentUser(req);
  if (!email) return res.status(401).json({ error: 'Non connecté' });

  await deleteTokens(email);
  return res.status(200).json({ ok: true });
}
