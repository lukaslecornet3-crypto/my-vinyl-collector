// ============================================================
// loop.js — Boucle requestAnimationFrame unique pour tous les canvas
// ============================================================

import { drawVinyl } from './canvas.js';

// Canvas "fixes" de l'app (un par page + modals)
export const CV = {
  hero: { el:null, ctx:null, album:null, angle:0, speed:.004, label:.33, active:true  },
  col:  { el:null, ctx:null, album:null, angle:0, speed:.005, label:.33, active:false },
  val:  { el:null, ctx:null, album:null, angle:0, speed:.005, label:.35, active:false },
  eco:  { el:null, ctx:null, album:null, angle:0, speed:.006, label:.35, active:false },
  prev: { el:null, ctx:null, album:null, angle:0, speed:.01,  label:.38, active:false },
  det:  { el:null, ctx:null, album:null, angle:0, speed:.004, label:.35, active:false },
};

// Canvas de la grille (créés dynamiquement)
export const gridCanvases = [];

let rafId = null;
let tabVisible = !document.hidden;

document.addEventListener('visibilitychange', () => {
  tabVisible = !document.hidden;
  tabVisible ? startLoop() : stopLoop();
});

export function startLoop() {
  if (!rafId) rafId = requestAnimationFrame(animLoop);
}

export function stopLoop() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
}

export function isLoopRunning() {
  return rafId !== null;
}

function animLoop() {
  if (!tabVisible) { rafId = null; return; }

  for (const k in CV) {
    const c = CV[k];
    if (!c.active || !c.el || !c.album) continue;
    c.angle += c.speed;
    drawVinyl(c.ctx, c.el.width, c.album, c.angle, c.label);
  }
  // Grille : on n'anime que ce qui est visible à l'écran (IntersectionObserver)
  for (const gc of gridCanvases) {
    if (!gc.visible) continue;
    gc.angle += .003;
    drawVinyl(gc.ctx, gc.el.width, gc.album, gc.angle, .35);
  }
  rafId = requestAnimationFrame(animLoop);
}

export function initCV(key, id) {
  const c = CV[key];
  c.el  = document.getElementById(id);
  c.ctx = c.el?.getContext('2d') || null;
}
