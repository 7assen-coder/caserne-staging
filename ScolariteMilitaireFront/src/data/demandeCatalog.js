/** Catalogue des types de demandes — frontend-only. */

export const DEMANDE_NATURES = [
  { value: 'permission_sortie', label: 'Permission de sortie', codePrefix: 'PS' },
  { value: 'autorisation_sortie', label: 'Autorisation de sortie', codePrefix: 'AS' },
  { value: 'demande_document', label: 'Demande de document', codePrefix: 'DOC' },
  { value: 'demande_stage', label: 'Demande de stage', codePrefix: 'STG' },
  { value: 'divers', label: 'Divers', codePrefix: 'DIV' },
];

export const DEMANDE_STATUTS = [
  { value: 'en_cours', label: 'En cours' },
  { value: 'acceptee', label: 'Acceptée' },
  { value: 'refusee', label: 'Refusée' },
  { value: 'annulee', label: 'Annulée' },
];

export function demandeNatureLabel(value) {
  return DEMANDE_NATURES.find((n) => n.value === value)?.label ?? value ?? '—';
}

export function demandeStatutLabel(value) {
  return DEMANDE_STATUTS.find((s) => s.value === value)?.label ?? value ?? '—';
}

export function buildDemandeCode(natureValue, seq = 1) {
  const nature = DEMANDE_NATURES.find((n) => n.value === natureValue);
  const prefix = nature?.codePrefix ?? 'DEM';
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(seq).padStart(3, '0')}`;
}

export function nextDemandeSeq(existingItems = [], natureValue) {
  const prefix = DEMANDE_NATURES.find((n) => n.value === natureValue)?.codePrefix ?? 'DEM';
  const year = new Date().getFullYear();
  const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  let max = 0;
  existingItems.forEach((item) => {
    const m = String(item.code ?? '').match(pattern);
    if (m) max = Math.max(max, Number(m[1]));
  });
  return max + 1;
}
