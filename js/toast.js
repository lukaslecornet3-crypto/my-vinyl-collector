// ============================================================
// js/toast.js — Notifications discrètes + remplacement de confirm()
// API :
//   toast.success('Album ajouté')
//   toast.error('Erreur réseau')
//   toast.info('...')
//   toast.warn('...')
//   await toast.confirm('Supprimer ?')  → renvoie true/false
// ============================================================

const TOAST_DURATION = 3500;

// Container unique — créé à la demande
function getContainer() {
  let c = document.getElementById('toast-container');
  if (!c) {
    c = document.createElement('div');
    c.id = 'toast-container';
    c.setAttribute('role', 'status');
    c.setAttribute('aria-live', 'polite');
    document.body.appendChild(c);
  }
  return c;
}

function show(message, type = 'info', duration = TOAST_DURATION) {
  const container = getContainer();
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  container.appendChild(el);

  // Force le reflow pour l'animation d'entrée
  requestAnimationFrame(() => el.classList.add('toast-show'));

  const dismiss = () => {
    el.classList.remove('toast-show');
    el.classList.add('toast-hide');
    setTimeout(() => el.remove(), 250);
  };

  el.addEventListener('click', dismiss);
  if (duration > 0) setTimeout(dismiss, duration);

  return dismiss;
}

export const toast = {
  success: (m, d) => show(m, 'success', d),
  error:   (m, d) => show(m, 'error',   d ?? 5000),
  warn:    (m, d) => show(m, 'warn',    d),
  info:    (m, d) => show(m, 'info',    d),

  // Confirmation custom (remplace window.confirm)
  confirm(message) {
    return new Promise(resolve => {
      const container = getContainer();
      const el = document.createElement('div');
      el.className = 'toast toast-confirm';

      const msg = document.createElement('div');
      msg.className = 'toast-confirm-msg';
      msg.textContent = message;

      const actions = document.createElement('div');
      actions.className = 'toast-confirm-actions';

      const noBtn  = document.createElement('button');
      noBtn.className = 'toast-btn toast-btn-cancel';
      noBtn.textContent = 'Annuler';

      const yesBtn = document.createElement('button');
      yesBtn.className = 'toast-btn toast-btn-confirm';
      yesBtn.textContent = 'OK';

      actions.append(noBtn, yesBtn);
      el.append(msg, actions);
      container.appendChild(el);
      requestAnimationFrame(() => el.classList.add('toast-show'));

      const close = (answer) => {
        el.classList.remove('toast-show');
        el.classList.add('toast-hide');
        setTimeout(() => { el.remove(); resolve(answer); }, 250);
      };
      noBtn.onclick  = () => close(false);
      yesBtn.onclick = () => close(true);
      yesBtn.focus();
    });
  },
};
