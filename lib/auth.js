// ============================================================
// lib/auth.js — Hashage de mots de passe + signature JWT + cookies
// ============================================================

import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

const COOKIE_NAME = 'mvc_session';
const EXPIRY_DAYS = 7;

// Clé secrète pour signer les JWT (à définir dans les env vars Vercel)
function getSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) {
    console.error('[auth] JWT_SECRET manquant dans les env vars');
    throw new Error('JWT_SECRET non configuré côté serveur');
  }
  if (s.length < 32) {
    console.error('[auth] JWT_SECRET trop court :', s.length, 'caractères');
    throw new Error('JWT_SECRET trop court (>= 32 caractères)');
  }
  return new TextEncoder().encode(s);
}

// ---- Mots de passe ----
export function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// ---- JWT ----
export async function signSession(email) {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRY_DAYS}d`)
    .sign(getSecret());
}

export async function verifySession(token) {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload;
  } catch {
    return null;
  }
}

// ---- Cookies ----
export function setSessionCookie(res, token) {
  const maxAge = EXPIRY_DAYS * 24 * 60 * 60;
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`
  );
}

export function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
  );
}

function readCookie(req, name) {
  const cookies = req.headers.cookie || '';
  const match = cookies.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// Retourne l'email connecté, ou null
export async function getCurrentUser(req) {
  const token = readCookie(req, COOKIE_NAME);
  if (!token) return null;
  const payload = await verifySession(token);
  return payload?.email || null;
}

// ---- Validation ----
export function validEmail(email) {
  return typeof email === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

export function validPassword(password) {
  return typeof password === 'string' && password.length >= 8 && password.length <= 200;
}
