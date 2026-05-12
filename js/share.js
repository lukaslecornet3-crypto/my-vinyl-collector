// ============================================================
// js/share.js — Appels API de partage côté client
// ============================================================

export async function getMyShareCode() {
  try {
    const res = await fetch('/api/share', { credentials: 'same-origin' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.code || null;
  } catch {
    return null;
  }
}

export async function enableShare() {
  const res = await fetch('/api/share', {
    method: 'POST',
    credentials: 'same-origin',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur');
  return data.code;
}

export async function disableShare() {
  const res = await fetch('/api/share', {
    method: 'DELETE',
    credentials: 'same-origin',
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error || 'Erreur');
  }
}

// Lecture publique (pour la vue /share/CODE)
export async function fetchSharedCollection(code) {
  const res = await fetch(`/api/share/${encodeURIComponent(code)}`);
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error || 'Lien invalide');
  }
  return res.json(); // { displayName, count, collection }
}

export function buildShareUrl(code) {
  return `${location.origin}/share/${code}`;
}
