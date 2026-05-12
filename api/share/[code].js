// ============================================================
// /api/share/[code] — Lecture publique d'une collection partagée
// AUCUNE AUTH NÉCESSAIRE — accessible à n'importe qui avec le lien
// ============================================================

import { kv } from '../../lib/kv.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code } = req.query;
  if (!code || typeof code !== 'string' || code.length < 8) {
    return res.status(400).json({ error: 'Code invalide' });
  }

  // 1) Le code pointe vers un email
  const email = await kv.get(`share:${code}`);
  if (!email) return res.status(404).json({ error: 'Lien expiré ou inexistant' });

  // 2) Récupère la collection de cet email
  const collection = (await kv.get(`collection:${email}`)) || [];

  // Cache 60s côté CDN pour réduire les hits Redis
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  // On ne renvoie SURTOUT pas l'email complet (seulement la partie locale, anonymisée)
  const displayName = email.split('@')[0];

  return res.status(200).json({
    displayName,
    count: collection.length,
    collection,
  });
}
