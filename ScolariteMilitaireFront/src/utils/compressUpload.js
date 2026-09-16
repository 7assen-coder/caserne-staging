/** Client-side normalize before upload (backend re-normalizes as source of truth). */

export const INTAKE_MAX_BYTES = 10 * 1024 * 1024;
export const PHOTO_MAX_EDGE = 1024;
export const PHOTO_TARGET_BYTES = 280 * 1024;
export const PHOTO_QUALITY_START = 0.88;
export const PHOTO_QUALITY_FLOOR = 0.82;

export const DOC_IMAGE_MAX_EDGE = 1600;
export const DOC_MAX_BYTES = 1 * 1024 * 1024;
export const DOC_QUALITY_START = 0.88;
export const DOC_QUALITY_FLOOR = 0.8;

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image illisible ou corrompue.'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

function scaledSize(width, height, maxEdge) {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function encodeJpegUnderCap(canvas, {
  qualityStart,
  qualityFloor,
  targetBytes,
  edgeSteps = [],
}) {
  let quality = qualityStart;
  let blob = await canvasToBlob(canvas, 'image/jpeg', quality);
  while (blob && blob.size > targetBytes && quality > qualityFloor + 0.01) {
    quality = Math.max(qualityFloor, quality - 0.04);
    blob = await canvasToBlob(canvas, 'image/jpeg', quality);
  }
  if (blob && blob.size <= targetBytes) return blob;

  let working = canvas;
  for (const edge of edgeSteps) {
    const next = document.createElement('canvas');
    const size = scaledSize(working.width, working.height, edge);
    if (size.width === working.width && size.height === working.height) continue;
    next.width = size.width;
    next.height = size.height;
    const ctx = next.getContext('2d');
    ctx.drawImage(working, 0, 0, size.width, size.height);
    working = next;
    quality = qualityStart;
    blob = await canvasToBlob(working, 'image/jpeg', quality);
    while (blob && blob.size > targetBytes && quality > qualityFloor + 0.01) {
      quality = Math.max(qualityFloor, quality - 0.04);
      blob = await canvasToBlob(working, 'image/jpeg', quality);
    }
    if (blob && blob.size <= targetBytes) return blob;
  }
  return blob;
}

function toJpegFile(blob, originalName) {
  const base = String(originalName || 'upload').replace(/\.[^.]+$/, '') || 'upload';
  return new File([blob], `${base}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
}

/**
 * @param {File} file
 * @param {'photo' | 'document'} kind
 * @returns {Promise<{ ok: true, file: File } | { ok: false, message: string }>}
 */
export async function compressUploadFile(file, kind = 'document') {
  if (!(file instanceof File)) {
    return { ok: false, message: 'Fichier invalide.' };
  }
  if (file.size > INTAKE_MAX_BYTES) {
    return {
      ok: false,
      message: `Fichier trop volumineux à l’envoi (maximum ${INTAKE_MAX_BYTES / (1024 * 1024)} Mo).`,
    };
  }

  const nameLower = file.name.toLowerCase();
  const isPdf = file.type === 'application/pdf' || nameLower.endsWith('.pdf');

  if (kind === 'photo') {
    if (isPdf) {
      return { ok: false, message: 'Une photo d’identité doit être une image (JPG, PNG ou WebP).' };
    }
    try {
      const img = await loadImageFromFile(file);
      const size = scaledSize(img.naturalWidth, img.naturalHeight, PHOTO_MAX_EDGE);
      const canvas = document.createElement('canvas');
      canvas.width = size.width;
      canvas.height = size.height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, size.width, size.height);
      const blob = await encodeJpegUnderCap(canvas, {
        qualityStart: PHOTO_QUALITY_START,
        qualityFloor: PHOTO_QUALITY_FLOOR,
        targetBytes: PHOTO_TARGET_BYTES,
        edgeSteps: [960, 800],
      });
      if (!blob) return { ok: false, message: 'Impossible d’optimiser cette image.' };
      return { ok: true, file: toJpegFile(blob, file.name) };
    } catch (err) {
      return { ok: false, message: err.message || 'Image illisible.' };
    }
  }

  // Documents
  if (isPdf) {
    if (file.size > DOC_MAX_BYTES) {
      return {
        ok: false,
        message: `PDF trop volumineux : ${(file.size / 1024 / 1024).toFixed(1)} Mo (maximum 1 Mo).`,
      };
    }
    return { ok: true, file };
  }

  try {
    const img = await loadImageFromFile(file);
    const size = scaledSize(img.naturalWidth, img.naturalHeight, DOC_IMAGE_MAX_EDGE);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, size.width, size.height);
    const blob = await encodeJpegUnderCap(canvas, {
      qualityStart: DOC_QUALITY_START,
      qualityFloor: DOC_QUALITY_FLOOR,
      targetBytes: DOC_MAX_BYTES,
      edgeSteps: [1400, 1200, 1000],
    });
    if (!blob) return { ok: false, message: 'Impossible d’optimiser ce scan.' };
    if (blob.size > DOC_MAX_BYTES) {
      return {
        ok: false,
        message: 'Image trop lourde après optimisation (maximum 1 Mo). Réessayez avec un scan plus léger.',
      };
    }
    return { ok: true, file: toJpegFile(blob, file.name) };
  } catch (err) {
    return { ok: false, message: err.message || 'Fichier illisible.' };
  }
}
