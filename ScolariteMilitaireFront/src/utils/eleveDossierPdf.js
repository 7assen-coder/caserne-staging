import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { buildEleveFicheSections } from '../data/eleveFicheSections';
import { APP_NAME, INSTITUTION } from '../data/institution';
import { fetchEspLogoDataUrl, sanitizeExportText } from './etudiantsListExport';

const NAVY = [15, 27, 51];
const GREEN = [72, 115, 70];
const GOLD = [200, 165, 78];
const HEADER_H = 28;

function safe(v) {
  if (v == null || v === '') return '—';
  return sanitizeExportText(String(v));
}

/**
 * Bandeau vert : logo à gauche + nom de l’école. Pas de ligne République.
 */
function drawOfficialHeader(doc, pageW, logoDataUrl) {
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, pageW, HEADER_H, 'F');
  doc.setFillColor(...GOLD);
  doc.rect(0, HEADER_H, pageW, 1.2, 'F');

  const logoSize = 14;
  const logoX = 10;
  const logoY = (HEADER_H - logoSize) / 2;

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoSize, logoSize);
    } catch {
      /* logo optionnel */
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  const textX = logoDataUrl ? logoX + logoSize + 6 : pageW / 2;
  const align = logoDataUrl ? 'left' : 'center';
  doc.text('ÉCOLE SUPÉRIEURE POLYTECHNIQUE', textX, HEADER_H / 2 + 1.5, { align });

  doc.setTextColor(0, 0, 0);
}

/**
 * PDF dossier étudiant — mise en page administrative structurée (4.19).
 */
export async function downloadEleveDossierPdf(eleve) {
  if (!eleve) throw new Error('Aucun étudiant à exporter.');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  let logoDataUrl = null;
  try {
    logoDataUrl = await fetchEspLogoDataUrl();
  } catch {
    /* sans logo */
  }

  const sections = buildEleveFicheSections(eleve).filter((s) => !s.isDocuments);
  const fullName = `${safe(eleve.prenom)} ${safe(eleve.nom)}`.replace(/—/g, '').trim() || 'Étudiant';
  const dateStr = new Date().toLocaleDateString('fr-FR');

  const renderPageHeader = () => {
    drawOfficialHeader(doc, pageW, logoDataUrl);

    let y = HEADER_H + 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...NAVY);
    doc.text('Dossier militaire de l’étudiant', pageW / 2, y, { align: 'center' });

    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`${fullName} · Matricule ${safe(eleve.matricule)}`, pageW / 2, y, { align: 'center' });

    y += 6;
    doc.setFontSize(9);
    doc.text(`Établi le ${dateStr} — ${APP_NAME}`, pageW / 2, y, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    return y + 8;
  };

  let y = renderPageHeader();
  let sectionNum = 0;

  sections.forEach((section) => {
    const allFields = [
      ...(section.fields || []),
      ...(section.parentsFields || []),
    ];
    const rows = allFields
      .filter((f) => f.value != null && String(f.value).trim() !== '')
      .map((f) => [sanitizeExportText(f.label), safe(f.value)]);

    if (!rows.length) return;

    sectionNum += 1;
    const blockH = 10 + rows.length * 6 + 6;
    if (y + blockH > pageH - 20) {
      doc.addPage();
      y = renderPageHeader();
    }

    doc.setFillColor(245, 247, 250);
    doc.roundedRect(margin, y, pageW - margin * 2, 7.5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...NAVY);
    doc.text(`${sectionNum}. ${section.title}`, margin + 3, y + 5);
    y += 9;

    autoTable(doc, {
      startY: y,
      body: rows,
      theme: 'plain',
      styles: {
        fontSize: 9,
        cellPadding: { top: 1.5, right: 2.5, bottom: 1.5, left: 2.5 },
        lineColor: [220, 225, 230],
        lineWidth: 0.15,
        textColor: [30, 41, 59],
      },
      columnStyles: {
        0: { cellWidth: 58, fontStyle: 'bold', fillColor: [248, 250, 252] },
        1: { cellWidth: 'auto' },
      },
      margin: { left: margin, right: margin },
    });

    y = doc.lastAutoTable.finalY + 5;
  });

  const pageCount = doc.getNumberOfPages();
  const brand = INSTITUTION.nomComplet || APP_NAME;
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`${brand} — Page ${i}/${pageCount}`, pageW / 2, pageH - 8, { align: 'center' });
    doc.setDrawColor(...GOLD);
    doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
  }

  const mat = String(eleve.matricule ?? 'etudiant').replace(/\s/g, '');
  doc.save(`dossier-etudiant-${mat}.pdf`);
}
