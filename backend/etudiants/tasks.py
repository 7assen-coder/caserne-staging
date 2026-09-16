"""Phase 21 Celery tasks: bulk import, Excel export, photo thumbnails."""

from __future__ import annotations

import io
import logging
from pathlib import Path

from celery import shared_task
from django.conf import settings
from django.core.files.base import ContentFile
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    soft_time_limit=300,
    time_limit=360,
    max_retries=1,
    default_retry_delay=30,
)
def run_bulk_import(self, job_id: str):
    from etudiants.cache_keys import bump_eleve_caches
    from etudiants.importers import BulkImporter, read_csv, read_excel
    from etudiants.jobs import IMPORT_MAX_ROWS
    from etudiants.models import ImportJob, JobStatus

    try:
        job = ImportJob.objects.get(pk=job_id)
    except ImportJob.DoesNotExist:
        logger.error('ImportJob %s missing', job_id)
        return

    job.status = JobStatus.RUNNING
    job.started_at = timezone.now()
    job.error_message = ''
    job.save(update_fields=['status', 'started_at', 'error_message'])

    try:
        name = (job.original_name or job.source_file.name or '').lower()
        meta = {'sheet_name': '', 'format': 'legacy'}
        with job.source_file.open('rb') as fh:
            if name.endswith('.csv'):
                rows = read_csv(fh)
            else:
                rows, meta = read_excel(fh)

        if len(rows) > IMPORT_MAX_ROWS:
            raise ValueError(
                f'Trop de lignes ({len(rows)}). Maximum autorisé : {IMPORT_MAX_ROWS}.'
            )

        report = BulkImporter().run(rows, meta=meta)
        report['row_count'] = len(rows)
        job.report = report
        job.status = JobStatus.SUCCEEDED
        job.finished_at = timezone.now()
        job.save(update_fields=['report', 'status', 'finished_at'])
    except Exception as exc:
        logger.exception('ImportJob %s failed', job_id)
        job.status = JobStatus.FAILED
        job.error_message = str(exc)[:2000]
        job.finished_at = timezone.now()
        job.save(update_fields=['status', 'error_message', 'finished_at'])
        raise
    finally:
        try:
            bump_eleve_caches()
        except Exception:
            logger.exception('cache bump after import failed')


@shared_task(
    bind=True,
    soft_time_limit=180,
    time_limit=240,
    max_retries=1,
    default_retry_delay=20,
)
def build_eleves_export(self, job_id: str):
    from etudiants.filters import apply_eleve_list_filters
    from etudiants.models import Eleve, ExportJob, JobStatus
    from accounts.permissions import eleves_queryset_for

    try:
        job = ExportJob.objects.get(pk=job_id)
    except ExportJob.DoesNotExist:
        logger.error('ExportJob %s missing', job_id)
        return

    job.status = JobStatus.RUNNING
    job.started_at = timezone.now()
    job.error_message = ''
    job.save(update_fields=['status', 'started_at', 'error_message'])

    try:
        import openpyxl
        from openpyxl.styles import Font

        user = job.created_by
        if user is not None:
            qs = eleves_queryset_for(user, for_list=True)
        else:
            qs = Eleve.objects.select_related('dossier_academique', 'dossier_militaire')
        params = job.filters if isinstance(job.filters, dict) else {}
        qs = apply_eleve_list_filters(qs, params)

        default_cols = [
            'matricule',
            'nom_famille',
            'prenom',
            'sexe',
            'departement',
            'niveau_actuel',
            'compagnie',
            'section',
        ]
        columns = list(job.columns) if job.columns else default_cols
        # sanitize
        allowed = set(default_cols) | {
            'nni',
            'date_naissance',
            'telephone',
            'email_perso',
            'nationalite',
        }
        columns = [c for c in columns if c in allowed] or default_cols

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = 'Eleves'
        ws.append(columns)
        for cell in ws[1]:
            cell.font = Font(bold=True)

        count = 0
        for eleve in qs.iterator(chunk_size=200):
            da = getattr(eleve, 'dossier_academique', None)
            dm = getattr(eleve, 'dossier_militaire', None)
            row_map = {
                'matricule': eleve.matricule,
                'nom_famille': eleve.nom_famille,
                'prenom': eleve.prenom,
                'sexe': eleve.sexe,
                'nni': eleve.nni,
                'date_naissance': eleve.date_naissance.isoformat() if eleve.date_naissance else '',
                'telephone': eleve.tel1 or '',
                'email_perso': eleve.email_perso or '',
                'nationalite': eleve.nationalite or '',
                'departement': getattr(da, 'departement', '') or '',
                'niveau_actuel': getattr(da, 'niveau_actuel', '') or '',
                'compagnie': getattr(dm, 'compagnie', '') or '',
                'section': getattr(dm, 'section', '') or '',
            }
            ws.append([row_map.get(c, '') for c in columns])
            count += 1

        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        filename = f'export_eleves_{job.id}.xlsx'
        job.result_file.save(filename, ContentFile(buf.read()), save=False)
        job.row_count = count
        job.status = JobStatus.SUCCEEDED
        job.finished_at = timezone.now()
        job.save()
    except Exception as exc:
        logger.exception('ExportJob %s failed', job_id)
        job.status = JobStatus.FAILED
        job.error_message = str(exc)[:2000]
        job.finished_at = timezone.now()
        job.save(update_fields=['status', 'error_message', 'finished_at'])
        raise


@shared_task(
    bind=True,
    soft_time_limit=60,
    time_limit=90,
    max_retries=2,
    default_retry_delay=15,
)
def generate_photo_variants(self, document_id: int, field_name: str):
    from io import BytesIO

    from django.core.files.base import ContentFile
    from django.core.files.storage import default_storage
    from PIL import Image

    from etudiants.jobs import PHOTO_VARIANT_FIELDS, PHOTO_VARIANT_SIZES
    from etudiants.models import DocumentEleve

    if field_name not in PHOTO_VARIANT_FIELDS:
        return

    try:
        doc = DocumentEleve.objects.get(pk=document_id)
    except DocumentEleve.DoesNotExist:
        return

    image_field = getattr(doc, field_name, None)
    if not image_field or not getattr(image_field, 'name', None):
        return

    try:
        with image_field.open('rb') as fh:
            img = Image.open(fh)
            img.load()
        if img.mode not in ('RGB', 'L'):
            img = img.convert('RGB')
        elif img.mode == 'L':
            img = img.convert('RGB')

        src_path = Path(image_field.name)
        stem = src_path.stem
        variant_prefix = str(src_path.parent / 'variants').replace('\\', '/')

        updates = {}
        for size in PHOTO_VARIANT_SIZES:
            thumb = img.copy()
            thumb.thumbnail((size, size), Image.Resampling.LANCZOS)
            rel = f'{variant_prefix}/{stem}_{size}.webp'
            buf = BytesIO()
            thumb.save(buf, format='WEBP', quality=82)
            buf.seek(0)
            if default_storage.exists(rel):
                default_storage.delete(rel)
            saved = default_storage.save(rel, ContentFile(buf.read()))
            updates[f'{field_name}_thumb_{size}'] = saved.replace('\\', '/')

        for k, v in updates.items():
            setattr(doc, k, v)
        DocumentEleve.objects.filter(pk=doc.pk).update(**updates)
    except Exception as exc:
        logger.exception('thumbnail failed doc=%s field=%s', document_id, field_name)
        raise self.retry(exc=exc)
