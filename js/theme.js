// ============================================================
// theme.js — Gestion clair/sombre
// (le thème initial est appliqué inline dans <head> pour éviter le flash)
// ============================================================

import { loadStorage, saveStorage } from './storage.js';

let currentTheme = loadStorage('theme', 'dark');

const themeToggle = document.getElementById('themeToggle');
const themeIcon   = themeToggle.querySelector('.theme-icon');

export function applyTheme(t, save = true) {
  currentTheme = t;
  document.documentElement.setAttribute('data-theme', t);
  themeIcon.textContent = t === 'dark' ? '🌙' : '☀️';
  document.querySelector('meta[name="theme-color"]').content = t === 'dark' ? '#080808' : '#f5f3ef';
  if (save) saveStorage('theme', t);
}

export function initTheme() {
  applyTheme(currentTheme, false);
  themeToggle.onclick = () => applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
}
