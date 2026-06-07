// ============================================================
// lib/email.js — Envoi d'emails via Resend
// Nécessite la variable d'env RESEND_API_KEY (côté serveur Vercel)
// ============================================================

const FROM = 'My Vinyl Collector <onboarding@resend.dev>';

export function emailConfigured() {
  return !!process.env.RESEND_API_KEY;
}

async function send({ to, subject, html }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY manquant');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Resend failed (${res.status}): ${t}`);
  }
  return res.json();
}

// Email de réinitialisation de mot de passe
export function sendResetEmail(to, link) {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#080808;color:#fff;padding:32px;border-radius:12px">
      <h1 style="color:#c9a84c;font-size:20px;margin:0 0 16px">My Vinyl<span style="color:#c9a84c">.</span>Collector</h1>
      <p style="color:#ccc;line-height:1.6">Tu as demandé à réinitialiser ton mot de passe.</p>
      <p style="color:#ccc;line-height:1.6">Clique sur le bouton ci-dessous (valable 1 heure) :</p>
      <p style="text-align:center;margin:28px 0">
        <a href="${link}" style="background:#c9a84c;color:#0a0a0a;text-decoration:none;font-weight:bold;padding:12px 28px;border-radius:8px;display:inline-block">
          Réinitialiser mon mot de passe
        </a>
      </p>
      <p style="color:#888;font-size:13px;line-height:1.6">Si tu n'es pas à l'origine de cette demande, ignore simplement cet email — ton mot de passe reste inchangé.</p>
      <p style="color:#555;font-size:12px;word-break:break-all">Ou copie ce lien : ${link}</p>
    </div>`;
  return send({ to, subject: 'Réinitialise ton mot de passe — My Vinyl Collector', html });
}
