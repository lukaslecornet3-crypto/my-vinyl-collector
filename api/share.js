// ============================================================
// /api/share — Gère le lien public de partage de l'utilisateur connecté
//   GET    : retourne mon code actuel (ou null si pas activé)
//   POST   : active/régénère mon code
//   DELETE : désactive le partage
// ============================================================

import crypto from 'node:crypto';
import { kv } from '../lib/kv.js';
import { getCurrentUser } from '../lib/auth.js';

function generateCode() {
  // 12 octets → 16 chars base64url (sans = / +)
  return crypto.randomBytes(12).toString('base64url');
}

export default async function handler(req, res) {
  const email = await getCurrentUser(req);
  if (!email) return res.status(401).json({ error: 'Non connecté' });

  const userKey = `user:${email}`;
  const user    = await kv.get(userKey);
  if (!user) return res.status(404).json({ error: 'Utilisateur inconnu' });

  if (req.method === 'GET') {
    return res.status(200).json({ code: user.shareCode || null });
  }

  if (req.method === 'POST') {
    // Révoque l'ancien code si présent
    if (user.shareCode) await kv.del(`share:${user.shareCode}`);

    const code = generateCode();
    await kv.set(`share:${code}`, email);
    await kv.set(userKey, { ...user, shareCode: code });
    return res.status(200).json({ code });
  }

  if (req.method === 'DELETE') {
    if (user.shareCode) await kv.del(`share:${user.shareCode}`);
    await kv.set(userKey, { ...user, shareCode: null });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
