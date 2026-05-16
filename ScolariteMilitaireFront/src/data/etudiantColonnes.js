/** Registre central des colonnes liste / export étudiants. */

export const COLONNE_GROUPES = {
  identite: 'Identité',
  scolarite: 'Scolarité',
  contact: 'Contact',
  militaire: 'Vie militaire',
  mobilite: 'Mobilité',
  sante: 'Santé',
  hebergement: 'Hébergement',
};

const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('fr-FR');
};

const fmtSexe = (s) => (s === 'F' ? 'F' : 'M');

const VOIE_LABELS = {
  1: 'Voie 1 — Interne',
  2: 'Voie 1 — Externe',
  3: 'Voie 2 — Interne',
  4: 'Voie 2 — Externe',
};

/** @type {import('./etudiantColonnes').EtudiantColonneDef[]} */
export const ETUDIANT_COLONNES = [
  {
    id: 'matricule',
    label: 'Matricule',
    group: 'identite',
    defaultVisible: true,
    simpleExport: true,
    sortable: true,
    getValue: (e) => e.matricule ?? '',
    accessor: (e) => e.matricule ?? '',
  },
  {
    id: 'nom',
    label: 'Nom & prénom',
    group: 'identite',
    defaultVisible: true,
    simpleExport: true,
    sortable: true,
    getValue: (e) => `${e.nom ?? ''} ${e.prenom ?? ''}`.trim(),
    accessor: (e) => `${e.nom ?? ''} ${e.prenom ?? ''}`.trim(),
    tableOnly: true,
  },
  {
    id: 'sexe',
    label: 'Sexe',
    group: 'identite',
    defaultVisible: false,
    simpleExport: true,
    sortable: true,
    getValue: (e) => fmtSexe(e.sexe),
    accessor: (e) => fmtSexe(e.sexe),
  },
  {
    id: 'nni',
    label: 'NNI',
    group: 'identite',
    defaultVisible: false,
    simpleExport: true,
    sortable: true,
    getValue: (e) => e.nni ?? '',
    accessor: (e) => e.nni ?? '',
  },
  {
    id: 'dateNaissance',
    label: 'Date de naissance',
    group: 'identite',
    getValue: (e) => fmtDate(e.dateNaissance),
    accessor: (e) => e.dateNaissance ?? '',
  },
  {
    id: 'lieuNaissance',
    label: 'Lieu de naissance',
    group: 'identite',
    getValue: (e) => e.lieuNaissance ?? '',
    accessor: (e) => e.lieuNaissance ?? '',
  },
  {
    id: 'nationalite',
    label: 'Nationalité',
    group: 'identite',
    getValue: (e) => e.nationalite ?? '',
    accessor: (e) => e.nationalite ?? '',
  },
  {
    id: 'departement',
    label: 'Département',
    group: 'scolarite',
    defaultVisible: true,
    simpleExport: true,
    sortable: true,
    getValue: (e) => e.scolarite?.filiere ?? e.filiere ?? '',
    accessor: (e) => e.scolarite?.filiere ?? e.filiere ?? '',
  },
  {
    id: 'niveau',
    label: 'Année (niveau)',
    group: 'scolarite',
    defaultVisible: true,
    simpleExport: true,
    sortable: true,
    getValue: (e) => e.scolarite?.niveau ?? '',
    accessor: (e) => e.scolarite?.niveau ?? '',
  },
  {
    id: 'semestre',
    label: 'Semestre',
    group: 'scolarite',
    getValue: (e) => e.scolarite?.semestreActuel ?? '',
    accessor: (e) => e.scolarite?.semestreActuel ?? '',
  },
  {
    id: 'parcours',
    label: 'Parcours',
    group: 'scolarite',
    getValue: (e) => e.scolarite?.parcours ?? '',
    accessor: (e) => e.scolarite?.parcours ?? '',
  },
  {
    id: 'voieAcces',
    label: "Voie d'accès",
    group: 'scolarite',
    getValue: (e) => VOIE_LABELS[e.voieAcces] ?? e.voieAcces ?? e.scolarite?.voieAcces ?? '',
    accessor: (e) => e.voieAcces ?? '',
  },
  {
    id: 'anneePremiere',
    label: 'Année 1ère inscription',
    group: 'scolarite',
    getValue: (e) => e.anneePremiereInscription ?? e.scolarite?.anneeUni1ere ?? '',
    accessor: (e) => e.anneePremiereInscription ?? '',
  },
  {
    id: 'emailPro',
    label: 'E-mail professionnel',
    group: 'contact',
    getValue: (e) => e.emailPro ?? e.contact?.emailPro ?? '',
    accessor: (e) => e.emailPro ?? '',
  },
  {
    id: 'emailPerso',
    label: 'E-mail personnel',
    group: 'contact',
    getValue: (e) => e.emailPerso ?? e.contact?.emailPerso ?? '',
    accessor: (e) => e.emailPerso ?? '',
  },
  {
    id: 'telephone',
    label: 'Téléphone',
    group: 'contact',
    getValue: (e) => e.tel1 ?? e.contact?.telephone ?? '',
    accessor: (e) => e.tel1 ?? '',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    group: 'contact',
    getValue: (e) => e.tel2Whatsapp ?? e.contact?.tel2 ?? '',
    accessor: (e) => e.tel2Whatsapp ?? '',
  },
  {
    id: 'adresse',
    label: 'Adresse',
    group: 'contact',
    getValue: (e) => e.adressePrimaire ?? e.contact?.adresse ?? '',
    accessor: (e) => e.adressePrimaire ?? '',
  },
  {
    id: 'compagnie',
    label: 'Compagnie',
    group: 'militaire',
    defaultVisible: true,
    sortable: true,
    getValue: (e) => e.dossierMilitaire?.compagnie ?? e.compagnie ?? '',
    accessor: (e) => e.dossierMilitaire?.compagnie ?? e.compagnie ?? '',
  },
  {
    id: 'section',
    label: 'Section',
    group: 'militaire',
    defaultVisible: true,
    sortable: true,
    getValue: (e) => e.dossierMilitaire?.section ?? e.section ?? '',
    accessor: (e) => e.dossierMilitaire?.section ?? e.section ?? '',
  },
  {
    id: 'sport',
    label: 'Sport pratiqué',
    group: 'militaire',
    getValue: (e) => e.dossierMilitaire?.sportPratique ?? '',
    accessor: (e) => e.dossierMilitaire?.sportPratique ?? '',
  },
  {
    id: 'mobiliteType',
    label: 'Type mobilité',
    group: 'mobilite',
    getValue: (e) => e.mobilite?.type ?? '',
    accessor: (e) => e.mobilite?.type ?? '',
  },
  {
    id: 'mobiliteEtab',
    label: 'Établissement mobilité',
    group: 'mobilite',
    getValue: (e) => e.mobilite?.etablissement ?? '',
    accessor: (e) => e.mobilite?.etablissement ?? '',
  },
  {
    id: 'mobiliteSpec',
    label: 'Spécialité mobilité',
    group: 'mobilite',
    getValue: (e) => e.mobilite?.specialite ?? '',
    accessor: (e) => e.mobilite?.specialite ?? '',
  },
  {
    id: 'groupeSanguin',
    label: 'Groupe sanguin',
    group: 'sante',
    getValue: (e) => e.sante?.groupeSanguin ?? '',
    accessor: (e) => e.sante?.groupeSanguin ?? '',
  },
  {
    id: 'hebergement',
    label: 'Hébergement',
    group: 'hebergement',
    getValue: (e) => {
      const h = e.hebergement;
      if (!h?.batiment) return '';
      return [h.batiment, h.etage, h.aile, h.chambre, h.lit].filter(Boolean).join(' · ');
    },
    accessor: (e) => e.hebergement?.batiment ?? '',
  },
];

export const COLONNES_BY_ID = Object.fromEntries(ETUDIANT_COLONNES.map((c) => [c.id, c]));

export const DEFAULT_VISIBLE_COLONNE_IDS = ETUDIANT_COLONNES.filter((c) => c.defaultVisible).map(
  (c) => c.id,
);

export const SIMPLE_EXPORT_COLONNE_IDS = ETUDIANT_COLONNES.filter((c) => c.simpleExport).map(
  (c) => c.id,
);

export const STORAGE_KEY_COLONNES = 'esp-etudiants-colonnes-visibles';

export function sanitizeColonneIds(ids) {
  const valid = new Set(ETUDIANT_COLONNES.map((c) => c.id));
  const cleaned = (ids || []).filter((id) => valid.has(id));
  if (!cleaned.length) return [...DEFAULT_VISIBLE_COLONNE_IDS];
  if (!cleaned.includes('matricule')) cleaned.unshift('matricule');
  return cleaned;
}

export function loadVisibleColonneIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COLONNES);
    if (!raw) return [...DEFAULT_VISIBLE_COLONNE_IDS];
    return sanitizeColonneIds(JSON.parse(raw));
  } catch {
    return [...DEFAULT_VISIBLE_COLONNE_IDS];
  }
}

export function saveVisibleColonneIds(ids) {
  localStorage.setItem(STORAGE_KEY_COLONNES, JSON.stringify(sanitizeColonneIds(ids)));
}

export function resolveColonnes(ids) {
  return sanitizeColonneIds(ids)
    .map((id) => COLONNES_BY_ID[id])
    .filter(Boolean);
}

/** Matrice [en-têtes], [lignes…] pour export. */
export function buildExportMatrix(eleves, colonneIds) {
  const cols = resolveColonnes(colonneIds);
  const headers = cols.map((c) => c.label);
  const rows = eleves.map((e) =>
    cols.map((c) => {
      const v = c.getValue(e);
      return v == null || v === '' ? '' : String(v);
    }),
  );
  return { headers, rows, cols };
}
