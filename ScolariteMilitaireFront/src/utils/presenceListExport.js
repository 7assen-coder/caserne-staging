import { saveAs } from './saveAsFile.js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { STATUT_LABEL } from './constants';
import { loadAppels } from './presenceStore';
import { fetchEspLogoDataUrl, sanitizeExportText } from './etudiantsListExport';
import { APP_NAME } from '../data/institution';
import { formatDateTime } from './formatters';

function dateSuffix() {
  return new Date().toISOString().slice(0, 10);
}

function filterAppels(filters = {}) {
  let list = [...loadAppels()].sort((a, b) =>
    String(b.date ?? '').localeCompare(String(a.date ?? '')),
  );
  const q = (filters.q ?? '').toLowerCase().trim();
  if (q) {
    list = list.filter(
      (a) =>
        a.section?.toLowerCase().includes(q) ||
        a.superviseur?.toLowerCase().includes(q) ||
        a.compagnie?.toLowerCase().includes(q),
    );
  }
  if (filters.section) list = list.filter((a) => a.section === filters.section);
  if (filters.type) list = list.filter((a) => a.type === filters.type);
  return list;
}

export async function exportPresenceHistoriqueExcel(filters = {}, filenameBase = 'historique-presence-esp') {
  const XLSX = await import('xlsx');
  const appels = filterAppels(filters);
  const rows = appels.flatMap((a) =>
    (a.detail ?? []).map((d) => ({
      Date: formatDateTime(a.date),
      Section: a.section ?? '',
      Type: STATUT_LABEL[a.type] ?? a.type ?? '',
      Superviseur: a.superviseur ?? '',
      Matricule: d.matricule ?? '',
      Nom: d.nom ?? '',
      Statut: d.statut === 'present' ? 'Présent' : 'Absent',
      Motif: d.motif ? STATUT_LABEL[d.motif] ?? d.motif : '—',
    })),
  );
  const ws = XLSX.utils.json_to_sheet(
    rows.length ? rows : [{ Info: 'Aucun appel enregistré' }],
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Présence');
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([buf], { type: 'application/octet-stream' }), `${filenameBase}-${dateSuffix()}.xlsx`);
}

export async function exportPresenceHistoriquePdf(filters = {}, filenameBase = 'historique-presence-esp') {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  let startY = 14;
  try {
    const logo = await fetchEspLogoDataUrl();
    doc.addImage(logo, 'PNG', 14, 10, 22, 22);
    startY = 40;
  } catch {
    /* sans logo */
  }

  doc.setFontSize(14);
  doc.setTextColor(27, 42, 74);
  doc.text(APP_NAME, 40, 18);
  doc.setFontSize(11);
  doc.text('Historique des appels de présence', 40, 26);
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(`Date d'édition : ${new Date().toLocaleDateString('fr-FR')}`, 40, 32);

  const appels = filterAppels(filters);
  const head = ['Date', 'Section', 'Type', 'Superviseur', 'Matricule', 'Nom', 'Statut', 'Motif'];
  const body = appels.flatMap((a) =>
    (a.detail ?? []).map((d) => [
      formatDateTime(a.date),
      sanitizeExportText(a.section),
      STATUT_LABEL[a.type] ?? a.type ?? '—',
      sanitizeExportText(a.superviseur),
      sanitizeExportText(d.matricule),
      sanitizeExportText(d.nom),
      d.statut === 'present' ? 'Présent' : 'Absent',
      sanitizeExportText(d.motif ? STATUT_LABEL[d.motif] ?? d.motif : '—'),
    ]),
  );

  autoTable(doc, {
    startY,
    head: [head],
    body: body.length ? body : [['—', 'Aucun appel enregistré', '—', '—', '—', '—', '—', '—']],
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [27, 42, 74], textColor: 255 },
    margin: { left: 14, right: 14 },
  });

  doc.save(`${filenameBase}-${dateSuffix()}.pdf`);
}
