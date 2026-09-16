"""Phase 24 — resolve media keys and enforce élève / job ownership."""

from __future__ import annotations

from django.db.models import Q

from accounts.permissions import eleves_queryset_for
from etudiants.models import (
    DocumentEleve,
    DossierSante,
    ExportJob,
    ImportJob,
)


DOCUMENT_FILE_FIELDS = (
    'cin',
    'acte_naissance',
    'diplome_acces',
    'diplome_bac',
    'photo_identite_militaire',
    'photo_identite_civile',
    'photo_militaire_integrale',
)

DOCUMENT_THUMB_FIELDS = (
    'photo_identite_militaire_thumb_128',
    'photo_identite_militaire_thumb_320',
    'photo_identite_civile_thumb_128',
    'photo_identite_civile_thumb_320',
    'photo_militaire_integrale_thumb_128',
    'photo_militaire_integrale_thumb_320',
)

SANTE_FILE_FIELDS = (
    'dossier_medical_pdf',
    'photo_medicale',
)


def normalize_media_key(media_path: str) -> str:
    key = (media_path or '').lstrip('/')
    if key.startswith('media/'):
        key = key[len('media/') :]
    return key.replace('\\', '/')


def user_may_access_media(user, media_path: str) -> bool:
    """
    True if the path is known and in scope, or is an import/export owned by the user.

    Unknown paths: deny (403) so we do not leak existence across scopes via 404 timing alone
    for scoped dossier files; missing storage object still 404 after authz.
    """
    key = normalize_media_key(media_path)
    if not key or '..' in key.split('/'):
        return False

    if user.is_staff or user.is_superuser:
        return True

    eleves = eleves_queryset_for(user)

    # DocumentEleve FileFields
    doc_q = Q()
    for field in DOCUMENT_FILE_FIELDS:
        doc_q |= Q(**{f'{field}': key})
    if DocumentEleve.objects.filter(doc_q, eleve__in=eleves).exists():
        return True

    # Thumb CharFields (relative keys)
    thumb_q = Q()
    for field in DOCUMENT_THUMB_FIELDS:
        thumb_q |= Q(**{f'{field}': key})
    if DocumentEleve.objects.filter(thumb_q, eleve__in=eleves).exists():
        return True

    # Variant keys may be storage-saved with slightly different names; match prefix
    if '/variants/' in key:
        parent_prefix = key.rsplit('/variants/', 1)[0] + '/'
        for field in DOCUMENT_FILE_FIELDS:
            if field.startswith('photo_'):
                if DocumentEleve.objects.filter(
                    eleve__in=eleves,
                    **{f'{field}__startswith': parent_prefix},
                ).exists():
                    return True

    sante_q = Q()
    for field in SANTE_FILE_FIELDS:
        sante_q |= Q(**{f'{field}': key})
    if DossierSante.objects.filter(sante_q, eleve__in=eleves).exists():
        return True

    # Import / export job files — owner or staff
    if ImportJob.objects.filter(source_file=key, created_by=user).exists():
        return True
    if ExportJob.objects.filter(result_file=key, created_by=user).exists():
        return True

    # Operations module PDFs (optional — match by filename if models present)
    try:
        from operations import models as op_models

        for model, fields in (
            (getattr(op_models, 'EquipementItem', None), ('pdf',)),
            (getattr(op_models, 'Sanction', None), ('cr_pdf', 'pj_pdf')),
            (getattr(op_models, 'Demande', None), ('demande_pdf', 'pj_pdf')),
            (getattr(op_models, 'MedicalConsultation', None), ('pj_pdf',)),
            (getattr(op_models, 'JournalEvent', None), ('pj_pdf',)),
        ):
            if model is None:
                continue
            q = Q()
            for f in fields:
                if hasattr(model, f):
                    q |= Q(**{f: key})
            if not q:
                continue
            qs = model.objects.filter(q)
            if hasattr(model, 'eleve_id') or hasattr(model, 'eleve'):
                qs = qs.filter(eleve__in=eleves)
            if qs.exists():
                return True
    except Exception:  # noqa: BLE001
        pass

    return False
