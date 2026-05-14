"""Routage HTTP du projet backend."""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.permissions import AllowAny


class PublicSpectacularAPIView(SpectacularAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]


class PublicSpectacularSwaggerView(SpectacularSwaggerView):
    authentication_classes = []
    permission_classes = [AllowAny]


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/', include('etudiants.urls')),
    path('api/schema/', PublicSpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', PublicSpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
