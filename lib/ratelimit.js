// ============================================================
// lib/ratelimit.js — Rate limiting via Upstash Ratelimit (sliding window)
// ============================================================

import { Ratelimit } from '@upstash/ratelimit';
import { kv } from './kv.js';

// Limites par "verrou" :
//   - login    : 5 essais / 5 minutes  → protection brute force
//   - register : 3 inscriptions / heure → anti-spam
//   - other    : 60 req / minute       → DoS basique
const limiters = {
  login:    new Ratelimit({ redis: kv, limiter: Ratelimit.slidingWindow(5,  '5 m'),  prefix: 'rl:login'    }),
  register: new Ratelimit({ redis: kv, limiter: Ratelimit.slidingWindow(3,  '1 h'),  prefix: 'rl:register' }),
  api:      new Ratelimit({ redis: kv, limiter: Ratelimit.slidingWindow(60, '1 m'),  prefix: 'rl:api'      }),
};

// Récupère l'IP du client (Vercel ajoute x-forwarded-for)
export function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff) return xff.split(',')[0].trim();
  return req.headers['x-real-ip'] || 'unknown';
}

// Vérifie le rate limit. Retourne { allowed, retryAfter (secondes) }
export async function checkLimit(kind, identifier) {
  const limiter = limiters[kind];
  if (!limiter) return { allowed: true, retryAfter: 0 };

  const { success, reset } = await limiter.limit(identifier);
  if (success) return { allowed: true, retryAfter: 0 };

  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return { allowed: false, retryAfter };
}

// Helper : applique le rate limit et renvoie 429 si dépassé
// Usage : if (await applyRateLimit(req, res, 'login')) return;
export async function applyRateLimit(req, res, kind) {
  const ip = getClientIp(req);
  const { allowed, retryAfter } = await checkLimit(kind, ip);
  if (!allowed) {
    res.setHeader('Retry-After', String(retryAfter));
    res.status(429).json({
      error: `Trop de tentatives. Réessaie dans ${retryAfter} secondes.`,
      retryAfter,
    });
    return true;
  }
  return false;
}
