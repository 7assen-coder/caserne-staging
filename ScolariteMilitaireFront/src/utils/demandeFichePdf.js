import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  demandeNatureLabel,
  demandeStatutLabel,
} from '../data/demandeCatalog';
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

export async function downloadDemandeFichePdf(eleve, demandes = []) {
  let logoAdded = false;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const nomComplet = sanitizeExportText(`${eleve.prenom ?? ''} ${eleve.nom ?? ''}`.trim());

  try {
    const logo = await fetchEspLogoDataUrl();
    doc.addImage(logo, 'PNG', 14, 12, 24, 24);
    logoAdded = true;
  } catch {
    /* sans logo */
  }

  const textX = logoAdded ? 42 : 14;
  doc.setFontSize(14);
  doc.setTextColor(27, 42, 74);
  doc.text(APP_NAME, textX, 20);
  doc.setFontSize(12);
  doc.text('Historique des demandes', textX, 28);
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Matricule : ${sanitizeExportText(eleve.matricule)}`, textX, 36);
  doc.text(`Étudiant : ${nomComplet}`, textX, 42);
  doc.text(`Département : ${sanitizeExportText(eleve.departement ?? '—')}`, textX, 48);
  doc.text(`Date d'édition : ${new Date().toLocaleDateString('fr-FR')}`, textX, 54);

  const head = ['Code', 'Description', 'Nature', 'Dépôt', 'Statut', 'Demande', 'PJ'];
  const body = (demandes ?? []).map((item) => [
    sanitizeExportText(item.code),
    sanitizeExportText(item.description),
    demandeNatureLabel(item.nature),
    formatDateFr(item.dateDepot),
    demandeStatutLabel(item.statut),
    item.demandePdf?.name ? 'Oui' : '—',
    item.pjPdf?.name ? 'Oui' : '—',
  ]);

  autoTable(doc, {
    startY: 62,
    head: [head],
    body: body.length ? body : [['—', 'Aucune demande enregistrée', '—', '—', '—', '—', '—']],
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [27, 42, 74], textColor: 255 },
    margin: { left: 14, right: 14 },
  });

  const safeMat = String(eleve.matricule ?? 'etudiant').replace(/[/\\?%*:|"<>]/g, '-');
  doc.save(`historique-demandes-${safeMat}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
