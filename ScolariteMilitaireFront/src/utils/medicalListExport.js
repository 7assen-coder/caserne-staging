import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from './saveAsFile.js';
import { consultationTypeLabel } from '../data/medicalCatalog';
import { fetchEspLogoDataUrl, sanitizeExportText } from './etudiantsListExport';
import { APP_NAME } from '../data/institution';
import { buildMedicalDetailExportRows } from './medicalStats';
import { loadConsultations } from './medicalStore';

const SYNTHESIS_COLUMNS = [
  { key: 'matricule', label: 'Matricule' },
  { key: 'nomComplet', label: 'Nom et prénom' },
  { key: 'age', label: 'Âge' },
  { key: 'groupeSanguin', label: 'Groupe sanguin' },
  { key: 'departement', label: 'Département' },
  { key: 'niveau', label: 'Niveau' },
  { key: 'nbConsultations', label: 'Nb consultations' },
  { key: 'derniere', label: 'Dernière consultation' },
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
  const all = loadConsultations();
  return students.map((s) => {
    const items = all.filter((i) => String(i.eleveId) === String(s.id));
    const last = items.sort((a, b) =>
      String(b.dateConsultation).localeCompare(String(a.dateConsultation)),
    )[0];
    const derniere = last
      ? `${formatDateFr(last.dateConsultation)} · ${last.motif ?? '—'}`
      : '—';
    return {
      matricule: sanitizeExportText(s.matricule),
      nomComplet: sanitizeExportText(`${s.prenom ?? ''} ${s.nom ?? ''}`.trim()),
      age: s.age != null ? String(s.age) : '—',
      groupeSanguin: sanitizeExportText(s.groupeSanguin || '—'),
      departement: sanitizeExportText(s.departement),
      niveau: sanitizeExportText(s.niveau),
      nbConsultations: String(s.nbConsultations ?? items.length),
      derniere: sanitizeExportText(derniere),
    };
  });
}

export async function exportMedicalSynthesisExcel(students, filenameBase = 'synthese-medical-esp') {
  const XLSX = await import('xlsx');
  const rows = synthesisRows(students);
  const ws = XLSX.utils.json_to_sheet(
    rows.map((r) =>
      Object.fromEntries(SYNTHESIS_COLUMNS.map((c) => [c.label, r[c.key] ?? ''])),
    ),
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Synthèse médicale');
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([buf], { type: 'application/octet-stream' }), `${filenameBase}-${dateSuffix()}.xlsx`);
}

export async function exportMedicalDetailExcel(students, filenameBase = 'registre-medical-esp') {
  const XLSX = await import('xlsx');
  const detail = buildMedicalDetailExportRows(students);
  const rows = detail.map(({ item, student }) => ({
    Matricule: student.matricule ?? '',
    Étudiant: `${student.prenom ?? ''} ${student.nom ?? ''}`.trim(),
    Code: item.code ?? '',
    Type: consultationTypeLabel(item.type),
    Motif: item.motif ?? '',
    Date: formatDateFr(item.dateConsultation),
    'Avis infirmerie': item.avisInfirmerie ?? '',
    PJ: item.pjPdf?.name ? 'Oui' : '—',
  }));
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Info: 'Aucune consultation' }]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Consultations');
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([buf], { type: 'application/octet-stream' }), `${filenameBase}-${dateSuffix()}.xlsx`);
}

export async function exportMedicalSynthesisPdf(
  students,
  { filtersLabel = 'aucun' } = {},
  filenameBase = 'synthese-medical-esp',
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const startY = await tryAddLogo(doc);
  doc.setFontSize(14);
  doc.setTextColor(27, 42, 74);
  doc.text(APP_NAME, 40, 18);
  doc.setFontSize(11);
  doc.text('Synthèse suivi médical', 40, 26);
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(`Filtres : ${sanitizeExportText(filtersLabel)}`, 40, 32);
  doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, 40, 38);

  const rows = synthesisRows(students);
  autoTable(doc, {
    startY: startY + 4,
    head: [SYNTHESIS_COLUMNS.map((c) => c.label)],
    body: rows.map((r) => SYNTHESIS_COLUMNS.map((c) => r[c.key] ?? '')),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [27, 42, 74], textColor: 255 },
    margin: { left: 14, right: 14 },
  });

  doc.save(`${filenameBase}-${dateSuffix()}.pdf`);
}

export async function exportMedicalDetailPdf(
  students,
  { filtersLabel = 'aucun' } = {},
  filenameBase = 'registre-medical-esp',
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const startY = await tryAddLogo(doc);
  doc.setFontSize(14);
  doc.setTextColor(27, 42, 74);
  doc.text(APP_NAME, 40, 18);
  doc.setFontSize(11);
  doc.text('Registre détaillé — consultations médicales', 40, 26);
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(`Filtres : ${sanitizeExportText(filtersLabel)}`, 40, 32);

  const detail = buildMedicalDetailExportRows(students);
  const head = ['Matricule', 'Étudiant', 'Code', 'Type', 'Motif', 'Date', 'Avis infirmerie', 'PJ'];
  const body = detail.map(({ item, student }) => [
    sanitizeExportText(student.matricule),
    sanitizeExportText(`${student.prenom ?? ''} ${student.nom ?? ''}`.trim()),
    sanitizeExportText(item.code),
    consultationTypeLabel(item.type),
    sanitizeExportText(item.motif),
    formatDateFr(item.dateConsultation),
    sanitizeExportText(item.avisInfirmerie || '—'),
    item.pjPdf?.name ? 'Oui' : '—',
  ]);

  autoTable(doc, {
    startY: startY + 4,
    head: [head],
    body: body.length ? body : [['—', 'Aucune consultation', '—', '—', '—', '—', '—', '—']],
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [27, 42, 74], textColor: 255 },
    margin: { left: 14, right: 14 },
  });

  doc.save(`${filenameBase}-${dateSuffix()}.pdf`);
}
