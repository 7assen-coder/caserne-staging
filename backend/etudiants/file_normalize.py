"""Normalize uploaded identity photos and document scans before validation/storage."""

from __future__ import annotations

from io import BytesIO

from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile

PHOTO_MAX_EDGE = 1024
PHOTO_TARGET_BYTES = 280 * 1024
PHOTO_QUALITY_START = 88
PHOTO_QUALITY_FLOOR = 82

DOC_IMAGE_MAX_EDGE = 1600
DOC_MAX_BYTES = 1 * 1024 * 1024
DOC_QUALITY_START = 88
DOC_QUALITY_FLOOR = 80
DOC_EDGE_STEPS = (1400, 1200, 1000)

INTAKE_MAX_BYTES = 10 * 1024 * 1024

PHOTO_FIELDS = frozenset({
    'photo_identite_militaire',
    'photo_identite_civile',
    'photo_militaire_integrale',
})
DOCUMENT_FIELDS = frozenset({
    'cin',
    'acte_naissance',
    'diplome_acces',
    'diplome_bac',
})


def _extension(name: str) -> str:
    if not name or '.' not in name:
        return ''
    return name.rsplit('.', 1)[-1].lower()


def _is_pdf(uploaded) -> bool:
    name = getattr(uploaded, 'name', '') or ''
    content_type = (getattr(uploaded, 'content_type', '') or '').lower()
    return _extension(name) == 'pdf' or content_type == 'application/pdf'


def _read_bytes(uploaded) -> bytes:
    if hasattr(uploaded, 'open'):
        try:
            uploaded.open('rb')
        except Exception:
            pass
    if hasattr(uploaded, 'seek'):
        uploaded.seek(0)
    data = uploaded.read()
    if hasattr(uploaded, 'seek'):
        uploaded.seek(0)
    return data


def _scaled_size(width: int, height: int, max_edge: int) -> tuple[int, int]:
    longest = max(width, height)
    if longest <= max_edge:
        return width, height
    scale = max_edge / float(longest)
    return max(1, int(round(width * scale))), max(1, int(round(height * scale)))


def _encode_jpeg(img, quality: int) -> bytes:
    buf = BytesIO()
    img.save(buf, format='JPEG', quality=quality, optimize=True, progressive=True)
    return buf.getvalue()


def _normalize_image_bytes(
    data: bytes,
    *,
    max_edge: int,
    target_bytes: int,
    quality_start: int,
    quality_floor: int,
    edge_steps: tuple[int, ...] = (),
) -> bytes:
    from PIL import Image, ImageOps

    with Image.open(BytesIO(data)) as raw:
        img = ImageOps.exif_transpose(raw)
        img.load()
    if img.mode not in ('RGB', 'L'):
        img = img.convert('RGB')
    elif img.mode == 'L':
        img = img.convert('RGB')

    w, h = _scaled_size(img.width, img.height, max_edge)
    if (w, h) != (img.width, img.height):
        img = img.resize((w, h), Image.Resampling.LANCZOS)

    quality = quality_start
    out = _encode_jpeg(img, quality)
    while len(out) > target_bytes and quality > quality_floor:
        quality = max(quality_floor, quality - 4)
        out = _encode_jpeg(img, quality)

    if len(out) <= target_bytes:
        return out

    for edge in edge_steps:
        nw, nh = _scaled_size(img.width, img.height, edge)
        if (nw, nh) == (img.width, img.height):
            continue
        img = img.resize((nw, nh), Image.Resampling.LANCZOS)
        quality = quality_start
        out = _encode_jpeg(img, quality)
        while len(out) > target_bytes and quality > quality_floor:
            quality = max(quality_floor, quality - 4)
            out = _encode_jpeg(img, quality)
        if len(out) <= target_bytes:
            return out

    return out


def _as_uploaded(data: bytes, original_name: str, content_type: str = 'image/jpeg'):
    base = (original_name or 'upload').rsplit('.', 1)[0] or 'upload'
    name = f'{base}.jpg'
    return SimpleUploadedFile(name, data, content_type=content_type)


def normalize_uploaded_file(uploaded, kind: str):
    """
    kind: 'photo' | 'document'
    Returns a Django-compatible uploaded file (possibly unchanged for small PDFs).
    """
    if uploaded in (None, '', False):
        return uploaded

    size = getattr(uploaded, 'size', None)
    if size is not None and size > INTAKE_MAX_BYTES:
        raise ValidationError(
            f'Fichier trop volumineux à l’envoi (maximum {INTAKE_MAX_BYTES // (1024 * 1024)} Mo).'
        )

    name = getattr(uploaded, 'name', '') or 'upload'

    if kind == 'photo':
        if _is_pdf(uploaded):
            raise ValidationError('Une photo d’identité doit être une image (JPG, PNG ou WebP).')
        raw = _read_bytes(uploaded)
        try:
            normalized = _normalize_image_bytes(
                raw,
                max_edge=PHOTO_MAX_EDGE,
                target_bytes=PHOTO_TARGET_BYTES,
                quality_start=PHOTO_QUALITY_START,
                quality_floor=PHOTO_QUALITY_FLOOR,
                edge_steps=(960, 800),
            )
        except Exception as exc:
            raise ValidationError('Fichier image illisible ou corrompu.') from exc
        return _as_uploaded(normalized, name)

    # document
    if _is_pdf(uploaded):
        if size is not None and size > DOC_MAX_BYTES:
            raise ValidationError(
                f'PDF trop volumineux : {size / 1024 / 1024:.1f} Mo (maximum 1 Mo).'
            )
        return uploaded

    raw = _read_bytes(uploaded)
    try:
        normalized = _normalize_image_bytes(
            raw,
            max_edge=DOC_IMAGE_MAX_EDGE,
            target_bytes=DOC_MAX_BYTES,
            quality_start=DOC_QUALITY_START,
            quality_floor=DOC_QUALITY_FLOOR,
            edge_steps=DOC_EDGE_STEPS,
        )
    except Exception as exc:
        raise ValidationError('Fichier image illisible ou corrompu.') from exc

    if len(normalized) > DOC_MAX_BYTES:
        raise ValidationError(
            'Image trop lourde après optimisation (maximum 1 Mo).'
        )
    return _as_uploaded(normalized, name)


def normalize_document_payload(attrs: dict) -> dict:
    """Normalize photo/document fields present in serializer validated/attrs data."""
    out = dict(attrs)
    for field in PHOTO_FIELDS:
        if field in out and out[field] not in (None, ''):
            out[field] = normalize_uploaded_file(out[field], 'photo')
    for field in DOCUMENT_FIELDS:
        if field in out and out[field] not in (None, ''):
            out[field] = normalize_uploaded_file(out[field], 'document')
    return out
