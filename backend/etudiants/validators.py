"""Validateurs de fichiers pour les pièces du dossier étudiant."""

from django.core.exceptions import ValidationError

MAX_PDF_SIZE = 5 * 1024 * 1024  # 5 Mo
MAX_IMAGE_DIMENSION = 500  # px
ALLOWED_EXTENSIONS = {'pdf', 'jpg', 'jpeg', 'png', 'webp'}


def _extension(f):
    name = getattr(f, 'name', '') or ''
    return name.rsplit('.', 1)[-1].lower() if '.' in name else ''


def validate_image_resolution(f):
    """Refuse une image dont la largeur ou la hauteur dépasse 500 px."""
    from PIL import Image

    try:
        with Image.open(f) as img:
            width, height = img.size
    except Exception:
        raise ValidationError("Fichier image illisible ou corrompu.")
    finally:
        if hasattr(f, 'seek'):
            f.seek(0)

    if width > MAX_IMAGE_DIMENSION or height > MAX_IMAGE_DIMENSION:
        raise ValidationError(
            f"Résolution trop grande : {width}×{height} px "
            f"(maximum {MAX_IMAGE_DIMENSION}×{MAX_IMAGE_DIMENSION} px)."
        )


def validate_document_file(f):
    """Pièce PDF ou image : PDF ≤ 5 Mo, image ≤ 500×500 px."""
    ext = _extension(f)
    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationError(
            f"Extension non autorisée : .{ext or '?'} "
            f"(autorisées : {', '.join(sorted(ALLOWED_EXTENSIONS))})."
        )
    if ext == 'pdf':
        if f.size > MAX_PDF_SIZE:
            raise ValidationError(
                f"PDF trop volumineux : {f.size / 1024 / 1024:.1f} Mo (maximum 5 Mo)."
            )
    else:
        validate_image_resolution(f)
