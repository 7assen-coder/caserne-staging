import { IMPORT_MAX_BYTES, IMPORT_MAX_LABEL } from './importExportLimits';

export function validateImportFile(file) {
  if (!(file instanceof File)) {
    return { ok: false, message: 'Fichier invalide.' };
  }

  if (file.size > IMPORT_MAX_BYTES) {
    return {
      ok: false,
      message: `Le fichier est trop volumineux. Taille maximale : ${IMPORT_MAX_LABEL}.`,
    };
  }

  const name = file.name.toLowerCase();
  const allowed =
    name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv');
  if (!allowed) {
    return {
      ok: false,
      message: 'Format non accepté. Utilisez un fichier Excel (.xlsx) ou CSV (.csv).',
    };
  }

  return { ok: true };
}
