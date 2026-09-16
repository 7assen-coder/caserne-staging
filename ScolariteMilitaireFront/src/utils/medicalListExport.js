import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from './saveAsFile.js';
import { consultationTypeLabel } from '../data/medicalCatalog';
import { fetchEspLogoDataUrl, sanitizeExportText } from './etudiantsListExport';
import { APP_NAME } from '../data/institution';
import { buildMedicalDetailExportRows } from './medicalStats';
import { apiList } from './opsApi';
import { apiPaths } from '../services/apiPaths';

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
  return students.map((s) => {
    const derniere = s.derniereDate
      ? `${formatDateFr(s.derniereDate)} · ${s.derniereMotif ?? '—'}`
      : '—';
    return {
      matricule: sanitizeExportText(s.matricule),
      nomComplet: sanitizeExportText(`${s.prenom ?? ''} ${s.nom ?? ''}`.trim()),
      age: s.age != null ? String(s.age) : '—',
      groupeSanguin: sanitizeExportText(s.groupeSanguin || '—'),
      departement: sanitizeExportText(s.departement),
      niveau: sanitizeExportText(s.niveau),
      nbConsultations: String(s.nbConsultations ?? 0),
      derniere: sanitizeExportText(derniere),
    };
  });
}

async function fetchConsultationsMapped() {
  const raw = await apiList(apiPaths.consultations.list);
  return raw.map((r) => ({
    id: r.id,
    eleveId: String(r.eleve),
    code: r.code ?? '',
    type: r.type ?? 'consultation',
    motif: r.motif ?? '',
    dateConsultation: r.date_consultation ?? '',
    avisInfirmerie: r.avis_infirmerie ?? '',
    pjPdf: r.pj_pdf ? { name: 'pj.pdf' } : null,
  }));
}

export async function exportMedicalSynthesisExcel(students, filenameBase = 'synthese-medical-esp') {
  const XLSX = await import('xlsx-js-style');
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
  const XLSX = await import('xlsx-js-style');
  const detail = buildMedicalDetailExportRows(students, await fetchConsultationsMapped());
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

  const detail = buildMedicalDetailExportRows(students, await fetchConsultationsMapped());
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
