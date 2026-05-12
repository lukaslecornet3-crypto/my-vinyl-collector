// ============================================================
// lib/kv.js — Client Upstash Redis (via Vercel marketplace)
//
// Cherche AUTOMATIQUEMENT les bonnes variables d'env, peu importe
// comment l'intégration Vercel/Upstash les a nommées.
// ============================================================

import { Redis } from '@upstash/redis';

// Récupère la première variable dont le NOM correspond à un suffixe
function findEnv(suffixes) {
  const entries = Object.entries(process.env);
  for (const suffix of suffixes) {
    const found = entries.find(([k]) => k === suffix || k.endsWith('_' + suffix));
    if (found && found[1]) return found[1];
  }
  return null;
}

const url = findEnv([
  'UPSTASH_REDIS_REST_URL',
  'KV_REST_API_URL',
  'REST_URL',
  'REST_API_URL',
]);

const token = findEnv([
  'UPSTASH_REDIS_REST_TOKEN',
  'KV_REST_API_TOKEN',
  'REST_TOKEN',
  'REST_API_TOKEN',
]);

if (!url || !token) {
  // Log lisible côté Vercel : on liste les variables disponibles
  const keys = Object.keys(process.env)
    .filter(k => /UPSTASH|KV|REDIS/i.test(k))
    .sort();
  console.error('[kv] URL/token Upstash introuvable. Variables détectées :', keys);
  throw new Error('Upstash Redis : URL/token manquant. Connecte la base Upstash au projet Vercel.');
}

export const kv = new Redis({ url, token });
