// ============================================================
// js/cloud-sync.js — Lecture/écriture de la collection cloud
// Save debouncé pour éviter de spammer l'API à chaque modif
// ============================================================

let saveTimer = null;
const SAVE_DELAY_MS = 1200;

export async function loadCloudCollection() {
  try {
    const res = await fetch('/api/collection', { credentials: 'same-origin' });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data.collection) ? data.collection : null;
  } catch {
    return null;
  }
}

export async function saveCloudCollection(collection) {
  try {
    const res = await fetch('/api/collection', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collection }),
      credentials: 'same-origin',
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Debounce : on attend 1.2s sans modif avant d'envoyer au serveur
export function scheduleCloudSave(collection) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveCloudCollection([...collection]), SAVE_DELAY_MS);
}

// Force un save immédiat (au logout par exemple)
export async function flushCloudSave(collection) {
  clearTimeout(saveTimer);
  saveTimer = null;
  return saveCloudCollection([...collection]);
}
