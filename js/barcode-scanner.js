// ============================================================
// js/barcode-scanner.js — Scan de code-barres via la caméra (ZXing)
// Compatible Safari iOS (ZXing est du JS pur, pas de WASM)
// La lib est chargée à la demande pour ne pas alourdir le 1er chargement.
// ============================================================

let zxingPromise = null;
let codeReader = null;

// Charge ZXing une seule fois (lazy)
function loadZXing() {
  if (zxingPromise) return zxingPromise;
  zxingPromise = new Promise((resolve, reject) => {
    if (window.ZXing) return resolve(window.ZXing);
    const s = document.createElement('script');
    s.src = '/vendor/zxing.min.js';
    s.onload  = () => resolve(window.ZXing);
    s.onerror = () => reject(new Error('Impossible de charger le scanner'));
    document.head.appendChild(s);
  });
  return zxingPromise;
}

// Démarre la lecture sur l'élément <video> fourni.
// onResult(barcode) est appelé au premier code-barres lu.
export async function startScanner(videoEl, onResult, onError) {
  let ZXing;
  try {
    ZXing = await loadZXing();
  } catch (e) {
    onError?.(e);
    return;
  }

  try {
    codeReader = new ZXing.BrowserMultiFormatReader();
    // facingMode: environment → caméra arrière sur mobile
    const constraints = { video: { facingMode: { ideal: 'environment' } } };

    await codeReader.decodeFromConstraints(constraints, videoEl, (result, err) => {
      if (result) {
        const code = result.getText ? result.getText() : result.text;
        if (code) onResult?.(code);
      }
      // err est normal entre 2 frames (NotFoundException) → on l'ignore
    });
  } catch (e) {
    // Souvent : permission caméra refusée, ou pas de caméra
    onError?.(e);
  }
}

export function stopScanner() {
  if (codeReader) {
    try { codeReader.reset(); } catch {}
    codeReader = null;
  }
}
