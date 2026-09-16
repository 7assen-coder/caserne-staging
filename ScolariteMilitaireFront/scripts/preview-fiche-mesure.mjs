#!/usr/bin/env node
/**
 * Preview composed fiche mesure (no template-bg).
 * Writes .tmp/fiche-mesure-preview.pdf and .tmp/fiche-mesure-preview.png
 *
 * Usage: node scripts/preview-fiche-mesure.mjs [--crosshairs]
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { jsPDF } from 'jspdf';
import {
  FICHE_MESURE_LAYOUT,
  LOGO_PATH,
  MEASURE_KEYS,
} from '../src/utils/ficheMesureLayout.js';
import { renderFicheMesurePage } from '../src/utils/ficheMesureRender.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const publicDir = join(root, 'public');
const outDir = join(root, '.tmp');
const crosshairs = process.argv.includes('--crosshairs');

const SAMPLE = {
  nom: 'HASSEN',
  prenom: 'Med',
  date: '16/09/2026',
  grade: '2e Compagnie · Section 1',
  corps: 'ESP',
  measures: {
    tailleCm: '175',
    tourPoitrine: '98',
    tourCeinture: '82',
    tourTaille: '80',
    tourBassin: '96',
    tourCou: '38',
    longueurManche: '64',
    longueurDos: '75',
    pointure: '42',
    longueurCote: '104',
  },
};

function fileToDataUrl(absPath) {
  const buf = readFileSync(absPath);
  const mime = absPath.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

function drawCrosshair(doc, x, y, color = [220, 40, 40]) {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.15);
  doc.line(x - 2, y, x + 2, y);
  doc.line(x, y - 2, x, y + 2);
}

function main() {
  mkdirSync(outDir, { recursive: true });

  const logo = fileToDataUrl(join(publicDir, LOGO_PATH));
  /** @type {Record<string, string>} */
  const diagrams = {};
  for (const card of FICHE_MESURE_LAYOUT.measureCards) {
    diagrams[card.key] = fileToDataUrl(join(publicDir, card.diagram));
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  renderFicheMesurePage(doc, SAMPLE, { logo, diagrams });

  if (crosshairs) {
    for (const cell of Object.values(FICHE_MESURE_LAYOUT.header)) {
      drawCrosshair(doc, cell.valueX, cell.valueY, [0, 120, 200]);
      doc.setDrawColor(0, 160, 220);
      doc.rect(cell.crop.x, cell.crop.y, cell.crop.w, cell.crop.h);
    }
    for (const key of MEASURE_KEYS) {
      const card = FICHE_MESURE_LAYOUT.measurements[key];
      drawCrosshair(doc, card.valueRightX, card.valueLineY);
      doc.setDrawColor(220, 40, 40);
      doc.rect(card.crop.x, card.crop.y, card.crop.w, card.crop.h);
    }
  }

  const pdfPath = join(outDir, 'fiche-mesure-preview.pdf');
  writeFileSync(pdfPath, Buffer.from(doc.output('arraybuffer')));

  const pngBase = join(outDir, 'fiche-mesure-preview');
  const r = spawnSync('pdftoppm', ['-png', '-singlefile', '-r', '120', pdfPath, pngBase], {
    encoding: 'utf8',
  });
  if (r.status !== 0) {
    console.error(r.stderr || 'pdftoppm failed');
    process.exit(1);
  }
  console.log(`Wrote ${pdfPath}`);
  console.log(`Wrote ${pngBase}.png`);
}

main();
