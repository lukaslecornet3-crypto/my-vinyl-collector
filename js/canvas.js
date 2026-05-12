// ============================================================
// canvas.js — Dessin des vinyles + cache statique (OffscreenCanvas)
// ============================================================

// Cache des images de pochettes : url -> Image | null (chargement) | false (erreur)
export const coverCache = {};

// Cache des disques statiques (sans la pochette tournante)
let staticCache = {};

export function preloadCover(url) {
  if (!url || coverCache[url] !== undefined) return;
  coverCache[url] = null;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload  = () => { coverCache[url] = img; staticCache = {}; }; // invalide les disques cachés
  img.onerror = () => { coverCache[url] = false; };
  img.src = url;
}

// Construit (ou récupère depuis le cache) le disque statique
// = vinyle noir + sillons + reflets, SANS la pochette qui tourne.
function getStaticDisc(W, album, labelSize) {
  const key = `${W}_${album.color}_${album.rim}_${labelSize}`;
  if (staticCache[key]) return staticCache[key];

  const oc = (typeof OffscreenCanvas !== 'undefined')
    ? new OffscreenCanvas(W, W)
    : (() => { const c = document.createElement('canvas'); c.width = c.height = W; return c; })();
  const ctx = oc.getContext('2d');
  const R   = W/2 - 2;
  const lr  = R * labelSize;
  const cx  = W/2;

  ctx.save();
  ctx.translate(cx, cx);

  // Disque noir + bordure colorée
  ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI*2);
  ctx.fillStyle = '#111'; ctx.fill();
  ctx.strokeStyle = album.rim || '#333'; ctx.lineWidth = 2; ctx.stroke();

  // Sillons concentriques (dessinés une seule fois)
  const gStart = R*(labelSize + .08);
  const gStep  = R*(.9 - labelSize - .08)/30;
  for (let i = 0; i < 30; i++) {
    const b = 16 + (i%3)*7;
    ctx.beginPath(); ctx.arc(0, 0, gStart + i*gStep, 0, Math.PI*2);
    ctx.strokeStyle = `rgb(${b},${b},${b})`; ctx.lineWidth = .7; ctx.stroke();
  }

  // 6 reflets en étoile
  for (let s = 0; s < 6; s++) {
    ctx.save(); ctx.rotate((s/6) * Math.PI * 2);
    ctx.beginPath(); ctx.moveTo(lr, 0); ctx.lineTo(R*.92, 0);
    ctx.strokeStyle = 'rgba(255,255,255,.025)'; ctx.lineWidth = 14; ctx.stroke();
    ctx.restore();
  }

  // Trou central
  ctx.beginPath(); ctx.arc(0, 0, R*.05, 0, Math.PI*2);
  ctx.fillStyle = '#080808'; ctx.fill();

  ctx.restore();
  staticCache[key] = oc;
  return oc;
}

export function drawVinyl(ctx, W, album, angle, labelSize) {
  if (!ctx) return;
  const cx = W/2, R = W/2 - 2, lr = R * labelSize;

  ctx.clearRect(0, 0, W, W);

  // 1) Disque statique (depuis le cache)
  ctx.drawImage(getStaticDisc(W, album, labelSize), 0, 0);

  // 2) Pochette tournante au centre
  ctx.save();
  ctx.translate(cx, cx);
  ctx.rotate(angle);

  ctx.save();
  ctx.beginPath(); ctx.arc(0, 0, lr, 0, Math.PI*2); ctx.clip();
  const cover = album.coverUrl ? coverCache[album.coverUrl] : null;
  if (cover) {
    ctx.drawImage(cover, -lr, -lr, lr*2, lr*2);
  } else {
    ctx.fillStyle = album.color || '#1a0a2e';
    ctx.fillRect(-lr, -lr, lr*2, lr*2);
    if (cover === null) { // chargement en cours : on affiche les initiales
      ctx.fillStyle = 'rgba(255,255,255,.15)';
      ctx.font = `bold ${Math.round(lr*.45)}px Poppins,sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(
        (album.title || '?').split(' ').slice(0, 2).map(w => w[0]).join(''),
        0, 0
      );
    }
  }
  ctx.restore();

  // Bordure de l'étiquette
  ctx.beginPath(); ctx.arc(0, 0, lr, 0, Math.PI*2);
  ctx.strokeStyle = album.rim || '#555'; ctx.lineWidth = 1.5; ctx.stroke();

  ctx.restore();
}
