"""Seed one user per RBAC role for local/staging smoke tests."""

from datetime import date
from decimal import Decimal

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from accounts.models import UserProfile
from accounts.serializers import ensure_profile
from etudiants.models import DossierAcademique, DossierMilitaire, DossierSante, Eleve

DEFAULT_PASSWORD = 'TestPass12!'

SEED = [
    ('admin@esp.mr', UserProfile.ROLE_ADMINISTRATEUR, {}, True),
    ('cdu@esp.mr', UserProfile.ROLE_COMMANDANT_UNITE, {}, False),
    ('cdg@esp.mr', UserProfile.ROLE_COMMANDANT_GROUPEMENT, {}, False),
    ('cdc@esp.mr', UserProfile.ROLE_COMMANDANT_COMPAGNIE, {'scope_compagnie': '1ere'}, False),
    ('chef@esp.mr', UserProfile.ROLE_CHEF_SECTION, {'scope_section': '11', 'scope_compagnie': '1ere'}, False),
    ('sup@esp.mr', UserProfile.ROLE_SUPERVISEUR, {'scope_section': '11'}, False),
]


def _ensure_demo_eleve():
    eleve = Eleve.objects.filter(matricule=9001).first()
    if eleve:
        return eleve
    eleve = Eleve.objects.create(
        matricule=9001,
        num_bac='BAC9001',
        nni='9000000001',
        sexe='H',
        prenom='Demo',
        nom_famille='Etudiant',
        date_naissance=date(2001, 5, 15),
        lieu_naissance='Nouakchott',
        nationalite='Mauritanienne',
        categorie_bac='National',
        serie_bac='C',
        moyenne_bac=Decimal('14.00'),
        ecole_bac='Lycée',
        date_premiere_inscription=date(2022, 9, 1),
        voie_acces='1',
        diplome_acces='Bac',
        adresse_primaire='Nouakchott',
        email_perso='demo.etudiant@example.com',
        tel1='31234567',
    )
    DossierMilitaire.objects.create(
        eleve=eleve, compagnie='1ere', section='11', sport_pratique='Football'
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


class Command(BaseCommand):
    help = 'Crée des utilisateurs de test pour chaque rôle RBAC (mot de passe TestPass12!).'

    def handle(self, *args, **options):
        for email, fonction, scopes, is_super in SEED:
            user = User.objects.filter(email__iexact=email).first()
            if user is None:
                if is_super:
                    user = User.objects.create_superuser(
                        username=email, email=email, password=DEFAULT_PASSWORD
                    )
                else:
                    user = User.objects.create_user(
                        username=email, email=email, password=DEFAULT_PASSWORD
                    )
                created = True
            else:
                user.set_password(DEFAULT_PASSWORD)
                user.is_active = True
                if is_super:
                    user.is_superuser = True
                    user.is_staff = True
                user.save()
                created = False
            profile = ensure_profile(user)
            profile.fonction = fonction
            profile.is_active_access = True
            profile.must_change_password = False
            profile.scope_compagnie = scopes.get('scope_compagnie', '')
            profile.scope_section = scopes.get('scope_section', '')
            profile.save()
            verb = 'créé' if created else 'mis à jour'
            self.stdout.write(self.style.SUCCESS(f'{verb}: {email} ({fonction})'))

        eleve = _ensure_demo_eleve()
        email = (eleve.email_pro or f'{eleve.matricule}@esp.mr').strip().lower()
        user = User.objects.filter(email__iexact=email).first()
        if user is None:
            user = User.objects.create_user(
                username=email,
                email=email,
                password=DEFAULT_PASSWORD,
                first_name=eleve.prenom,
                last_name=eleve.nom_famille,
            )
            created = True
        else:
            user.set_password(DEFAULT_PASSWORD)
            user.is_active = True
            user.save()
            created = False
        profile = ensure_profile(user)
        profile.fonction = UserProfile.ROLE_ETUDIANT
        profile.eleve = eleve
        profile.matricule = str(eleve.matricule)
        profile.is_active_access = True
        profile.must_change_password = False
        profile.save()
        verb = 'créé' if created else 'mis à jour'
        self.stdout.write(
            self.style.SUCCESS(f'{verb}: {email} (etudiant → élève {eleve.matricule})')
        )

        self.stdout.write(self.style.WARNING(f'Mot de passe commun: {DEFAULT_PASSWORD}'))
