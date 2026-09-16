from urllib.parse import urlparse
import re

from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied

from accounts.permissions import (
    can_edit_nni,
    can_edit_parents,
    can_edit_sante,
    can_view_nni,
    can_view_parents,
    can_view_sante,
    mask_nni,
)

from .models import (
    Eleve,
    ContactParent,
    DossierSante,
    DossierAcademique,
    DossierMilitaire,
    Hebergement,
    DocumentEleve,
)

FORBIDDEN_SENSITIVE = "Vous n'avez pas la permission de modifier ce champ sensible."
MATRICULE_6 = re.compile(r'^\d{6}$')
NNI_10 = re.compile(r'^\d{10}$')


def _request_user(serializer):
    request = serializer.context.get('request')
    if request is None:
        return None
    return getattr(request, 'user', None)


def _current_academic_start_yy(now=None):
    """Two-digit start year of current academic year (Sep → YYYY-YYYY+1)."""
    now = now or timezone.localtime()
    year = now.year
    month = now.month
    start = year if month >= 9 else year - 1
    return start % 100


class ContactParentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactParent
        fields = '__all__'

    def to_representation(self, instance):
        user = _request_user(self)
        if user is not None and not can_view_parents(user):
            return None
        return super().to_representation(instance)

    def create(self, validated_data):
        user = _request_user(self)
        if user is not None and not can_edit_parents(user):
            raise PermissionDenied(FORBIDDEN_SENSITIVE)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        user = _request_user(self)
        if user is not None and not can_edit_parents(user):
            raise PermissionDenied(FORBIDDEN_SENSITIVE)
        return super().update(instance, validated_data)


class DossierSanteSerializer(serializers.ModelSerializer):
    imc = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)

    class Meta:
        model = DossierSante
        fields = '__all__'

    def to_representation(self, instance):
        user = _request_user(self)
        if user is not None and not can_view_sante(user):
            return None
        ret = super().to_representation(instance)
        for field in ('dossier_medical_pdf', 'photo_medicale'):
            url = ret.get(field)
            if url:
                ret[field] = urlparse(url).path
        return ret

    def create(self, validated_data):
        user = _request_user(self)
        if user is not None and not can_edit_sante(user):
            raise PermissionDenied(FORBIDDEN_SENSITIVE)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        user = _request_user(self)
        if user is not None and not can_edit_sante(user):
            raise PermissionDenied(FORBIDDEN_SENSITIVE)
        return super().update(instance, validated_data)


class DossierAcademiqueSerializer(serializers.ModelSerializer):
    class Meta:
        model = DossierAcademique
        fields = '__all__'


class DossierAcademiqueListSerializer(serializers.ModelSerializer):
    class Meta:
        model = DossierAcademique
        fields = ('departement', 'niveau_actuel', 'parcours')


class DossierMilitaireSerializer(serializers.ModelSerializer):
    class Meta:
        model = DossierMilitaire
        fields = '__all__'


class DossierMilitaireListSerializer(serializers.ModelSerializer):
    class Meta:
        model = DossierMilitaire
        fields = ('compagnie', 'section')


class HebergementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hebergement
        fields = '__all__'


class DocumentEleveSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentEleve
        fields = '__all__'

    def to_internal_value(self, data):
        from etudiants.file_normalize import (
            DOCUMENT_FIELDS,
            PHOTO_FIELDS,
            normalize_uploaded_file,
        )

        # Normalize before field validators so large phone photos pass after resize.
        if hasattr(data, 'copy'):
            mutable = data.copy()
        else:
            mutable = dict(data)

        try:
            for field in PHOTO_FIELDS:
                val = mutable.get(field) if hasattr(mutable, 'get') else mutable.get(field)
                if val not in (None, ''):
                    mutable[field] = normalize_uploaded_file(val, 'photo')
            for field in DOCUMENT_FIELDS:
                val = mutable.get(field) if hasattr(mutable, 'get') else mutable.get(field)
                if val not in (None, ''):
                    mutable[field] = normalize_uploaded_file(val, 'document')
        except ValidationError as exc:
            msgs = list(getattr(exc, 'messages', None) or [str(exc)])
            raise serializers.ValidationError(msgs) from exc

        return super().to_internal_value(mutable)

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        file_fields = [
            'cin',
            'acte_naissance',
            'diplome_acces',
            'diplome_bac',
            'photo_identite_militaire',
            'photo_identite_civile',
            'photo_militaire_integrale',
        ]
        for field in file_fields:
            url = ret.get(field)
            if url:
                ret[field] = urlparse(url).path
        # Phase 21 thumbs are relative MEDIA paths
        for field in (
            'photo_identite_militaire_thumb_128',
            'photo_identite_militaire_thumb_320',
            'photo_identite_civile_thumb_128',
            'photo_identite_civile_thumb_320',
            'photo_militaire_integrale_thumb_128',
            'photo_militaire_integrale_thumb_320',
        ):
            rel = ret.get(field) or ''
            if rel and not str(rel).startswith('/'):
                ret[field] = f'/media/{rel}'
        return ret


class EleveListSerializer(serializers.ModelSerializer):
    """Slim list payload — no santé / parents / hébergement / documents."""

    dossier_academique = DossierAcademiqueListSerializer(read_only=True)
    dossier_militaire = DossierMilitaireListSerializer(read_only=True)

    class Meta:
        model = Eleve
        fields = (
            'id',
            'matricule',
            'prenom',
            'nom_famille',
            'prenom_ar',
            'nom_famille_ar',
            'sexe',
            'nni',
            'tel1',
            'email_pro',
            'date_naissance',
            'row_version',
            'updated_at',
            'dossier_academique',
            'dossier_militaire',
            'profil_incomplet',
        )
        read_only_fields = fields

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        user = _request_user(self)
        if user is None:
            return ret
        view = can_view_nni(user)
        if view == 'masked':
            ret['nni'] = mask_nni(getattr(instance, 'nni', ''))
        elif not view:
            ret['nni'] = None
        return ret


class EleveSerializer(serializers.ModelSerializer):
    contacts_parents = ContactParentSerializer(read_only=True)
    dossier_sante = DossierSanteSerializer(read_only=True)
    dossier_academique = DossierAcademiqueSerializer(read_only=True)
    dossier_militaire = DossierMilitaireSerializer(read_only=True)
    hebergement = HebergementSerializer(read_only=True)
    documents = DocumentEleveSerializer(read_only=True)
    expected_version = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = Eleve
        fields = '__all__'
        read_only_fields = (
            'annee_premiere_inscription',
            'email_pro',
            'row_version',
            'updated_at',
            'created_at',
        )

    CREATE_REQUIRED_FIELDS = (
        'nni',
        'email_perso',
        'tel1',
        'date_naissance',
        'lieu_naissance',
        'voie_acces',
        'num_bac',
        'serie_bac',
        'moyenne_bac',
        'ecole_bac',
        'diplome_acces',
        'adresse_primaire',
        'date_premiere_inscription',
        'nationalite',
        'nom_famille',
    )

    @staticmethod
    def _is_blank(value):
        return value is None or (isinstance(value, str) and not value.strip())

    @classmethod
    def dossier_is_complete(cls, eleve):
        for field in cls.CREATE_REQUIRED_FIELDS:
            if cls._is_blank(getattr(eleve, field, None)):
                return False
        return True

    def create(self, validated_data):
        # Never allow API create to mark incomplete — import sets this flag.
        validated_data['profil_incomplet'] = False
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Clients must not flip profil_incomplet manually except via completion.
        validated_data.pop('profil_incomplet', None)
        instance = super().update(instance, validated_data)
        if instance.profil_incomplet and self.dossier_is_complete(instance):
            instance.profil_incomplet = False
            instance.save(update_fields=['profil_incomplet'])
        return instance

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        user = _request_user(self)
        if user is None:
            return ret

        view = can_view_nni(user)
        if view == 'masked':
            ret['nni'] = mask_nni(getattr(instance, 'nni', ''))
        elif not view:
            ret['nni'] = None

        if not can_view_sante(user):
            ret['dossier_sante'] = None
        if not can_view_parents(user):
            ret['contacts_parents'] = None
        return ret

    def validate_matricule(self, value):
        s = str(value).strip()
        instance = getattr(self, 'instance', None)
        if instance is not None and instance.matricule == value:
            return value
        if not MATRICULE_6.fullmatch(s):
            raise serializers.ValidationError(
                'Le matricule doit contenir exactement 6 chiffres (ex. 251280).'
            )
        yy = int(s[:2])
        max_yy = _current_academic_start_yy()
        if yy > max_yy:
            raise serializers.ValidationError(
                f"L'année du matricule ({yy:02d}) ne peut pas dépasser "
                f"{max_yy:02d} (année universitaire en cours)."
            )
        return value

    def validate_nni(self, value):
        if value in (None, ''):
            return value
        s = str(value).strip()
        if not NNI_10.fullmatch(s):
            raise serializers.ValidationError(
                'Le NNI doit contenir exactement 10 chiffres.'
            )
        return s

    def validate(self, attrs):
        user = _request_user(self)
        initial = self.initial_data if isinstance(getattr(self, 'initial_data', None), dict) else {}
        if user is not None:
            if ('nni' in attrs or 'nni' in initial) and not can_edit_nni(user):
                raise PermissionDenied(FORBIDDEN_SENSITIVE)

        # Nouvel étudiant (create): keep strict required fields despite blankable model.
        if self.instance is None:
            missing = {}
            for field in self.CREATE_REQUIRED_FIELDS:
                if field in attrs:
                    val = attrs[field]
                elif field in initial:
                    val = initial[field]
                else:
                    val = None
                if self._is_blank(val):
                    missing[field] = 'Ce champ est obligatoire.'
            if missing:
                raise serializers.ValidationError(missing)
        return attrs