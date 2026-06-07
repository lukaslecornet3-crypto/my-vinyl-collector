// ============================================================
// /api/discord/callback — Reçoit le code, connecte/crée le compte
// Liaison par EMAIL : un login Discord et un compte email/mdp avec le
// même email partagent la même collection.
// ============================================================

import { kv } from '../../lib/kv.js';
import { signSession, setSessionCookie } from '../../lib/auth.js';
import { exchangeCodeForToken, fetchDiscordUser, getRedirectUri } from '../../lib/discord.js';

function redirect(res, path) {
  res.writeHead(302, { Location: path });
  res.end();
}

export default async function handler(req, res) {
  const { code, state, error } = req.query;

  if (error) return redirect(res, `/?auth=error&reason=${encodeURIComponent(error)}`);
  if (!code || !state) return redirect(res, '/?auth=error&reason=missing_params');

  // Vérifie le state (anti-CSRF)
  const stateKey = `discord-state:${state}`;
  const valid = await kv.get(stateKey);
  if (!valid) return redirect(res, '/?auth=error&reason=invalid_state');
  await kv.del(stateKey);

  try {
    const tokens = await exchangeCodeForToken(code, getRedirectUri(req));
    const user   = await fetchDiscordUser(tokens.access_token);

    // Discord doit fournir un email vérifié
    if (!user.email || user.verified === false) {
      return redirect(res, '/?auth=error&reason=no_email');
    }
    const email = user.email.toLowerCase();

    // Crée le compte s'il n'existe pas (sinon on réutilise l'existant)
    const existing = await kv.get(`user:${email}`);
    if (!existing) {
      await kv.set(`user:${email}`, {
        createdAt: Date.now(),
        via: 'discord',
        discordId: user.id,
        username: user.username || null,
      });
    } else if (!existing.discordId) {
      // Lie le compte email existant à Discord (sans toucher au mot de passe)
      await kv.set(`user:${email}`, { ...existing, discordId: user.id, username: user.username || existing.username || null });
    }

    // Session
    const token = await signSession(email);
    setSessionCookie(res, token);
    return redirect(res, '/?auth=discord');
  } catch (e) {
    console.error('[discord/callback]', e);
    return redirect(res, '/?auth=error&reason=discord_failed');
  }
}
