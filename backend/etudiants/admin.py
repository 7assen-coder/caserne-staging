from django.contrib import admin
from .models import (
    Eleve, ContactParent, DossierSante, DossierAcademique, 
    DossierMilitaire, Hebergement, DocumentEleve
)

@admin.register(Eleve)
class EleveAdmin(admin.ModelAdmin):
    list_display = (
        'matricule', 'prenom', 'nom_famille', 'nni', 'sexe',
        'profil_incomplet', 'categorie_bac', 'row_version',
    )
    list_filter = ('profil_incomplet', 'sexe', 'categorie_bac')
    search_fields = ('matricule', 'prenom', 'nom_famille', 'nni')
    readonly_fields = (
        'row_version', 'updated_at', 'created_at',
        'annee_premiere_inscription', 'email_pro',
    )

@admin.register(DossierSante)
class DossierSanteAdmin(admin.ModelAdmin):
    # 1. Make it visible in the list view (table)
    list_display = ('eleve', 'groupe_sanguin', 'poids_kg', 'taille_cm', 'imc')

    # 2. Crucial: Make it visible inside the student's detail/edit form
    readonly_fields = ('imc',)

    # 3. Organize where it appears in the edit form
    fields = (
        'eleve', 
        'groupe_sanguin', 
        'poids_kg', 
        'taille_cm', 
        'imc',  # Now this will render safely as read-only text
        'assureur', 
        'num_assure', 
        'antecedents_medicaux', 
        'maladies_chroniques', 
        'medicaments_a_vie'
    )

admin.site.register(ContactParent)
admin.site.register(DossierAcademique)
admin.site.register(DossierMilitaire)
admin.site.register(Hebergement)
admin.site.register(DocumentEleve)
