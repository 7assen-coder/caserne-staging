from urllib.parse import urlparse

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
    imc = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
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

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        file_fields = [
            'cin', 'acte_naissance', 'diplome_acces', 'diplome_bac',
            'photo_identite_militaire', 'photo_identite_civile', 'photo_militaire_integrale',
        ]
        for field in file_fields:
            url = ret.get(field)
            if url:
                ret[field] = urlparse(url).path
        return ret

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
        read_only_fields = ('annee_premiere_inscription', 'email_pro')
