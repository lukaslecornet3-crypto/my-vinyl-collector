// ============================================================
// /api/spotify/now-playing — Renvoie ce que l'utilisateur écoute
// ============================================================

import { getCurrentUser } from '../../lib/auth.js';
import { getValidAccessToken, fetchNowPlaying, getTokens } from '../../lib/spotify.js';

export default async function handler(req, res) {
  const email = await getCurrentUser(req);
  if (!email) return res.status(401).json({ error: 'Non connecté' });

  const tokens = await getTokens(email);
  if (!tokens) return res.status(200).json({ connected: false });

  try {
    const token = await getValidAccessToken(email);
    if (!token) return res.status(200).json({ connected: false });

    const data = await fetchNowPlaying(token);

    if (!data.item) {
      return res.status(200).json({ connected: true, playing: false });
    }

    // On simplifie le payload côté client
    const item = data.item;
    return res.status(200).json({
      connected: true,
      playing: data.is_playing,
      track: {
        name:        item.name,
        artists:     item.artists?.map(a => a.name) || [],
        album:       item.album?.name || '',
        albumImage:  item.album?.images?.[0]?.url || null,
        progress_ms: data.progress_ms || 0,
        duration_ms: item.duration_ms || 0,
        spotifyUrl:  item.external_urls?.spotify || null,
      },
    });
  } catch (e) {
    console.error('[spotify/now-playing]', e);
    return res.status(500).json({ error: 'Erreur Spotify', connected: true });
  }
}
