/** Registre central des colonnes liste / export étudiants. */

export const COLONNE_GROUPES = {
  identite: 'Identité',
  scolarite: 'Scolarité',
  contact: 'Contact',
  militaire: 'Vie militaire',
  mobilite: 'Mobilité',
  sante: 'Santé',
  hebergement: 'Hébergement',
  mensurations: 'Mensurations & habillement',
};

const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('fr-FR');
};

const fmtSexe = (s) => (s === 'F' ? 'F' : 'M');

const fmtImc = (e) => {
  const p = e.sante?.poids;
  const t = e.sante?.tailleCm;
  if (e.sante?.imc) return String(e.sante.imc);
  if (!p || !t) return '';
  const pv = Number(String(p).replace(',', '.'));
  const tv = Number(String(t).replace(',', '.'));
  if (!pv || !tv) return '';
  const m = tv / 100;
  return (pv / (m * m)).toFixed(1);
};

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
  {
    id: 'poids',
    label: 'Poids (kg)',
    group: 'mensurations',
    getValue: (e) => e.sante?.poids ?? '',
    accessor: (e) => e.sante?.poids ?? '',
  },
  {
    id: 'tailleCm',
    label: 'Taille (cm)',
    group: 'mensurations',
    getValue: (e) => e.sante?.tailleCm ?? '',
    accessor: (e) => e.sante?.tailleCm ?? '',
  },
  {
    id: 'imc',
    label: 'IMC',
    group: 'mensurations',
    getValue: (e) => fmtImc(e),
    accessor: (e) => fmtImc(e),
  },
  {
    id: 'tourPoitrine',
    label: 'Tour poitrine (cm)',
    group: 'mensurations',
    getValue: (e) => e.dossierMilitaire?.tourPoitrine ?? '',
    accessor: (e) => e.dossierMilitaire?.tourPoitrine ?? '',
  },
  {
    id: 'tourCeinture',
    label: 'Tour ceinture (cm)',
    group: 'mensurations',
    getValue: (e) => e.dossierMilitaire?.tourCeinture ?? '',
    accessor: (e) => e.dossierMilitaire?.tourCeinture ?? '',
  },
  {
    id: 'tourTaille',
    label: 'Tour taille (cm)',
    group: 'mensurations',
    getValue: (e) => e.dossierMilitaire?.tourTaille ?? '',
    accessor: (e) => e.dossierMilitaire?.tourTaille ?? '',
  },
  {
    id: 'tourBassin',
    label: 'Tour bassin (cm)',
    group: 'mensurations',
    getValue: (e) => e.dossierMilitaire?.tourBassin ?? '',
    accessor: (e) => e.dossierMilitaire?.tourBassin ?? '',
  },
  {
    id: 'tourCou',
    label: 'Tour cou (cm)',
    group: 'mensurations',
    getValue: (e) => e.dossierMilitaire?.tourCou ?? '',
    accessor: (e) => e.dossierMilitaire?.tourCou ?? '',
  },
  {
    id: 'longueurManche',
    label: 'Longueur manche (cm)',
    group: 'mensurations',
    getValue: (e) => e.dossierMilitaire?.longueurManche ?? '',
    accessor: (e) => e.dossierMilitaire?.longueurManche ?? '',
  },
  {
    id: 'longueurDos',
    label: 'Longueur dos (cm)',
    group: 'mensurations',
    getValue: (e) => e.dossierMilitaire?.longueurDos ?? '',
    accessor: (e) => e.dossierMilitaire?.longueurDos ?? '',
  },
  {
    id: 'longueurCote',
    label: 'Longueur côté (cm)',
    group: 'mensurations',
    getValue: (e) => e.dossierMilitaire?.longueurCote ?? '',
    accessor: (e) => e.dossierMilitaire?.longueurCote ?? '',
  },
  {
    id: 'tailleChemise',
    label: 'Taille chemise',
    group: 'mensurations',
    getValue: (e) => e.habillement?.tailleChemise ?? '',
    accessor: (e) => e.habillement?.tailleChemise ?? '',
  },
  {
    id: 'taillePantalon',
    label: 'Taille pantalon',
    group: 'mensurations',
    getValue: (e) => e.habillement?.taillePantalon ?? '',
    accessor: (e) => e.habillement?.taillePantalon ?? '',
  },
  {
    id: 'pointure',
    label: 'Pointure',
    group: 'mensurations',
    getValue: (e) => e.habillement?.pointure ?? e.habillement?.rangers ?? '',
    accessor: (e) => e.habillement?.pointure ?? e.habillement?.rangers ?? '',
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

const MENSURATION_GROUP = 'mensurations';

/** Colonnes exportables hors mensurations (4.20). */
export function resolveColonnesExportSansMensurations(colonneIds) {
  return resolveColonnes(colonneIds).filter((c) => c.group !== MENSURATION_GROUP);
}

/**
 * Export transposé : libellés en colonne A, un étudiant par colonne (B, C…).
 * @returns {{ rowLabels: string[], studentHeaders: string[], grid: string[][] }}
 */
export function buildTransposedExportMatrix(eleves, colonneIds) {
  const cols = resolveColonnesExportSansMensurations(colonneIds);
  if (!cols.length) {
    return { rowLabels: [], studentHeaders: [], grid: [] };
  }

  const studentHeaders = eleves.map((e) => {
    const m = e.matricule ?? '';
    const n = `${e.nom ?? ''} ${e.prenom ?? ''}`.trim();
    return n ? `${n} (${m})` : String(m || 'Étudiant');
  });

  const rowLabels = cols.map((c) => c.label);
  const grid = cols.map((col) =>
    eleves.map((e) => {
      const v = col.getValue(e);
      return v == null || v === '' ? '' : String(v);
    }),
  );

  return { rowLabels, studentHeaders, grid, cols };
}
