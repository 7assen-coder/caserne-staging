from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import serializers

from .models import UserProfile
from .otp import validate_esp_email, validate_otp_code
from .user_lookup import find_user_by_email


def ensure_profile(user: User) -> UserProfile:
    defaults = {
        'fonction': (
            UserProfile.ROLE_ADMINISTRATEUR
            if user.is_superuser
            else UserProfile.ROLE_SUPERVISEUR
        ),
    }
    profile, _ = UserProfile.objects.get_or_create(user=user, defaults=defaults)
    return profile


def user_to_public_dict(user: User) -> dict:
    from .permissions import get_sensitive_caps

    profile = ensure_profile(user)
    phone = profile.phone or ''
    matricule = profile.matricule or ''
    fonction = profile.fonction or UserProfile.ROLE_SUPERVISEUR
    if user.is_superuser:
        fonction = UserProfile.ROLE_ADMINISTRATEUR
    grade = profile.grade or ''
    return {
        'id': str(user.pk),
        'email': user.email or '',
        'phone': phone,
        'nom': user.last_name or '',
        'prenom': user.first_name or '',
        'matricule': matricule or '—',
        'fonction': fonction,
        'grade': grade or '—',
        'scope_compagnie': profile.scope_compagnie or '',
        'scope_section': profile.scope_section or '',
        'is_active_access': bool(profile.is_active_access),
        'must_change_password': bool(profile.must_change_password),
        'eleve_id': profile.eleve_id,
        'is_superuser': bool(user.is_superuser),
        'sensitive_caps': get_sensitive_caps(user),
    }


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    phone = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=8)
    password = serializers.CharField(write_only=True)
    remember_me = serializers.BooleanField(required=False, default=True)

    def validate(self, attrs):
        email = (attrs.get('email') or '').strip().lower()
        phone = (attrs.get('phone') or '').strip()
        password = attrs.get('password')
        if email and phone:
            raise serializers.ValidationError(
                {'non_field_errors': ['Fournir un e-mail ou un téléphone, pas les deux.']}
            )
        if not email and not phone:
            raise serializers.ValidationError({'non_field_errors': ['E-mail ou téléphone requis.']})
        user = None
        if email:
            user = find_user_by_email(email)
            if user is None:
                raise serializers.ValidationError({'email': ['Identifiants invalides.']})
        else:
            profile = UserProfile.objects.select_related('user').filter(phone=phone).first()
            user = profile.user if profile else None
            if user is None:
                raise serializers.ValidationError({'phone': ['Identifiants invalides.']})
        auth_user = authenticate(username=user.username, password=password)
        if auth_user is None:
            raise serializers.ValidationError({'password': ['Mot de passe incorrect.']})
        profile = ensure_profile(auth_user)
        if not profile.is_active_access and not auth_user.is_superuser:
            raise serializers.ValidationError({'non_field_errors': ['Accès révoqué.']})
        attrs['user'] = auth_user
        return attrs


VALID_FONCTIONS = {c[0] for c in UserProfile.FONCTION_CHOICES}


class MilitaryUserSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, min_length=8)
    first_name = serializers.CharField(required=False, allow_blank=True, default='')
    last_name = serializers.CharField(required=False, allow_blank=True, default='')
    phone = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=8)
    matricule = serializers.CharField(required=False, allow_blank=True, default='')
    grade = serializers.CharField(required=False, allow_blank=True, default='')
    fonction = serializers.ChoiceField(choices=UserProfile.FONCTION_CHOICES)
    scope_compagnie = serializers.CharField(required=False, allow_blank=True, default='')
    scope_section = serializers.CharField(required=False, allow_blank=True, default='')
    eleve_id = serializers.IntegerField(required=False, allow_null=True)
    is_active_access = serializers.BooleanField(required=False, default=True)

    def validate_email(self, value):
        try:
            return validate_esp_email(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc

    def validate(self, attrs):
        fonction = attrs.get('fonction')
        section = (attrs.get('scope_section') or '').strip()
        compagnie = (attrs.get('scope_compagnie') or '').strip()
        eleve_id = attrs.get('eleve_id')
        if fonction in UserProfile.SECTION_SCOPED_ROLES and not section:
            raise serializers.ValidationError({'scope_section': ['Section requise pour ce rôle.']})
        if fonction in UserProfile.COMPAGNIE_SCOPED_ROLES and not compagnie:
            raise serializers.ValidationError({'scope_compagnie': ['Compagnie requise pour ce rôle.']})
        if fonction == UserProfile.ROLE_ETUDIANT and not eleve_id:
            raise serializers.ValidationError({'eleve_id': ['Élève lié requis pour le rôle étudiant.']})
        attrs['scope_section'] = section
        attrs['scope_compagnie'] = compagnie
        return attrs


class MilitaryUserUpdateSerializer(serializers.Serializer):
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=8)
    matricule = serializers.CharField(required=False, allow_blank=True)
    grade = serializers.CharField(required=False, allow_blank=True)
    fonction = serializers.ChoiceField(choices=UserProfile.FONCTION_CHOICES, required=False)
    scope_compagnie = serializers.CharField(required=False, allow_blank=True)
    scope_section = serializers.CharField(required=False, allow_blank=True)
    eleve_id = serializers.IntegerField(required=False, allow_null=True)
    is_active_access = serializers.BooleanField(required=False)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, min_length=8)

    def validate(self, attrs):
        instance = self.context.get('profile')
        fonction = attrs.get('fonction', instance.fonction if instance else None)
        section = attrs.get(
            'scope_section',
            instance.scope_section if instance else '',
        )
        compagnie = attrs.get(
            'scope_compagnie',
            instance.scope_compagnie if instance else '',
        )
        section = (section or '').strip()
        compagnie = (compagnie or '').strip()
        eleve_id = attrs.get(
            'eleve_id',
            instance.eleve_id if instance else None,
        )
        if fonction in UserProfile.SECTION_SCOPED_ROLES and not section:
            raise serializers.ValidationError({'scope_section': ['Section requise pour ce rôle.']})
        if fonction in UserProfile.COMPAGNIE_SCOPED_ROLES and not compagnie:
            raise serializers.ValidationError({'scope_compagnie': ['Compagnie requise pour ce rôle.']})
        if fonction == UserProfile.ROLE_ETUDIANT and not eleve_id:
            raise serializers.ValidationError({'eleve_id': ['Élève lié requis pour le rôle étudiant.']})
        if 'scope_section' in attrs:
            attrs['scope_section'] = section
        if 'scope_compagnie' in attrs:
            attrs['scope_compagnie'] = compagnie
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        user = self.context['request'].user
        profile = ensure_profile(user)
        new_password = attrs['new_password']
        current = (attrs.get('current_password') or '').strip()
        if profile.must_change_password:
            if current and not user.check_password(current):
                raise serializers.ValidationError({'current_password': ['Mot de passe actuel incorrect.']})
        else:
            if not current:
                raise serializers.ValidationError({'current_password': ['Mot de passe actuel requis.']})
            if not user.check_password(current):
                raise serializers.ValidationError({'current_password': ['Mot de passe actuel incorrect.']})
        if user.check_password(new_password):
            raise serializers.ValidationError({'new_password': ['Le nouveau mot de passe doit être différent.']})
        attrs['profile'] = profile
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    source = serializers.ChoiceField(
        choices=('login_recovery', 'profile_reset'),
        required=False,
        default='login_recovery',
    )
    lang = serializers.ChoiceField(
        choices=('fr', 'ar'),
        required=False,
        default='fr',
    )

    def validate_email(self, value):
        try:
            return validate_esp_email(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc

    def validate_lang(self, value):
        v = (value or 'fr').strip().lower()
        if v.startswith('ar'):
            return 'ar'
        return 'fr'


class PasswordResetVerifySerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    otp = serializers.CharField(max_length=12)

    def validate_email(self, value):
        try:
            return validate_esp_email(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc

    def validate_otp(self, value):
        try:
            return validate_otp_code(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc


class PasswordResetConfirmSerializer(serializers.Serializer):
    reset_token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)
