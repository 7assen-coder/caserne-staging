/**
 * importEtudiantsBulk.js — import local (navigateur), sans backend.
 */

import { downloadClientImportTemplate } from './importTemplateClient';
import { importStudentsFromFile } from './importEtudiantsClient';

export { downloadClientImportTemplate };

/**
 * @param {File} file .xlsx or .csv
 * @returns {Promise<{ ok: number, skipped: number, errors: {ligne: number, message: string}[] }>}
 */
export async function uploadFileToImportApi(file) {
  return importStudentsFromFile(file);
}

/** @param {'xlsx'|'csv'} type */
export async function downloadTemplateFromApi(type = 'xlsx') {
  await downloadClientImportTemplate(type);
}
