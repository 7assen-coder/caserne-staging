"""CI-critical: Phase 40 multi-replica / production shared-state guards."""

import os
import subprocess
import sys
import unittest
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[2]


def _load_settings_env(**extra):
    env = os.environ.copy()
    env.update(
        {
            'DJANGO_SETTINGS_MODULE': 'backend.settings',
            'SECRET_KEY': 'ci-test-key-polyspace-phase40-xxxxxxxxxxxxxxxxxxxxxxxxxx',
            'DEBUG': 'False',
            'USE_LOCMEM_CACHE': 'True',
            'HEALTHZ_REQUIRE_REDIS': 'False',
            'SECURE_SSL_REDIRECT': 'False',
            'DB_HOST': '127.0.0.1',
            'DB_PORT': '5432',
            'DB_NAME': 'esp',
            'DB_USER': 'esp',
            'DB_PASSWORD': 'esp',
            'DB_SSLMODE': 'disable',
            'ALLOWED_HOSTS': 'localhost,testserver',
        }
    )
    env.update({k: str(v) for k, v in extra.items()})
    code = (
        'import django\n'
        'django.setup()\n'
        'from django.conf import settings\n'
        'print("ok", settings.DJANGO_ENV)\n'
    )
    return subprocess.run(
        [sys.executable, '-c', code],
        cwd=str(BACKEND),
        env=env,
        capture_output=True,
        text=True,
    )


class Phase40ScaleGuardsTests(unittest.TestCase):
    def test_replicas_forbid_locmem(self):
        r = _load_settings_env(DJANGO_ENV='staging', BACKEND_REPLICAS='2', USE_LOCMEM_CACHE='True')
        self.assertNotEqual(r.returncode, 0, r.stderr)
        self.assertIn('BACKEND_REPLICAS', r.stderr + r.stdout)

    def test_production_forbids_locmem(self):
        r = _load_settings_env(
            DJANGO_ENV='production',
            USE_LOCMEM_CACHE='True',
            USE_S3_MEDIA='True',
        )
        self.assertNotEqual(r.returncode, 0, r.stderr)
        self.assertIn('USE_LOCMEM_CACHE', r.stderr + r.stdout)

    def test_production_requires_s3_media(self):
        r = _load_settings_env(
            DJANGO_ENV='production',
            USE_LOCMEM_CACHE='False',
            REDIS_URL='redis://127.0.0.1:6379/1',
            USE_S3_MEDIA='False',
        )
        self.assertNotEqual(r.returncode, 0, r.stderr)
        self.assertIn('USE_S3_MEDIA', r.stderr + r.stdout)
