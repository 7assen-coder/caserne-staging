export const FORMATION_SITE_BASE = 'https://www.esp.mr/formation';

export function formationUrl(codeDept) {
  const c = String(codeDept || 'irt')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  return `${FORMATION_SITE_BASE}/${c || 'irt'}`;
}

export function departementCodeDepuisFiliere(filiereLabel) {
  if (!filiereLabel) return 'irt';
  const s = String(filiereLabel).trim();
  const head = s.split(/\s*[—–-]/)[0]?.trim().toLowerCase() || '';
  const compact = head.replace(/[^a-z0-9]/g, '');
  if (compact.includes('gc')) return 'gc';
  const m = s.match(/^([A-Za-z]{2,4})\s*[—–-]/);
  if (m) return m[1].toLowerCase();
  const first = s.split(/\s/)[0]?.toLowerCase() || 'irt';
  if (['irt', 'gc', 'gm', 'ge', 'sid', 'mpg'].includes(first)) return first;
  return 'irt';
}

export const MODULES_ESP_IRT_S1 = [
  {
    code: 'HE12',
    intitule: 'Techniques de communications',
    credits: 2,
    heuresTotal: 24,
    ue: 'UE01',
    pole: 'Pôle Humanité et Entreprise',
    cm: 6,
    td: 18,
    tp: 0,
    semestre: 'S1',
  },
  {
    code: 'HE14',
    intitule: 'Projet Entreprenariat et Innovation',
    credits: 4,
    heuresTotal: 72,
    ue: 'UE02',
    pole: 'Pôle Humanité et Entreprise',
    cm: 9,
    td: 30,
    tp: 9,
    semestre: 'S1',
  },
  {
    code: 'IRT12',
    intitule: "Systèmes d'exploitation I",
    credits: 2,
    heuresTotal: 24,
    ue: 'UE05',
    pole: 'Pôle Compétences de Spécialité',
    cm: 8,
    td: 8,
    tp: 9,
    semestre: 'S1',
  },
  {
    code: 'ST12-M',
    intitule: 'Modélisation',
    credits: 2,
    heuresTotal: 24,
    ue: '—',
    pole: 'Sciences & Technologies (ST)',
    cm: 6,
    td: 18,
    tp: 0,
    semestre: 'S1',
  },
  {
    code: 'ST12-I',
    intitule: 'Informatique',
    credits: 3,
    heuresTotal: 48,
    ue: '—',
    pole: 'Sciences & Technologies (ST)',
    cm: 9,
    td: 30,
    tp: 9,
    semestre: 'S1',
  },
  {
    code: 'ST14',
    intitule: 'Recherche opérationnelle',
    credits: 3,
    heuresTotal: 25,
    ue: '—',
    pole: 'Sciences & Technologies (ST)',
    cm: 8,
    td: 8,
    tp: 9,
    semestre: 'S1',
  },
];

export const MODULES_ESP_IRT_S2 = [
  {
    code: 'HE21',
    intitule: 'Management de projet & qualité (transversal)',
    credits: 3,
    heuresTotal: 36,
    ue: 'UE10',
    pole: 'Pôle Humanité et Entreprise',
    cm: 6,
    td: 18,
    tp: 6,
    semestre: 'S2',
  },
  {
    code: 'IRT22',
    intitule: 'Bases de données & applications',
    credits: 4,
    heuresTotal: 48,
    ue: 'UE12',
    pole: 'Pôle Compétences de Spécialité',
    cm: 12,
    td: 18,
    tp: 18,
    semestre: 'S2',
  },
  {
    code: 'ST20',
    intitule: 'Statistique & probabilité (approfondissement)',
    credits: 3,
    heuresTotal: 36,
    ue: 'UE11',
    pole: 'Sciences & Technologies (ST)',
    cm: 9,
    td: 18,
    tp: 9,
    semestre: 'S2',
  },
];

function modulesStubAutreDept(codeDept) {
  const u = formationUrl(codeDept);
  return [
    {
      code: `${codeDept.toUpperCase()}-01`,
      intitule: `Grille du département — voir l’offre publiée (${u})`,
      credits: 0,
      heuresTotal: 0,
      ue: '—',
      pole: '—',
      cm: 0,
      td: 0,
      tp: 0,
      semestre: 'S1',
    },
  ];
}

export function getParcoursAnneeFormations(dept, annee) {
  const d = (dept || 'irt').toLowerCase();
  if (d === 'irt') {
    const S1 = MODULES_ESP_IRT_S1;
    const S2 = MODULES_ESP_IRT_S2;
    return {
      S1,
      S2,
      totalCredits: sumCredits(S1) + sumCredits(S2),
      annee,
      sourceUrl: formationUrl('irt'),
    };
  }
  const stub = modulesStubAutreDept(d);
  return {
    S1: stub,
    S2: [
      {
        code: `${d.toUpperCase()}-S2`,
        intitule: `Semestre 2 — consulter ${formationUrl(d)}`,
        credits: 0,
        heuresTotal: 0,
        ue: '—',
        pole: '—',
        cm: 0,
        td: 0,
        tp: 0,
        semestre: 'S2',
      },
    ],
    totalCredits: sumCredits(stub),
    annee,
    sourceUrl: formationUrl(d),
  };
}

function sumCredits(list) {
  return (list || []).reduce((s, m) => s + (Number(m.credits) || 0), 0);
}

export const REFERENTIEL_MODULES_IRT = [...MODULES_ESP_IRT_S1, ...MODULES_ESP_IRT_S2];

export function enrichirModuleAvecReferenceEsp(m) {
  const ref = REFERENTIEL_MODULES_IRT.find((r) => r.code === m.code) || null;
  if (!ref) return m;
  const cr = m.credit ?? m.credits ?? ref.credits;
  return {
    ...ref,
    ...m,
    intitule: m.intitule || ref.intitule,
    credits: cr,
    credit: cr,
  };
}
