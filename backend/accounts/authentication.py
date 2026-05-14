from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication


class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        header = self.get_header(request)
        if header is not None:
            return super().authenticate(request)
        raw = request.COOKIES.get(settings.JWT_COOKIE_ACCESS_NAME)
        if raw:
            validated_token = self.get_validated_token(raw)
            return self.get_user(validated_token), validated_token
        return None
