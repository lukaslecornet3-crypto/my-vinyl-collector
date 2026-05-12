// ============================================================
// js/actions-menu.js — Menu déroulant "Plus" (Partager / Importer / Exporter)
// ============================================================

export function initActionsMenu() {
  const btn      = document.getElementById('moreActionsBtn');
  const dropdown = document.getElementById('moreActionsDropdown');
  if (!btn || !dropdown) return;

  function open()   { dropdown.classList.remove('hidden'); btn.setAttribute('aria-expanded', 'true');  }
  function close()  { dropdown.classList.add('hidden');    btn.setAttribute('aria-expanded', 'false'); }
  function toggle() { dropdown.classList.contains('hidden') ? open() : close(); }

  btn.addEventListener('click', e => {
    e.stopPropagation();
    toggle();
  });

  // Ferme au clic en dehors
  document.addEventListener('click', e => {
    if (!dropdown.contains(e.target) && e.target !== btn) close();
  });

  // Ferme avec Échap
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') close();
  });

  // Ferme après un clic sur un item (l'action elle-même reste gérée par son listener d'origine)
  dropdown.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', () => close());
  });
}
