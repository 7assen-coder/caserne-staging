import { COMPAGNIES_OPTIONS, compagnieAttendueDepuisNiveau } from './etudiantOptions';

/** Montants par défaut par compagnie (MRU) — frontend-only. */
export const DROITS_DEFAULT_MONTANT = {
  '1re Compagnie': 2500,
  '2e Compagnie': 2800,
  '3e Compagnie': 3000,
};

export const DROITS_ETATS = [
  { value: 'percu', label: 'Perçu' },
  { value: 'non_percu', label: 'Non perçu' },
];

export const MOIS_OPTIONS = [
  { value: 1, label: 'Janvier' },
  { value: 2, label: 'Février' },
  { value: 3, label: 'Mars' },
  { value: 4, label: 'Avril' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Juin' },
  { value: 7, label: 'Juillet' },
  { value: 8, label: 'Août' },
  { value: 9, label: 'Septembre' },
  { value: 10, label: 'Octobre' },
  { value: 11, label: 'Novembre' },
  { value: 12, label: 'Décembre' },
];

export const DROITS_COMPAGNIES = COMPAGNIES_OPTIONS.filter((o) => o.value);

export const COMPAGNIE_NIVEAU_LABEL = {
  '1re Compagnie': '3e année',
  '2e Compagnie': '4e année',
  '3e Compagnie': '5e année',
};

export function droitsEtatLabel(value) {
  return DROITS_ETATS.find((e) => e.value === value)?.label ?? value ?? '—';
}

export function moisLabel(mois) {
  return MOIS_OPTIONS.find((m) => m.value === Number(mois))?.label ?? String(mois);
}

export function defaultMontantForCompagnie(compagnie) {
  return DROITS_DEFAULT_MONTANT[compagnie] ?? 2500;
}

export function buildDroitsBatchKey(annee, mois, compagnie) {
  return `${annee}-${mois}-${compagnie}`;
}

export function yearOptions(centerYear = new Date().getFullYear()) {
  return [centerYear - 1, centerYear, centerYear + 1].map((y) => ({
    value: y,
    label: String(y),
  }));
}

/** Résout la compagnie d'un élève (dossier militaire, niveau ou section). */
export function resolveEleveCompagnie(eleve) {
  const dm = eleve?.dossierMilitaire ?? {};
  const direct = String(dm.compagnie ?? eleve?.compagnie ?? '').trim();
  if (direct) return direct;

  const niveau = eleve?.scolarite?.niveau ?? eleve?.cycle ?? '';
  const fromNiveau = compagnieAttendueDepuisNiveau(niveau);
  if (fromNiveau) return fromNiveau;

  const section = String(dm.section ?? eleve?.section ?? '');
  const match = section.match(/Section\s*(\d)/i);
  if (match) {
    const idx = match[1];
    if (idx === '1') return '1re Compagnie';
    if (idx === '2') return '2e Compagnie';
    if (idx === '3') return '3e Compagnie';
  }
  return '';
}
