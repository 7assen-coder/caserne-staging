from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import UserProfile

User = get_user_model()


@receiver(post_save, sender=User)
def ensure_user_profile(sender, instance, created, **kwargs):
    defaults = {
        'fonction': (
            UserProfile.ROLE_ADMINISTRATEUR
            if instance.is_superuser
            else UserProfile.ROLE_SUPERVISEUR
        ),
    }
    profile, was_created = UserProfile.objects.get_or_create(user=instance, defaults=defaults)
    if not was_created and instance.is_superuser and profile.fonction != UserProfile.ROLE_ADMINISTRATEUR:
        # Do not downgrade an explicit admin; only promote superusers without admin role.
        if profile.fonction in (
            UserProfile.ROLE_SUPERVISEUR,
            UserProfile.ROLE_CHEF_SECTION,
            'encadrement',
            'terrain',
            'commandement',
        ):
            profile.fonction = UserProfile.ROLE_ADMINISTRATEUR
            profile.save(update_fields=['fonction'])
