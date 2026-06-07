// ============================================================
// /api/discord/login — Redirige vers l'autorisation Discord
// ============================================================

import crypto from 'node:crypto';
import { kv } from '../../lib/kv.js';
import { buildAuthorizeUrl } from '../../lib/discord.js';

export default async function handler(req, res) {
  // State anti-CSRF, valable 10 min
  const state = crypto.randomBytes(16).toString('hex');
  await kv.set(`discord-state:${state}`, '1', { ex: 600 });

  res.writeHead(302, { Location: buildAuthorizeUrl(req, state) });
  res.end();
}
