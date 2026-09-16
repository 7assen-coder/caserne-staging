"""Password change and forgot-password OTP endpoints."""

from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .otp import (
    OtpError,
    check_request_rate_limits,
    check_verify_rate_limits,
    clear_otp,
    generate_otp,
    issue_reset_token,
    load_reset_token,
    normalize_email,
    store_otp,
    verify_otp,
)
from .permissions import HasActiveAccess
from .audit import record_audit
from .models import AuditEvent
from .serializers import (
    ChangePasswordSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    PasswordResetVerifySerializer,
    ensure_profile,
    user_to_public_dict,
)
from .tasks import send_password_reset_otp_email
from .throttles import (
    PasswordResetConfirmThrottle,
    PasswordResetRequestThrottle,
    PasswordResetVerifyThrottle,
)
from .user_lookup import find_active_user_by_email


def _client_ip(request) -> str:
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR') or ''


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated, HasActiveAccess]

    def post(self, request):
        ser = ChangePasswordSerializer(data=request.data, context={'request': request})
        ser.is_valid(raise_exception=True)
        user = request.user
        profile = ser.validated_data['profile']
        new_password = ser.validated_data['new_password']
        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as exc:
            return Response(
                {'new_password': list(exc.messages)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.set_password(new_password)
        user.save(update_fields=['password'])
        profile.must_change_password = False
        profile.save(update_fields=['must_change_password'])
        record_audit(
            request=request,
            action=AuditEvent.ACTION_PASSWORD_CHANGE,
            resource_type=AuditEvent.RESOURCE_AUTH,
            summary=f'Changement mot de passe {user.email or user.username}'[:255],
        )
        return Response(user_to_public_dict(user))


class PasswordResetRequestView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetRequestThrottle]

    def post(self, request):
        ser = PasswordResetRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        email = ser.validated_data['email']
        try:
            check_request_rate_limits(email=email, ip=_client_ip(request))
        except OtpError as exc:
            return Response({'detail': exc.message}, status=exc.status)

        detail = {'detail': 'Si un compte existe, un code a été envoyé.'}
        user = find_active_user_by_email(email)
        if user is None:
            return Response(detail)
        profile = ensure_profile(user)
        if not profile.is_active_access and not user.is_superuser:
            return Response(detail)

        otp = generate_otp()
        store_otp(email, otp)
        source = ser.validated_data.get('source') or 'login_recovery'
        lang = ser.validated_data.get('lang') or 'fr'
        send_password_reset_otp_email.delay(email, otp, source, lang)
        return Response(detail)


class PasswordResetVerifyView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetVerifyThrottle]

    def post(self, request):
        ser = PasswordResetVerifySerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        email = ser.validated_data['email']
        otp = ser.validated_data['otp']
        try:
            check_verify_rate_limits(ip=_client_ip(request))
            verify_otp(email, otp)
        except OtpError as exc:
            return Response({'detail': exc.message}, status=exc.status)

        user = find_active_user_by_email(email)
        if user is None:
            return Response({'detail': 'Code expiré ou invalide. Demandez un nouveau code.'}, status=400)
        token = issue_reset_token(user.pk, email)
        return Response({'reset_token': token})


class PasswordResetConfirmView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetConfirmThrottle]

    def post(self, request):
        ser = PasswordResetConfirmSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        token = ser.validated_data['reset_token']
        new_password = ser.validated_data['new_password']
        try:
            data = load_reset_token(token)
        except OtpError as exc:
            return Response({'detail': exc.message}, status=exc.status)

        email = normalize_email(data['email'])
        try:
            user = User.objects.get(pk=data['uid'], username=email, is_active=True)
        except User.DoesNotExist:
            return Response({'detail': 'Jeton de réinitialisation invalide.'}, status=400)

        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as exc:
            return Response({'new_password': list(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save(update_fields=['password'])
        profile = ensure_profile(user)
        profile.must_change_password = False
        profile.save(update_fields=['must_change_password'])
        clear_otp(email)
        record_audit(
            request=request,
            action=AuditEvent.ACTION_PASSWORD_RESET,
            resource_type=AuditEvent.RESOURCE_AUTH,
            actor=user,
            summary=f'Réinitialisation mot de passe {user.email or user.username}'[:255],
        )
        return Response({'detail': 'Mot de passe mis à jour.', 'user': user_to_public_dict(user)})
