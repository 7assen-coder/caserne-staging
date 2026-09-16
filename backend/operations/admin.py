from django.contrib import admin

from .models import (
    AppelLigne,
    AppelPresence,
    ConsultationMedicale,
    Demande,
    DroitsBatch,
    DroitsLigne,
    EquipementItem,
    JournalEvenement,
    Sanction,
)


@admin.register(EquipementItem)
class EquipementItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'eleve', 'code', 'nature', 'etat', 'date_remise')
    list_filter = ('etat',)


@admin.register(Sanction)
class SanctionAdmin(admin.ModelAdmin):
    list_display = ('id', 'eleve', 'code', 'nature', 'statut', 'date_debut')
    list_filter = ('statut', 'nature')


@admin.register(Demande)
class DemandeAdmin(admin.ModelAdmin):
    list_display = ('id', 'eleve', 'code', 'nature', 'statut', 'date_depot')
    list_filter = ('statut', 'nature')


@admin.register(ConsultationMedicale)
class ConsultationMedicaleAdmin(admin.ModelAdmin):
    list_display = ('id', 'eleve', 'type', 'date_consultation', 'code')
    list_filter = ('type',)


@admin.register(JournalEvenement)
class JournalEvenementAdmin(admin.ModelAdmin):
    list_display = ('id', 'eleve', 'type', 'titre', 'date', 'source')
    list_filter = ('type', 'source')


class DroitsLigneInline(admin.TabularInline):
    model = DroitsLigne
    extra = 0


@admin.register(DroitsBatch)
class DroitsBatchAdmin(admin.ModelAdmin):
    list_display = ('id', 'annee', 'mois', 'compagnie', 'validated_at', 'default_montant')
    inlines = [DroitsLigneInline]


class AppelLigneInline(admin.TabularInline):
    model = AppelLigne
    extra = 0


@admin.register(AppelPresence)
class AppelPresenceAdmin(admin.ModelAdmin):
    list_display = ('id', 'date', 'compagnie', 'section', 'type', 'superviseur')
    inlines = [AppelLigneInline]
