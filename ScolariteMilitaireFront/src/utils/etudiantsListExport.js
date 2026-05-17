import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';
import { buildExportMatrix } from '../data/etudiantColonnes';
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
    .replace(/[\u02B0-\u02FF\u2070-\u209F\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
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
  const res = await fetch(`${import.meta.env.BASE_URL}esp-logo.png`);
  if (!res.ok) throw new Error('Logo ESP introuvable (esp-logo.png).');
  const buf = new Uint8Array(await res.arrayBuffer());
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode.apply(null, buf.subarray(i, i + chunk));
  }
  return `data:image/png;base64,${btoa(binary)}`;
}

function colWidths(headers) {
  return headers.map((h) => {
    const l = h.toLowerCase();
    if (l.includes('nom')) return 28;
    if (l.includes('mail') || l.includes('adresse') || l.includes('établissement')) return 32;
    if (l.includes('téléphone') || l.includes('whatsapp')) return 14;
    if (l.includes('compagnie')) return 18;
    return 16;
  });
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
          font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
          fill: { fgColor: { rgb: '487346' } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
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

  ws['!cols'] = colWidths(headers).map((wch) => ({ wch }));
  ws['!rows'] = [{ hpt: 22 }];
}

export async function exportEtudiantsExcel(
  eleves,
  colonneIds,
  filenameBase = 'liste-etudiants-esp',
) {
  const { headers, rows } = matrixForExport(eleves, colonneIds);
  if (!headers.length) {
    throw new Error('Sélectionnez au moins une colonne à exporter.');
  }

  const XLSX = await import('xlsx-js-style');
  const sheetData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  styleWorksheet(ws, XLSX, headers);

  const wb = XLSX.utils.book_new();
  wb.Props = { Title: `${APP_NAME} — Liste des étudiants`, Author: APP_NAME };
  XLSX.utils.book_append_sheet(wb, ws, 'Étudiants');
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

  try {
    const dataUrl = await fetchEspLogoDataUrl();
    doc.addImage(dataUrl, 'PNG', 14, 8, 20, 20);
  } catch {
    /* logo optionnel */
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(APP_NAME, pageW / 2, 16, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(title, pageW / 2, 23, { align: 'center' });
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(
    `École supérieure polytechnique — ${new Date().toLocaleDateString('fr-FR')}`,
    pageW / 2,
    28,
    { align: 'center' },
  );
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 33,
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
