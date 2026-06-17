import getpass

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError


def _normalize_email(email: str) -> str:
    return (email or '').strip().lower()


class Command(BaseCommand):
    help = (
        'Crée ou met à jour un superutilisateur dont l’e-mail se termine par @esp.mr '
        '(cohérent avec la connexion front : username = e-mail).'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            required=True,
            help='Adresse e-mail (doit finir par @esp.mr)',
        )
        parser.add_argument(
            '--password',
            type=str,
            default='',
            help='Mot de passe (si vide : saisie masquée)',
        )

    def handle(self, *args, **options):
        email = _normalize_email(options['email'])
        if not email.endswith('@esp.mr'):
            raise CommandError("L'e-mail doit se terminer par @esp.mr.")
        password = (options.get('password') or '').strip()
        if not password:
            password = getpass.getpass('Mot de passe : ')
            confirm = getpass.getpass('Confirmation : ')
            if password != confirm:
                raise CommandError('Les mots de passe ne correspondent pas.')
        if len(password) < 8:
            raise CommandError('Le mot de passe doit contenir au moins 8 caractères.')

        existing = User.objects.filter(email__iexact=email).first()
        if existing:
            existing.username = email
            existing.email = email
            existing.is_staff = True
            existing.is_superuser = True
            existing.is_active = True
            existing.set_password(password)
            existing.save()
            self.stdout.write(self.style.SUCCESS(f'Superutilisateur mis à jour : {email}'))
            return

        User.objects.create_superuser(username=email, email=email, password=password)
        self.stdout.write(self.style.SUCCESS(f'Superutilisateur créé : {email}'))
