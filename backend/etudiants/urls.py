from django.urls import path, include
from rest_framework.routers import SimpleRouter

from .views import (
    EleveViewSet,
    ContactParentViewSet,
    DossierSanteViewSet,
    DossierAcademiqueViewSet,
    DossierMilitaireViewSet,
    HebergementViewSet,
    DocumentEleveViewSet,
    ImportElevesView,
    ImportTemplateView,
    ImportJobDetailView,
    ImportJobErrorsCsvView,
    ExportElevesView,
    ExportJobDetailView,
    ExportJobDownloadView,
)

router = SimpleRouter()
router.register(r'eleves', EleveViewSet)
router.register(r'contacts', ContactParentViewSet)
router.register(r'sante', DossierSanteViewSet)
router.register(r'academique', DossierAcademiqueViewSet)
router.register(r'militaire', DossierMilitaireViewSet)
router.register(r'hebergements', HebergementViewSet)
router.register(r'docs', DocumentEleveViewSet)

urlpatterns = [
    path('eleves/import/', ImportElevesView.as_view(), name='import-eleves'),
    path('eleves/import/jobs/<uuid:job_id>/', ImportJobDetailView.as_view(), name='import-job-detail'),
    path(
        'eleves/import/jobs/<uuid:job_id>/errors/',
        ImportJobErrorsCsvView.as_view(),
        name='import-job-errors-csv',
    ),
    path('eleves/import/template/', ImportTemplateView.as_view(), name='import-template'),
    path('eleves/export/', ExportElevesView.as_view(), name='export-eleves'),
    path('eleves/export/jobs/<uuid:job_id>/', ExportJobDetailView.as_view(), name='export-job-detail'),
    path(
        'eleves/export/jobs/<uuid:job_id>/fichier/',
        ExportJobDownloadView.as_view(),
        name='export-job-download',
    ),
    path('', include(router.urls)),
]
