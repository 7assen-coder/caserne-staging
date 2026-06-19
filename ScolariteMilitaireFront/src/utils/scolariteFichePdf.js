import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  SEMESTRE_COLUMNS,
  validationSemestreLabel,
} from '../data/scolariteSemestres';
import { fetchEspLogoDataUrl, sanitizeExportText } from './etudiantsListExport';
import { APP_NAME } from '../data/institution';

export async function downloadScolariteFichePdf(dossier) {
  const logo = await fetchEspLogoDataUrl();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const nomComplet = sanitizeExportText(`${dossier.prenom ?? ''} ${dossier.nom ?? ''}`.trim());
  const s = dossier.scolarite ?? {};

  doc.addImage(logo, 'PNG', 14, 12, 24, 24);
  doc.setFontSize(14);
  doc.setTextColor(27, 42, 74);
  doc.text(APP_NAME, 42, 20);
  doc.setFontSize(12);
  doc.text('Fiche de suivi scolarité', 42, 28);
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Matricule : ${sanitizeExportText(dossier.matricule)}`, 42, 36);
  doc.text(`Étudiant : ${nomComplet}`, 42, 42);
  doc.text(`Département : ${sanitizeExportText(dossier.departement ?? s.departement ?? '—')}`, 42, 48);
  doc.text(`Niveau : ${sanitizeExportText(dossier.niveau ?? s.niveau ?? '—')}`, 42, 54);
  doc.text(`Statut : ${sanitizeExportText(dossier.statutLabel ?? '—')}`, 42, 60);
  doc.text(`Date d'édition : ${new Date().toLocaleDateString('fr-FR')}`, 42, 66);

  const semHead = ['Semestre / Parcours', 'Validation'];
  const semBody = SEMESTRE_COLUMNS.map(({ key, label }) => [
    label,
    validationSemestreLabel(dossier.semestres?.[key]),
  ]);

  autoTable(doc, {
    startY: 72,
    head: [semHead],
    body: semBody,
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [27, 42, 74], textColor: 255 },
    margin: { left: 14, right: 14 },
    columnStyles: { 0: { cellWidth: 40 } },
  });

  const mobilite = dossier.mobilite;
  const yAfter = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(11);
  doc.setTextColor(27, 42, 74);
  doc.text('Mobilité / double diplôme', 14, yAfter);

  autoTable(doc, {
    startY: yAfter + 4,
    head: [['Type', 'Établissement partenaire', 'Spécialité']],
    body: [
      [
        sanitizeExportText(mobilite?.type ?? '—'),
        sanitizeExportText(mobilite?.etablissement ?? '—'),
        sanitizeExportText(mobilite?.specialite ?? '—'),
      ],
    ],
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [39, 103, 73], textColor: 255 },
    margin: { left: 14, right: 14 },
  });

  const safeMat = String(dossier.matricule ?? 'etudiant').replace(/[/\\?%*:|"<>]/g, '-');
  doc.save(`fiche-scolarite-${safeMat}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
