/**
 * Export liste étudiants — mise en page inspirée des documents académiques (titres centrés,
 * marges, tableaux sobres ; rendu proche des conventions « article » LaTeX sans fichier .tex).
 * PDF : jsPDF + autopTable (Times).
 * Word : DOCX avec logo ESP.
 * Excel : grille lisible avec colonnes dimensionnées.
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ImageRun,
  HeadingLevel,
} from 'docx';
import { saveAs } from 'file-saver';

const INSTITUTION_SHORT = 'École Supérieure Polytechnique';
const INSTITUTION_AR = 'المدرسة العليا متعددة التقنيات';

/** Charge le logo depuis /esp-logo.png (public). */
export async function fetchEspLogoBuffer() {
  const res = await fetch(`${import.meta.env.BASE_URL}esp-logo.png`);
  if (!res.ok) throw new Error('Logo ESP introuvable (esp-logo.png).');
  return new Uint8Array(await res.arrayBuffer());
}

export async function fetchEspLogoDataUrl() {
  const buf = await fetchEspLogoBuffer();
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode.apply(null, buf.subarray(i, i + chunk));
  }
  return `data:image/png;base64,${btoa(binary)}`;
}

/** Données tabulaires pour les exports */
export function rowsToExportMatrix(eleves) {
  return eleves.map((e) => [
    e.matricule ?? '',
    `${e.nom ?? ''} ${e.prenom ?? ''}`.trim(),
    e.sexe === 'F' ? 'F' : 'M',
    e.scolarite?.filiere ?? '—',
    e.scolarite?.niveau ?? '—',
    e.nni ?? '',
    e.contact?.emailPerso ?? e.contact?.email ?? '',
    e.contact?.telephone ?? '',
  ]);
}

const HEADERS = ['Matricule', 'Nom & prénom', 'Sexe', 'Département', 'Année (niveau)', 'NNI', 'Email', 'Téléphone'];

export async function exportEtudiantsExcel(eleves, filenameBase = 'liste-etudiants') {
  const XLSX = await import('xlsx');
  const matrix = rowsToExportMatrix(eleves);
  const sheetData = [HEADERS, ...matrix];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!cols'] = HEADERS.map((_, i) => ({
    wch: i === 1 ? 28 : i === 6 ? 30 : i === 7 ? 14 : 18,
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Étudiants');
  XLSX.writeFile(wb, `${filenameBase}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function exportEtudiantsPdf(eleves, meta = {}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  try {
    const dataUrl = await fetchEspLogoDataUrl();
    doc.addImage(dataUrl, 'PNG', 14, 8, 22, 22);
  } catch {
    /* sans logo si échec réseau */
  }

  doc.setFont('times', 'bold');
  doc.setFontSize(13);
  doc.text(INSTITUTION_SHORT, pageW / 2, 18, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('times', 'italic');
  doc.text(meta.subtitle ?? INSTITUTION_AR, pageW / 2, 24, { align: 'center' });
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text(meta.title ?? 'Liste des étudiants — Direction de la scolarité', pageW / 2, 31, { align: 'center' });
  doc.setDrawColor(180, 180, 180);
  doc.line(14, 34, pageW - 14, 34);

  const body = rowsToExportMatrix(eleves);
  autoTable(doc, {
    startY: 37,
    head: [HEADERS],
    body,
    styles: {
      font: 'times',
      fontSize: 7,
      cellPadding: 1.5,
      valign: 'middle',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [15, 27, 51],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
    tableWidth: 'auto',
    horizontalPageBreak: true,
    didDrawPage(data) {
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(
        `Document généré le ${new Date().toLocaleDateString('fr-FR')} — ${eleves.length} étudiant(s)`,
        pageW / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' },
      );
      doc.setTextColor(0);
    },
  });

  doc.save(`${meta.filenameBase ?? 'liste-etudiants'}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function exportEtudiantsDocx(eleves, meta = {}) {
  const logoBuf = await fetchEspLogoBuffer();

  const headerParas = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new ImageRun({
          data: logoBuf,
          transformation: { width: 140, height: 140 },
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.TITLE,
      children: [
        new TextRun({ text: INSTITUTION_SHORT, bold: true, size: 28, font: 'Times New Roman' }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: meta.title ?? 'Liste des étudiants — Direction de la scolarité',
          italics: true,
          size: 22,
          font: 'Times New Roman',
        }),
      ],
    }),
  ];

  const border = {
    top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
  };

  const headerRow = new TableRow({
    children: HEADERS.map(
      (h) =>
        new TableCell({
          borders: border,
          children: [
            new Paragraph({
              children: [new TextRun({ text: h, bold: true, color: '0F1B33', size: 18 })],
            }),
          ],
        }),
    ),
  });

  const dataRows = rowsToExportMatrix(eleves).map(
    (cells) =>
      new TableRow({
        children: cells.map(
          (c) =>
            new TableCell({
              borders: border,
              width: { size: 12.5, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: String(c), size: 18 })],
                }),
              ],
            }),
        ),
      }),
  );

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [...headerParas, table,
          new Paragraph({
            spacing: { before: 200 },
            children: [
              new TextRun({
                text: `${eleves.length} étudiant(s) · ${new Date().toLocaleString('fr-FR')}`,
                size: 18,
                color: '666666',
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${meta.filenameBase ?? 'liste-etudiants'}-${new Date().toISOString().slice(0, 10)}.docx`);
}
