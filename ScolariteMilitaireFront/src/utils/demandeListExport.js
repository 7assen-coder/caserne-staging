import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from './saveAsFile.js';
import {
  demandeNatureLabel,
  demandeStatutLabel,
} from '../data/demandeCatalog';
import { fetchEspLogoDataUrl, sanitizeExportText } from './etudiantsListExport';
import { APP_NAME } from '../data/institution';
import { buildDemandeDetailExportRows } from './demandeStats';
import { loadDemandes } from './demandeStore';

const SYNTHESIS_COLUMNS = [
  { key: 'matricule', label: 'Matricule' },
  { key: 'nomComplet', label: 'Nom et prénom' },
  { key: 'departement', label: 'Département' },
  { key: 'niveau', label: 'Niveau' },
  { key: 'nbDemandes', label: 'Nb demandes' },
  { key: 'enCours', label: 'En cours' },
  { key: 'derniere', label: 'Dernière demande' },
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

async function tryAddLogo(doc) {
  try {
    const logo = await fetchEspLogoDataUrl();
    doc.addImage(logo, 'PNG', 14, 10, 22, 22);
    return 40;
  } catch {
    return 14;
  }
}

function synthesisRows(students) {
  const all = loadDemandes();
  return students.map((s) => {
    const items = all.filter((i) => String(i.eleveId) === String(s.id));
    const enCours = items.filter((i) => i.statut === 'en_cours').length;
    const last = items.sort((a, b) =>
      String(b.dateDepot).localeCompare(String(a.dateDepot)),
    )[0];
    const derniere = last
      ? `${formatDateFr(last.dateDepot)} · ${demandeNatureLabel(last.nature)}`
      : '—';
    return {
      matricule: sanitizeExportText(s.matricule),
      nomComplet: sanitizeExportText(`${s.prenom ?? ''} ${s.nom ?? ''}`.trim()),
      departement: sanitizeExportText(s.departement),
      niveau: sanitizeExportText(s.niveau),
      nbDemandes: String(s.nbDemandes ?? items.length),
      enCours: String(enCours),
      derniere: sanitizeExportText(derniere),
    };
  });
}

export async function exportDemandeSynthesisExcel(students, filenameBase = 'synthese-demandes-esp') {
  const XLSX = await import('xlsx');
  const headers = SYNTHESIS_COLUMNS.map((c) => c.label);
  const body = synthesisRows(students).map((row) =>
    SYNTHESIS_COLUMNS.map((c) => row[c.key] ?? ''),
  );
  const ws = XLSX.utils.aoa_to_sheet([headers, ...body]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Synthèse');
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${filenameBase}-${dateSuffix()}.xlsx`,
  );
}

export async function exportDemandeDetailExcel(students, filenameBase = 'registre-demandes-esp') {
  const XLSX = await import('xlsx');
  const headers = [
    'Matricule', 'Nom et prénom', 'Département', 'Niveau', 'Code', 'Description', 'Nature',
    'Date dépôt', 'Statut', 'Demande PDF', 'PJ PDF',
  ];
  const body = buildDemandeDetailExportRows(students).map(({ item, student: s }) => [
    sanitizeExportText(s.matricule),
    sanitizeExportText(`${s.prenom ?? ''} ${s.nom ?? ''}`.trim()),
    sanitizeExportText(s.departement),
    sanitizeExportText(s.niveau),
    sanitizeExportText(item.code),
    sanitizeExportText(item.description),
    demandeNatureLabel(item.nature),
    item.dateDepot ?? '',
    demandeStatutLabel(item.statut),
    item.demandePdf?.name ? 'Oui' : 'Non',
    item.pjPdf?.name ? 'Oui' : 'Non',
  ]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...body]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Registre');
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${filenameBase}-${dateSuffix()}.xlsx`,
  );
}

export async function exportDemandeSynthesisPdf(
  students,
  { filenameBase = 'synthese-demandes-esp', filtersLabel = '' } = {},
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const textX = await tryAddLogo(doc);

  doc.setFontSize(14);
  doc.setTextColor(27, 42, 74);
  doc.text(APP_NAME, textX, 18);
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text(`Synthèse demandes — ${APP_NAME}`, textX, 26);
  doc.setFontSize(9);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, textX, 32);
  if (filtersLabel) doc.text(`Filtres : ${filtersLabel}`, textX, 38);

  autoTable(doc, {
    startY: filtersLabel ? 42 : 38,
    head: [SYNTHESIS_COLUMNS.map((c) => c.label)],
    body: synthesisRows(students).map((row) => SYNTHESIS_COLUMNS.map((c) => row[c.key] ?? '')),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [27, 42, 74], textColor: 255 },
    margin: { left: 14, right: 14 },
    tableWidth: pageW - 28,
  });

  doc.save(`${filenameBase}-${dateSuffix()}.pdf`);
}

export async function exportDemandeDetailPdf(
  students,
  { filenameBase = 'registre-demandes-esp', filtersLabel = '' } = {},
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const textX = await tryAddLogo(doc);

  doc.setFontSize(14);
  doc.setTextColor(27, 42, 74);
  doc.text(APP_NAME, textX, 18);
  doc.setFontSize(11);
  doc.text(`Registre détaillé demandes — ${APP_NAME}`, textX, 26);
  doc.setFontSize(9);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, textX, 32);
  if (filtersLabel) doc.text(`Filtres : ${filtersLabel}`, textX, 38);

  const headers = ['Matricule', 'Nom', 'Dépt', 'Code', 'Description', 'Nature', 'Dépôt', 'Statut'];
  const body = buildDemandeDetailExportRows(students).map(({ item, student: s }) => [
    sanitizeExportText(s.matricule),
    sanitizeExportText(`${s.prenom ?? ''} ${s.nom ?? ''}`.trim()),
    sanitizeExportText(s.departement),
    sanitizeExportText(item.code),
    sanitizeExportText(item.description),
    demandeNatureLabel(item.nature),
    formatDateFr(item.dateDepot),
    demandeStatutLabel(item.statut),
  ]);

  autoTable(doc, {
    startY: filtersLabel ? 42 : 38,
    head: [headers],
    body: body.length ? body : [['—', '—', '—', '—', 'Aucune demande', '—', '—', '—']],
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [27, 42, 74], textColor: 255 },
    margin: { left: 14, right: 14 },
    tableWidth: pageW - 28,
  });

  doc.save(`${filenameBase}-${dateSuffix()}.pdf`);
}
