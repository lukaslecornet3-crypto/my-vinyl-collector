// ============================================================
// /api/auth/me — Renvoie l'utilisateur connecté (ou 401)
// + Renouvelle le cookie de session à chaque visite (sliding window)
//   → tant que l'utilisateur revient au moins 1 fois / 30 jours,
//     il reste connecté indéfiniment.
// ============================================================

import { getCurrentUser, signSession, setSessionCookie } from '../../lib/auth.js';

export default async function handler(req, res) {
  const email = await getCurrentUser(req);
  if (!email) return res.status(401).json({ error: 'Non connecté' });

  // Renouvelle la session (rallonge de 30j à chaque appel)
  try {
    const token = await signSession(email);
    setSessionCookie(res, token);
  } catch {
    // Si la re-signature échoue, on continue quand même : la session
    // existante reste valide jusqu'à son expiration naturelle
  }

  return res.status(200).json({ email });
}
