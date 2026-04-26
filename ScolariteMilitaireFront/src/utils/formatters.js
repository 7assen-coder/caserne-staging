export function formatDate(value) {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatName(eleve) {
  if (!eleve) return '';
  return `${eleve.nom?.toUpperCase() ?? ''} ${eleve.prenom ?? ''}`.trim();
}

export function initials(nom, prenom) {
  const a = (nom ?? '').charAt(0);
  const b = (prenom ?? '').charAt(0);
  return `${a}${b}`.toUpperCase() || '·';
}

export function percent(value, total) {
  if (!total) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}
