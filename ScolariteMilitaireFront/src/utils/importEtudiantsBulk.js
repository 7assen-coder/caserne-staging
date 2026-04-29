import { FILIERES, NIVEAUX_SCOLARITE, VOIES_ACCES_ETUDIANT } from './constants';

function stripAcc(s) {
  return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normKey(k) {
  return stripAcc(String(k ?? '').toLowerCase().trim()).replace(/[\s_-]+/g, '_');
}

function pick(row, ...keys) {
  const o = {};
  Object.keys(row).forEach((k) => {
    o[normKey(k)] = row[k];
  });
  for (const key of keys) {
    const nk = normKey(key);
    if (o[nk] != null && String(o[nk]).trim() !== '') return o[nk];
  }
  return '';
}

function toSexe(v) {
  const s = String(v ?? '').toLowerCase();
  if (s.startsWith('f')) return 'F';
  return 'H';
}

/**
 * Transforme une ligne import (Excel / CSV via XLSX) en payloads API.
 */
export function rowToImportPayload(raw) {
  const matricule = String(pick(raw, 'matricule', 'Matricule')).trim();
  const nom = String(pick(raw, 'nom_famille', 'nom', 'Nom', 'Nom_de_famille')).trim();
  const prenom = String(pick(raw, 'prenom', 'Prénom', 'prenoms')).trim();
  const nni = String(pick(raw, 'nni', 'NNI')).trim();
  const departement = String(pick(raw, 'departement', 'filiere', 'département', 'Departement')).trim();
  const niveau = String(pick(raw, 'niveau', 'annee', 'année', 'année_(niveau)')).trim();

  const emailPerso = String(pick(raw, 'email_perso', 'email', 'Email')).trim() || `${matricule || 'import'}@esp.mr`;
  const tel = String(pick(raw, 'telephone', 'tel', 'tel1', 'Téléphone')).trim() || '00000000';

  const payload = {
    matricule,
    nom,
    prenom,
    nni: nni || `IMPORT-${matricule}`,
    numeroBac: String(pick(raw, 'num_bac', 'bac', 'Num_bac')).trim() || '—',
    sexe: toSexe(pick(raw, 'sexe', 'Sexe')),
    dateNaissance: String(pick(raw, 'date_naissance', 'date_naissance_', 'naissance')).trim() || '2000-01-01',
    lieuNaissance: String(pick(raw, 'lieu_naissance', 'lieu')).trim() || '—',
    nationalite: String(pick(raw, 'nationalite', 'nationalité')).trim() || '—',
    categorieBac: String(pick(raw, 'categorie_bac')).trim() || 'National',
    serieBac: String(pick(raw, 'serie_bac', 'serie')).trim() || '—',
    moyenneBac: String(pick(raw, 'moyenne_bac', 'moyenne')).trim() || '10',
    ecoleBac: String(pick(raw, 'ecole_bac')).trim() || '—',
    anneePremiereInscription: String(pick(raw, 'annee_premiere_inscription')).trim() || '2024-2025',
    datePremiereInscription: String(pick(raw, 'date_premiere_inscription')).trim() || '2024-09-01',
    residentAvecParents: 'Oui',
    compteBankily: '',
    scolarite: {
      departement: departement || FILIERES[0],
      filiere: departement || FILIERES[0],
      niveau: niveau || NIVEAUX_SCOLARITE[0],
      semestreActuel: String(pick(raw, 'semestre')).trim() || 'S1',
      voieAcces: VOIES_ACCES_ETUDIANT[0]?.value ?? 'Voix 1',
      diplomeAcces: String(pick(raw, 'diplome_acces')).trim() || '—',
      etablissementPremierCycle: String(pick(raw, 'etablissement')).trim() || '—',
      anneeUni1ere: String(pick(raw, 'annee_uni')).trim() || '2024-2025',
      donneesSemestres: '',
      diplome: '',
      etablissementEchange: '',
      etablissementDoubleDiplome: '',
      specialiteMobilite: '',
      parcours: '',
    },
    contact: {
      emailPerso,
      emailPro: emailPerso,
      telephone: tel,
      tel2: '',
      adresse: String(pick(raw, 'adresse_primaire', 'adresse')).trim() || 'À compléter',
      adresseSecondaire: '',
    },
    parents: {
      prenomPere: '',
      fonctionPere: '',
      prenomMere: '',
      nomMere: '',
      fonctionMere: '',
    },
  };

  return {
    payload,
    departement: departement || FILIERES[0],
    niveau: niveau || NIVEAUX_SCOLARITE[0],
  };
}

export async function downloadExcelImportTemplate() {
  const XLSX = await import('xlsx');
  const headers = [
    'matricule',
    'nom_famille',
    'prenom',
    'nni',
    'sexe',
    'date_naissance',
    'lieu_naissance',
    'nationalite',
    'departement',
    'niveau',
    'email_perso',
    'telephone',
  ];
  const example = [
    'ESP-DEMO-001',
    'NomExemple',
    'PrenomExemple',
    '12345678',
    'H',
    '2003-06-15',
    'Nouakchott',
    'MR',
    FILIERES[0],
    NIVEAUX_SCOLARITE[0],
    'import.demo@esp.mr',
    '33123456',
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Etudiants');
  XLSX.writeFile(wb, `modele-import-etudiants-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function downloadWordImportTemplate() {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    BorderStyle,
    PageOrientation,
    TableLayoutType,
    VerticalAlignTable,
    convertMillimetersToTwip,
  } = await import('docx');
  const { saveAs } = await import('file-saver');

  const hdr = [
    'matricule',
    'nom_famille',
    'prenom',
    'nni',
    'sexe',
    'date_naissance',
    'lieu_naissance',
    'nationalite',
    'departement',
    'niveau',
    'email_perso',
    'telephone',
  ];

  const border = {
    top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
  };

  const demoValues = [
    'ESP-DEMO-001',
    'NomExemple',
    'PrenomExemple',
    '12345678',
    'H',
    '2003-06-15',
    'Nouakchott',
    'MR',
    FILIERES[0],
    NIVEAUX_SCOLARITE[0],
    'import.demo@esp.mr',
    '33123456',
  ];

  /** Largeur utile approximative du tableau sur une page paysage A4 (évite colonnes ultra-étroites). */
  const tableTotalTwips = convertMillimetersToTwip(248);
  const n = hdr.length;
  const baseColTwips = Math.floor(tableTotalTwips / n);
  const remainder = tableTotalTwips - baseColTwips * n;
  const columnWidths = hdr.map((_, i) => baseColTwips + (i < remainder ? 1 : 0));

  const mkCell = (text, bold, widthTwips) =>
    new TableCell({
      borders: border,
      verticalAlign: VerticalAlignTable.CENTER,
      width: { size: widthTwips, type: WidthType.DXA },
      children: [
        new Paragraph({
          spacing: { before: 40, after: 40 },
          children: [new TextRun({ text: String(text), bold, size: 16 })],
        }),
      ],
    });

  const headerRow = new TableRow({
    tableHeader: true,
    children: hdr.map((h, i) => mkCell(h, true, columnWidths[i])),
  });
  const demoRow = new TableRow({
    children: demoValues.map((v, i) => mkCell(v, false, columnWidths[i])),
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.LANDSCAPE,
              width: convertMillimetersToTwip(297),
              height: convertMillimetersToTwip(210),
            },
          },
        },
        children: [
          new Paragraph({
            spacing: { after: 160 },
            children: [
              new TextRun({
                text: 'Modèle import étudiants — ESP',
                bold: true,
                size: 32,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text:
                  'Une ligne par étudiant. Ne pas modifier la première ligne. Supprimer la ligne d’exemple avant import.',
                italics: true,
                size: 18,
              }),
            ],
          }),
          new Table({
            layout: TableLayoutType.FIXED,
            width: { size: 100, type: WidthType.PERCENTAGE },
            columnWidths,
            rows: [headerRow, demoRow],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `modele-import-etudiants-word-${new Date().toISOString().slice(0, 10)}.docx`);
}

/**
 * Extrait les lignes du premier tableau d’un fichier Word (.docx) converti en HTML.
 */
export async function parseWordDocxTableRows(arrayBuffer) {
  const mammoth = await import('mammoth');
  const { value } = await mammoth.convertToHtml({ arrayBuffer });
  const dom = new DOMParser().parseFromString(value, 'text/html');
  const table = dom.querySelector('table');
  if (!table) {
    throw new Error('Aucun tableau détecté dans le fichier Word.');
  }
  const trs = [...table.rows];
  if (trs.length < 2) {
    throw new Error('Le tableau doit contenir une ligne d’en-tête et au moins une ligne de données.');
  }
  const headers = [...trs[0].cells].map((c) => c.textContent.trim());
  const rows = [];
  for (let i = 1; i < trs.length; i++) {
    const cells = [...trs[i].cells];
    const obj = {};
    headers.forEach((h, j) => {
      obj[h || `col_${j}`] = cells[j]?.textContent?.trim() ?? '';
    });
    rows.push(obj);
  }
  return rows;
}

export async function runBulkImport(rowsObjects, eleveService, onProgress) {
  const errors = [];
  let ok = 0;
  for (let idx = 0; idx < rowsObjects.length; idx++) {
    const raw = rowsObjects[idx];
    try {
      const { payload } = rowToImportPayload(raw);
      if (!payload.matricule || !payload.nom || !payload.prenom) {
        throw new Error('Matricule, nom et prénom obligatoires.');
      }
      const created = await eleveService.createEleve(payload);
      await eleveService.createDossierAcademique(created.id, payload);
      ok += 1;
      onProgress?.({ ok, row: idx + 1, total: rowsObjects.length });
    } catch (e) {
      errors.push({
        ligne: idx + 2,
        message: e?.response?.data?.detail ?? e?.message ?? String(e),
      });
    }
  }
  return { ok, errors };
}
