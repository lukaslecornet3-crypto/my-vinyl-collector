// ============================================================
// js/color-extract.js — Couleur dominante d'une pochette → glow coloré
//   Charge une COPIE de l'image avec CORS (juste pour lire les pixels).
//   Si le serveur ne fournit pas CORS → on ignore (pas de glow, sans erreur).
// ============================================================

const colorCache = {}; // url -> "r,g,b" | false

function setGlow(el, rgb) {
  el.style.boxShadow = rgb ? `0 0 90px 12px rgba(${rgb},.38)` : '';
  el.style.transition = 'box-shadow .6s ease';
}

export function applyCoverGlow(el, url) {
  if (!el) return;
  if (!url) { setGlow(el, null); return; }

  // Déjà connu
  if (colorCache[url] !== undefined) {
    setGlow(el, colorCache[url] || null);
    return;
  }

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      const s = 16;
      const c = document.createElement('canvas');
      c.width = s; c.height = s;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, s, s);
      const data = ctx.getImageData(0, 0, s, s).data;

      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue;            // ignore les pixels transparents
        // ignore le quasi-noir et quasi-blanc (peu colorés)
        const lum = (data[i] + data[i+1] + data[i+2]) / 3;
        if (lum < 25 || lum > 235) continue;
        r += data[i]; g += data[i+1]; b += data[i+2]; n++;
      }
      if (!n) { colorCache[url] = false; return; }
      const rgb = `${Math.round(r/n)},${Math.round(g/n)},${Math.round(b/n)}`;
      colorCache[url] = rgb;
      setGlow(el, rgb);
    } catch {
      colorCache[url] = false; // canvas "tainted" → on abandonne proprement
    }
  };
  img.onerror = () => { colorCache[url] = false; };
  img.src = url;
}
