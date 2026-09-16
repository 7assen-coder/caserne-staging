import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from './saveAsFile.js';
import { equipementEtatLabel } from '../data/equipementCatalog';
import { fetchEspLogoDataUrl, sanitizeExportText } from './etudiantsListExport';
import { APP_NAME } from '../data/institution';
import { buildDetailExportRows } from './equipementStats';
import { apiList } from './opsApi';
import { apiPaths } from '../services/apiPaths';

const SYNTHESIS_COLUMNS = [
  { key: 'matricule', label: 'Matricule' },
  { key: 'nomComplet', label: 'Nom et prénom' },
  { key: 'section', label: 'Section' },
  { key: 'nbItems', label: 'Nb items' },
  { key: 'enUsage', label: 'En usage' },
  { key: 'rendu', label: 'Rendu' },
];


async function fetchEquipementMapped() {
  const rawItems = await apiList(apiPaths.equipements.list);
  return rawItems.map((raw) => ({
    id: raw.id,
    eleveId: String(raw.eleve),
    code: raw.code ?? '',
    type: raw.nature ?? '',
    description: raw.description ?? '',
    quantite: raw.quantite ?? 1,
    dateRemise: raw.date_remise ?? '',
    etat: raw.etat === 'rendu' ? 'rendu' : 'en_usage',
    dateRetour: raw.date_retour ?? null,
    pdfAttachment: raw.pdf ? { name: 'piece.pdf' } : null,
  }));
}

function dateSuffix() {
  return new Date().toISOString().slice(0, 10);
}

function synthesisRows(students) {
  return students.map((s) => ({
    matricule: sanitizeExportText(s.matricule),
    nomComplet: sanitizeExportText(`${s.prenom ?? ''} ${s.nom ?? ''}`.trim()),
    section: sanitizeExportText(s.section),
    nbItems: String(s.nbItems ?? 0),
    enUsage: String(s.nbItems ?? 0),
    rendu: '0',
  }));
}

/** Synthèse par étudiant — Excel */
export async function exportEquipementSynthesisExcel(students, filenameBase = 'synthese-equipement-esp') {
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

/** Registre détaillé — une ligne par pièce d'équipement */
export async function exportEquipementDetailExcel(students, filenameBase = 'registre-equipement-esp') {
  const XLSX = await import('xlsx-js-style');
  const headers = [
    'Matricule',
    'Nom et prénom',
    'Section',
    'Code',
    'Type',
    'Description',
    'Qté',
    'Date remise',
    'État',
    'Date retour',
    'Pièce jointe',
  ];
  const items = await fetchEquipementMapped();
  const body = buildDetailExportRows(students, items).map(({ item, student: s }) => [
    sanitizeExportText(s.matricule),
    sanitizeExportText(`${s.prenom ?? ''} ${s.nom ?? ''}`.trim()),
    sanitizeExportText(s.section),
    sanitizeExportText(item.code),
    sanitizeExportText(item.type),
    sanitizeExportText(item.description),
    String(item.quantite ?? 1),
    item.dateRemise ?? '',
    equipementEtatLabel(item.etat),
    item.dateRetour ?? '',
    item.pdfAttachment?.name ? 'Oui' : 'Non',
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

/** Synthèse par étudiant — PDF officiel ESP */
export async function exportEquipementSynthesisPdf(
  students,
  { filenameBase = 'synthese-equipement-esp', filtersLabel = '' } = {},
) {
  const logo = await fetchEspLogoDataUrl();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const title = `Synthèse équipement — ${APP_NAME}`;

  doc.addImage(logo, 'PNG', 14, 10, 22, 22);
  doc.setFontSize(14);
  doc.setTextColor(27, 42, 74);
  doc.text(APP_NAME, 40, 18);
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text(title, 40, 26);
  doc.setFontSize(9);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 40, 32);
  if (filtersLabel) {
    doc.text(`Filtres : ${filtersLabel}`, 40, 38);
  }

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

/** Registre détaillé — PDF (toutes les lignes d'équipement) */
export async function exportEquipementDetailPdf(
  students,
  { filenameBase = 'registre-equipement-esp', filtersLabel = '' } = {},
) {
  const logo = await fetchEspLogoDataUrl();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const title = `Registre détaillé équipement — ${APP_NAME}`;

  doc.addImage(logo, 'PNG', 14, 10, 22, 22);
  doc.setFontSize(14);
  doc.setTextColor(27, 42, 74);
  doc.text(APP_NAME, 40, 18);
  doc.setFontSize(11);
  doc.text(title, 40, 26);
  doc.setFontSize(9);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 40, 32);
  if (filtersLabel) {
    doc.text(`Filtres : ${filtersLabel}`, 40, 38);
  }

  const headers = ['Matricule', 'Nom', 'Section', 'Code', 'Type', 'Description', 'Qté', 'Remise', 'État', 'Retour'];
  const items = await fetchEquipementMapped();
  const body = buildDetailExportRows(students, items).map(({ item, student: s }) => [
    sanitizeExportText(s.matricule),
    sanitizeExportText(`${s.prenom ?? ''} ${s.nom ?? ''}`.trim()),
    sanitizeExportText(s.section),
    sanitizeExportText(item.code),
    sanitizeExportText(item.type),
    sanitizeExportText(item.description),
    String(item.quantite ?? 1),
    item.dateRemise ?? '—',
    equipementEtatLabel(item.etat),
    item.dateRetour ?? '—',
  ]);

  autoTable(doc, {
    startY: filtersLabel ? 42 : 38,
    head: [headers],
    body: body.length ? body : [['—', '—', '—', '—', '—', 'Aucune pièce enregistrée', '—', '—', '—', '—']],
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [27, 42, 74], textColor: 255 },
    margin: { left: 14, right: 14 },
    tableWidth: pageW - 28,
  });

  doc.save(`${filenameBase}-${dateSuffix()}.pdf`);
}

// Compatibilité avec l'ancien nom
export const exportEquipementListExcel = exportEquipementSynthesisExcel;
export const exportEquipementListPdf = exportEquipementSynthesisPdf;
