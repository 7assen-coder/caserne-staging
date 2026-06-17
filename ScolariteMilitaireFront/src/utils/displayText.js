import { sanitizeExportText } from './etudiantsListExport';

/** Texte lisible partout (mobile, desktop, PDF) — remplace superscripts Unicode. */
export function formatDisplayText(value) {
  return sanitizeExportText(value);
}
