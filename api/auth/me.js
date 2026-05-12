// ============================================================
// /api/auth/me — Renvoie l'utilisateur connecté (ou 401)
// ============================================================

import { getCurrentUser } from '../../lib/auth.js';

export default async function handler(req, res) {
  const email = await getCurrentUser(req);
  if (!email) return res.status(401).json({ error: 'Non connecté' });
  return res.status(200).json({ email });
}
