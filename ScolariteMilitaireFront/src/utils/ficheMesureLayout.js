/**
 * Drawn-grid layout for Fiche mesure GP (no template-bg overlay).
 * Shared by export (jsPDF), import OCR crops, and preview script.
 */

/** @typedef {{ x: number, y: number, w: number, h: number, label: string, valueX: number, valueY: number, maxW: number, size: number, crop: { x: number, y: number, w: number, h: number } }} HeaderCell */
/** @typedef {{ key: string, n: number, label: string, diagram: string, x: number, y: number, w: number, h: number, valueLineY: number, valueRightX: number, dashLeft: number, dashRight: number, cmX: number, size: number, showCm?: boolean, crop: { x: number, y: number, w: number, h: number } }} MeasureCard */

export const PAGE = { w: 210, h: 297, margin: 10 };
export const GP_GREEN = [34, 120, 72];
export const NAVY = [15, 27, 51];
export const RED = [190, 40, 40];
export const LINE = [90, 90, 90];

const M = PAGE.margin;
const usableW = PAGE.w - M * 2; // 190

/** Header table geometry */
const HEADER = {
  x: M,
  y: 38,
  w: usableW,
  rowH: 14,
  colW: usableW / 2,
};

/**
 * @returns {Record<string, HeaderCell>}
 */
function buildHeader() {
  const { x, y, colW, rowH } = HEADER;
  const mk = (key, label, col, row, size = 10) => {
    const cx = x + col * colW;
    const cy = y + row * rowH;
    const valueX = cx + 3;
    // Label near top; value ~2mm below label baseline, clear of bottom border
    const valueY = cy + 10.5;
    return {
      key,
      label,
      x: cx,
      y: cy,
      w: colW,
      h: rowH,
      valueX,
      valueY,
      maxW: colW - 6,
      size,
      crop: { x: valueX, y: valueY - 4.5, w: colW - 8, h: 5.5 },
    };
  };
  return {
    nom: mk('nom', 'NOM', 0, 0),
    date: mk('date', 'DATE', 1, 0),
    prenom: mk('prenom', 'PRÉNOM', 0, 1),
    grade: mk('grade', 'GRADE', 1, 1, 9),
  };
}

/** Measure card grid: 3 cols × 4 rows (last row has 2 cards + signature). */
const CARD_GAP = 2.5;
const CARD_COLS = 3;
const CARD_W = (usableW - CARD_GAP * (CARD_COLS - 1)) / CARD_COLS;
const CARD_H = 45;
const CARDS_TOP = 70;

/** Shared value row geometry (all 10 cards — same as TAILLE). */
export const MEASURE_VALUE_ROW = {
  /** Baseline for dotted line + digits (mm from card bottom). */
  bottomInset: 5,
  dashLeft: 4,
  gapBeforeCm: 1.5,
  cmRight: 2.5,
  cmFontSize: 9,
  valueFontSize: 18,
  /** Reserved width for « CM » on the right. */
  cmReserve: 16,
  /** Right inset when there is no CM suffix (pointure). */
  noCmRight: 4,
};

const MEASURE_DEFS = [
  { key: 'tailleCm', n: 1, label: 'TAILLE', diagram: 'fiche-mesure/diagrams/taille.png', showCm: true },
  { key: 'tourPoitrine', n: 2, label: 'TOUR DE POITRINE', diagram: 'fiche-mesure/diagrams/tour-poitrine.png', showCm: true },
  { key: 'tourCeinture', n: 3, label: 'TOUR DE CEINTURE', diagram: 'fiche-mesure/diagrams/tour-ceinture.png', showCm: true },
  { key: 'tourTaille', n: 4, label: 'TOUR DE TAILLE', diagram: 'fiche-mesure/diagrams/tour-taille.png', showCm: true },
  { key: 'tourBassin', n: 5, label: 'TOUR DE BASSIN', diagram: 'fiche-mesure/diagrams/tour-bassin.png', showCm: true },
  { key: 'tourCou', n: 6, label: 'TOUR DE COU', diagram: 'fiche-mesure/diagrams/tour-cou.png', showCm: true },
  { key: 'longueurManche', n: 7, label: 'LONGUEUR MANCHE', diagram: 'fiche-mesure/diagrams/longueur-manche.png', showCm: true },
  { key: 'longueurDos', n: 8, label: 'LONGUEUR DOS', diagram: 'fiche-mesure/diagrams/longueur-dos.png', showCm: true },
  { key: 'pointure', n: 9, label: 'POINTURE', diagram: 'fiche-mesure/diagrams/pointure.png', showCm: false },
  { key: 'longueurCote', n: 10, label: 'LONGUEUR CÔTÉ', diagram: 'fiche-mesure/diagrams/longueur-cote.png', showCm: true },
];

/**
 * @returns {MeasureCard[]}
 */
function buildMeasureCards() {
  return MEASURE_DEFS.map((def, i) => {
    const col = i % CARD_COLS;
    const gridRow = Math.floor(i / CARD_COLS);
    const x = M + col * (CARD_W + CARD_GAP);
    const y = CARDS_TOP + gridRow * (CARD_H + CARD_GAP);
    const valueRow = MEASURE_VALUE_ROW;
    const valueLineY = y + CARD_H - valueRow.bottomInset;
    const showCm = def.showCm !== false;
    const valueRightX = showCm
      ? x + CARD_W - valueRow.cmRight - valueRow.cmReserve
      : x + CARD_W - valueRow.noCmRight;
    const cropW = 28;
    return {
      ...def,
      x,
      y,
      w: CARD_W,
      h: CARD_H,
      valueLineY,
      valueRightX,
      dashLeft: x + valueRow.dashLeft,
      dashRight: valueRightX + 0.5,
      cmX: x + CARD_W - valueRow.cmRight,
      size: valueRow.valueFontSize,
      showCm,
      crop: {
        x: valueRightX - cropW,
        y: valueLineY - 7,
        w: cropW,
        h: 9,
      },
    };
  });
}

const measureCards = buildMeasureCards();
/** @type {Record<string, MeasureCard>} */
const measurements = Object.fromEntries(measureCards.map((c) => [c.key, c]));

export const FICHE_MESURE_LAYOUT = {
  logo: { x: M, y: 17, w: 18, h: 17.5 },
  title: { x: M, y: 11, size: 13 },
  titleBar: { x: M, y: 12.5, w: usableW, h: 2.2 },
  corpsBox: { x: M + 22, y: 17, w: usableW - 22, h: 17.5 },
  headerBox: { x: HEADER.x, y: HEADER.y, w: HEADER.w, h: HEADER.rowH * 2 },
  header: buildHeader(),
  measureCards,
  measurements,
  signature: {
    x: M + 2 * (CARD_W + CARD_GAP),
    y: CARDS_TOP + 3 * (CARD_H + CARD_GAP),
    w: CARD_W,
    h: CARD_H,
  },
  accentBar: {
    x: M - 2,
    y: HEADER.y,
    w: 2,
    h: HEADER.rowH * 2,
  },
};

export const MEASURE_KEYS = MEASURE_DEFS.map((d) => d.key);

export const FIELD_PATHS = {
  tailleCm: 'sante.tailleCm',
  tourPoitrine: 'dossierMilitaire.tourPoitrine',
  tourCeinture: 'dossierMilitaire.tourCeinture',
  tourTaille: 'dossierMilitaire.tourTaille',
  tourBassin: 'dossierMilitaire.tourBassin',
  tourCou: 'dossierMilitaire.tourCou',
  longueurManche: 'dossierMilitaire.longueurManche',
  longueurDos: 'dossierMilitaire.longueurDos',
  longueurCote: 'dossierMilitaire.longueurCote',
  pointure: 'dossierMilitaire.pointure',
  poids: 'sante.poids',
};

export const PAYLOAD_PREFIX = 'ESP-MESURES:';
export const LOGO_PATH = 'esp-logo.png';

/**
 * @param {Record<string, string|number|null|undefined>} measures
 * @returns {string}
 */
export function encodeMesuresPayload(measures) {
  const parts = [];
  for (const key of MEASURE_KEYS) {
    const v = measures[key];
    if (v == null || String(v).trim() === '') continue;
    parts.push(`${key}=${String(v).trim().replace(/[;=]/g, '')}`);
  }
  if (measures.poids != null && String(measures.poids).trim() !== '') {
    parts.push(`poids=${String(measures.poids).trim().replace(/[;=]/g, '')}`);
  }
  return `${PAYLOAD_PREFIX}${parts.join(';')}`;
}

/**
 * @param {string} text
 * @returns {Record<string, string>}
 */
export function parseMesuresPayload(text) {
  const out = {};
  if (!text) return out;
  const idx = String(text).indexOf(PAYLOAD_PREFIX);
  if (idx < 0) return out;
  const line = String(text)
    .slice(idx + PAYLOAD_PREFIX.length)
    .split(/[\n\r]/)[0]
    .trim();
  for (const part of line.split(';')) {
    const eq = part.indexOf('=');
    if (eq <= 0) continue;
    const key = part.slice(0, eq).trim();
    const raw = part.slice(eq + 1).trim();
    const m = raw.match(/^(\d{1,3}(?:[.,]\d+)?)/);
    if (!key || !m) continue;
    if (MEASURE_KEYS.includes(key) || key === 'poids') {
      out[key] = m[1].replace(',', '.');
    }
  }
  return out;
}
