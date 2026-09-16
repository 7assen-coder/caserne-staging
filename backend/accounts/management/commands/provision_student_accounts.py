"""Bulk-create student User accounts linked to élèves."""

import secrets
import string

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import UserProfile
from accounts.serializers import ensure_profile
from etudiants.models import Eleve


def _password(length=12):
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


class Command(BaseCommand):
    help = 'Provisionne des comptes étudiants (fonction=etudiant) liés aux élèves.'

    def add_arguments(self, parser):
        parser.add_argument('--limit', type=int, default=0, help='Max élèves à traiter (0 = tous)')
        parser.add_argument('--dry-run', action='store_true')
        parser.add_argument(
            '--print-secrets',
            action='store_true',
            help='Affiche email;mot_de_passe (à ne pas journaliser en prod)',
        )

    def handle(self, *args, **options):
        limit = options['limit']
        dry = options['dry_run']
        print_secrets = options['print_secrets']

        linked_ids = set(
            UserProfile.objects.filter(
                fonction=UserProfile.ROLE_ETUDIANT,
                eleve_id__isnull=False,
            ).values_list('eleve_id', flat=True)
        )
        qs = Eleve.objects.exclude(pk__in=linked_ids).order_by('matricule')
        if limit > 0:
            qs = qs[:limit]

        created = 0
        skipped = 0
        for eleve in qs:
            email = (eleve.email_pro or f'{eleve.matricule}@esp.mr').strip().lower()
            if User.objects.filter(email__iexact=email).exists():
                skipped += 1
                self.stdout.write(self.style.WARNING(f'skip conflict email {email}'))
                continue
            pwd = _password()
            if dry:
                created += 1
                if print_secrets:
                    self.stdout.write(f'{email};{pwd}')
                continue
            with transaction.atomic():
                user = User.objects.create_user(
                    username=email,
                    email=email,
                    password=pwd,
                    first_name=eleve.prenom or '',
                    last_name=eleve.nom_famille or '',
                )
                profile = ensure_profile(user)
                profile.fonction = UserProfile.ROLE_ETUDIANT
                profile.eleve = eleve
                profile.matricule = str(eleve.matricule)
                profile.is_active_access = True
                profile.must_change_password = True
                profile.save()
            created += 1
            if print_secrets:
                self.stdout.write(f'{email};{pwd}')

        verb = 'would create' if dry else 'created'
        self.stdout.write(self.style.SUCCESS(f'{verb}={created} skipped={skipped}'))
