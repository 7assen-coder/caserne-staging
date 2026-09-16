import { describe, expect, it } from 'vitest';
import {
  encodeMesuresPayload,
  parseMesuresPayload,
  FIELD_PATHS,
  FICHE_MESURE_LAYOUT,
  MEASURE_KEYS,
} from './ficheMesureLayout.js';
import { extractPayloadFromPdfBuffer, mesuresToFormEntries } from './ficheMesureImport.js';
import { parseFicheTaillesText } from './ficheTaillesParse.js';

describe('ficheMesure layout', () => {
  it('defines 10 measure cards with diagrams and OCR crops', () => {
    expect(FICHE_MESURE_LAYOUT.measureCards).toHaveLength(10);
    expect(MEASURE_KEYS).toHaveLength(10);
    for (const card of FICHE_MESURE_LAYOUT.measureCards) {
      expect(card.diagram).toMatch(/^fiche-mesure\/diagrams\/.+\.png$/);
      expect(card.crop.w).toBeGreaterThan(0);
      expect(card.label).toBeTruthy();
      expect(card.valueLineY).toBe(card.y + card.h - 5);
      expect(card.valueRightX).toBeGreaterThan(card.dashLeft);
      expect(FICHE_MESURE_LAYOUT.measurements[card.key]).toBe(card);
    }
    expect(FICHE_MESURE_LAYOUT.header.nom.label).toBe('NOM');
    expect(FICHE_MESURE_LAYOUT.header.prenom.label).toBe('PRÉNOM');
  });
});

describe('ficheMesure payload', () => {
  it('round-trips measure keys without fusion', () => {
    const payload = encodeMesuresPayload({
      tailleCm: 175,
      tourPoitrine: 98,
      tourCeinture: 82,
      tourTaille: 80,
    });
    expect(payload.startsWith('ESP-MESURES:')).toBe(true);
    const parsed = parseMesuresPayload(payload);
    expect(parsed).toEqual({
      tailleCm: '175',
      tourPoitrine: '98',
      tourCeinture: '82',
      tourTaille: '80',
    });
  });

  it('extracts payload from PDF-like binary buffer', () => {
    const line = encodeMesuresPayload({ tailleCm: '180', tourPoitrine: '100' });
    const fakePdf = `%PDF-1.4\nBT (${line}) Tj\nET\n%%EOF`;
    const buf = new TextEncoder().encode(fakePdf).buffer;
    expect(extractPayloadFromPdfBuffer(buf)).toEqual({
      tailleCm: '180',
      tourPoitrine: '100',
    });
  });

  it('maps values to form paths', () => {
    const entries = mesuresToFormEntries({
      tailleCm: '175',
      tourPoitrine: '98',
      poids: '70',
    });
    expect(entries).toEqual([
      [FIELD_PATHS.tailleCm, '175'],
      [FIELD_PATHS.tourPoitrine, '98'],
      [FIELD_PATHS.poids, '70'],
    ]);
  });
});

describe('parseFicheTaillesText', () => {
  it('distinguishes taille stature from tour de taille', () => {
    const parsed = parseFicheTaillesText(`
taille: 175
tour de taille: 80
tour poitrine: 98
tour ceinture: 82
`);
    expect(parsed.tailleCm).toBe('175');
    expect(parsed.tourTaille).toBe('80');
    expect(parsed.tourPoitrine).toBe('98');
    expect(parsed.tourCeinture).toBe('82');
  });
});
