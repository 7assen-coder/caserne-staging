"""Fast auth user lookups by institutional email (username == email)."""

from __future__ import annotations

from django.contrib.auth.models import User

from .otp import normalize_email


def find_user_by_email(email: str) -> User | None:
    """Exact match on unique username index (username is always the email)."""
    email = normalize_email(email)
    if not email:
        return None
    return User.objects.filter(username=email).select_related('profile').first()


def find_active_user_by_email(email: str) -> User | None:
    email = normalize_email(email)
    if not email:
        return None
    return (
        User.objects.select_related('profile')
        .only(
            'id',
            'email',
            'username',
            'is_active',
            'is_superuser',
            'password',
            'profile__id',
            'profile__is_active_access',
            'profile__must_change_password',
            'profile__fonction',
            'profile__phone',
            'profile__matricule',
            'profile__grade',
            'profile__scope_compagnie',
            'profile__scope_section',
            'profile__eleve_id',
        )
        .filter(username=email, is_active=True)
        .first()
    )


def email_taken(email: str) -> bool:
    email = normalize_email(email)
    if not email:
        return False
    return User.objects.filter(username=email).exists()
