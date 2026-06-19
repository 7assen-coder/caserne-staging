import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from './saveAsFile.js';
import { buildExportMatrix, buildTransposedExportMatrix } from '../data/etudiantColonnes';
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

function styleTransposedWorksheet(ws, XLSX, rowCount, colCount) {
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
      } else if (C === 0) {
        ws[addr].s = {
          font: { bold: true, sz: 10, color: { rgb: '1E293B' } },
          fill: { fgColor: { rgb: 'E8EDF4' } },
          alignment: { vertical: 'center', wrapText: true },
          border: BORDER,
        };
      } else {
        ws[addr].s = {
          font: { sz: 10, color: { rgb: '1E293B' } },
          fill: R % 2 === 0 ? { fgColor: { rgb: 'FFFFFF' } } : { fgColor: { rgb: 'F7F8FA' } },
          alignment: { vertical: 'center', wrapText: true },
          border: BORDER,
        };
      }
    }
  }

  const colWidths = [{ wch: 32 }];
  for (let c = 1; c < colCount; c += 1) colWidths.push({ wch: 22 });
  ws['!cols'] = colWidths;
  ws['!rows'] = [{ hpt: 28 }];
  ws['!freeze'] = { xSplit: 1, ySplit: 1, topLeftCell: 'B2', activePane: 'bottomRight' };
}

export async function exportEtudiantsExcel(
  eleves,
  colonneIds,
  filenameBase = 'liste-etudiants-esp',
) {
  const { rowLabels, studentHeaders, grid } = buildTransposedExportMatrix(eleves, colonneIds);
  if (!rowLabels.length) {
    throw new Error('Sélectionnez au moins une colonne à exporter (hors mensurations).');
  }

  const XLSX = await import('xlsx-js-style');
  const headerRow = ['Champ / Étudiant', ...studentHeaders];
  const dataRows = rowLabels.map((label, ri) => [label, ...grid[ri]]);
  const sheetData = [headerRow, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  styleTransposedWorksheet(ws, XLSX, dataRows.length, headerRow.length);

  const wb = XLSX.utils.book_new();
  wb.Props = {
    Title: `${APP_NAME} — Registre étudiants (transposé)`,
    Author: APP_NAME,
    Comments: 'Mensurations exclues — libellés en lignes, étudiants en colonnes.',
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
  const title = meta.title ?? `Liste des étudiants — ${APP_NAME}`;

  doc.setFillColor(72, 115, 70);
  doc.rect(0, 0, pageW, 22, 'F');
  doc.setFillColor(200, 165, 78);
  doc.rect(0, 22, pageW, 1, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('République Islamique de Mauritanie', pageW / 2, 9, { align: 'center' });
  doc.setFontSize(11);
  doc.text('ÉCOLE SUPÉRIEURE POLYTECHNIQUE', pageW / 2, 16, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  try {
    const dataUrl = await fetchEspLogoDataUrl();
    doc.addImage(dataUrl, 'PNG', 14, 26, 18, 18);
  } catch {
    /* logo optionnel */
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 27, 51);
  doc.text(APP_NAME, pageW / 2, 32, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(title, pageW / 2, 39, { align: 'center' });
  doc.setFontSize(8);
  doc.text(
    `Registre des étudiants — ${new Date().toLocaleDateString('fr-FR')} — ${eleves.length} dossier(s)`,
    pageW / 2,
    44,
    { align: 'center' },
  );
  doc.setTextColor(0, 0, 0);

  autoTable(doc, {
    startY: 48,
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
    didDrawPage() {
      doc.setFontSize(7);
      doc.setTextColor(100);
      doc.text(
        `${APP_NAME} — ${eleves.length} étudiant(s)`,
        pageW / 2,
        doc.internal.pageSize.getHeight() - 6,
        { align: 'center' },
      );
      doc.setTextColor(0);
    },
  });

  doc.save(`${exportFilename(meta.filenameBase ?? 'liste-etudiants-esp')}.pdf`);
}
