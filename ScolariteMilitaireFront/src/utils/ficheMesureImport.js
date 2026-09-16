/**
 * Import mensurations from .txt/.csv or fiche-mesure PDF.
 * Priority: ESP-MESURES payload → zone OCR → keyword text parse.
 */
import { parseFicheTaillesText } from './ficheTaillesParse.js';
import {
  FICHE_MESURE_LAYOUT,
  FIELD_PATHS,
  MEASURE_KEYS,
  parseMesuresPayload,
  PAYLOAD_PREFIX,
} from './ficheMesureLayout.js';

const A4_W_MM = 210;
const A4_H_MM = 297;

/**
 * @param {Record<string, string>} values
 * @returns {Array<[string, string]>}
 */
export function mesuresToFormEntries(values) {
  const entries = [];
  for (const [key, val] of Object.entries(values || {})) {
    const path = FIELD_PATHS[key];
    if (path && val != null && String(val).trim() !== '') {
      entries.push([path, String(val).trim()]);
    }
  }
  return entries;
}

/**
 * Extract ESP-MESURES payload from raw PDF bytes (works even when text is white).
 * @param {ArrayBuffer} buffer
 * @returns {Record<string, string>}
 */
export function extractPayloadFromPdfBuffer(buffer) {
  const bytes = new Uint8Array(buffer);
  let text = '';
  // Latin-1 decode keeps byte↔char 1:1 for ASCII payload search
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    text += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  // PDF may escape parentheses; normalize common escapes
  const normalized = text.replace(/\\([()\\])/g, '$1');
  if (!normalized.includes(PAYLOAD_PREFIX)) return {};
  return parseMesuresPayload(normalized);
}

function extractNumber(raw) {
  if (!raw) return '';
  const m = String(raw).replace(/\s+/g, ' ').match(/(\d{1,3}(?:[.,]\d+)?)/);
  return m ? m[1].replace(',', '.') : '';
}

/**
 * Rasterize first PDF page to a canvas (browser).
 * @param {ArrayBuffer} buffer
 * @param {number} scale
 */
async function rasterizePdfPage(buffer, scale = 2) {
  const pdfjs = await import('pdfjs-dist');
  // Vite-friendly worker
  if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString();
  }
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, canvas, viewport }).promise;
  return { canvas, width: viewport.width, height: viewport.height };
}

/**
 * OCR only LAYOUT value crops — avoids label/value fusion across fields.
 * @param {ArrayBuffer} buffer
 * @returns {Promise<Record<string, string>>}
 */
export async function ocrMesureZonesFromPdf(buffer) {
  if (typeof document === 'undefined') return {};
  const { canvas, width, height } = await rasterizePdfPage(buffer, 2.5);
  const out = {};
  const sx = width / A4_W_MM;
  const sy = height / A4_H_MM;

  const Tesseract = (await import('tesseract.js')).default;
  const worker = await Tesseract.createWorker('eng');
  try {
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789.,',
    });

    for (const key of MEASURE_KEYS) {
      const slot = FICHE_MESURE_LAYOUT.measurements[key];
      if (!slot) continue;
      const crop = slot.crop || {
        x: (slot.valueRightX ?? slot.valueXEnd) - 28,
        y: (slot.valueLineY ?? slot.valueY) - 7,
        w: 28,
        h: 9,
      };
      const x = Math.max(0, Math.floor(crop.x * sx));
      const y = Math.max(0, Math.floor(crop.y * sy));
      const w = Math.min(canvas.width - x, Math.ceil(crop.w * sx));
      const h = Math.min(canvas.height - y, Math.ceil(crop.h * sy));
      if (w < 4 || h < 4) continue;

      const zone = document.createElement('canvas');
      zone.width = Math.max(w * 2, 40);
      zone.height = Math.max(h * 2, 24);
      const zctx = zone.getContext('2d');
      zctx.fillStyle = '#fff';
      zctx.fillRect(0, 0, zone.width, zone.height);
      zctx.imageSmoothingEnabled = false;
      zctx.drawImage(canvas, x, y, w, h, 0, 0, zone.width, zone.height);

      try {
        const result = await worker.recognize(zone);
        const num = extractNumber(result?.data?.text);
        if (num) out[key] = num;
      } catch {
        // skip failed zone
      }
    }
  } finally {
    await worker.terminate();
  }
  return out;
}

/**
 * @param {File} file
 * @returns {Promise<{ values: Record<string, string>, method: 'payload'|'ocr'|'text'|'none', count: number }>}
 */
export async function importFicheMesures(file) {
  if (!file) return { values: {}, method: 'none', count: 0 };

  const name = file.name || '';
  const type = file.type || '';
  const isText = /text|csv/i.test(type) || /\.txt$|\.csv$/i.test(name);
  const isPdf = /pdf/i.test(type) || /\.pdf$/i.test(name);

  if (isText) {
    const text = await file.text();
    const values = parseFicheTaillesText(text);
    return { values, method: 'text', count: Object.keys(values).length };
  }

  if (isPdf) {
    const buffer = await file.arrayBuffer();
    const fromPayload = extractPayloadFromPdfBuffer(buffer);
    if (Object.keys(fromPayload).length > 0) {
      return {
        values: fromPayload,
        method: 'payload',
        count: Object.keys(fromPayload).length,
      };
    }
    try {
      const fromOcr = await ocrMesureZonesFromPdf(buffer);
      if (Object.keys(fromOcr).length > 0) {
        return { values: fromOcr, method: 'ocr', count: Object.keys(fromOcr).length };
      }
    } catch {
      // fall through
    }
    return { values: {}, method: 'none', count: 0 };
  }

  return { values: {}, method: 'none', count: 0 };
}
