// ============================================================
// lib/discord.js — OAuth2 Discord (login social)
// Donne accès à : identité Discord + email vérifié
// ============================================================

export const DISCORD_SCOPES = ['identify', 'email'].join(' ');

function getCredentials() {
  const id     = process.env.DISCORD_CLIENT_ID?.trim();
  const secret = process.env.DISCORD_CLIENT_SECRET?.trim();
  if (!id || !secret) {
    throw new Error('DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET manquants');
  }
  return { id, secret };
}

// URL de callback (basée sur le host de la requête → marche sur tous les domaines)
export function getRedirectUri(req) {
  const host  = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}/api/discord/callback`;
}

export function buildAuthorizeUrl(req, state) {
  const { id } = getCredentials();
  const params = new URLSearchParams({
    client_id: id,
    redirect_uri: getRedirectUri(req),
    response_type: 'code',
    scope: DISCORD_SCOPES,
    state,
    prompt: 'consent',
  });
  return `https://discord.com/api/oauth2/authorize?${params}`;
}

// Échange le code contre un access_token
export async function exchangeCodeForToken(code, redirectUri) {
  const { id, secret } = getCredentials();
  const body = new URLSearchParams({
    client_id: id,
    client_secret: secret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });

  const res = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Discord token exchange failed (${res.status}): ${t}`);
  }
  return res.json(); // { access_token, token_type, ... }
}

// Récupère le profil Discord de l'utilisateur
export async function fetchDiscordUser(accessToken) {
  const res = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Discord user fetch failed (${res.status}): ${t}`);
  }
  return res.json(); // { id, username, email, verified, avatar, ... }
}
