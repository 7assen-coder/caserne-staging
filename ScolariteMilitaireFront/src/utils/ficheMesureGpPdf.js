/**
 * Fiche mesure GP — fond officiel (template-bg.jpg) + valeurs dynamiques uniquement.
 * Le visuel (logo GP, diagrammes, bordures, « …… CM ») provient du modèle officiel.
 */
import { jsPDF } from 'jspdf';
import { saveAs } from './saveAsFile.js';
import { sanitizeExportText } from './etudiantsListExport';

const BASE = import.meta.env.BASE_URL;
const TEMPLATE_BG = 'fiche-mesure/template-bg.jpg';
const NAVY = [15, 27, 51];

/** Positions en mm (A4 210×297) calibrées sur « Fiche mesure GP.pdf » officiel. */
const LAYOUT = {
  header: {
    nom: { x: 23, y: 71, size: 10 },
    date: { x: 133, y: 71, size: 10 },
    prenom: { x: 23, y: 79.5, size: 10 },
    grade: { x: 115, y: 79.5, size: 9 },
  },
  measurements: {
    tailleCm: { xEnd: 53, y: 124, size: 9 },
    tourPoitrine: { xEnd: 124, y: 101, size: 9 },
    tourCeinture: { xEnd: 193, y: 101, size: 9 },
    tourTaille: { xEnd: 124, y: 124, size: 9 },
    tourBassin: { xEnd: 193, y: 124, size: 9 },
    tourCou: { xEnd: 53, y: 162, size: 9 },
    longueurManche: { xEnd: 124, y: 162, size: 9 },
    longueurDos: { xEnd: 193, y: 162, size: 9 },
    pointure: { xEnd: 53, y: 213, size: 9, gapBeforeSuffix: 2 },
    longueurCote: { xEnd: 124, y: 213, size: 9 },
  },
};

let bgCache = null;

async function loadTemplateBackground() {
  if (bgCache) return bgCache;
  const res = await fetch(`${BASE}${TEMPLATE_BG}`);
  if (!res.ok) {
    throw new Error('Modèle « Fiche mesure GP » introuvable (fiche-mesure/template-bg.jpg).');
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  let binary = '';
  for (let i = 0; i < buf.length; i += 8192) {
    binary += String.fromCharCode.apply(null, buf.subarray(i, i + 8192));
  }
  bgCache = `data:image/jpeg;base64,${btoa(binary)}`;
  return bgCache;
}

function safe(v) {
  if (v == null) return '';
  return sanitizeExportText(String(v).trim());
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

function buildGrade(compagnie, section) {
  return [safe(compagnie), safe(section)].filter(Boolean).join(' · ');
}

function drawField(doc, text, { x, y, size }) {
  const value = safe(text);
  if (!value) return;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(size);
  doc.setTextColor(...NAVY);
  doc.text(value, x, y);
  doc.setTextColor(0, 0, 0);
}

/** Valeur seule, alignée à droite juste avant « CM » déjà imprimé sur le fond. */
function drawMeasureValue(doc, text, { xEnd, y, size, gapBeforeSuffix = 7 }) {
  const value = formatMeasure(text);
  if (!value) return;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(size);
  doc.setTextColor(...NAVY);
  const w = doc.getTextWidth(value);
  doc.text(value, xEnd - w - gapBeforeSuffix, y);
  doc.setTextColor(0, 0, 0);
}

/**
 * Génère et télécharge la fiche mesure préremplie.
 * @param {{ eleve?: object, mensurations?: object, taille?: string|number, poids?: string|number }} opts
 */
export async function downloadFicheMesureGp({ eleve, mensurations, taille, poids } = {}) {
  const m = mensurations || eleve?.dossierMilitaire || {};
  const compagnie = m.compagnie ?? eleve?.compagnie;
  const section = m.section ?? eleve?.section;

  const bg = await loadTemplateBackground();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.addImage(bg, 'JPEG', 0, 0, 210, 297);

  drawField(doc, eleve?.nom, LAYOUT.header.nom);
  drawField(doc, eleve?.prenom, LAYOUT.header.prenom);
  drawField(doc, new Date().toLocaleDateString('fr-FR'), LAYOUT.header.date);
  drawField(doc, buildGrade(compagnie, section), LAYOUT.header.grade);

  const measures = {
    tailleCm: taille ?? eleve?.sante?.tailleCm,
    tourPoitrine: m.tourPoitrine,
    tourCeinture: m.tourCeinture,
    tourTaille: m.tourTaille,
    tourBassin: m.tourBassin,
    tourCou: m.tourCou,
    longueurManche: m.longueurManche,
    longueurDos: m.longueurDos,
    longueurCote: m.longueurCote,
    pointure: m.pointure,
  };

  for (const [key, pos] of Object.entries(LAYOUT.measurements)) {
    drawMeasureValue(doc, measures[key], pos);
  }

  void poids;

  const mat = safe(eleve?.matricule) || 'etudiant';
  saveAs(doc.output('blob'), `fiche-mesure-${mat}.pdf`);
}

/** Alias conservé pour le formulaire (étape militaire). */
export async function generateFicheTaillesPdf(opts) {
  return downloadFicheMesureGp(opts);
}

export { parseFicheTaillesText } from './ficheTaillesParse';
