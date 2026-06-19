import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fetchEspLogoDataUrl, sanitizeExportText } from './etudiantsListExport';
import { equipementEtatLabel } from '../data/equipementCatalog';
import { APP_NAME } from '../data/institution';

function formatDateFr(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return iso;
  }
}

export async function downloadEquipementFichePdf(eleve, items = []) {
  const logo = await fetchEspLogoDataUrl();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const nomComplet = sanitizeExportText(`${eleve.prenom ?? ''} ${eleve.nom ?? ''}`.trim());

  doc.addImage(logo, 'PNG', 14, 12, 24, 24);
  doc.setFontSize(14);
  doc.setTextColor(27, 42, 74);
  doc.text(APP_NAME, 42, 20);
  doc.setFontSize(12);
  doc.text('Fiche équipement', 42, 28);
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Matricule : ${sanitizeExportText(eleve.matricule)}`, 42, 36);
  doc.text(`Étudiant : ${nomComplet}`, 42, 42);
  doc.text(
    `Section : ${sanitizeExportText(eleve.dossierMilitaire?.section ?? eleve.section ?? '—')}`,
    42,
    48,
  );
  doc.text(`Date d'édition : ${new Date().toLocaleDateString('fr-FR')}`, 42, 54);

  const head = [
    'Code',
    'Type',
    'Description',
    'Qté',
    'Remise',
    'État',
    'Retour',
    'PJ',
  ];
  const body = (items ?? []).map((item) => [
    sanitizeExportText(item.code),
    sanitizeExportText(item.type),
    sanitizeExportText(item.description),
    String(item.quantite ?? 1),
    formatDateFr(item.dateRemise),
    equipementEtatLabel(item.etat),
    formatDateFr(item.dateRetour),
    item.pdfAttachment?.name ? 'Oui' : '—',
  ]);

  autoTable(doc, {
    startY: 62,
    head: [head],
    body: body.length ? body : [['—', '—', 'Aucun équipement enregistré', '—', '—', '—', '—', '—']],
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [27, 42, 74], textColor: 255 },
    margin: { left: 14, right: 14 },
  });

  const safeMat = String(eleve.matricule ?? 'etudiant').replace(/[/\\?%*:|"<>]/g, '-');
  doc.save(`fiche-equipement-${safeMat}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
