// ============================================================
// /api/discord — OAuth2 Discord, login + callback dans UNE fonction
//   - Sans ?code  → étape "login" : redirige vers Discord
//   - Avec ?code  → étape "callback" : connecte/crée le compte
// (limite Vercel Hobby : 12 fonctions serverless)
// ============================================================

import crypto from 'node:crypto';
import { kv } from '../lib/kv.js';
import { signSession, setSessionCookie } from '../lib/auth.js';
import { buildAuthorizeUrl, exchangeCodeForToken, fetchDiscordUser, getRedirectUri } from '../lib/discord.js';

function redirect(res, path) {
  res.writeHead(302, { Location: path });
  res.end();
}

export default async function handler(req, res) {
  const { code, state, error } = req.query;

  // ---- Étape LOGIN (pas de code) ----
  if (!code) {
    const st = crypto.randomBytes(16).toString('hex');
    await kv.set(`discord-state:${st}`, '1', { ex: 600 });
    return redirect(res, buildAuthorizeUrl(req, st));
  }

  // ---- Étape CALLBACK (code présent) ----
  if (error) return redirect(res, `/?auth=error&reason=${encodeURIComponent(error)}`);
  if (!state) return redirect(res, '/?auth=error&reason=missing_params');

  const stateKey = `discord-state:${state}`;
  if (!(await kv.get(stateKey))) return redirect(res, '/?auth=error&reason=invalid_state');
  await kv.del(stateKey);

  try {
    const tokens = await exchangeCodeForToken(code, getRedirectUri(req));
    const user   = await fetchDiscordUser(tokens.access_token);

    if (!user.email || user.verified === false) {
      return redirect(res, '/?auth=error&reason=no_email');
    }
    const email = user.email.toLowerCase();

    const existing = await kv.get(`user:${email}`);
    if (!existing) {
      await kv.set(`user:${email}`, {
        createdAt: Date.now(), via: 'discord',
        discordId: user.id, username: user.username || null,
      });
    } else if (!existing.discordId) {
      await kv.set(`user:${email}`, {
        ...existing, discordId: user.id,
        username: user.username || existing.username || null,
      });
    }

    setSessionCookie(res, await signSession(email));
    return redirect(res, '/?auth=discord');
  } catch (e) {
    console.error('[discord]', e);
    return redirect(res, '/?auth=error&reason=discord_failed');
  }
}
