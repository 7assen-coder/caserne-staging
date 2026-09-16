/**
 * Pure jsPDF drawing for Fiche mesure GP (browser + Node preview).
 */
import {
  FICHE_MESURE_LAYOUT,
  encodeMesuresPayload,
  GP_GREEN,
  NAVY,
  RED,
  LINE,
  PAGE,
  MEASURE_VALUE_ROW,
} from './ficheMesureLayout.js';

function safe(v) {
  if (v == null || v === '') return '';
  return String(v)
    .replace(/1ʳᵉ/gi, '1re')
    .replace(/2ᵉ/gi, '2e')
    .replace(/3ᵉ/gi, '3e')
    .replace(/[\u02B0-\u02FF]/g, '')
    .replace(/[\u2070-\u209F]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function formatMeasure(v) {
  const s = safe(v);
  if (!s) return '';
  const n = Number(String(s).replace(',', '.'));
  if (Number.isFinite(n)) {
    return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
  }
  return s;
}

function clipText(doc, text, maxW) {
  let value = text;
  while (value.length > 1 && doc.getTextWidth(value) > maxW) {
    value = `${value.slice(0, -2)}…`;
  }
  return value;
}

function drawHeaderCell(doc, cell, value) {
  const { x, y, w, h, label, valueX, valueY, maxW, size } = cell;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.25);
  doc.rect(x, y, w, h);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text(label, x + 2.5, y + 4);

  const raw = safe(value);
  if (!raw) return;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(size);
  doc.setTextColor(...NAVY);
  doc.text(clipText(doc, raw, maxW), valueX, valueY);
  doc.setTextColor(0, 0, 0);
}

function drawMeasureCard(doc, card, value, diagramDataUrl) {
  const { x, y, w, h, n, label, valueLineY, valueRightX, dashLeft, dashRight, cmX, size, showCm } =
    card;
  const row = MEASURE_VALUE_ROW;

  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.rect(x, y, w, h, 'S');

  const cx = x + 5;
  const cy = y + 5.5;
  doc.setFillColor(...RED);
  doc.circle(cx, cy, 3.2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(String(n), cx, cy + 1.1, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...NAVY);
  doc.text(`${label} :`, x + w - 2.5, y + 4.5, { align: 'right' });

  if (diagramDataUrl) {
    const maxW = w - 10;
    const maxH = h - 20;
    let imgW = maxW * 0.72;
    let imgH = maxH;
    if (imgW / imgH > 0.9) imgW = imgH * 0.75;
    if (imgW / imgH < 0.55) imgH = imgW / 0.65;
    if (imgH > maxH) {
      imgH = maxH;
      imgW = imgH * 0.72;
    }
    const imgX = x + (w - imgW) / 2;
    const imgY = y + 8;
    try {
      doc.addImage(diagramDataUrl, 'PNG', imgX, imgY, imgW, imgH);
    } catch {
      // skip
    }
  }

  // Dotted value line (same baseline as digits for every card)
  doc.setDrawColor(160, 160, 160);
  doc.setLineWidth(0.2);
  doc.setLineDashPattern([0.6, 0.6], 0);
  doc.line(dashLeft, valueLineY, dashRight, valueLineY);
  doc.setLineDashPattern([], 0);

  if (showCm) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(row.cmFontSize);
    doc.setTextColor(80, 80, 80);
    doc.text('CM', cmX, valueLineY, { align: 'right' });
  }

  const formatted = formatMeasure(value);
  if (formatted) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(size);
    doc.setTextColor(...NAVY);
    const tw = doc.getTextWidth(formatted);
    doc.text(formatted, valueRightX - tw, valueLineY);
  }
  doc.setTextColor(0, 0, 0);
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {{ nom?: string, prenom?: string, date?: string, grade?: string, corps?: string, measures?: Record<string, string|number|null|undefined> }} data
 * @param {{ logo?: string, diagrams?: Record<string, string> }} assets
 */
export function renderFicheMesurePage(doc, data, assets = {}) {
  const L = FICHE_MESURE_LAYOUT;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(L.title.size);
  doc.setTextColor(...NAVY);
  doc.text('FICHE DE MESURES HOMME', L.title.x, L.title.y);

  doc.setFillColor(...GP_GREEN);
  const titleW = doc.getTextWidth('FICHE DE MESURES HOMME');
  doc.rect(L.title.x, L.title.y + 1.5, Math.min(titleW + 4, L.titleBar.w), L.titleBar.h, 'F');

  if (assets.logo) {
    try {
      doc.addImage(assets.logo, 'PNG', L.logo.x, L.logo.y, L.logo.w, L.logo.h);
    } catch {
      // ignore
    }
  }

  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.35);
  doc.rect(L.corpsBox.x, L.corpsBox.y, L.corpsBox.w, L.corpsBox.h);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('CORPS / ADMINISTRATION', L.corpsBox.x + 2.5, L.corpsBox.y + 4.5);
  const corps = safe(data.corps);
  if (corps) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text(corps, L.corpsBox.x + 2.5, L.corpsBox.y + L.corpsBox.h - 4.5);
  }

  doc.setFillColor(...GP_GREEN);
  doc.rect(PAGE.margin - 2.5, L.headerBox.y, 2, L.headerBox.h, 'F');

  drawHeaderCell(doc, L.header.nom, data.nom);
  drawHeaderCell(doc, L.header.date, data.date);
  drawHeaderCell(doc, L.header.prenom, data.prenom);
  drawHeaderCell(doc, L.header.grade, data.grade);

  for (const card of L.measureCards) {
    drawMeasureCard(doc, card, data.measures?.[card.key], assets.diagrams?.[card.key]);
  }

  const sig = L.signature;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.35);
  doc.rect(sig.x, sig.y, sig.w, sig.h);
  doc.setFillColor(...GP_GREEN);
  doc.rect(sig.x, sig.y, 2, sig.h, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('SIGNATURE', sig.x + 4, sig.y + 4);

  const payload = encodeMesuresPayload(data.measures || {});
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4);
  doc.setTextColor(255, 255, 255);
  doc.text(payload, 5, 292);
  doc.setTextColor(0, 0, 0);
}

export { safe, formatMeasure };
