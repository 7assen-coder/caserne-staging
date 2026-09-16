import i18n from '../i18n';

export function activeBcp47() {
  return i18n.language?.startsWith('ar') ? 'ar' : 'fr-FR';
}

export function formatDate(value, options) {
  if (value == null || value === '') return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat(activeBcp47(), options ?? { dateStyle: 'medium' }).format(d);
}

export function formatNumber(value, options) {
  if (value == null || value === '') return '';
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return String(value);
  return new Intl.NumberFormat(activeBcp47(), options).format(n);
}

export function localeCompare(a, b) {
  return String(a ?? '').localeCompare(String(b ?? ''), activeBcp47());
}
