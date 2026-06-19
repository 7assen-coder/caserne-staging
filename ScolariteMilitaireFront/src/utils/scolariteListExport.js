import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from './saveAsFile.js';
import {
  SEMESTRE_COLUMNS,
  SEMESTRE_KEYS,
  semestreColumnLabel,
  validationSemestreLabel,
} from '../data/scolariteSemestres';
import { fetchEspLogoDataUrl, sanitizeExportText } from './etudiantsListExport';
import { APP_NAME } from '../data/institution';

function dateSuffix() {
  return new Date().toISOString().slice(0, 10);
}

function baseColumns(visibleSemestres = SEMESTRE_KEYS) {
  return [
    { key: 'matricule', label: 'Matricule' },
    { key: 'nomComplet', label: 'Nom et prénom' },
    { key: 'departement', label: 'Département' },
    { key: 'niveau', label: 'Niveau' },
    { key: 'statut', label: 'Statut' },
    ...visibleSemestres.map((k) => ({ key: k, label: semestreColumnLabel(k) })),
    { key: 'mobilite', label: 'Mobilité' },
    { key: 'etablissement', label: 'Établissement partenaire' },
  ];
}

function rowToExport(row, visibleSemestres = SEMESTRE_KEYS) {
  const out = {
    matricule: sanitizeExportText(row.matricule),
    nomComplet: sanitizeExportText(`${row.prenom ?? ''} ${row.nom ?? ''}`.trim()),
    departement: sanitizeExportText(row.departement),
    niveau: sanitizeExportText(row.niveau),
    statut: sanitizeExportText(row.statutLabel),
    mobilite: sanitizeExportText(row.mobilite?.type ?? ''),
    etablissement: sanitizeExportText(row.mobilite?.etablissement ?? ''),
  };
  visibleSemestres.forEach((key) => {
    out[key] = validationSemestreLabel(row.semestres?.[key]);
  });
  return out;
}

export async function exportScolariteSynthesisExcel(
  students,
  visibleSemestres = SEMESTRE_KEYS,
  filenameBase = 'synthese-scolarite-esp',
) {
  const XLSX = await import('xlsx');
  const cols = baseColumns(visibleSemestres);
  const headers = cols.map((c) => c.label);
  const body = students.map((s) => {
    const row = rowToExport(s, visibleSemestres);
    return cols.map((c) => row[c.key] ?? '');
  });
  const ws = XLSX.utils.aoa_to_sheet([headers, ...body]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Scolarité');
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(
    new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `${filenameBase}-${dateSuffix()}.xlsx`,
  );
}

export async function exportScolariteSynthesisPdf(
  students,
  {
    visibleSemestres = SEMESTRE_KEYS,
    filenameBase = 'synthese-scolarite-esp',
    filtersLabel = '',
  } = {},
) {
  const logo = await fetchEspLogoDataUrl();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const title = `Synthèse scolarité — ${APP_NAME}`;

  doc.addImage(logo, 'PNG', 14, 10, 22, 22);
  doc.setFontSize(14);
  doc.setTextColor(27, 42, 74);
  doc.text(APP_NAME, 40, 18);
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text(title, 40, 26);
  doc.setFontSize(9);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 40, 32);
  if (filtersLabel) doc.text(`Filtres : ${filtersLabel}`, 40, 38);

  const cols = baseColumns(visibleSemestres);
  const headers = cols.map((c) => c.label);
  const body = students.map((s) => {
    const row = rowToExport(s, visibleSemestres);
    return cols.map((c) => row[c.key] ?? '');
  });

  autoTable(doc, {
    startY: filtersLabel ? 42 : 38,
    head: [headers],
    body,
    styles: { fontSize: 6.5, cellPadding: 1.5 },
    headStyles: { fillColor: [27, 42, 74], textColor: 255 },
    margin: { left: 10, right: 10 },
    tableWidth: pageW - 20,
  });

  doc.save(`${filenameBase}-${dateSuffix()}.pdf`);
}

/** Registre long : une ligne par semestre renseigné */
export async function exportScolariteDetailExcel(students, filenameBase = 'registre-scolarite-esp') {
  const XLSX = await import('xlsx');
  const headers = [
    'Matricule',
    'Nom et prénom',
    'Département',
    'Niveau',
    'Semestre',
    'Validation',
    'Mobilité',
    'Établissement',
  ];
  const body = [];
  students.forEach((s) => {
    const keys = SEMESTRE_KEYS.filter((k) => s.semestres?.[k]);
    if (!keys.length) {
      body.push([
        sanitizeExportText(s.matricule),
        sanitizeExportText(`${s.prenom ?? ''} ${s.nom ?? ''}`.trim()),
        sanitizeExportText(s.departement),
        sanitizeExportText(s.niveau),
        '—',
        '—',
        sanitizeExportText(s.mobilite?.type ?? ''),
        sanitizeExportText(s.mobilite?.etablissement ?? ''),
      ]);
      return;
    }
    keys.forEach((key) => {
      body.push([
        sanitizeExportText(s.matricule),
        sanitizeExportText(`${s.prenom ?? ''} ${s.nom ?? ''}`.trim()),
        sanitizeExportText(s.departement),
        sanitizeExportText(s.niveau),
        key,
        validationSemestreLabel(s.semestres[key]),
        sanitizeExportText(s.mobilite?.type ?? ''),
        sanitizeExportText(s.mobilite?.etablissement ?? ''),
      ]);
    });
  });
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
