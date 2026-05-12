// ============================================================
// /api/spotify/callback — Reçoit le code, échange contre tokens
// ============================================================

import { kv } from '../../lib/kv.js';
import { exchangeCodeForTokens, saveTokens, getRedirectUri } from '../../lib/spotify.js';

export default async function handler(req, res) {
  const { code, state, error } = req.query;

  if (error) {
    return redirect(res, `/?spotify=error&reason=${encodeURIComponent(error)}`);
  }
  if (!code || !state) {
    return redirect(res, '/?spotify=error&reason=missing_params');
  }

  // Récupère l'email associé au state (créé par /api/spotify/login)
  const stateKey = `spotify-state:${state}`;
  const email = await kv.get(stateKey);
  if (!email) {
    return redirect(res, '/?spotify=error&reason=invalid_state');
  }
  await kv.del(stateKey); // consume

  try {
    const tokens = await exchangeCodeForTokens(code, getRedirectUri(req));
    await saveTokens(email, tokens);
    return redirect(res, '/?spotify=connected');
  } catch (e) {
    console.error('[spotify/callback]', e);
    return redirect(res, '/?spotify=error&reason=exchange_failed');
  }
}

function redirect(res, path) {
  res.writeHead(302, { Location: path });
  res.end();
}
