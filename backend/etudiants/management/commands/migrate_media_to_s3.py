"""One-shot copy of local MEDIA_ROOT files into default_storage (S3 / MinIO)."""

from __future__ import annotations

import os
from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = (
        'Upload files from MEDIA_ROOT (or --source-dir) into default_storage. '
        'Use after enabling USE_S3_MEDIA. Idempotent: skips keys that already exist.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--source-dir',
            type=str,
            default='',
            help='Override MEDIA_ROOT',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='List files that would be uploaded without writing',
        )

    def handle(self, *args, **options):
        source = Path(options['source_dir'] or settings.MEDIA_ROOT).resolve()
        dry = bool(options['dry_run'])
        if not source.is_dir():
            self.stderr.write(self.style.ERROR(f'Not a directory: {source}'))
            return

        uploaded = 0
        skipped = 0
        for root, _dirs, files in os.walk(source):
            for name in files:
                if name.startswith('.'):
                    continue
                abs_path = Path(root) / name
                rel = abs_path.relative_to(source).as_posix()
                if default_storage.exists(rel):
                    skipped += 1
                    continue
                if dry:
                    self.stdout.write(f'would upload {rel}')
                    uploaded += 1
                    continue
                with abs_path.open('rb') as fh:
                    default_storage.save(rel, File(fh, name=rel))
                uploaded += 1
                self.stdout.write(f'uploaded {rel}')

        self.stdout.write(
            self.style.SUCCESS(
                f'Done. uploaded={uploaded} skipped_existing={skipped} dry_run={dry}'
            )
        )
