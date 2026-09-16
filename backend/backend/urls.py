"""Routage HTTP du projet backend."""
from django.conf import settings
from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.permissions import AllowAny, IsAuthenticated

from accounts.permissions import CanManageMilitaryUsers, HasActiveAccess
from etudiants.views import ProtectedMediaView


class PublicSpectacularAPIView(SpectacularAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]


class PublicSpectacularSwaggerView(SpectacularSwaggerView):
    authentication_classes = []
    permission_classes = [AllowAny]


class LockedSpectacularAPIView(SpectacularAPIView):
    permission_classes = [IsAuthenticated, HasActiveAccess, CanManageMilitaryUsers]


class LockedSpectacularSwaggerView(SpectacularSwaggerView):
    permission_classes = [IsAuthenticated, HasActiveAccess, CanManageMilitaryUsers]


if settings.DEBUG:
    _schema_view = PublicSpectacularAPIView
    _docs_view = PublicSpectacularSwaggerView
else:
    _schema_view = LockedSpectacularAPIView
    _docs_view = LockedSpectacularSwaggerView

from backend.health import HealthzView, LivezView, ReadyzView
from backend.metrics import metrics_view

urlpatterns = [
    path('admin/', admin.site.urls),
    path('metrics', metrics_view, name='prometheus-django-metrics'),
    path('api/livez/', LivezView.as_view(), name='livez'),
    path('api/readyz/', ReadyzView.as_view(), name='readyz'),
    path('api/healthz/', HealthzView.as_view(), name='healthz'),
    path('api/v1/auth/', include('accounts.urls')),
    path('api/v1/audit/', include('accounts.audit_urls')),
    path('api/v1/', include('etudiants.urls')),
    path('api/v1/', include('operations.urls')),
    path('api/schema/', _schema_view.as_view(), name='schema'),
    path('api/docs/', _docs_view.as_view(url_name='schema'), name='swagger-ui'),
    path('media/<path:media_path>', ProtectedMediaView.as_view(), name='protected-media'),
]
