import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from './saveAsFile.js';
import { droitsEtatLabel, moisLabel } from '../data/droitsCatalog';
import { fetchEspLogoDataUrl, sanitizeExportText } from './etudiantsListExport';
import { APP_NAME } from '../data/institution';

function dateSuffix() {
  return new Date().toISOString().slice(0, 10);
}

function formatMontant(n) {
  const v = Number(n) || 0;
  return v.toLocaleString('fr-FR');
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

export async function exportDroitsExcel(batch, filenameBase = 'droits-esp') {
  const XLSX = await import('xlsx');
  const headers = [
    'Matricule',
    'Nom et prénom',
    'Section',
    'Niveau',
    'Montant (MRU)',
    'État',
    'Remarques',
  ];
  const body = (batch.rows ?? []).map((r) => [
    sanitizeExportText(r.matricule),
    sanitizeExportText(`${r.prenom ?? ''} ${r.nom ?? ''}`.trim()),
    sanitizeExportText(r.section),
    sanitizeExportText(r.niveau),
    formatMontant(r.montant),
    droitsEtatLabel(r.etat),
    sanitizeExportText(r.remarques),
  ]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...body]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Droits');
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const slug = `${batch.annee}-${String(batch.mois).padStart(2, '0')}`;
  saveAs(
    new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `${filenameBase}-${slug}-${dateSuffix()}.xlsx`,
  );
}

export async function exportDroitsPdf(batch, filenameBase = 'droits-esp') {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const textX = await tryAddLogo(doc);

  doc.setFontSize(14);
  doc.setTextColor(27, 42, 74);
  doc.text(APP_NAME, textX, 18);
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text(`Bourse / droits — ${moisLabel(batch.mois)} ${batch.annee}`, textX, 26);
  doc.setFontSize(9);
  doc.text(`Compagnie : ${sanitizeExportText(batch.compagnie)}`, textX, 32);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, textX, 38);
  if (batch.validated) {
    doc.text('Statut : validé', textX, 44);
  }

  const headers = ['Matricule', 'Nom', 'Section', 'Niveau', 'Montant', 'État', 'Remarques'];
  const body = (batch.rows ?? []).map((r) => [
    sanitizeExportText(r.matricule),
    sanitizeExportText(`${r.prenom ?? ''} ${r.nom ?? ''}`.trim()),
    sanitizeExportText(r.section),
    sanitizeExportText(r.niveau),
    `${formatMontant(r.montant)} MRU`,
    droitsEtatLabel(r.etat),
    sanitizeExportText(r.remarques),
  ]);

  autoTable(doc, {
    startY: batch.validated ? 48 : 44,
    head: [headers],
    body: body.length ? body : [['—', 'Aucun étudiant', '—', '—', '—', '—', '—']],
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [27, 42, 74], textColor: 255 },
    margin: { left: 14, right: 14 },
    tableWidth: pageW - 28,
  });

  const slug = `${batch.annee}-${String(batch.mois).padStart(2, '0')}`;
  doc.save(`${filenameBase}-${slug}-${dateSuffix()}.pdf`);
}
