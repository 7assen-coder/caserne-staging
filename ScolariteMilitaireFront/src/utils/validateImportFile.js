import { IMPORT_MAX_BYTES } from './importExportLimits';

export function validateImportFile(file, t) {
  if (!(file instanceof File)) {
    return { ok: false, message: t ? t('eleves:importInvalidFormat') : 'Fichier invalide.' };
  }

  if (file.size > IMPORT_MAX_BYTES) {
    return {
      ok: false,
      message: t ? t('eleves:importInvalidFormat') : 'Fichier trop volumineux.',
    };
  }

  const name = file.name.toLowerCase();
  const allowed =
    name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.docx');
  if (!allowed) {
    return {
      ok: false,
      message: t
        ? t('eleves:importInvalidFormat')
        : 'Format non accepté. Utilisez Excel (.xlsx) ou Word (.docx).',
    };
  }

  return { ok: true };
}

export function isDocxFile(file) {
  if (!(file instanceof File)) return false;
  return file.name.toLowerCase().endsWith('.docx');
}
