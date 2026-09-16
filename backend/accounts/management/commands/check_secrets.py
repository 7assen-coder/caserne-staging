"""Verify SECRET_KEY / DEBUG / DJANGO_ENV without leaking the key."""

from django.conf import settings
from django.core.management.base import BaseCommand

from backend.settings import _secret_is_weak


class Command(BaseCommand):
    help = 'Vérifie SECRET_KEY / DEBUG / DJANGO_ENV (sans afficher le secret).'

    def handle(self, *args, **options):
        key = settings.SECRET_KEY or ''
        weak = _secret_is_weak(key)
        env = getattr(settings, 'DJANGO_ENV', 'local')
        self.stdout.write(f'DJANGO_ENV={env}')
        self.stdout.write(f'DEBUG={settings.DEBUG}')
        self.stdout.write(f'SECRET_KEY length={len(key)}')
        self.stdout.write(f'SECRET_KEY weak={weak}')
        if not key:
            self.stderr.write(self.style.ERROR('FAIL: SECRET_KEY manquant'))
            raise SystemExit(1)
        if (not settings.DEBUG or env in ('production', 'staging', 'render')) and weak:
            self.stderr.write(self.style.ERROR('FAIL: SECRET_KEY trop faible pour cet environnement'))
            raise SystemExit(1)
        self.stdout.write(self.style.SUCCESS('OK'))
