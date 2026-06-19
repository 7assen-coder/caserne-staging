export const MAX_PHOTO_DIMENSION = 500;
export const MAX_DOCUMENT_SIZE = 1 * 1024 * 1024;
export const MAX_EQUIPEMENT_PDF_SIZE = 5 * 1024 * 1024;

async function readHeader(file, byteCount) {
  const slice = file.slice(0, byteCount);
  const buf = await slice.arrayBuffer();
  return new Uint8Array(buf);
}

function startsWith(bytes, signature) {
  if (bytes.length < signature.length) return false;
  for (let i = 0; i < signature.length; i += 1) {
    if (bytes[i] !== signature[i]) return false;
  }
  return true;
}

export async function detectFileType(file) {
  const header = await readHeader(file, 12);

  if (startsWith(header, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'pdf';
  if (startsWith(header, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (startsWith(header, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (
    startsWith(header, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(header.subarray(8), [0x57, 0x45, 0x42, 0x50])
  ) {
    return 'webp';
  }
  return null;
}

function readImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image illisible ou corrompue.'));
    };
    img.src = url;
  });
}

export async function validateUploadFile(file, kind = 'document', options = {}) {
  if (!(file instanceof File)) return { ok: false, message: 'Fichier invalide.' };

  const detected = await detectFileType(file);
  const pdfOnly = options.pdfOnly === true;
  const maxSize = options.maxSize ?? MAX_DOCUMENT_SIZE;

  if (detected == null) {
    return {
      ok: false,
      message: pdfOnly
        ? 'Format non autorisé. Seuls les fichiers PDF sont acceptés.'
        : 'Format non autorisé. Seuls les fichiers PDF, JPG, PNG et WebP sont acceptés.',
    };
  }

  if (pdfOnly && detected !== 'pdf') {
    return { ok: false, message: 'Seuls les fichiers PDF sont acceptés pour cette pièce jointe.' };
  }

  if (kind === 'photo') {
    if (detected === 'pdf') {
      return { ok: false, message: 'Une photo d’identité doit être une image (JPG, PNG ou WebP).' };
    }
    try {
      const { width, height } = await readImageDimensions(file);
      if (width > MAX_PHOTO_DIMENSION || height > MAX_PHOTO_DIMENSION) {
        return {
          ok: false,
          message: `Résolution trop grande : ${width}×${height} px (maximum ${MAX_PHOTO_DIMENSION}×${MAX_PHOTO_DIMENSION} px).`,
        };
      }
    } catch (err) {
      return { ok: false, message: err.message || 'Image illisible.' };
    }
    return { ok: true, kind: detected };
  }

  if (file.size > maxSize) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    const maxMb = (maxSize / 1024 / 1024).toFixed(0);
    return { ok: false, message: `Fichier trop volumineux : ${mb} Mo (maximum ${maxMb} Mo).` };
  }

  return { ok: true, kind: detected };
}
