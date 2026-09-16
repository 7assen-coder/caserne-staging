"""Phase 21: async ImportJob / ExportJob + photo variants (eager Celery)."""

import io
from datetime import date
from decimal import Decimal

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image
from rest_framework.test import APIClient

from accounts.models import UserProfile
from accounts.serializers import ensure_profile
from etudiants.models import DocumentEleve, DossierAcademique, Eleve, ExportJob, ImportJob, JobStatus
from etudiants.tasks import generate_photo_variants


def _make_eleve(**overrides):
    data = dict(
        matricule=92001,
        num_bac='BAC92001',
        nni='2100999002',
        sexe='H',
        prenom='Exp',
        nom_famille='Ort',
        date_naissance=date(2001, 2, 2),
        lieu_naissance='Nouakchott',
        nationalite='Mauritanienne',
        categorie_bac='National',
        serie_bac='C',
        moyenne_bac=Decimal('12.00'),
        ecole_bac='Lycée',
        date_premiere_inscription=date(2022, 9, 1),
        voie_acces='1',
        diplome_acces='Bac',
        adresse_primaire='Nouakchott',
        email_perso='exp@esp.mr',
        tel1='31234567',
    )
    data.update(overrides)
    return Eleve.objects.create(**data)


def _xlsx_minimal():
    import openpyxl

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append([
        'matricule', 'nom_famille', 'prenom', 'nni', 'sexe', 'date_naissance',
    ])
    ws.append([91001, 'TestNom', 'TestPrenom', '2100999001', 'H', '2002-01-15'])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.read()


@override_settings(
    CELERY_TASK_ALWAYS_EAGER=True,
    CELERY_TASK_EAGER_PROPAGATES=True,
    CACHES={
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'phase21-tests',
        }
    },
)
class Phase21ImportExportTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin21@esp.mr', email='admin21@esp.mr', password='TestPass12!'
        )
        profile = ensure_profile(self.admin)
        profile.fonction = UserProfile.ROLE_ADMINISTRATEUR
        profile.is_active_access = True
        profile.save()
        self.admin = User.objects.select_related('profile').get(pk=self.admin.pk)
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

        self.terrain = User.objects.create_user(
            username='terrain21@esp.mr', email='terrain21@esp.mr', password='TestPass12!'
        )
        tp = ensure_profile(self.terrain)
        tp.fonction = UserProfile.ROLE_CHEF_SECTION
        tp.is_active_access = True
        tp.save()

    def test_import_sync_eager_creates_eleve(self):
        content = _xlsx_minimal()
        upload = SimpleUploadedFile(
            'eleves.xlsx',
            content,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        r = self.client.post('/api/v1/eleves/import/?sync=1', {'file': upload}, format='multipart')
        self.assertIn(r.status_code, (200, 201), r.content)
        self.assertTrue(Eleve.objects.filter(matricule=91001).exists())
        self.assertTrue(ImportJob.objects.filter(created_by=self.admin).exists())
        job = ImportJob.objects.latest('created_at')
        self.assertEqual(job.status, JobStatus.SUCCEEDED)
        detail = self.client.get(f'/api/v1/eleves/import/jobs/{job.id}/')
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data['status'], 'succeeded')
        self.assertGreaterEqual(detail.data['created'], 1)

    def test_import_forbidden_without_cap(self):
        self.client.force_authenticate(user=self.terrain)
        content = _xlsx_minimal()
        upload = SimpleUploadedFile('eleves.xlsx', content)
        r = self.client.post('/api/v1/eleves/import/?sync=1', {'file': upload}, format='multipart')
        self.assertEqual(r.status_code, 403)

    def test_import_rejects_oversized(self):
        big = SimpleUploadedFile('big.xlsx', b'x' * (5 * 1024 * 1024 + 10))
        r = self.client.post('/api/v1/eleves/import/', {'file': big}, format='multipart')
        self.assertEqual(r.status_code, 400)

    def test_export_job_download(self):
        e = _make_eleve(matricule=92001, nni='2100999002', num_bac='BAC92001', email_perso='e92001@esp.mr')
        DossierAcademique.objects.create(
            eleve=e,
            departement='IRT',
            niveau_actuel='3e année',
        )
        r = self.client.post(
            '/api/v1/eleves/export/?sync=1',
            {'format': 'xlsx', 'filters': {}, 'columns': ['matricule', 'prenom', 'nom_famille']},
            format='json',
        )
        self.assertEqual(r.status_code, 200, r.content)
        job_id = r.data['id']
        job = ExportJob.objects.get(pk=job_id)
        self.assertEqual(job.status, JobStatus.SUCCEEDED)
        dl = self.client.get(f'/api/v1/eleves/export/jobs/{job_id}/fichier/')
        self.assertEqual(dl.status_code, 200)

    def test_export_job_other_user_forbidden(self):
        job = ExportJob.objects.create(created_by=self.admin, status=JobStatus.PENDING)
        self.client.force_authenticate(user=self.terrain)
        r = self.client.get(f'/api/v1/eleves/export/jobs/{job.id}/')
        self.assertEqual(r.status_code, 403)


@override_settings(
    CELERY_TASK_ALWAYS_EAGER=True,
    CELERY_TASK_EAGER_PROPAGATES=True,
)
class Phase21ThumbnailTests(TestCase):
    def test_generate_photo_variants(self):
        eleve = _make_eleve(
            matricule=93001,
            nni='2100999003',
            num_bac='BAC93001',
            email_perso='pho@esp.mr',
            moyenne_bac=Decimal('11.00'),
            date_naissance=date(2000, 1, 1),
        )
        img = Image.new('RGB', (200, 200), color=(20, 40, 60))
        buf = io.BytesIO()
        img.save(buf, format='JPEG')
        buf.seek(0)
        doc = DocumentEleve.objects.create(eleve=eleve)
        doc.photo_identite_civile.save(
            'civile.jpg',
            SimpleUploadedFile('civile.jpg', buf.read(), content_type='image/jpeg'),
            save=True,
        )
        generate_photo_variants(doc.pk, 'photo_identite_civile')
        doc.refresh_from_db()
        self.assertTrue(doc.photo_identite_civile_thumb_128)
        self.assertTrue(doc.photo_identite_civile_thumb_320)
