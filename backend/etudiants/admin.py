from django.contrib import admin
from .models import (
    Eleve, ContactParent, DossierSante, DossierAcademique, 
    DossierMilitaire, Hebergement, DocumentEleve
)

@admin.register(Eleve)
class EleveAdmin(admin.ModelAdmin):
    list_display = ('matricule', 'prenom', 'nom_famille', 'nni', 'sexe', 'categorie_bac')
    search_fields = ('matricule', 'prenom', 'nom_famille', 'nni')

admin.site.register(ContactParent)
admin.site.register(DossierSante)
admin.site.register(DossierAcademique)
admin.site.register(DossierMilitaire)
admin.site.register(Hebergement)
admin.site.register(DocumentEleve)
