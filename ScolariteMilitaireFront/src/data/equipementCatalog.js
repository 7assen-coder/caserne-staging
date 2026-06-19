/**
 * Catalogue équipement ESP — codes lisibles :
 *   {ARTICLE}-Q{quantité}   ex. FORME-COMPLET-Q1, RANGERS-Q2
 *
 * En lisant le code seul : article + quantité remise.
 */

export const EQUIPEMENT_CATALOG = [
  {
    id: 'forme-complet',
    baseCode: 'FORME-COMPLET',
    type: 'Tenue militaire',
    label: 'Forme / uniforme complet',
    description:
      'Ensemble réglementaire complet : veste, pantalon, chemise, cravate et insignes',
    quantiteDefaut: 1,
  },
  {
    id: 'casquette',
    baseCode: 'CASQUETTE',
    type: 'Coiffure',
    label: 'Casquette',
    description: 'Casquette réglementaire ESP',
    quantiteDefaut: 1,
  },
  {
    id: 'rangers',
    baseCode: 'RANGERS',
    type: 'Chaussures',
    label: 'Rangers',
    description: 'Bottes de combat (rangers) réglementaires',
    quantiteDefaut: 1,
  },
  {
    id: 'tenue-sport',
    baseCode: 'TENUE-SPORT',
    type: 'Tenue sport',
    label: 'Tenue de sport',
    description: 'Ensemble sport réglementaire (haut + bas)',
    quantiteDefaut: 1,
  },
];

/** @deprecated Alias pour compatibilité interne */
export const EQUIPEMENT_TYPES = EQUIPEMENT_CATALOG.map((item) => ({
  code: item.baseCode,
  type: item.type,
  description: item.label,
  quantiteDefaut: item.quantiteDefaut,
}));

export const EQUIPEMENT_ETATS = [
  { value: 'en_usage', label: 'En usage' },
  { value: 'rendu', label: 'Rendu' },
];

export function equipementEtatLabel(etat) {
  return EQUIPEMENT_ETATS.find((e) => e.value === etat)?.label ?? etat ?? '—';
}

/** Construit le code final : ARTICLE-Q{n} */
export function buildEquipementCode(baseCode, quantite = 1) {
  const base = String(baseCode ?? '').trim().toUpperCase();
  const q = Math.max(1, Number(quantite) || 1);
  if (!base) return '';
  return `${base}-Q${q}`;
}

/** Extrait base et quantité d'un code ARTICLE-Q{n} (ou retourne le code tel quel). */
export function parseEquipementCode(code) {
  const raw = String(code ?? '').trim().toUpperCase();
  const match = raw.match(/^(.+)-Q(\d+)$/);
  if (!match) return { baseCode: raw, quantite: null, full: raw };
  return {
    baseCode: match[1],
    quantite: Number(match[2]),
    full: raw,
  };
}

export function findCatalogByBaseCode(baseCode) {
  const key = String(baseCode ?? '').trim().toUpperCase();
  return EQUIPEMENT_CATALOG.find((c) => c.baseCode === key) ?? null;
}

export function catalogLabel(item) {
  return item?.label ?? item?.description ?? '';
}
