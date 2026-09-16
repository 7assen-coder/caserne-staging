from urllib.parse import urlparse

from rest_framework import serializers

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


class EleveSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    matricule = serializers.CharField()
    prenom = serializers.CharField()
    nom_famille = serializers.CharField()


def _strip_file_urls(ret, fields):
    for field in fields:
        url = ret.get(field)
        if url:
            ret[field] = urlparse(url).path
    return ret


class EquipementItemSerializer(serializers.ModelSerializer):
    expected_version = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = EquipementItem
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'row_version')

    def to_representation(self, instance):
        return _strip_file_urls(super().to_representation(instance), ['pdf'])


class SanctionSerializer(serializers.ModelSerializer):
    expected_version = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = Sanction
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'row_version')

    def to_representation(self, instance):
        return _strip_file_urls(super().to_representation(instance), ['cr_pdf', 'pj_pdf'])


class DemandeSerializer(serializers.ModelSerializer):
    expected_version = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = Demande
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'row_version')

    def to_representation(self, instance):
        return _strip_file_urls(super().to_representation(instance), ['demande_pdf', 'pj_pdf'])


class ConsultationMedicaleSerializer(serializers.ModelSerializer):
    expected_version = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = ConsultationMedicale
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'row_version')

    def to_representation(self, instance):
        return _strip_file_urls(super().to_representation(instance), ['pj_pdf'])


class JournalEvenementSerializer(serializers.ModelSerializer):
    expected_version = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = JournalEvenement
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'row_version')

    def to_representation(self, instance):
        return _strip_file_urls(super().to_representation(instance), ['pj_pdf'])


class DroitsLigneSerializer(serializers.ModelSerializer):
    expected_version = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = DroitsLigne
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'row_version')


class DroitsBatchSerializer(serializers.ModelSerializer):
    lignes = DroitsLigneSerializer(many=True, read_only=True)
    expected_version = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = DroitsBatch
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'row_version')


class AppelLigneSerializer(serializers.ModelSerializer):
    eleve_matricule = serializers.CharField(source='eleve.matricule', read_only=True)
    eleve_nom = serializers.SerializerMethodField()

    class Meta:
        model = AppelLigne
        fields = (
            'id',
            'appel',
            'eleve',
            'statut',
            'motif',
            'created_at',
            'updated_at',
            'eleve_matricule',
            'eleve_nom',
        )

    def get_eleve_nom(self, obj):
        e = obj.eleve
        return f'{e.prenom} {e.nom_famille}'.strip()


class AppelPresenceSerializer(serializers.ModelSerializer):
    lignes = AppelLigneSerializer(many=True, read_only=True)
    total = serializers.SerializerMethodField()
    presents = serializers.SerializerMethodField()
    absents = serializers.SerializerMethodField()

    class Meta:
        model = AppelPresence
        fields = '__all__'

    def get_total(self, obj):
        return obj.lignes.count()

    def get_presents(self, obj):
        return obj.lignes.filter(statut='present').count()

    def get_absents(self, obj):
        return obj.lignes.filter(statut='absent').count()
