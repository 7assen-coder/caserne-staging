from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EleveViewSet, ContactParentViewSet, DossierSanteViewSet,
    DossierAcademiqueViewSet, DossierMilitaireViewSet,
    HebergementViewSet, DocumentEleveViewSet,
    ImportElevesView, ImportTemplateView,
)

router = DefaultRouter()
router.register(r'eleves', EleveViewSet)
router.register(r'contacts-parents', ContactParentViewSet)
router.register(r'dossiers-sante', DossierSanteViewSet)
router.register(r'dossiers-academiques', DossierAcademiqueViewSet)
router.register(r'dossiers-militaires', DossierMilitaireViewSet)
router.register(r'hebergements', HebergementViewSet)
router.register(r'documents', DocumentEleveViewSet)

urlpatterns = [
    # Custom import endpoints — must come BEFORE router include
    path('import/eleves/', ImportElevesView.as_view(), name='import-eleves'),
    path('import/template/', ImportTemplateView.as_view(), name='import-template'),
    # DRF router (registers all ViewSets)
    path('', include(router.urls)),
]
