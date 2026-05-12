// ============================================================
// /api/collection — Lecture/écriture de la collection cloud
// GET : récupère la collection de l'utilisateur connecté
// PUT : remplace la collection de l'utilisateur connecté
// ============================================================

import { kv } from '../lib/kv.js';
import { getCurrentUser } from '../lib/auth.js';

const MAX_ALBUMS = 5000;
const MAX_BYTES  = 5 * 1024 * 1024; // 5 Mo

export default async function handler(req, res) {
  const email = await getCurrentUser(req);
  if (!email) return res.status(401).json({ error: 'Non connecté' });

  const key = `collection:${email}`;

  if (req.method === 'GET') {
    const collection = (await kv.get(key)) || [];
    return res.status(200).json({ collection });
  }

  if (req.method === 'PUT') {
    const { collection } = req.body || {};
    if (!Array.isArray(collection)) {
      return res.status(400).json({ error: 'Format invalide' });
    }
    if (collection.length > MAX_ALBUMS) {
      return res.status(413).json({ error: `Trop d'albums (max ${MAX_ALBUMS})` });
    }
    // Approx du poids
    const approx = JSON.stringify(collection).length;
    if (approx > MAX_BYTES) {
      return res.status(413).json({ error: 'Collection trop volumineuse' });
    }
    await kv.set(key, collection);
    return res.status(200).json({ ok: true, count: collection.length });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
