"""Validateurs de fichiers pour les pièces du dossier étudiant."""

from django.core.exceptions import ValidationError

MAX_DOCUMENT_SIZE = 1 * 1024 * 1024  # 1 Mo
MAX_IMAGE_DIMENSION = 500  # px
ALLOWED_EXTENSIONS = {'pdf', 'jpg', 'jpeg', 'png', 'webp'}


def _extension(f):
    name = getattr(f, 'name', '') or ''
    return name.rsplit('.', 1)[-1].lower() if '.' in name else ''


def validate_image_resolution(f):
    """Photo d'identité : image dont la largeur et la hauteur sont ≤ 500 px."""
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
    """Pièce justificative PDF ou image : taille ≤ 1 Mo."""
    ext = _extension(f)
    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationError(
            f"Extension non autorisée : .{ext or '?'} "
            f"(autorisées : {', '.join(sorted(ALLOWED_EXTENSIONS))})."
        )
    if f.size > MAX_DOCUMENT_SIZE:
        raise ValidationError(
            f"Fichier trop volumineux : {f.size / 1024 / 1024:.1f} Mo (maximum 1 Mo)."
        )
