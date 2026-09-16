"""Phase 21 — import/export limits and helpers."""

IMPORT_MAX_BYTES = 5 * 1024 * 1024  # 5 MiB — align with SPA + nginx 6M
IMPORT_MAX_ROWS = 5000

PHOTO_VARIANT_FIELDS = (
    'photo_identite_militaire',
    'photo_identite_civile',
    'photo_militaire_integrale',
)

PHOTO_VARIANT_SIZES = (128, 320)


def job_owner_or_staff(user, job) -> bool:
    if user is None or not user.is_authenticated:
        return False
    if getattr(user, 'is_superuser', False) or getattr(user, 'is_staff', False):
        return True
    return job.created_by_id == user.id
