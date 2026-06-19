import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  sanctionNatureLabel,
  sanctionStatutLabel,
} from '../data/sanctionCatalog';
import { fetchEspLogoDataUrl, sanitizeExportText } from './etudiantsListExport';
import { APP_NAME } from '../data/institution';

function formatDateFr(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return iso;
  }
}

export async function downloadSanctionFichePdf(eleve, sanctions = []) {
  const logo = await fetchEspLogoDataUrl();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const nomComplet = sanitizeExportText(`${eleve.prenom ?? ''} ${eleve.nom ?? ''}`.trim());

  doc.addImage(logo, 'PNG', 14, 12, 24, 24);
  doc.setFontSize(14);
  doc.setTextColor(27, 42, 74);
  doc.text(APP_NAME, 42, 20);
  doc.setFontSize(12);
  doc.text('Fiche sanctions', 42, 28);
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Matricule : ${sanitizeExportText(eleve.matricule)}`, 42, 36);
  doc.text(`Étudiant : ${nomComplet}`, 42, 42);
  doc.text(`Département : ${sanitizeExportText(eleve.departement ?? '—')}`, 42, 48);
  doc.text(`Niveau : ${sanitizeExportText(eleve.niveau ?? '—')}`, 42, 54);
  doc.text(`Date d'édition : ${new Date().toLocaleDateString('fr-FR')}`, 42, 60);

  const head = ['Code', 'Motif', 'Nature', 'Début', 'Fin', 'Statut', 'CR', 'PJ'];
  const body = (sanctions ?? []).map((item) => [
    sanitizeExportText(item.code),
    sanitizeExportText(item.motif),
    sanctionNatureLabel(item.nature),
    formatDateFr(item.dateDebut),
    formatDateFr(item.dateFin),
    sanctionStatutLabel(item.statut),
    item.crPdf?.name ? 'Oui' : '—',
    item.pjPdf?.name ? 'Oui' : '—',
  ]);

  autoTable(doc, {
    startY: 68,
    head: [head],
    body: body.length ? body : [['—', 'Aucune sanction enregistrée', '—', '—', '—', '—', '—', '—']],
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [27, 42, 74], textColor: 255 },
    margin: { left: 14, right: 14 },
  });

  const safeMat = String(eleve.matricule ?? 'etudiant').replace(/[/\\?%*:|"<>]/g, '-');
  doc.save(`fiche-sanctions-${safeMat}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
