// ============================================================
// swipe.js — Gestes tactiles (gauche/droite)
// ============================================================

export function addSwipe(el, onLeft, onRight) {
  let sx = 0, sy = 0;
  el.addEventListener('touchstart', e => {
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
  }, { passive:true });
  el.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    // Mouvement horizontal franc (> 40px) et plus horizontal que vertical
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)*1.5) {
      dx < 0 ? onLeft() : onRight();
    }
  }, { passive:true });
}
