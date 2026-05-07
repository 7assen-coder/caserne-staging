import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { INSTITUTION } from '../data/institution';

const MENSURATIONS_FIELDS = [
  { key: 'tourPoitrine', label: 'Tour de poitrine (cm)' },
  { key: 'tourCeinture', label: 'Tour de ceinture (cm)' },
  { key: 'tourTaille', label: 'Tour de taille (cm)' },
  { key: 'tourBassin', label: 'Tour de bassin (cm)' },
  { key: 'tourCou', label: 'Tour de cou (cm)' },
  { key: 'longueurManche', label: 'Longueur de manche (cm)' },
  { key: 'longueurDos', label: 'Longueur de dos (cm)' },
  { key: 'longueurCote', label: 'Longueur de côté (cm)' },
  { key: 'pointure', label: 'Pointure (FR)' },
];

function safe(v) {
  if (v == null) return '—';
  const s = String(v).trim();
  return s ? s : '—';
}

export function generateFicheTaillesPdf({ eleve, mensurations, taille, poids } = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(INSTITUTION.nomCourt, 14, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(INSTITUTION.nomComplet, 14, 21);
  doc.text(`${INSTITUTION.adresse} · ${INSTITUTION.pays}`, 14, 26);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('Fiche de tailles — Étudiant', pageW / 2, 38, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const today = new Date().toLocaleDateString('fr-FR');
  doc.text(`Établie le ${today}`, pageW - 14, 15, { align: 'right' });

  const idRows = [
    ['Matricule', safe(eleve?.matricule)],
    ['Nom & prénom', `${safe(eleve?.nom)} ${safe(eleve?.prenom)}`.trim()],
    ['Compagnie', safe(eleve?.dossierMilitaire?.compagnie ?? eleve?.compagnie)],
    ['Section', safe(eleve?.dossierMilitaire?.section ?? eleve?.section)],
    ['Filière', safe(eleve?.scolarite?.filiere)],
    ['Niveau', safe(eleve?.scolarite?.niveau)],
  ];
  autoTable(doc, {
    startY: 44,
    head: [['Identité', 'Valeur']],
    body: idRows,
    theme: 'grid',
    headStyles: { fillColor: [27, 42, 74], textColor: 255, halign: 'left' },
    styles: { fontSize: 10, cellPadding: 2.4 },
    columnStyles: { 0: { cellWidth: 60, fontStyle: 'bold' }, 1: { cellWidth: 'auto' } },
  });

  const startMensY = doc.lastAutoTable.finalY + 6;
  const m = mensurations || eleve?.dossierMilitaire || {};
  const body = MENSURATIONS_FIELDS.map((f) => [f.label, safe(m[f.key])]);
  body.push(['Poids (kg)', safe(poids ?? eleve?.sante?.poids)]);
  body.push(['Taille (cm)', safe(taille ?? eleve?.sante?.tailleCm)]);

  autoTable(doc, {
    startY: startMensY,
    head: [['Mensurations', 'Valeur']],
    body,
    theme: 'striped',
    headStyles: { fillColor: [200, 165, 78], textColor: 255, halign: 'left' },
    styles: { fontSize: 10, cellPadding: 2.4 },
    columnStyles: { 0: { cellWidth: 90, fontStyle: 'bold' }, 1: { cellWidth: 'auto' } },
  });

  const finalY = doc.lastAutoTable.finalY + 14;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('Cette fiche est établie pour la dotation des effets et équipements.', 14, finalY);
  doc.setFont('helvetica', 'normal');
  doc.text('Signature étudiant :', 14, finalY + 16);
  doc.text(`${INSTITUTION.signatureLibelle} :`, pageW - 14, finalY + 16, { align: 'right' });
  doc.line(14, finalY + 30, 80, finalY + 30);
  doc.line(pageW - 80, finalY + 30, pageW - 14, finalY + 30);

  const filename = `fiche-tailles-${(eleve?.matricule || 'etudiant')}.pdf`;
  doc.save(filename);
}

const FICHE_KEYWORDS = [
  { re: /poitrine/i, key: 'tourPoitrine' },
  { re: /ceinture/i, key: 'tourCeinture' },
  { re: /taille(?!.*manche)/i, key: 'tourTaille' },
  { re: /bassin/i, key: 'tourBassin' },
  { re: /cou(?!turi)/i, key: 'tourCou' },
  { re: /manche/i, key: 'longueurManche' },
  { re: /dos/i, key: 'longueurDos' },
  { re: /côt[eé]|cote/i, key: 'longueurCote' },
  { re: /pointure/i, key: 'pointure' },
  { re: /poids/i, key: 'poids' },
  { re: /taille\s*\(?cm\)?|stature/i, key: 'tailleCm' },
];

export function parseFicheTaillesText(rawText) {
  const out = {};
  if (!rawText) return out;
  const lines = String(rawText).split(/\r?\n|;|·/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    for (const { re, key } of FICHE_KEYWORDS) {
      if (re.test(line)) {
        const m = line.match(/(\d{1,3}(?:[.,]\d+)?)/);
        if (m && !out[key]) {
          out[key] = m[1].replace(',', '.');
        }
        break;
      }
    }
  }
  return out;
}
