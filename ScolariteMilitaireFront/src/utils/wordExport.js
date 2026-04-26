import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
  AlignmentType,
  convertInchesToTwip,
} from 'docx';
import { saveAs } from 'file-saver';
import { formatDate } from './formatters';
import { INSTITUTION } from '../data/institution';
import { getAnneeEntiereIrt, anneeDepuisCycle } from '../data/espProgrammeIrt';
import { getDecisionCode, DECISION_CODE_LABELS } from './gradeDecision';
import { enrichirModuleAvecReferenceEsp, departementCodeDepuisFiliere, formationUrl } from '../data/espFormationCatalog';

const DIRECTION = 'Direction de la scolarité';

function br(c = 1) {
  return Array.from({ length: c }, () => new Paragraph(''));
}

function docHeader() {
  return [
    new Paragraph({
      children: [new TextRun({ text: INSTITUTION.nomComplet, bold: true, size: 24 })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: DIRECTION, italics: true, size: 20 })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: `${INSTITUTION.adresse} · ${INSTITUTION.pays}`, size: 18, color: '666666' })],
      alignment: AlignmentType.CENTER,
    }),
  ];
}

function line(label, value) {
  return new Paragraph({
    spacing: { after: 60 },
    children: [
      new TextRun({ text: `${label} : `, bold: true, size: 22 }),
      new TextRun({ text: value ?? '—', size: 22 }),
    ],
  });
}

const cellBorders = {
  top: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
  left: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
  right: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
};

function cPara(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: 20, ...opts })],
  });
}

function cTab(text, size = 18) {
  return new Paragraph({ children: [new TextRun({ text, size })] });
}

/**
 * Lignes du tableau « offre de formation » (mêmes champs que la page Formation ESP : code, UE, pôle, volume…).
 */
function attestationTableRowsFromOffre(modules) {
  return (modules || []).map(
    (mod) =>
      new TableRow({
        children: [
          new TableCell({ borders: cellBorders, children: [cTab(mod.code, 16)], width: { size: 8, type: WidthType.PERCENTAGE } }),
          new TableCell({ borders: cellBorders, children: [cTab(mod.intitule, 16)], width: { size: 22, type: WidthType.PERCENTAGE } }),
          new TableCell({ borders: cellBorders, children: [cTab(mod.ue || '—', 16)], width: { size: 7, type: WidthType.PERCENTAGE } }),
          new TableCell({ borders: cellBorders, children: [cTab(mod.pole || '—', 16)], width: { size: 20, type: WidthType.PERCENTAGE } }),
          new TableCell({ borders: cellBorders, children: [cTab(String(mod.heuresTotal ?? '—'), 16)], width: { size: 5, type: WidthType.PERCENTAGE } }),
          new TableCell({ borders: cellBorders, children: [cTab(String(mod.cm ?? '—'), 16)], width: { size: 4, type: WidthType.PERCENTAGE } }),
          new TableCell({ borders: cellBorders, children: [cTab(String(mod.td ?? '—'), 16)], width: { size: 4, type: WidthType.PERCENTAGE } }),
          new TableCell({ borders: cellBorders, children: [cTab(String(mod.tp ?? '—'), 16)], width: { size: 4, type: WidthType.PERCENTAGE } }),
          new TableCell({ borders: cellBorders, children: [cTab(String(mod.credits ?? '—'), 16)], width: { size: 5, type: WidthType.PERCENTAGE } }),
        ],
      }),
  );
}

function headerRowAttestation() {
  const labels = ['Code', 'Intitulé du module', 'UE', 'Pôle', 'H', 'CM', 'TD', 'TP', 'ECTS'];
  const widths = [8, 22, 7, 20, 5, 4, 4, 4, 5];
  return new TableRow({
    tableHeader: true,
    children: labels.map(
      (label, i) =>
        new TableCell({
          borders: cellBorders,
          shading: { fill: 'E8EEF5' },
          width: { size: widths[i], type: WidthType.PERCENTAGE },
          children: [cPara(label, { bold: true, size: 16 })],
        }),
    ),
  });
}

/**
 * Attestation d’inscription / scolarité (document institutionnel, Word).
 */
export async function downloadAttestationScolarite(eleve) {
  const s = eleve.scolarite || {};
  const d = new Date();
  const dateRef = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  const doc = new Document({
    sections: [
      {
        properties: { page: { margin: { top: convertInchesToTwip(0.8), right: convertInchesToTwip(0.9), bottom: convertInchesToTwip(0.8), left: convertInchesToTwip(0.9) } } },
        children: [
          ...docHeader(),
          br(2),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'ATTESTATION DE SCOLARITÉ', bold: true, size: 28 })],
          }),
          br(1),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: `Établissement reconnu par l’État · Année universitaire en cours`, size: 18, italics: true, color: '555555' })],
          }),
          br(2),
          new Paragraph({
            children: [new TextRun({ text: 'Le directeur de la scolarité certifie que :', size: 22 })],
            spacing: { after: 120 },
          }),
          line("L’étudiant", `${eleve.prenom} ${eleve.nom}`),
          line("Nom d’usage / matricule", eleve.matricule),
          line('Né(e) le', formatDate(eleve.dateNaissance) || '—'),
          line('à', eleve.lieuNaissance || '—'),
          line('Filière / cycle', s.filiere || eleve.filiere),
          line(
            'Niveau',
            [s.niveau, s.semestreActuel].filter(Boolean).join(' — ') || '—',
          ),
          line('Compagnie & section', `${eleve.compagnie} · ${eleve.section}`),
          line("Statut d’inscription", eleve.statut === 'suspendu' ? 'Suspendu' : 'Actif'),
          br(1),
          new Paragraph({
            children: [
              new TextRun({ text: 'L’intéressé est régulièrement inscrit pour l’année en cours, sous réserve des décisions pédagogiques et disciplinaires. ', size: 22 }),
            ],
            spacing: { after: 120 },
            alignment: AlignmentType.JUSTIFIED,
          }),
          new Paragraph({ children: [new TextRun({ text: "La présente attestation est délivrée à l’intéressé pour servir et valoir ce que de droit.", size: 22 })], alignment: AlignmentType.JUSTIFIED }),
          br(3),
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Fait à ${INSTITUTION.adresse}, le ${dateRef}`, size: 22 })] }),
          br(3),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: 'Le Directeur de la scolarité', bold: true, size: 22 })],
          }),
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: '(Cachet & signature)', size: 18, italics: true, color: '888888' })] }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Attestation_scolarite_${(eleve.matricule || 'etudiant').replace(/\//g, '-')}.docx`);
}

/**
 * Attestation de parcours : contenu des modules = même structure que l’e-catalogue (page Formation) du département.
 * ex. IRT : https://www.esp.mr/formation/irt — pour GC, GM, etc. : /formation/gc, /formation/gm …
 */
export async function downloadAttestationParcoursIrt(eleve) {
  const annee = anneeDepuisCycle(eleve.cycle);
  const s = eleve.scolarite || {};
  const fil = s.filiere || eleve.filiere;
  const prog = getAnneeEntiereIrt(annee, fil);
  const dept = departementCodeDepuisFiliere(fil);
  const d = new Date();
  const dateRef = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const doc = new Document({
    sections: [
      {
        properties: { page: { margin: { top: convertInchesToTwip(0.6), right: convertInchesToTwip(0.55), bottom: convertInchesToTwip(0.6), left: convertInchesToTwip(0.55) } } },
        children: [
          ...docHeader(),
          br(1),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'ATTESTATION DE PARCOURS PÉDAGOGIQUE', bold: true, size: 28 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `Année de référence : ${annee}e année · Filière / département (offre de formation)`,
                size: 18,
                italics: true,
                color: '555555',
              }),
            ],
          }),
          br(1),
          line('Référence de l’offre (site ESP)', prog.sourceUrl),
          line('Établissement', INSTITUTION.nomComplet),
          line('Étudiant', `${eleve.prenom} ${eleve.nom}`),
          line('Matricule', eleve.matricule),
          line('Département / filière', fil || '—'),
          line('Niveau', eleve.cycle || '—'),
          br(1),
          new Paragraph({ children: [new TextRun({ text: 'Semestre 1 — modules (extrait de la page Formation, champs : code, UE, pôle, volume, CM / TD / TP, ECTS)', bold: true, size: 20 })], spacing: { after: 120 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRowAttestation(), ...attestationTableRowsFromOffre(prog.S1)],
          }),
          br(1),
          new Paragraph({ children: [new TextRun({ text: 'Semestre 2 — modules', bold: true, size: 20 })], spacing: { after: 120 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRowAttestation(), ...attestationTableRowsFromOffre(prog.S2)],
          }),
          br(1),
          line('Total crédits (indicatif sur l’année)', String(prog.totalCredits)),
          br(2),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "Les intitulés, volumes et crédits reproduisent le référentiel affiché sur le site (section Formation) pour le département concerné. Toute validation définitive relève de la scolarité et du règlement des études.",
                size: 20,
              }),
            ],
          }),
          br(3),
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Fait à ${INSTITUTION.adresse}, le ${dateRef}`, size: 22 })] }),
          br(2),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: INSTITUTION.signatureLibelle, bold: true, size: 22 })],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: `(${INSTITUTION.cachetMention})`, size: 18, italics: true, color: '888888' })],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Attestation_parcours_${dept}_${(eleve.matricule || 'etudiant').replace(/\//g, '-')}.docx`);
}

/**
 * Relevé de notes (relevé en ligne) : aligné sur l’e-catalogue Formation (code, UE, pôle, volume, CM/TD/TP) — pas de colonne mention.
 * Les lignes de notes sont enrichies par `enrichirModuleAvecReferenceEsp` (réf. IRT).
 */
export async function downloadReleveSemestre(eleve, semestreIndex = 0) {
  const releves = eleve.relevesSemestres;
  if (!releves?.length) {
    const blob = new Blob(['Relevé indisponible (données de démonstration incomplètes).'], { type: 'text/plain' });
    saveAs(blob, `releve_${eleve.matricule || 'x'}.txt`);
    return;
  }
  const block = releves[Math.min(semestreIndex, releves.length - 1)];
  const moy = block.moyenneGenerale;
  const creditT = block.creditTotal;
  const creditO = block.creditObtenu;
  const res = block.resultat;

  const moduleRows = (block.modules || []).map((raw) => {
    const m = enrichirModuleAvecReferenceEsp(raw);
    const dCode = getDecisionCode(raw);
    const hasVol = m.cm != null || m.td != null || m.tp != null;
    const cmtp = !hasVol ? '—' : `${m.cm ?? 0} / ${m.td ?? 0} / ${m.tp ?? 0}`;
    const libDec = (DECISION_CODE_LABELS[dCode] || '—').replace(/^Em — /, '');
    return new TableRow({
      children: [
        new TableCell({ borders: cellBorders, width: { size: 7, type: WidthType.PERCENTAGE }, children: [cTab(m.code, 16)] }),
        new TableCell({ borders: cellBorders, width: { size: 18, type: WidthType.PERCENTAGE }, children: [cTab(m.intitule, 16)] }),
        new TableCell({ borders: cellBorders, width: { size: 6, type: WidthType.PERCENTAGE }, children: [cTab(m.ue || '—', 16)] }),
        new TableCell({ borders: cellBorders, width: { size: 15, type: WidthType.PERCENTAGE }, children: [cTab(m.pole || '—', 16)] }),
        new TableCell({ borders: cellBorders, width: { size: 5, type: WidthType.PERCENTAGE }, children: [cTab(String(m.heuresTotal ?? '—'), 16)] }),
        new TableCell({ borders: cellBorders, width: { size: 8, type: WidthType.PERCENTAGE }, children: [cTab(cmtp, 16)] }),
        new TableCell({ borders: cellBorders, width: { size: 5, type: WidthType.PERCENTAGE }, children: [cTab(String(m.credit), 16)] }),
        new TableCell({ borders: cellBorders, width: { size: 5, type: WidthType.PERCENTAGE }, children: [cTab(String(m.note), 16)] }),
        new TableCell({ borders: cellBorders, width: { size: 4, type: WidthType.PERCENTAGE }, children: [cPara(dCode, { bold: true, size: 16, color: dCode === 'NV' || dCode === 'E' ? 'b45309' : '1a5c3a' })] }),
        new TableCell({ borders: cellBorders, width: { size: 12, type: WidthType.PERCENTAGE }, children: [cTab(libDec, 15)] }),
      ],
    });
  });

  const hdrLabels = [
    'Code',
    'Intitulé',
    'UE',
    'Pôle',
    'H',
    'CM / TD / TP',
    'ECTS',
    'Note/20',
    'Déc.',
    'Décision (Em)',
  ];
  const hdrWidths = [7, 18, 6, 15, 5, 8, 5, 5, 4, 12];
  const headerRow = new TableRow({
    tableHeader: true,
    children: hdrLabels.map(
      (label, i) =>
        new TableCell({
          borders: cellBorders,
          shading: { fill: 'E8EEF5' },
          width: { size: hdrWidths[i], type: WidthType.PERCENTAGE },
          children: [cPara(label, { bold: true, size: 15 })],
        }),
    ),
  });

  const d = new Date();
  const dateRef = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  const doc = new Document({
    sections: [
      {
        properties: { page: { margin: { top: convertInchesToTwip(0.6), right: convertInchesToTwip(0.7), bottom: convertInchesToTwip(0.6), left: convertInchesToTwip(0.7) } } },
        children: [
          ...docHeader(),
          br(1),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'RELEVÉ DE NOTES (RELEVÉ EN LIGNE)', bold: true, size: 26 })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: block.periode, size: 22, italics: true })] }),
          br(1),
          line('Étudiant', `${eleve.prenom} ${eleve.nom} (${eleve.nomAr || '—'})`),
          line('Matricule', eleve.matricule),
          line('Filière', sVal(eleve, 'filiere')),
          line('E-catalogue Formation (département)', formationUrl(departementCodeDepuisFiliere(sVal(eleve, 'filiere')))),
          new Paragraph({ spacing: { after: 120 } }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...moduleRows] }),
          br(1),
          line('Moyenne générale du semestre (sur 20)', moy),
          line('Crédits capitalisés', `${creditO} / ${creditT}`),
          line('Résultat d’année (semestre)', res),
          br(1),
          new Paragraph({
            children: [
              new TextRun({ text: 'Légende des codes : V = validé · NV = non validé · E = éliminatoire · VCI = compensation interne · VCE = compensation globale.', size: 16, color: '555555' }),
            ],
            alignment: AlignmentType.JUSTIFIED,
          }),
          br(1),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Le présent relevé ne vaut qu’en cas de validation conformément au règlement des études. Document non contractuel, établi à partir du système de scolarité.', size: 18, color: '555555' })] }),
          br(2),
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Fait à ${INSTITUTION.adresse}, le ${dateRef}`, size: 20 })] }),
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Le responsable pédagogique de la scolarité', bold: true, size: 20 })] }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const slug = (block.code || `S${semestreIndex + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_');
  saveAs(blob, `Releve_notes_${(eleve.matricule || 'x').replace(/\//g, '-')}_${slug}.docx`);
}

function sVal(eleve, k) {
  return eleve.scolarite?.[k] ?? eleve[k] ?? '—';
}
