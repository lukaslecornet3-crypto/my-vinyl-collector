// ============================================================
// /api/discogs.js — Proxy serverless Vercel
// Le token Discogs reste SUR LE SERVEUR (variable d'environnement),
// jamais envoyé au navigateur.
// ============================================================

// Endpoints Discogs autorisés (whitelist anti-abus)
const ALLOWED_PATHS = [
  /^\/database\/search$/,
  /^\/marketplace\/price_suggestions\/\d+$/,
];

export default async function handler(req, res) {
  const token = process.env.DISCOGS_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'DISCOGS_TOKEN manquant côté serveur' });
  }

  // Le client envoie /api/discogs?path=/database/search&q=...
  const { path, ...params } = req.query;

  if (!path || !ALLOWED_PATHS.some(rx => rx.test(path))) {
    return res.status(400).json({ error: 'Endpoint non autorisé' });
  }

  // Reconstruit l'URL Discogs avec les query params transmis
  const url = new URL(`https://api.discogs.com${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v != null) url.searchParams.append(k, String(v));
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'MyVinylCollector/1.0',
        'Authorization': `Discogs token=${token}`,
      },
    });
    const data = await upstream.json();

    // Cache CDN Vercel : 1h frais, 24h stale-while-revalidate
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(upstream.status).json(data);
  } catch (e) {
    return res.status(502).json({ error: 'Discogs indisponible' });
  }
}
