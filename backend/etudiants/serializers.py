from rest_framework import serializers
from .models import (
    Eleve, ContactParent, DossierSante, DossierAcademique, 
    DossierMilitaire, Hebergement, DocumentEleve
)

class ContactParentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactParent
        fields = '__all__'

class DossierSanteSerializer(serializers.ModelSerializer):
    class Meta:
        model = DossierSante
        fields = '__all__'

class DossierAcademiqueSerializer(serializers.ModelSerializer):
    class Meta:
        model = DossierAcademique
        fields = '__all__'

class DossierMilitaireSerializer(serializers.ModelSerializer):
    class Meta:
        model = DossierMilitaire
        fields = '__all__'

class HebergementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hebergement
        fields = '__all__'

class DocumentEleveSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentEleve
        fields = '__all__'

class EleveSerializer(serializers.ModelSerializer):
    contacts_parents = ContactParentSerializer(read_only=True)
    dossier_sante = DossierSanteSerializer(read_only=True)
    dossier_academique = DossierAcademiqueSerializer(read_only=True)
    dossier_militaire = DossierMilitaireSerializer(read_only=True)
    hebergement = HebergementSerializer(read_only=True)
    documents = DocumentEleveSerializer(read_only=True)

    class Meta:
        model = Eleve
        fields = '__all__'
