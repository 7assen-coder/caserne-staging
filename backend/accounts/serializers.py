from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import serializers

from .models import UserProfile


def user_to_public_dict(user: User) -> dict:
    profile = getattr(user, 'profile', None)
    phone = getattr(profile, 'phone', None) or ''
    matricule = getattr(profile, 'matricule', '') or ''
    fonction = getattr(profile, 'fonction', '') or 'encadrement'
    grade = getattr(profile, 'grade', '') or ''
    return {
        'id': str(user.pk),
        'email': user.email or '',
        'phone': phone,
        'nom': user.last_name or '',
        'prenom': user.first_name or '',
        'matricule': matricule or '—',
        'fonction': fonction,
        'grade': grade or '—',
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
            raise serializers.ValidationError({'non_field_errors': ['Fournir un e-mail ou un téléphone, pas les deux.']})
        if not email and not phone:
            raise serializers.ValidationError({'non_field_errors': ['E-mail ou téléphone requis.']})
        user = None
        if email:
            user = User.objects.filter(email__iexact=email).first()
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
        attrs['user'] = auth_user
        return attrs
