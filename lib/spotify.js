// ============================================================
// lib/spotify.js — Helper Spotify API (OAuth + refresh + calls)
// ============================================================

import { kv } from './kv.js';

// Scopes minimum nécessaires pour notre usage
export const SPOTIFY_SCOPES = [
  'user-read-currently-playing',
  'user-read-playback-state',
].join(' ');

function getCredentials() {
  // .trim() : protège contre les espaces/tabulations invisibles collés par erreur
  const id     = process.env.SPOTIFY_CLIENT_ID?.trim();
  const secret = process.env.SPOTIFY_CLIENT_SECRET?.trim();
  if (!id || !secret) {
    throw new Error('SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET manquants');
  }
  return { id, secret };
}

// URL de la callback (utilise le host de la requête pour fonctionner sur tous les domaines Vercel)
export function getRedirectUri(req) {
  const host  = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}/api/spotify/callback`;
}

// URL d'authorize avec tous les paramètres
export function buildAuthorizeUrl(req, state) {
  const { id } = getCredentials();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: id,
    scope: SPOTIFY_SCOPES,
    redirect_uri: getRedirectUri(req),
    state,
  });
  return `https://accounts.spotify.com/authorize?${params}`;
}

// Échange le code reçu en callback contre un access + refresh token
export async function exchangeCodeForTokens(code, redirectUri) {
  const { id, secret } = getCredentials();
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });
  const auth = Buffer.from(`${id}:${secret}`).toString('base64');

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Spotify token exchange failed (${res.status}): ${t}`);
  }
  return res.json(); // { access_token, refresh_token, expires_in, scope, token_type }
}

// Récupère un nouveau access_token via le refresh_token (les access_token expirent en 1h)
export async function refreshAccessToken(refreshToken) {
  const { id, secret } = getCredentials();
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  const auth = Buffer.from(`${id}:${secret}`).toString('base64');

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Spotify refresh failed (${res.status}): ${t}`);
  }
  return res.json(); // { access_token, expires_in, scope, token_type } (refresh_token absent si pas changé)
}

// ---- Stockage tokens en KV ----
const kvKey = (email) => `spotify:${email}`;

export async function saveTokens(email, tokens) {
  // tokens : { access_token, refresh_token, expires_in } depuis l'API
  const data = {
    access_token:  tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at:    Date.now() + (tokens.expires_in - 60) * 1000, // -60s de marge
  };
  await kv.set(kvKey(email), data);
  return data;
}

export async function getTokens(email) {
  return kv.get(kvKey(email));
}

export async function deleteTokens(email) {
  await kv.del(kvKey(email));
}

// Retourne un access_token valide (refresh auto si expiré)
export async function getValidAccessToken(email) {
  const tokens = await getTokens(email);
  if (!tokens) return null;
  if (Date.now() < tokens.expires_at) return tokens.access_token;

  // Expiré → refresh
  const refreshed = await refreshAccessToken(tokens.refresh_token);
  const updated = {
    ...tokens,
    access_token: refreshed.access_token,
    expires_at: Date.now() + (refreshed.expires_in - 60) * 1000,
  };
  if (refreshed.refresh_token) updated.refresh_token = refreshed.refresh_token;
  await kv.set(kvKey(email), updated);
  return updated.access_token;
}

// Récupère le morceau en cours de lecture
export async function fetchNowPlaying(accessToken) {
  const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  // 204 = rien ne joue
  if (res.status === 204) return { is_playing: false, item: null };
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Spotify now-playing failed (${res.status}): ${t}`);
  }
  return res.json();
}
