from django.urls import include, path
from rest_framework.routers import SimpleRouter

from .views import (
    AppelPresenceViewSet,
    ConsultationMedicaleViewSet,
    DemandeViewSet,
    DroitsBatchViewSet,
    DroitsLigneViewSet,
    EquipementItemViewSet,
    JournalEvenementViewSet,
    SanctionViewSet,
)

router = SimpleRouter()
router.register(r'equipements', EquipementItemViewSet)
router.register(r'sanctions', SanctionViewSet)
router.register(r'demandes', DemandeViewSet)
router.register(r'consultations', ConsultationMedicaleViewSet)
router.register(r'journal', JournalEvenementViewSet)
router.register(r'droits/batches', DroitsBatchViewSet, basename='droits-batch')
router.register(r'droits/lignes', DroitsLigneViewSet, basename='droits-ligne')
router.register(r'appels', AppelPresenceViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
