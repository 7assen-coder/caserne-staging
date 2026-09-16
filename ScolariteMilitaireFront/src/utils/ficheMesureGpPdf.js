/**
 * Fiche mesure GP — composed PDF (no template-bg overlay).
 */
import { jsPDF } from 'jspdf';
import { saveAs } from './saveAsFile.js';
import { sanitizeExportText } from './etudiantsListExport';
import {
  FICHE_MESURE_LAYOUT,
  MEASURE_KEYS,
  LOGO_PATH,
} from './ficheMesureLayout.js';
import { renderFicheMesurePage } from './ficheMesureRender.js';
import { INSTITUTION } from '../data/institution.js';
import { formatSectionLabel } from './eleveScolariteAuto.js';

export { renderFicheMesurePage } from './ficheMesureRender.js';

const BASE = import.meta.env.BASE_URL;
const imageCache = new Map();

async function loadImageDataUrl(relPath, loader) {
  if (imageCache.has(relPath)) return imageCache.get(relPath);
  let dataUrl;
  if (loader) {
    dataUrl = await loader(relPath);
  } else {
    const res = await fetch(`${BASE}${relPath}`);
    if (!res.ok) throw new Error(`Asset introuvable : ${relPath}`);
    const buf = new Uint8Array(await res.arrayBuffer());
    let binary = '';
    for (let i = 0; i < buf.length; i += 8192) {
      binary += String.fromCharCode.apply(null, buf.subarray(i, i + 8192));
    }
    const mime = relPath.endsWith('.png') ? 'image/png' : 'image/jpeg';
    dataUrl = `data:${mime};base64,${btoa(binary)}`;
  }
  imageCache.set(relPath, dataUrl);
  return dataUrl;
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
  return [safe(compagnie), safe(formatSectionLabel(section, compagnie))].filter(Boolean).join(' · ');
}

function collectMeasures({ eleve, mensurations, taille, poids }) {
  const m = mensurations || eleve?.dossierMilitaire || {};
  return {
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
    poids: poids ?? eleve?.sante?.poids,
  };
}

/**
 * @param {{ eleve?: object, mensurations?: object, taille?: string|number, poids?: string|number }} opts
 * @param {{ loadImage?: (path: string) => Promise<string> }} [io]
 */
export async function buildFicheMesureGpBlob(opts = {}, io = {}) {
  const m = opts.mensurations || opts.eleve?.dossierMilitaire || {};
  const compagnie = m.compagnie ?? opts.eleve?.compagnie;
  const section = m.section ?? opts.eleve?.section;
  const measures = collectMeasures(opts);

  const measuresFmt = {};
  for (const key of MEASURE_KEYS) {
    const v = measures[key];
    if (v == null || String(v).trim() === '') continue;
    measuresFmt[key] = formatMeasure(v);
  }

  const loader = io.loadImage;
  const logo = await loadImageDataUrl(LOGO_PATH, loader);
  /** @type {Record<string, string>} */
  const diagrams = {};
  await Promise.all(
    FICHE_MESURE_LAYOUT.measureCards.map(async (card) => {
      try {
        diagrams[card.key] = await loadImageDataUrl(card.diagram, loader);
      } catch {
        // optional
      }
    }),
  );

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  renderFicheMesurePage(
    doc,
    {
      nom: opts.eleve?.nom,
      prenom: opts.eleve?.prenom,
      date: new Date().toLocaleDateString('fr-FR'),
      grade: buildGrade(compagnie, section),
      corps: INSTITUTION.nomCourt,
      measures: measuresFmt,
    },
    { logo, diagrams },
  );

  return doc.output('blob');
}

export async function downloadFicheMesureGp(opts = {}) {
  const blob = await buildFicheMesureGpBlob(opts);
  const mat = safe(opts.eleve?.matricule) || 'etudiant';
  saveAs(blob, `fiche-mesure-${mat}.pdf`);
}

export async function generateFicheTaillesPdf(opts) {
  return downloadFicheMesureGp(opts);
}

export { parseFicheTaillesText } from './ficheTaillesParse.js';
export {
  FICHE_MESURE_LAYOUT,
  parseMesuresPayload,
  encodeMesuresPayload,
  MEASURE_KEYS,
} from './ficheMesureLayout.js';
