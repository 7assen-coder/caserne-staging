"""Phase 6: AuditEvent trail for élève + API access control."""

from datetime import date
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import AuditEvent, UserProfile
from accounts.serializers import ensure_profile
from etudiants.models import DossierAcademique, DossierMilitaire, DossierSante, Eleve


def _make_eleve(*, matricule=900001, nni='1234567890', compagnie='1ere', section='11'):
    eleve = Eleve.objects.create(
        matricule=matricule,
        num_bac=f'BAC{matricule}',
        nni=nni,
        sexe='H',
        prenom='Test',
        nom_famille='Audit',
        date_naissance=date(2000, 1, 1),
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
        email_perso=f'perso{matricule}@example.com',
        tel1='31234567',
    )
    DossierMilitaire.objects.create(
        eleve=eleve, compagnie=compagnie, section=section, sport_pratique='Football'
    )
    DossierAcademique.objects.create(
        eleve=eleve,
        departement='IRT',
        niveau_actuel='3',
        semestre_actuel='S5',
        parcours='En cours normal',
    )
    DossierSante.objects.create(eleve=eleve, groupe_sanguin='O+')
    return eleve


def _make_user(*, email, fonction, password='TestPass12', **profile_kwargs):
    user = User.objects.create_user(username=email, email=email, password=password)
    profile = ensure_profile(user)
    profile.fonction = fonction
    profile.is_active_access = True
    for k, v in profile_kwargs.items():
        setattr(profile, k, v)
    profile.save()
    return User.objects.select_related('profile').get(pk=user.pk)


class AuditEventTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = _make_user(email='admin@esp.mr', fonction=UserProfile.ROLE_ADMINISTRATEUR)
        self.superviseur = _make_user(
            email='sup@esp.mr',
            fonction=UserProfile.ROLE_SUPERVISEUR,
            scope_section='11',
        )
        self.eleve = _make_eleve()

    def test_retrieve_creates_view_event(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(f'/api/v1/eleves/{self.eleve.pk}/')
        self.assertEqual(response.status_code, 200, response.data if hasattr(response, 'data') else response.content)
        event = AuditEvent.objects.filter(
            action=AuditEvent.ACTION_VIEW,
            resource_type=AuditEvent.RESOURCE_ELEVE,
            resource_id=str(self.eleve.pk),
        ).first()
        self.assertIsNotNone(event)
        self.assertEqual(event.actor_id, self.admin.pk)
        self.assertEqual(event.eleve_id, self.eleve.pk)

    def test_update_creates_update_event(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            f'/api/v1/eleves/{self.eleve.pk}/',
            {'nom_famille': 'Modifie', 'expected_version': self.eleve.row_version},
            format='json',
        )
        self.assertEqual(response.status_code, 200, getattr(response, 'data', None))
        event = AuditEvent.objects.filter(action=AuditEvent.ACTION_UPDATE).first()
        self.assertIsNotNone(event)
        self.assertIn('nom_famille', event.changes)

    def test_destroy_creates_delete_event(self):
        self.client.force_authenticate(user=self.admin)
        pk = self.eleve.pk
        response = self.client.delete(
            f'/api/v1/eleves/{pk}/',
            {'expected_version': self.eleve.row_version},
            format='json',
        )
        self.assertIn(response.status_code, (204, 200))
        self.assertTrue(
            AuditEvent.objects.filter(
                action=AuditEvent.ACTION_DELETE,
                resource_id=str(pk),
            ).exists()
        )

    def test_superviseur_cannot_list_audit(self):
        self.client.force_authenticate(user=self.superviseur)
        response = self.client.get('/api/v1/audit/')
        self.assertEqual(response.status_code, 403)

    def test_admin_can_list_and_filter_by_eleve(self):
        AuditEvent.objects.create(
            actor=self.admin,
            actor_email=self.admin.email,
            action=AuditEvent.ACTION_VIEW,
            resource_type=AuditEvent.RESOURCE_ELEVE,
            resource_id=str(self.eleve.pk),
            eleve=self.eleve,
            eleve_matricule=str(self.eleve.matricule),
            summary='test',
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/v1/audit/', {'eleve': self.eleve.pk})
        self.assertEqual(response.status_code, 200, getattr(response, 'data', None))
        results = response.data['results'] if isinstance(response.data, dict) else response.data
        self.assertGreaterEqual(len(results), 1)

    def test_audit_failure_does_not_break_update(self):
        self.client.force_authenticate(user=self.admin)
        with patch('accounts.audit.AuditEvent.objects.create', side_effect=RuntimeError('db down')):
            response = self.client.patch(
                f'/api/v1/eleves/{self.eleve.pk}/',
                {'prenom': 'Ok', 'expected_version': self.eleve.row_version},
                format='json',
            )
        self.assertEqual(response.status_code, 200, getattr(response, 'data', None))
        self.eleve.refresh_from_db()
        self.assertEqual(self.eleve.prenom, 'Ok')


class AuditAdminReadonlyTests(TestCase):
    def test_admin_cannot_delete_audit_event(self):
        from django.contrib.admin.sites import site
        from accounts.admin import AuditEventAdmin

        admin_model = AuditEventAdmin(AuditEvent, site)
        request = type('R', (), {'user': User(is_superuser=True)})()
        self.assertFalse(admin_model.has_delete_permission(request))
        self.assertFalse(admin_model.has_add_permission(request))
        self.assertFalse(admin_model.has_change_permission(request))
