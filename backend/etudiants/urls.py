from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EleveViewSet, ContactParentViewSet, DossierSanteViewSet, 
    DossierAcademiqueViewSet, DossierMilitaireViewSet, 
    HebergementViewSet, DocumentEleveViewSet
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
    path('', include(router.urls)),
]
