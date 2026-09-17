/**
 * Import élèves via API Django (POST /api/import/eleves/ → job poll).
 */

import { api, withUploadTimeout } from '../services/api';
import { API_IMPORT_UPLOAD_TIMEOUT_MS } from '../services/apiConstants';
import { downloadClientImportTemplate } from './importTemplateClient';
import { isFrontendOnly } from './frontendMode';
import { importStudentsFromFile } from './importEtudiantsClient';
import { apiPaths } from '../services/apiPaths';

export { downloadClientImportTemplate };

const POLL_INTERVAL_MS = 1500;
const POLL_MAX_MS = 5 * 60 * 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapReport(data) {
  return {
    ok: (data?.created ?? 0) + (data?.updated ?? 0),
    skipped: data?.skipped ?? 0,
    errors: (data?.errors ?? []).map((e, i) =>
      typeof e === 'string'
        ? { ligne: i + 1, message: e }
        : { ligne: e.ligne ?? e.row ?? i + 1, message: e.message ?? e.error ?? String(e) },
    ),
    jobId: data?.id,
    status: data?.status,
  };
}

async function pollImportJob(jobId) {
  const started = Date.now();
  while (Date.now() - started < POLL_MAX_MS) {
    const { data } = await api.get(apiPaths.eleves.importJob(jobId));
    if (data.status === 'succeeded' || data.status === 'failed') {
      if (data.status === 'failed' && !(data.errors || []).length) {
        throw new Error(data.error_message || 'Import échoué.');
      }
      return mapReport(data);
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error('Import trop long. Réessayez ou contactez l’administrateur.');
}

/**
 * @param {File} file .xlsx or .csv
 * @returns {Promise<{ ok: number, skipped: number, errors: {ligne: number, message: string}[] }>}
 */
export async function uploadFileToImportApi(file) {
  if (isFrontendOnly()) {
    return importStudentsFromFile(file);
  }
  const form = new FormData();
  form.append('file', file);
  const { data, status } = await api.post(
    apiPaths.eleves.import,
    form,
    withUploadTimeout({
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: API_IMPORT_UPLOAD_TIMEOUT_MS,
    }),
  );

  // Sync / eager path returns full report immediately
  if (status !== 202 && (data?.created != null || data?.errors)) {
    return mapReport(data);
  }

  if (!data?.id) {
    throw new Error('Réponse import invalide (pas de job).');
  }
  return pollImportJob(data.id);
}

/** @param {'xlsx'|'csv'} type */
export async function downloadTemplateFromApi(type = 'xlsx') {
  if (isFrontendOnly()) {
    await downloadClientImportTemplate(type);
    return;
  }
  const { data } = await api.get(apiPaths.eleves.importTemplate, {
    params: { type },
    responseType: 'blob',
  });
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Polyspace_modele_dossier_eleve.${type === 'csv' ? 'csv' : 'xlsx'}`;
  a.click();
  URL.revokeObjectURL(url);
}
