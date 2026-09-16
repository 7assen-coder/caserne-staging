import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from './saveAsFile.js';
import { buildExportMatrix, resolveColonnesExportSansMensurations } from '../data/etudiantColonnes';
import { APP_NAME } from '../data/institution';

const BORDER = {
  top: { style: 'thin', color: { rgb: 'CCCCCC' } },
  bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
  left: { style: 'thin', color: { rgb: 'CCCCCC' } },
  right: { style: 'thin', color: { rgb: 'CCCCCC' } },
};

/** Normalise le texte pour Excel/PDF (superscripts, caractères spéciaux). */
export function sanitizeExportText(value) {
  if (value == null || value === '') return '';
  return String(value)
    .replace(/1ʳᵉ/gi, '1re')
    .replace(/2ᵉ/gi, '2e')
    .replace(/3ᵉ/gi, '3e')
    .replace(/(\d)\s*ʳ\s*ᵉ/gi, '$1re')
    .replace(/(\d)\s*ᵉ/gi, '$1e')
    .replace(/[\u02B0-\u02FF]/g, '')
    .replace(/[\u2070-\u209F]/g, '')
    .replace(/[\u0300-\u036F]/g, '')
    .replace(/\uFFFD/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function matrixForExport(eleves, colonneIds) {
  const { headers, rows, cols } = buildExportMatrix(eleves, colonneIds);
  return {
    headers: headers.map(sanitizeExportText),
    rows: rows.map((row) => row.map(sanitizeExportText)),
    cols,
  };
}

export async function fetchEspLogoDataUrl() {
  const candidates = ['esp-logo.png', 'fiche-mesure/gp-logo.png'];
  let lastErr = null;
  for (const name of candidates) {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}${name}`);
      if (!res.ok) continue;
      const buf = new Uint8Array(await res.arrayBuffer());
      let binary = '';
      const chunk = 8192;
      for (let i = 0; i < buf.length; i += chunk) {
        binary += String.fromCharCode.apply(null, buf.subarray(i, i + chunk));
      }
      return `data:image/png;base64,${btoa(binary)}`;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error('Logo ESP introuvable.');
}

function dateSuffix() {
  return new Date().toISOString().slice(0, 10);
}

function exportFilename(base) {
  return `${base}-${dateSuffix()}`;
}

function styleWorksheet(ws, XLSX, headers) {
  const ref = ws['!ref'];
  if (!ref) return;
  const range = XLSX.utils.decode_range(ref);

  for (let R = range.s.r; R <= range.e.r; R += 1) {
    for (let C = range.s.c; C <= range.e.c; C += 1) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };

      if (R === 0) {
        ws[addr].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
          fill: { fgColor: { rgb: '1B2A4A' } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          border: BORDER,
        };
      } else {
        ws[addr].s = {
          font: { sz: 10, color: { rgb: '1E293B' } },
          fill: R % 2 === 0 ? { fgColor: { rgb: 'F7F8FA' } } : { fgColor: { rgb: 'FFFFFF' } },
          alignment: { vertical: 'center', wrapText: true },
          border: BORDER,
        };
      }
    }
  }

  ws['!cols'] = headers.map((h) => ({
    wch: Math.min(40, Math.max(12, String(h).length + 4)),
  }));
  ws['!rows'] = [{ hpt: 28 }];
  ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft' };
}

export async function exportEtudiantsExcel(
  eleves,
  colonneIds,
  filenameBase = 'liste-etudiants-esp',
) {
  const exportIds = resolveColonnesExportSansMensurations(colonneIds).map((c) => c.id);
  const { headers, rows } = matrixForExport(eleves, exportIds);
  if (!headers.length) {
    throw new Error('Sélectionnez au moins une colonne à exporter (hors mensurations).');
  }

  const XLSX = await import('xlsx-js-style');
  const sheetData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  styleWorksheet(ws, XLSX, headers);

  const wb = XLSX.utils.book_new();
  wb.Props = {
    Title: `${APP_NAME} — Registre étudiants`,
    Author: APP_NAME,
    Comments: 'Mensurations exclues — une ligne par étudiant.',
  };
  XLSX.utils.book_append_sheet(wb, ws, 'Registre');
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `${exportFilename(filenameBase)}.xlsx`,
  );
}

export async function exportEtudiantsPdf(eleves, colonneIds, meta = {}) {
  const { headers, rows } = matrixForExport(eleves, colonneIds);
  if (!headers.length) {
    throw new Error('Sélectionnez au moins une colonne à exporter.');
  }

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const HEADER_H = 22;
  const title = sanitizeExportText(
    String(meta.title ?? 'Liste des étudiants').replace(new RegExp(`\\s*[—-]\\s*${APP_NAME}\\s*$`, 'i'), '').trim()
      || 'Liste des étudiants',
  );
  const dateStr = new Date().toLocaleDateString('fr-FR');

  let logoDataUrl = null;
  try {
    logoDataUrl = await fetchEspLogoDataUrl();
  } catch {
    /* logo optionnel */
  }

  doc.setFillColor(72, 115, 70);
  doc.rect(0, 0, pageW, HEADER_H, 'F');
  doc.setFillColor(200, 165, 78);
  doc.rect(0, HEADER_H, pageW, 1.2, 'F');

  const logoSize = 12;
  const logoX = 10;
  const logoY = (HEADER_H - logoSize) / 2;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoSize, logoSize);
    } catch {
      /* ignore */
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  const textX = logoDataUrl ? logoX + logoSize + 5 : pageW / 2;
  doc.text('ÉCOLE SUPÉRIEURE POLYTECHNIQUE', textX, HEADER_H / 2 + 1.5, {
    align: logoDataUrl ? 'left' : 'center',
  });
  doc.setTextColor(0, 0, 0);

  let y = HEADER_H + 9;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 27, 51);
  doc.text(title, pageW / 2, y, { align: 'center' });

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(`${dateStr} · ${eleves.length} dossier(s)`, pageW / 2, y, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  autoTable(doc, {
    startY: y + 6,
    head: [headers],
    body: rows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 1.8,
      valign: 'middle',
      overflow: 'linebreak',
      lineColor: [180, 180, 180],
      lineWidth: 0.2,
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [72, 115, 70],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    alternateRowStyles: { fillColor: [247, 248, 250] },
    margin: { left: 10, right: 10 },
    tableWidth: 'auto',
    horizontalPageBreak: true,
    didDrawPage(data) {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(100);
      doc.text(
        `${APP_NAME} — Page ${data.pageNumber}/${pageCount}`,
        pageW / 2,
        pageH - 6,
        { align: 'center' },
      );
      doc.setTextColor(0);
    },
  });

  doc.save(`${exportFilename(meta.filenameBase ?? 'liste-etudiants-esp')}.pdf`);
}
