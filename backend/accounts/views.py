from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import LoginSerializer, user_to_public_dict


def _jwt_cookie_secure():
    return not getattr(settings, 'DEBUG', True)


def _set_auth_cookies(response, access: str, refresh: str, remember_me: bool):
    max_age_refresh = 60 * 60 * 24 * (14 if remember_me else 1)
    max_age_access = 60 * 60 * 24 if remember_me else 60 * 60 * 12
    common = {
        'httponly': True,
        'secure': _jwt_cookie_secure(),
        'samesite': 'Lax',
        'path': '/',
    }
    response.set_cookie(
        settings.JWT_COOKIE_ACCESS_NAME,
        access,
        max_age=max_age_access,
        **common,
    )
    response.set_cookie(
        settings.JWT_COOKIE_REFRESH_NAME,
        refresh,
        max_age=max_age_refresh,
        **common,
    )


def _clear_auth_cookies(response):
    for name in (settings.JWT_COOKIE_ACCESS_NAME, settings.JWT_COOKIE_REFRESH_NAME):
        response.delete_cookie(name, path='/', samesite='Lax')


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        ser = LoginSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = ser.validated_data['user']
        remember_me = ser.validated_data.get('remember_me', True)

        refresh = RefreshToken.for_user(user)
        access = str(refresh.access_token)
        refresh_s = str(refresh)

        payload = {
            'access': access,
            'refresh': refresh_s,
            'user': user_to_public_dict(user),
        }
        response = Response(payload, status=status.HTTP_200_OK)
        _set_auth_cookies(response, access, refresh_s, remember_me)
        return response


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        response = Response(status=status.HTTP_204_NO_CONTENT)
        _clear_auth_cookies(response)
        return response


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(user_to_public_dict(request.user))


class CookieTokenRefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh = request.COOKIES.get(settings.JWT_COOKIE_REFRESH_NAME) or (
            request.data.get('refresh') if hasattr(request, 'data') else None
        )
        if not refresh:
            return Response({'detail': 'Refresh introuvable.'}, status=status.HTTP_401_UNAUTHORIZED)
        serializer = TokenRefreshSerializer(data={'refresh': refresh})
        serializer.is_valid(raise_exception=True)
        access = serializer.validated_data['access']
        response = Response({'access': access})
        common = {'httponly': True, 'secure': _jwt_cookie_secure(), 'samesite': 'Lax', 'path': '/'}
        response.set_cookie(
            settings.JWT_COOKIE_ACCESS_NAME,
            access,
            max_age=60 * 60 * 24,
            **common,
        )
        return response
