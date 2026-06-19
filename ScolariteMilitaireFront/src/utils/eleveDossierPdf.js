import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { buildEleveFicheSections } from '../data/eleveFicheSections';
import { APP_NAME, INSTITUTION } from '../data/institution';
import { fetchEspLogoDataUrl, sanitizeExportText } from './etudiantsListExport';

const NAVY = [15, 27, 51];
const GREEN = [72, 115, 70];
const GOLD = [200, 165, 78];

function safe(v) {
  if (v == null || v === '') return '—';
  return sanitizeExportText(String(v));
}

function drawOfficialHeader(doc, pageW) {
  try {
    /* logo chargé de façon asynchrone avant appel */
  } catch {
    /* optionnel */
  }

  doc.setFillColor(...GREEN);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setFillColor(...GOLD);
  doc.rect(0, 28, pageW, 1.2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('République Islamique de Mauritanie', pageW / 2, 12, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('ÉCOLE SUPÉRIEURE POLYTECHNIQUE', pageW / 2, 20, { align: 'center' });

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

  const renderPageHeader = () => {
    drawOfficialHeader(doc, pageW);
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, 'PNG', margin, 32, 16, 16);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...NAVY);
    doc.text('Dossier administratif de l’étudiant', pageW / 2, 40, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`${fullName} · Matricule ${safe(eleve.matricule)}`, pageW / 2, 47, { align: 'center' });
    doc.text(
      `Établi le ${new Date().toLocaleDateString('fr-FR')} — ${APP_NAME}`,
      pageW - margin,
      54,
      { align: 'right' },
    );
    doc.setTextColor(0, 0, 0);
    return 58;
  };

  let y = renderPageHeader();

  sections.forEach((section, idx) => {
    const rows = section.fields
      .filter((f) => f.value != null && String(f.value).trim() !== '')
      .map((f) => [f.label, safe(f.value)]);

    if (!rows.length) return;

    const blockH = 12 + rows.length * 7 + 8;
    if (y + blockH > pageH - 20) {
      doc.addPage();
      y = renderPageHeader();
    }

    doc.setFillColor(245, 247, 250);
    doc.roundedRect(margin, y, pageW - margin * 2, 8, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text(`${idx + 1}. ${section.title}`, margin + 3, y + 5.5);
    y += 10;

    autoTable(doc, {
      startY: y,
      body: rows,
      theme: 'plain',
      styles: {
        fontSize: 9,
        cellPadding: { top: 2, right: 3, bottom: 2, left: 3 },
        lineColor: [220, 225, 230],
        lineWidth: 0.2,
        textColor: [30, 41, 59],
      },
      columnStyles: {
        0: { cellWidth: 62, fontStyle: 'bold', fillColor: [248, 250, 252] },
        1: { cellWidth: 'auto' },
      },
      margin: { left: margin, right: margin },
    });

    y = doc.lastAutoTable.finalY + 6;
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `${INSTITUTION.nomCompletEn} — Document officiel — Page ${i}/${pageCount}`,
      pageW / 2,
      pageH - 8,
      { align: 'center' },
    );
    doc.setDrawColor(...GOLD);
    doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
  }

  const mat = String(eleve.matricule ?? 'etudiant').replace(/\s/g, '');
  doc.save(`dossier-etudiant-${mat}.pdf`);
}
