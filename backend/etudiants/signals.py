"""Invalidate list/dashboard caches when élève data changes (Phase 18).
Phase 21: enqueue photo WebP variants on DocumentEleve photo uploads.
"""

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from etudiants.cache_keys import bump_eleve_caches
from etudiants.jobs import PHOTO_VARIANT_FIELDS
from etudiants.models import DocumentEleve, DossierAcademique, DossierMilitaire, Eleve


@receiver(post_save, sender=Eleve)
@receiver(post_delete, sender=Eleve)
@receiver(post_save, sender=DossierAcademique)
@receiver(post_delete, sender=DossierAcademique)
@receiver(post_save, sender=DossierMilitaire)
@receiver(post_delete, sender=DossierMilitaire)
def _bump_eleve_list_caches(sender, **kwargs):
    bump_eleve_caches()


@receiver(post_save, sender=DocumentEleve)
def _enqueue_photo_variants(sender, instance: DocumentEleve, **kwargs):
    update_fields = kwargs.get('update_fields')
    from etudiants.tasks import generate_photo_variants

    for field_name in PHOTO_VARIANT_FIELDS:
        if update_fields is not None and field_name not in update_fields:
            continue
        image_field = getattr(instance, field_name, None)
        if image_field and getattr(image_field, 'name', None):
            generate_photo_variants.delay(instance.pk, field_name)
