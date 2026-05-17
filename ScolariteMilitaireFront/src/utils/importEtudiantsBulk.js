/**
 * importEtudiantsBulk.js
 *
 * The frontend is a thin UI layer — all parsing, validation and DB writes
 * are handled by the backend.  This file only contains:
 *   - uploadFileToImportApi   : POST the raw file to /api/import/eleves/
 *   - downloadTemplateFromApi : GET the template from /api/import/template/
 *
 * Export utilities (Excel / PDF / Word lists) are in etudiantsListExport.js
 * and are intentionally left untouched.
 */

import { api } from '../services/api';

/**
 * Upload a File object to the backend bulk-import endpoint.
 * The backend handles all parsing, validation and DB writes atomically.
 *
 * @param {File} file  .xlsx or .csv file
 * @returns {{ ok: number, skipped: number, errors: {ligne: string|number, message: string}[] }}
 */
export async function uploadFileToImportApi(file) {
  const fd = new FormData();
  fd.append('file', file);

  const resp = await api.post('/import/eleves/', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120_000, // large files may take a while
  });

  const data = resp.data;

  // Normalise backend error shape { row, field, message }
  // → frontend shape { ligne, message }
  const errors = (data.errors ?? []).map((e) => ({
    ligne: e.row ?? '?',
    message: e.field ? `[${e.field}] ${e.message}` : e.message,
  }));

  return { ok: data.created ?? 0, skipped: data.skipped ?? 0, errors };
}

/**
 * Download the import template from the backend.
 *
 * @param {'xlsx'|'csv'} type
 */
export async function downloadTemplateFromApi(type = 'xlsx') {
  const resp = await api.get('/import/template/', {
    params: { type },
    responseType: 'blob',
  });

  const url = URL.createObjectURL(resp.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `modele-import-etudiants.${type}`;
  a.click();
  URL.revokeObjectURL(url);
}
