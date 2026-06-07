// ============================================================
// js/share-card.js — Génère une image partageable de la collection
//   100% dessinée sur canvas (pas de pochettes externes → exportable,
//   pas de problème de "tainted canvas")
// ============================================================

import { ALBUMS } from './storage.js';
import { getLevel, computeStats } from './badges.js';
import { toast } from './toast.js';

const W = 1080, H = 1350;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

// Dessine un mini-vinyle (couleurs de l'album, sans photo)
function drawMiniVinyl(ctx, cx, cy, R, album) {
  ctx.save();
  ctx.translate(cx, cy);
  // disque
  ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI*2);
  ctx.fillStyle = '#111'; ctx.fill();
  ctx.strokeStyle = album.rim || '#333'; ctx.lineWidth = 3; ctx.stroke();
  // sillons
  for (let i = 0; i < 6; i++) {
    ctx.beginPath(); ctx.arc(0, 0, R*0.4 + i*(R*0.08), 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1; ctx.stroke();
  }
  // étiquette
  ctx.beginPath(); ctx.arc(0, 0, R*0.34, 0, Math.PI*2);
  ctx.fillStyle = album.color || '#1a0a2e'; ctx.fill();
  ctx.strokeStyle = album.rim || '#555'; ctx.lineWidth = 2; ctx.stroke();
  // trou
  ctx.beginPath(); ctx.arc(0, 0, R*0.04, 0, Math.PI*2);
  ctx.fillStyle = '#080808'; ctx.fill();
  ctx.restore();
}

function truncate(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}

function buildCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Fond dégradé sombre
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0a0a0a');
  grad.addColorStop(1, '#161616');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

  const stats = computeStats();
  const { current } = getLevel();

  // Eyebrow
  ctx.fillStyle = '#c9a84c';
  ctx.font = '600 30px Poppins, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MA COLLECTION VINYLE', W/2, 110);

  // Grand chiffre
  ctx.fillStyle = '#fff';
  ctx.font = '700 130px Poppins, sans-serif';
  ctx.fillText(`${stats.count}`, W/2, 250);
  ctx.fillStyle = '#888';
  ctx.font = '400 38px Poppins, sans-serif';
  ctx.fillText(stats.count > 1 ? 'vinyles' : 'vinyle', W/2, 305);

  // Valeur + niveau (deux pastilles)
  ctx.font = '600 32px Poppins, sans-serif';
  const valTxt = `≈ ${stats.totalValue} €`;
  const lvlTxt = `${current.icon} ${current.name}`;
  const pad = 28, gap = 24, ph = 64;
  const vw = ctx.measureText(valTxt).width + pad*2;
  const lw = ctx.measureText(lvlTxt).width + pad*2;
  const totalW = vw + gap + lw;
  let x0 = (W - totalW) / 2;
  const py = 350;
  // pastille valeur
  ctx.fillStyle = 'rgba(201,168,76,.14)';
  roundRect(ctx, x0, py, vw, ph, ph/2); ctx.fill();
  ctx.fillStyle = '#c9a84c'; ctx.textAlign = 'center';
  ctx.fillText(valTxt, x0 + vw/2, py + 43);
  // pastille niveau
  x0 += vw + gap;
  ctx.fillStyle = 'rgba(255,255,255,.06)';
  roundRect(ctx, x0, py, lw, ph, ph/2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText(lvlTxt, x0 + lw/2, py + 43);

  // Grille de mini-vinyles (jusqu'à 6 albums)
  const sample = ALBUMS.slice(0, 6);
  const cols = 3;
  const cellW = 300, cellH = 320;
  const gridW = cols * cellW;
  const startX = (W - gridW) / 2 + cellW/2;
  const startY = 560;
  sample.forEach((a, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const cx = startX + col * cellW;
    const cy = startY + row * cellH;
    drawMiniVinyl(ctx, cx, cy, 110, a);
    // textes
    ctx.fillStyle = '#fff';
    ctx.font = '600 26px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(truncate(ctx, a.title || '', cellW - 30), cx, cy + 150);
    ctx.fillStyle = '#c9a84c';
    ctx.font = '400 22px Poppins, sans-serif';
    ctx.fillText(truncate(ctx, a.artist || '', cellW - 30), cx, cy + 182);
  });

  // Footer
  ctx.fillStyle = '#fff';
  ctx.font = '700 34px Poppins, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('My Vinyl.Collector', W/2, H - 70);
  ctx.fillStyle = '#555';
  ctx.font = '400 24px Poppins, sans-serif';
  ctx.fillText('my-vinyl-collector.vercel.app', W/2, H - 32);

  return canvas;
}

export async function generateShareCard() {
  if (!ALBUMS.length) { toast.warn('Ajoute des vinyles d\'abord !'); return; }

  const canvas = buildCanvas();
  canvas.toBlob(async (blob) => {
    if (!blob) { toast.error('Échec de la génération'); return; }
    const file = new File([blob], 'ma-collection-vinyle.png', { type: 'image/png' });

    // 1) Partage natif (mobile) si disponible
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Ma collection vinyle' });
        return;
      } catch { /* annulé → on retombe sur le téléchargement */ }
    }
    // 2) Sinon : téléchargement
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'ma-collection-vinyle.png';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Image enregistrée !');
  }, 'image/png');
}
