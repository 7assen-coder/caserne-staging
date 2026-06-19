import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { consultationTypeLabel } from '../data/medicalCatalog';
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

export async function downloadMedicalFichePdf(eleve, consultations = [], profile = {}) {
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
  doc.text('Historique des consultations médicales', textX, 28);
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Matricule : ${sanitizeExportText(eleve.matricule)}`, textX, 36);
  doc.text(`Étudiant : ${nomComplet}`, textX, 42);
  doc.text(`Groupe sanguin : ${sanitizeExportText(eleve.sante?.groupeSanguin || profile.groupeSanguin || '—')}`, textX, 48);
  doc.text(`Date d'édition : ${new Date().toLocaleDateString('fr-FR')}`, textX, 54);

  if (profile.maladiesChroniques || profile.medicaments) {
    doc.setFontSize(9);
    doc.text(`Maladies chroniques : ${sanitizeExportText(profile.maladiesChroniques || '—')}`, 14, 62);
    doc.text(`Médicaments à vie : ${sanitizeExportText(profile.medicaments || '—')}`, 14, 68);
  }

  const head = ['Code', 'Type', 'Motif', 'Date', 'Avis infirmerie', 'PJ'];
  const body = (consultations ?? []).map((item) => [
    sanitizeExportText(item.code),
    consultationTypeLabel(item.type),
    sanitizeExportText(item.motif),
    formatDateFr(item.dateConsultation),
    sanitizeExportText(item.avisInfirmerie || '—'),
    item.pjPdf?.name ? 'Oui' : '—',
  ]);

  autoTable(doc, {
    startY: profile.maladiesChroniques || profile.medicaments ? 74 : 62,
    head: [head],
    body: body.length ? body : [['—', 'Aucune consultation enregistrée', '—', '—', '—', '—']],
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [27, 42, 74], textColor: 255 },
    margin: { left: 14, right: 14 },
  });

  const safeMat = String(eleve.matricule ?? 'etudiant').replace(/[/\\?%*:|"<>]/g, '-');
  doc.save(`historique-medical-${safeMat}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
