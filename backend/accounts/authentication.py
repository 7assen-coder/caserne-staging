from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication

from .csrf_utils import enforce_csrf


class CookieJWTAuthentication(JWTAuthentication):
    """Prefer Authorization header; otherwise read access JWT from httpOnly cookie."""

    def authenticate(self, request):
        header = self.get_header(request)
        if header is not None:
            return super().authenticate(request)

        raw = request.COOKIES.get(settings.JWT_COOKIE_ACCESS_NAME)
        if not raw:
            return None

        validated_token = self.get_validated_token(raw)
        user = self.get_user(validated_token)

        # Cookie auth on unsafe methods requires CSRF (XSS mitigation)
        if request.method not in ('GET', 'HEAD', 'OPTIONS', 'TRACE'):
            enforce_csrf(request)

        return user, validated_token
