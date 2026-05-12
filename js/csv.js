// ============================================================
// csv.js — Import / Export CSV (RFC 4180)
// ============================================================

import { ALBUMS, saveCollection } from './storage.js';
import { state } from './state.js';
import { COLORS } from './data.js';
import { applyFilters } from './search.js';

function csvEscape(v) {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

export function exportCSV() {
  const headers = ['titre','artiste','année','label','état','valeur','bas','moyen','haut','pistes','notes'];
  const rows = ALBUMS.map(a => [
    a.title, a.artist, a.year, a.label, a.condition, a.value,
    a.low, a.mid, a.high,
    (a.tracks || []).join(' | '),
    (a.notes || '').replace(/\r?\n/g, ' '),
  ].map(csvEscape).join(','));

  // CRLF = RFC 4180 ; BOM utf-8 (﻿) pour qu'Excel ouvre proprement
  const csv  = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'my-vinyl-collection.csv';
  link.click();
  URL.revokeObjectURL(url);
}

// Parser CSV RFC 4180 : gère virgules dans guillemets, "" → ", CRLF/LF
export function parseCSV(text) {
  const rows = [];
  let row = [], cur = '', inQ = false;
  const str = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (inQ) {
      if (ch === '"' && str[i+1] === '"') { cur += '"'; i++; }   // "" échappé
      else if (ch === '"') { inQ = false; }
      else { cur += ch; }
    } else {
      if (ch === '"')        inQ = true;
      else if (ch === ',')   { row.push(cur); cur = ''; }
      else if (ch === '\n')  { row.push(cur); rows.push(row); row = []; cur = ''; }
      else                   cur += ch;
    }
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

function randomColor() { return COLORS[Math.floor(Math.random() * COLORS.length)]; }

export function initCSV() {
  document.getElementById('exportBtn').onclick = exportCSV;
  document.getElementById('importBtn').onclick = () => document.getElementById('importFile').click();

  document.getElementById('importFile').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const rows = parseCSV(ev.target.result);
        const imported = rows.slice(1).map(cols => {
          const c1 = randomColor(), c2 = randomColor();
          return {
            title:     cols[0] || '',
            artist:    cols[1] || '',
            year:      parseInt(cols[2]) || '',
            label:     cols[3] || '',
            condition: cols[4] || '',
            value:     cols[5] || '',
            low:       cols[6] || '',
            mid:       cols[7] || '',
            high:      cols[8] || '',
            tracks:    cols[9] ? cols[9].split(' | ') : [],
            durations: [],
            notes:     cols[10] || '',
            color:     c1.color,
            rim:       c2.rim,
            coverUrl:  '',
          };
        }).filter(a => a.title.trim());

        if (!imported.length) { alert('Aucun album trouvé.'); return; }
        if (!confirm(`Importer ${imported.length} album(s) ?`)) return;

        ALBUMS.push(...imported);
        saveCollection();
        state.filteredAlbums = [...ALBUMS];
        applyFilters();
        alert(`✓ ${imported.length} album(s) importé(s) !`);
      } catch (err) {
        alert('Erreur CSV.');
        console.error(err);
      }
      e.target.value = '';
    };
    reader.readAsText(file, 'UTF-8');
  });
}
