import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from './saveAsFile.js';
import { apiPaths } from '../services/apiPaths';
import {
  sanctionNatureLabel,
  sanctionStatutLabel,
} from '../data/sanctionCatalog';
import { fetchEspLogoDataUrl, sanitizeExportText } from './etudiantsListExport';
import { APP_NAME } from '../data/institution';
import { buildSanctionDetailExportRows } from './sanctionStats';
import { apiList } from './opsApi';

const SYNTHESIS_COLUMNS = [
  { key: 'matricule', label: 'Matricule' },
  { key: 'nomComplet', label: 'Nom et prénom' },
  { key: 'departement', label: 'Département' },
  { key: 'niveau', label: 'Niveau' },
  { key: 'nbSanctions', label: 'Nb sanctions' },
  { key: 'enCours', label: 'En cours' },
  { key: 'derniere', label: 'Dernière sanction' },
];

function dateSuffix() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateFr(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return iso;
  }
}

function synthesisRows(students) {
  return students.map((s) => {
    const derniere = s.derniereDate
      ? `${formatDateFr(s.derniereDate)} · ${s.derniereNature || ''}`.trim()
      : '—';
    return {
      matricule: sanitizeExportText(s.matricule),
      nomComplet: sanitizeExportText(`${s.prenom ?? ''} ${s.nom ?? ''}`.trim()),
      departement: sanitizeExportText(s.departement),
      niveau: sanitizeExportText(s.niveau),
      nbSanctions: String(s.nbSanctions ?? 0),
      enCours: String(s.enCours ?? 0),
      derniere: sanitizeExportText(derniere),
    };
  });
}

async function fetchSanctionsMapped() {
  const raw = await apiList(apiPaths.sanctions.list);
  return raw.map((r) => ({
    id: r.id,
    eleveId: String(r.eleve),
    code: r.code ?? '',
    motif: r.motif ?? '',
    nature: r.nature ?? '',
    dateDebut: r.date_debut ?? '',
    dateFin: r.date_fin ?? '',
    statut: r.statut ?? 'en_cours',
    crPdf: r.cr_pdf ? { name: 'cr.pdf' } : null,
    pjPdf: r.pj_pdf ? { name: 'pj.pdf' } : null,
  }));
}

export async function exportSanctionSynthesisExcel(students, filenameBase = 'synthese-sanctions-esp') {
  const XLSX = await import('xlsx-js-style');
  const headers = SYNTHESIS_COLUMNS.map((c) => c.label);
  const body = synthesisRows(students).map((row) =>
    SYNTHESIS_COLUMNS.map((c) => row[c.key] ?? ''),
  );
  const ws = XLSX.utils.aoa_to_sheet([headers, ...body]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Synthèse');
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(
    new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `${filenameBase}-${dateSuffix()}.xlsx`,
  );
}

export async function exportSanctionDetailExcel(students, filenameBase = 'registre-sanctions-esp') {
  const XLSX = await import('xlsx-js-style');
  const headers = [
    'Matricule',
    'Nom et prénom',
    'Département',
    'Niveau',
    'Code',
    'Motif',
    'Nature',
    'Date début',
    'Date fin',
    'Statut',
    'CR PDF',
    'PJ PDF',
  ];
  const sanctions = await fetchSanctionsMapped();
  const body = buildSanctionDetailExportRows(students, sanctions).map(({ sanction: item, student: s }) => [
    sanitizeExportText(s.matricule),
    sanitizeExportText(`${s.prenom ?? ''} ${s.nom ?? ''}`.trim()),
    sanitizeExportText(s.departement),
    sanitizeExportText(s.niveau),
    sanitizeExportText(item.code),
    sanitizeExportText(item.motif),
    sanctionNatureLabel(item.nature),
    item.dateDebut ?? '',
    item.dateFin ?? '',
    sanctionStatutLabel(item.statut),
    item.crPdf?.name ? 'Oui' : 'Non',
    item.pjPdf?.name ? 'Oui' : 'Non',
  ]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...body]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Registre');
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(
    new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `${filenameBase}-${dateSuffix()}.xlsx`,
  );
}

export async function exportSanctionSynthesisPdf(
  students,
  { filenameBase = 'synthese-sanctions-esp', filtersLabel = '' } = {},
) {
  const logo = await fetchEspLogoDataUrl();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  doc.addImage(logo, 'PNG', 14, 10, 22, 22);
  doc.setFontSize(14);
  doc.setTextColor(27, 42, 74);
  doc.text(APP_NAME, 40, 18);
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text(`Synthèse sanctions — ${APP_NAME}`, 40, 26);
  doc.setFontSize(9);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 40, 32);
  if (filtersLabel) doc.text(`Filtres : ${filtersLabel}`, 40, 38);

  const headers = SYNTHESIS_COLUMNS.map((c) => c.label);
  const body = synthesisRows(students).map((row) =>
    SYNTHESIS_COLUMNS.map((c) => row[c.key] ?? ''),
  );

  autoTable(doc, {
    startY: filtersLabel ? 42 : 38,
    head: [headers],
    body,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [27, 42, 74], textColor: 255 },
    margin: { left: 14, right: 14 },
    tableWidth: pageW - 28,
  });

  doc.save(`${filenameBase}-${dateSuffix()}.pdf`);
}

export async function exportSanctionDetailPdf(
  students,
  { filenameBase = 'registre-sanctions-esp', filtersLabel = '' } = {},
) {
  const logo = await fetchEspLogoDataUrl();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  doc.addImage(logo, 'PNG', 14, 10, 22, 22);
  doc.setFontSize(14);
  doc.setTextColor(27, 42, 74);
  doc.text(APP_NAME, 40, 18);
  doc.setFontSize(11);
  doc.text(`Registre détaillé sanctions — ${APP_NAME}`, 40, 26);
  doc.setFontSize(9);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 40, 32);
  if (filtersLabel) doc.text(`Filtres : ${filtersLabel}`, 40, 38);

  const headers = [
    'Matricule',
    'Nom',
    'Dépt',
    'Code',
    'Motif',
    'Nature',
    'Début',
    'Fin',
    'Statut',
  ];
  const sanctions = await fetchSanctionsMapped();
  const body = buildSanctionDetailExportRows(students, sanctions).map(({ sanction: item, student: s }) => [
    sanitizeExportText(s.matricule),
    sanitizeExportText(`${s.prenom ?? ''} ${s.nom ?? ''}`.trim()),
    sanitizeExportText(s.departement),
    sanitizeExportText(item.code),
    sanitizeExportText(item.motif),
    sanctionNatureLabel(item.nature),
    formatDateFr(item.dateDebut),
    formatDateFr(item.dateFin),
    sanctionStatutLabel(item.statut),
  ]);

  autoTable(doc, {
    startY: filtersLabel ? 42 : 38,
    head: [headers],
    body: body.length ? body : [['—', '—', '—', '—', 'Aucune sanction', '—', '—', '—', '—']],
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [27, 42, 74], textColor: 255 },
    margin: { left: 14, right: 14 },
    tableWidth: pageW - 28,
  });

  doc.save(`${filenameBase}-${dateSuffix()}.pdf`);
}
