export function sanitizeMrPhoneDigits(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '');
  return digits.replace(/^[^234]+/, '').slice(0, 8);
}

export function isValidMrPhone8(v) {
  return /^[234]\d{7}$/.test(String(v));
}

export function blockNonDigitKey(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const allowed = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'End', 'Home'];
  if (allowed.includes(e.key)) return;
  if (e.key.length === 1 && !/^\d$/.test(e.key)) e.preventDefault();
}
