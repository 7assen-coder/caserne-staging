"""Phase 23–24: durable storage helpers + protected media delivery."""

from datetime import date
from decimal import Decimal
from io import BytesIO
from pathlib import Path

from django.contrib.auth.models import User
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.test import TestCase, override_settings
from django.urls import reverse
from PIL import Image
from rest_framework.test import APIClient

from accounts.models import UserProfile
from accounts.serializers import ensure_profile
from etudiants.media_access import user_may_access_media
from etudiants.models import DocumentEleve, Eleve
from etudiants.tasks import generate_photo_variants


def _png_bytes(color=(10, 80, 160)):
    buf = BytesIO()
    Image.new('RGB', (64, 64), color).save(buf, format='PNG')
    buf.seek(0)
    return buf.read()


def _make_eleve(**overrides):
    data = dict(
        matricule=93001,
        num_bac='BAC93001',
        nni='2100999301',
        sexe='H',
        prenom='Med',
        nom_famille='Ia',
        date_naissance=date(2001, 3, 3),
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
        email_perso='med@esp.mr',
        tel1='31234567',
    )
    data.update(overrides)
    return Eleve.objects.create(**data)


@override_settings(
    CELERY_TASK_ALWAYS_EAGER=True,
    CELERY_TASK_EAGER_PROPAGATES=True,
    USE_S3_MEDIA=False,
    MEDIA_DELIVERY='stream',
    CACHES={
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'phase23-media',
        }
    },
)
class Phase23ThumbStorageTests(TestCase):
    def test_generate_photo_variants_uses_default_storage(self):
        eleve = _make_eleve()
        doc = DocumentEleve.objects.create(eleve=eleve)
        doc.photo_identite_civile.save(
            'civile_test.png',
            ContentFile(_png_bytes()),
            save=True,
        )
        generate_photo_variants(doc.pk, 'photo_identite_civile')
        doc.refresh_from_db()
        self.assertTrue(doc.photo_identite_civile_thumb_128)
        self.assertTrue(doc.photo_identite_civile_thumb_320)
        self.assertTrue(default_storage.exists(doc.photo_identite_civile_thumb_128))
        self.assertTrue(default_storage.exists(doc.photo_identite_civile_thumb_320))


@override_settings(
    CELERY_TASK_ALWAYS_EAGER=True,
    CELERY_TASK_EAGER_PROPAGATES=True,
    USE_S3_MEDIA=False,
    MEDIA_DELIVERY='stream',
    CACHES={
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'phase24-media',
        }
    },
)
class Phase24MediaDeliveryTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin24@esp.mr', email='admin24@esp.mr', password='TestPass12!'
        )
        profile = ensure_profile(self.admin)
        profile.fonction = UserProfile.ROLE_ADMINISTRATEUR
        profile.is_active_access = True
        profile.save()
        self.admin = User.objects.select_related('profile').get(pk=self.admin.pk)

        self.other = User.objects.create_user(
            username='other24@esp.mr', email='other24@esp.mr', password='TestPass12!'
        )
        op = ensure_profile(self.other)
        op.fonction = UserProfile.ROLE_ETUDIANT
        op.is_active_access = True
        op.save()
        self.other = User.objects.select_related('profile').get(pk=self.other.pk)

        self.eleve = _make_eleve()
        self.doc = DocumentEleve.objects.create(eleve=self.eleve)
        self.doc.photo_identite_civile.save(
            'civile24.png',
            ContentFile(_png_bytes((20, 100, 40))),
            save=True,
        )
        self.key = self.doc.photo_identite_civile.name
        self.client = APIClient()

    def test_unauthenticated_401(self):
        url = f'/media/{self.key}'
        r = self.client.get(url)
        self.assertIn(r.status_code, (401, 403))

    def test_stream_returns_bytes(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.get(f'/media/{self.key}')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.get('Cache-Control'), 'private, no-store')
        body = b''.join(r.streaming_content) if hasattr(r, 'streaming_content') else r.content
        self.assertTrue(body[:8].startswith(b'\x89PNG') or len(body) > 10)

    def test_out_of_scope_403(self):
        # Étudiant role without linked eleve → cannot access this dossier photo
        self.client.force_authenticate(user=self.other)
        r = self.client.get(f'/media/{self.key}')
        self.assertEqual(r.status_code, 403)

    def test_unknown_path_403_for_authenticated(self):
        self.client.force_authenticate(user=self.admin)
        # Staff bypasses ownership — use non-staff with list scope but wrong file
        chef = User.objects.create_user(
            username='chef24@esp.mr', email='chef24@esp.mr', password='TestPass12!'
        )
        cp = ensure_profile(chef)
        cp.fonction = UserProfile.ROLE_CHEF_SECTION
        cp.is_active_access = True
        cp.section = '99'
        cp.save()
        chef = User.objects.select_related('profile').get(pk=chef.pk)
        self.client.force_authenticate(user=chef)
        r = self.client.get('/media/documents/photos/civile/no-such-file.png')
        self.assertEqual(r.status_code, 403)

    @override_settings(MEDIA_DELIVERY='xaccel', USE_S3_MEDIA=False)
    def test_xaccel_sets_header(self):
        self.client.force_authenticate(user=self.admin)
        # Ensure file exists on MEDIA_ROOT for xaccel path
        from django.conf import settings

        full = Path(settings.MEDIA_ROOT) / self.key
        full.parent.mkdir(parents=True, exist_ok=True)
        if not full.is_file():
            full.write_bytes(_png_bytes())
        r = self.client.get(f'/media/{self.key}')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.get('X-Accel-Redirect'), f'/protected-media/{self.key}')

    def test_user_may_access_media_helper(self):
        self.assertTrue(user_may_access_media(self.admin, self.key))
        self.assertFalse(user_may_access_media(self.other, self.key))
