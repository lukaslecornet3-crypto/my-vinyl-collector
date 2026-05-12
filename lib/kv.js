// ============================================================
// lib/kv.js — Client Upstash Redis (via Vercel marketplace)
//
// Variables d'env attendues (auto-injectées par Vercel) :
//   UPSTASH_REDIS_REST_URL   ou KV_REST_API_URL
//   UPSTASH_REDIS_REST_TOKEN ou KV_REST_API_TOKEN
// ============================================================

import { Redis } from '@upstash/redis';

const url   = process.env.UPSTASH_REDIS_REST_URL   || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

if (!url || !token) {
  throw new Error('Upstash Redis : URL/token manquant dans les env vars Vercel');
}

// `kv` est exporté pour garder l'API homogène avec le reste du code
export const kv = new Redis({ url, token });
