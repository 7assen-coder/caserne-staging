import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from './saveAsFile.js';
import { journalTypeLabel } from '../data/journalCatalog';
import { fetchEspLogoDataUrl, sanitizeExportText } from './etudiantsListExport';
import { APP_NAME } from '../data/institution';
import { buildJournalDetailExportRows } from './journalStats';

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

async function tryAddLogo(doc) {
  try {
    const logo = await fetchEspLogoDataUrl();
    doc.addImage(logo, 'PNG', 14, 10, 22, 22);
    return 40;
  } catch {
    return 14;
  }
}

export async function exportJournalRegistreExcel(students, filenameBase = 'registre-journal-esp') {
  const XLSX = await import('xlsx');
  const headers = [
    'Matricule',
    'Nom et prénom',
    'Département',
    'Niveau',
    'Code',
    'Type',
    'Date',
    'Titre',
    'Contenu',
    'Auteur',
    'PJ PDF',
  ];
  const body = buildJournalDetailExportRows(students).map(({ item, student: s }) => [
    sanitizeExportText(s.matricule),
    sanitizeExportText(`${s.prenom ?? ''} ${s.nom ?? ''}`.trim()),
    sanitizeExportText(s.departement),
    sanitizeExportText(s.niveau),
    sanitizeExportText(item.code),
    journalTypeLabel(item.type),
    item.date ?? '',
    sanitizeExportText(item.titre),
    sanitizeExportText(item.contenu),
    sanitizeExportText(item.auteur),
    item.pjPdf?.name ? 'Oui' : 'Non',
  ]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...body]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Journal');
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(
    new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `${filenameBase}-${dateSuffix()}.xlsx`,
  );
}

export async function exportJournalRegistrePdf(
  students,
  { filtersLabel = '' } = {},
  filenameBase = 'registre-journal-esp',
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const textX = await tryAddLogo(doc);

  doc.setFontSize(14);
  doc.setTextColor(27, 42, 74);
  doc.text(APP_NAME, textX, 18);
  doc.setFontSize(11);
  doc.text('Journal de vie scolaire — registre détaillé', textX, 26);
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(`Date d'édition : ${new Date().toLocaleDateString('fr-FR')}`, textX, 32);
  if (filtersLabel) {
    doc.text(`Filtres : ${sanitizeExportText(filtersLabel)}`, textX, 38);
  }

  const head = [
    'Matricule',
    'Nom',
    'Dépt',
    'Code',
    'Type',
    'Date',
    'Titre',
    'Contenu',
    'Auteur',
  ];
  const body = buildJournalDetailExportRows(students).map(({ item, student: s }) => [
    sanitizeExportText(s.matricule),
    sanitizeExportText(`${s.prenom ?? ''} ${s.nom ?? ''}`.trim()),
    sanitizeExportText(s.departement),
    sanitizeExportText(item.code),
    journalTypeLabel(item.type),
    formatDateFr(item.date),
    sanitizeExportText(item.titre),
    sanitizeExportText(item.contenu),
    sanitizeExportText(item.auteur),
  ]);

  autoTable(doc, {
    startY: filtersLabel ? 44 : 40,
    head: [head],
    body: body.length ? body : [['—', 'Aucune entrée', '—', '—', '—', '—', '—', '—', '—']],
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [27, 42, 74], textColor: 255 },
    margin: { left: 14, right: 14 },
    tableWidth: pageW - 28,
  });

  doc.save(`${filenameBase}-${dateSuffix()}.pdf`);
}
