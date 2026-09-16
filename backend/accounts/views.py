from django.conf import settings
from django.contrib.auth.models import User
from django.db import transaction
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from .csrf_utils import enforce_csrf
from .login_protection import (
    clear_failures,
    client_ip,
    is_ip_blocked,
    is_locked,
    lock_retry_after,
    normalize_identifier,
    register_failure,
)
from .audit import record_audit
from .models import AuditEvent, LoginAttempt, UserProfile
from .permissions import CanManageMilitaryUsers, CanProvisionStudents, HasActiveAccess, access_is_active
from .serializers import (
    LoginSerializer,
    MilitaryUserSerializer,
    MilitaryUserUpdateSerializer,
    ensure_profile,
    user_to_public_dict,
)
from .throttles import LoginRateThrottle
import secrets
import string


def _cookie_common():
    common = {
        'httponly': True,
        'secure': bool(getattr(settings, 'JWT_COOKIE_SECURE', not settings.DEBUG)),
        'samesite': getattr(settings, 'JWT_COOKIE_SAMESITE', 'Lax'),
        'path': '/',
    }
    domain = getattr(settings, 'JWT_COOKIE_DOMAIN', None)
    if domain:
        common['domain'] = domain
    return common


def _access_max_age() -> int:
    lifetime = settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME']
    return int(lifetime.total_seconds())


def _refresh_max_age(remember_me: bool) -> int:
    if remember_me:
        lifetime = settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME']
        return int(lifetime.total_seconds())
    return 60 * 60 * 12


def _set_auth_cookies(response, access: str, refresh: str, remember_me: bool):
    common = _cookie_common()
    response.set_cookie(
        settings.JWT_COOKIE_ACCESS_NAME,
        access,
        max_age=_access_max_age(),
        **common,
    )
    response.set_cookie(
        settings.JWT_COOKIE_REFRESH_NAME,
        refresh,
        max_age=_refresh_max_age(remember_me),
        **common,
    )


def _clear_auth_cookies(response):
    common = _cookie_common()
    # delete_cookie needs matching path/domain/samesite
    for name in (settings.JWT_COOKIE_ACCESS_NAME, settings.JWT_COOKIE_REFRESH_NAME):
        kwargs = {'path': '/', 'samesite': common['samesite']}
        if common.get('domain'):
            kwargs['domain'] = common['domain']
        response.delete_cookie(name, **kwargs)


def _record_attempt(*, identifier: str, ip: str, success: bool, user_agent: str = ''):
    try:
        LoginAttempt.objects.create(
            identifier=identifier or '',
            ip=(ip or '')[:64],
            success=success,
            user_agent=(user_agent or '')[:512],
        )
    except Exception:
        # Audit must not break login
        pass


def _lockout_response(ident: str = '', retry_after: int | None = None):
    seconds = retry_after if retry_after is not None else lock_retry_after(ident)
    minutes = max(1, (seconds + 59) // 60) if seconds else 15
    return Response(
        {
            'detail': (
                f'Compte temporairement verrouillé. Réessayez dans {minutes} minute'
                f'{"s" if minutes > 1 else ""}.'
            ),
            'code': 'login_locked',
            'retry_after': seconds,
        },
        status=status.HTTP_403_FORBIDDEN,
    )


@method_decorator(ensure_csrf_cookie, name='dispatch')
class CsrfCookieView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        token = get_token(request)
        return Response({'csrfToken': token})


class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        enforce_csrf(request)

        email = (request.data.get('email') or '').strip().lower()
        phone = (request.data.get('phone') or '').strip()
        ident = normalize_identifier(email=email, phone=phone)
        ip = client_ip(request)
        ua = request.META.get('HTTP_USER_AGENT', '')

        if is_ip_blocked(ip):
            return Response(
                {
                    'detail': 'Trop de tentatives depuis cette adresse. Réessayez plus tard.',
                    'code': 'login_ip_blocked',
                    'retry_after': int(getattr(settings, 'LOGIN_FAILURE_WINDOW_SECONDS', 900)),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if ident and is_locked(ident):
            return _lockout_response(ident)

        ser = LoginSerializer(data=request.data)
        try:
            ser.is_valid(raise_exception=True)
        except DRFValidationError as exc:
            fail = register_failure(ident, ip)
            _record_attempt(identifier=ident, ip=ip, success=False, user_agent=ua)
            record_audit(
                request=request,
                action=AuditEvent.ACTION_LOGIN_FAIL,
                resource_type=AuditEvent.RESOURCE_AUTH,
                summary=f'Échec connexion {ident}'[:255],
                success=False,
            )
            if fail.get('locked') or fail.get('ip_blocked'):
                return _lockout_response(ident, retry_after=fail.get('retry_after'))
            raise exc

        user = ser.validated_data['user']
        remember_me = ser.validated_data.get('remember_me', True)

        clear_failures(ident)
        _record_attempt(identifier=ident, ip=ip, success=True, user_agent=ua)
        record_audit(
            request=request,
            action=AuditEvent.ACTION_LOGIN_SUCCESS,
            resource_type=AuditEvent.RESOURCE_AUTH,
            actor=user,
            summary=f'Connexion {user.email or user.username}'[:255],
        )

        refresh = RefreshToken.for_user(user)
        access = str(refresh.access_token)
        refresh_s = str(refresh)

        response = Response({'user': user_to_public_dict(user)}, status=status.HTTP_200_OK)
        _set_auth_cookies(response, access, refresh_s, remember_me)
        return response


class LogoutView(APIView):
    permission_classes = [IsAuthenticated, HasActiveAccess]

    def post(self, request):
        raw = request.COOKIES.get(settings.JWT_COOKIE_REFRESH_NAME)
        if raw:
            try:
                RefreshToken(raw).blacklist()
            except TokenError:
                pass
        record_audit(
            request=request,
            action=AuditEvent.ACTION_LOGOUT,
            resource_type=AuditEvent.RESOURCE_AUTH,
            summary=f'Déconnexion {getattr(request.user, "email", "")}'[:255],
        )
        response = Response(status=status.HTTP_204_NO_CONTENT)
        _clear_auth_cookies(response)
        return response


class MeView(APIView):
    permission_classes = [IsAuthenticated, HasActiveAccess]

    def get(self, request):
        if not access_is_active(request.user):
            return Response({'detail': 'Accès révoqué.'}, status=status.HTTP_403_FORBIDDEN)
        return Response(user_to_public_dict(request.user))


class CookieTokenRefreshView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        enforce_csrf(request)
        refresh = request.COOKIES.get(settings.JWT_COOKIE_REFRESH_NAME)
        if not refresh and settings.DEBUG:
            refresh = request.data.get('refresh') if hasattr(request, 'data') else None
        if not refresh:
            return Response({'detail': 'Refresh introuvable.'}, status=status.HTTP_401_UNAUTHORIZED)

        from rest_framework.exceptions import AuthenticationFailed, ValidationError as DRFVal
        from rest_framework_simplejwt.exceptions import InvalidToken

        serializer = TokenRefreshSerializer(data={'refresh': refresh})
        try:
            serializer.is_valid(raise_exception=True)
        except (TokenError, InvalidToken, AuthenticationFailed, DRFVal):
            return Response(
                {'detail': 'Refresh invalide ou révoqué.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        access = serializer.validated_data['access']
        new_refresh = serializer.validated_data.get('refresh', refresh)
        response = Response({'ok': True})
        _set_auth_cookies(response, access, new_refresh, remember_me=True)
        return response


def _apply_profile_fields(profile: UserProfile, data: dict):
    if 'phone' in data:
        phone = (data.get('phone') or '').strip() or None
        profile.phone = phone
    if 'matricule' in data:
        profile.matricule = data.get('matricule') or ''
    if 'grade' in data:
        profile.grade = data.get('grade') or ''
    if 'fonction' in data:
        profile.fonction = data['fonction']
    if 'scope_compagnie' in data:
        profile.scope_compagnie = data.get('scope_compagnie') or ''
    if 'scope_section' in data:
        profile.scope_section = data.get('scope_section') or ''
    if 'eleve_id' in data:
        profile.eleve_id = data.get('eleve_id')
    if 'is_active_access' in data:
        profile.is_active_access = bool(data['is_active_access'])
    profile.save()


class MilitaryUserListCreateView(APIView):
    permission_classes = [IsAuthenticated, HasActiveAccess, CanManageMilitaryUsers]

    def get(self, request):
        users = User.objects.select_related('profile').order_by('email')
        return Response([user_to_public_dict(u) for u in users])

    def post(self, request):
        ser = MilitaryUserSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        email = data['email']
        if User.objects.filter(username=email).exists():
            return Response(
                {'email': ['Un utilisateur avec cet e-mail existe déjà.']},
                status=status.HTTP_400_BAD_REQUEST,
            )
        phone = (data.get('phone') or '').strip()
        password = (data.get('password') or '').strip() or phone
        if not password:
            return Response(
                {'phone': ['Téléphone requis (sert de mot de passe initial).']},
                status=status.HTTP_400_BAD_REQUEST,
            )
        with transaction.atomic():
            user = User.objects.create_user(
                username=email,
                email=email,
                password=password,
                first_name=data.get('first_name') or '',
                last_name=data.get('last_name') or '',
            )
            profile = ensure_profile(user)
            _apply_profile_fields(
                profile,
                {
                    'phone': phone or data.get('phone'),
                    'matricule': data.get('matricule'),
                    'grade': data.get('grade'),
                    'fonction': data['fonction'],
                    'scope_compagnie': data.get('scope_compagnie'),
                    'scope_section': data.get('scope_section'),
                    'eleve_id': data.get('eleve_id'),
                    'is_active_access': data.get('is_active_access', True),
                },
            )
            profile.must_change_password = True
            profile.save(update_fields=['must_change_password'])
        return Response(user_to_public_dict(user), status=status.HTTP_201_CREATED)


class MilitaryUserDetailView(APIView):
    permission_classes = [IsAuthenticated, HasActiveAccess, CanManageMilitaryUsers]

    def _get_user(self, pk):
        try:
            return User.objects.select_related('profile').get(pk=pk)
        except (User.DoesNotExist, ValueError, TypeError):
            return None

    def get(self, request, pk):
        user = self._get_user(pk)
        if not user:
            return Response({'detail': 'Introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(user_to_public_dict(user))

    def patch(self, request, pk):
        user = self._get_user(pk)
        if not user:
            return Response({'detail': 'Introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        profile = ensure_profile(user)
        ser = MilitaryUserUpdateSerializer(data=request.data, partial=True, context={'profile': profile})
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        # Prevent removing the last administrateur
        new_fonction = data.get('fonction', profile.fonction)
        new_active = data.get('is_active_access', profile.is_active_access)
        if (
            profile.fonction == UserProfile.ROLE_ADMINISTRATEUR
            and (
                new_fonction != UserProfile.ROLE_ADMINISTRATEUR
                or new_active is False
            )
        ):
            other_admins = UserProfile.objects.filter(
                fonction=UserProfile.ROLE_ADMINISTRATEUR,
                is_active_access=True,
            ).exclude(pk=profile.pk).count()
            super_count = User.objects.filter(is_superuser=True, is_active=True).exclude(pk=user.pk).count()
            if other_admins + super_count < 1 and not user.is_superuser:
                return Response(
                    {'detail': 'Impossible de retirer le dernier administrateur.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        with transaction.atomic():
            if 'first_name' in data:
                user.first_name = data['first_name'] or ''
            if 'last_name' in data:
                user.last_name = data['last_name'] or ''
            password_changed = False
            if 'password' in data and (data.get('password') or '').strip():
                user.set_password(data['password'].strip())
                password_changed = True
            if 'is_active_access' in data:
                user.is_active = bool(data['is_active_access'])
            user.save()
            _apply_profile_fields(profile, data)
            if password_changed:
                profile.must_change_password = True
                profile.save(update_fields=['must_change_password'])
        return Response(user_to_public_dict(user))

    def delete(self, request, pk):
        user = self._get_user(pk)
        if not user:
            return Response({'detail': 'Introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if user.pk == request.user.pk:
            return Response(
                {'detail': 'Vous ne pouvez pas désactiver votre propre compte.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        profile = ensure_profile(user)
        if profile.fonction == UserProfile.ROLE_ADMINISTRATEUR:
            other_admins = UserProfile.objects.filter(
                fonction=UserProfile.ROLE_ADMINISTRATEUR,
                is_active_access=True,
            ).exclude(pk=profile.pk).count()
            if other_admins < 1 and not User.objects.filter(is_superuser=True, is_active=True).exclude(pk=user.pk).exists():
                return Response(
                    {'detail': 'Impossible de retirer le dernier administrateur.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        profile.is_active_access = False
        profile.save(update_fields=['is_active_access'])
        user.is_active = False
        user.save(update_fields=['is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)


def _random_student_password(length=12):
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


class ProvisionStudentView(APIView):
    """Create or return the student User linked to an élève."""

    permission_classes = [IsAuthenticated, HasActiveAccess, CanProvisionStudents]

    def post(self, request):
        from etudiants.models import Eleve

        eleve_id = request.data.get('eleve_id')
        matricule = request.data.get('matricule')
        password = (request.data.get('password') or '').strip()

        eleve = None
        if eleve_id not in (None, ''):
            eleve = Eleve.objects.filter(pk=eleve_id).first()
        elif matricule not in (None, ''):
            try:
                eleve = Eleve.objects.filter(matricule=int(matricule)).first()
            except (TypeError, ValueError):
                eleve = None
        if eleve is None:
            return Response(
                {'detail': 'Élève introuvable (eleve_id ou matricule requis).'},
                status=status.HTTP_404_NOT_FOUND,
            )

        existing = (
            UserProfile.objects.select_related('user')
            .filter(fonction=UserProfile.ROLE_ETUDIANT, eleve_id=eleve.pk)
            .first()
        )
        if existing:
            record_audit(
                request=request,
                action=AuditEvent.ACTION_VIEW,
                resource_type=AuditEvent.RESOURCE_AUTH,
                resource_id=str(existing.user_id),
                eleve=eleve,
                summary='provision-student idempotent',
            )
            data = user_to_public_dict(existing.user)
            data['created'] = False
            data['temporary_password'] = None
            return Response(data)

        email = (eleve.email_pro or f'{eleve.matricule}@esp.mr').strip().lower()
        if User.objects.filter(username=email).exists():
            return Response(
                {
                    'detail': (
                        f"L'e-mail {email} est déjà utilisé par un compte non-étudiant. "
                        'Résolvez le conflit avant de provisionner.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        temp_password = password if len(password) >= 8 else _random_student_password()
        with transaction.atomic():
            user = User.objects.create_user(
                username=email,
                email=email,
                password=temp_password,
                first_name=eleve.prenom or '',
                last_name=eleve.nom_famille or '',
            )
            profile = ensure_profile(user)
            profile.fonction = UserProfile.ROLE_ETUDIANT
            profile.eleve = eleve
            profile.matricule = str(eleve.matricule)
            profile.is_active_access = True
            profile.must_change_password = True
            profile.save()
        record_audit(
            request=request,
            action=AuditEvent.ACTION_CREATE,
            resource_type=AuditEvent.RESOURCE_AUTH,
            resource_id=str(user.pk),
            eleve=eleve,
            summary=f'provision-student {email}',
        )
        data = user_to_public_dict(user)
        data['created'] = True
        data['temporary_password'] = temp_password
        return Response(data, status=status.HTTP_201_CREATED)
