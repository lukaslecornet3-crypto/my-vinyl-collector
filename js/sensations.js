// ============================================================
// js/sensations.js — Haptique + crackle vinyle (Web Audio) + bouton son
//   - haptic(type) : vibration courte (Android ; no-op si non supporté, ex iOS)
//   - Crackle de vinyle généré en Web Audio (aucun fichier externe → CSP OK)
//   - Bouton flottant 🔊 pour activer/couper le son (préférence mémorisée)
//   - Le crackle ne joue que sur l'accueil et la page Écouter
// ============================================================

import { loadStorage, saveStorage } from './storage.js';

// ---------- HAPTIQUE ----------
let hapticsOn = loadStorage('hapticsOn', true);

const PATTERNS = {
  tick:    8,
  select:  5,
  success: [10, 40, 20],
  warn:    [20, 30, 25],
  delete:  [15, 30, 15],
};

export function haptic(type = 'tick') {
  if (!hapticsOn) return;
  if (!('vibrate' in navigator)) return; // iOS Safari : pas supporté → ignoré
  try { navigator.vibrate(PATTERNS[type] ?? 8); } catch {}
}

// ---------- CRACKLE VINYLE (Web Audio) ----------
let audioCtx = null;
let crackleSource = null;
let crackleGain = null;
let crackleBuffer = null;
let crackleActive = false;

let soundOn = loadStorage('soundOn', false); // OFF par défaut (pas de son surprise)
let currentPage = 'home';

function ensureContext() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}

// Génère ~4s de crackle (hiss de surface + pops aléatoires) en mémoire
function buildCrackleBuffer(ctx) {
  const seconds = 4;
  const rate = ctx.sampleRate;
  const len  = rate * seconds;
  const buf  = ctx.createBuffer(1, len, rate);
  const data = buf.getChannelData(0);

  // 1) souffle de surface très léger
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.012;

  // 2) pops aléatoires (les craquements caractéristiques)
  const pops = Math.floor(seconds * 32);
  for (let p = 0; p < pops; p++) {
    const start = Math.floor(Math.random() * len);
    const amp   = 0.12 + Math.random() * 0.45;
    const dur   = Math.floor(rate * (0.0005 + Math.random() * 0.0035));
    for (let i = 0; i < dur && start + i < len; i++) {
      const decay = 1 - i / dur;
      data[start + i] += (Math.random() * 2 - 1) * amp * decay;
    }
  }
  return buf;
}

function startCrackle() {
  const ctx = ensureContext();
  if (!ctx || crackleActive) return;

  if (!crackleBuffer) crackleBuffer = buildCrackleBuffer(ctx);

  crackleSource = ctx.createBufferSource();
  crackleSource.buffer = crackleBuffer;
  crackleSource.loop = true;

  // Filtre passe-bas → adoucit le bruit pour un rendu "chaud"
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 7000;

  crackleGain = ctx.createGain();
  crackleGain.gain.value = 0;

  crackleSource.connect(filter);
  filter.connect(crackleGain);
  crackleGain.connect(ctx.destination);
  crackleSource.start();

  // Fondu d'entrée vers un volume discret
  crackleGain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.6);
  crackleActive = true;
}

function stopCrackle() {
  if (!crackleActive || !audioCtx) return;
  const ctx = audioCtx;
  try {
    crackleGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    const src = crackleSource;
    setTimeout(() => { try { src.stop(); } catch {} }, 350);
  } catch {}
  crackleActive = false;
}

// Décide si le crackle doit jouer (son activé + page concernée + onglet visible)
function refreshCrackle() {
  const shouldPlay = soundOn && !document.hidden && (currentPage === 'home' || currentPage === 'ecouter');
  if (shouldPlay) startCrackle();
  else stopCrackle();
}

// ---------- BOUTON SON ----------
function buildSoundToggle() {
  const btn = document.createElement('button');
  btn.id = 'soundToggle';
  btn.className = 'sound-toggle' + (soundOn ? ' on' : '');
  btn.setAttribute('aria-label', 'Activer/couper le son du vinyle');
  btn.title = soundOn ? 'Couper le crépitement du vinyle' : 'Activer le crépitement du vinyle';
  btn.textContent = soundOn ? '🔊' : '🔇';
  document.body.appendChild(btn);

  btn.addEventListener('click', () => {
    soundOn = !soundOn;
    saveStorage('soundOn', soundOn);
    btn.classList.toggle('on', soundOn);
    btn.textContent = soundOn ? '🔊' : '🔇';
    btn.title = soundOn ? 'Couper le crépitement du vinyle' : 'Activer le crépitement du vinyle';
    haptic('select');
    ensureContext(); // le clic = geste utilisateur → débloque l'audio
    refreshCrackle();
  });
}

// ---------- INIT ----------
export function initSensations() {
  buildSoundToggle();

  // Réagit aux changements de page (event émis par navigation.js)
  window.addEventListener('mvc:pagechange', (e) => {
    currentPage = e.detail || 'home';
    refreshCrackle();
  });

  // Coupe le son quand l'onglet passe en arrière-plan
  document.addEventListener('visibilitychange', refreshCrackle);
}
