from rest_framework import viewsets
from .models import (
    Eleve, ContactParent, DossierSante, DossierAcademique, 
    DossierMilitaire, Hebergement, DocumentEleve
)
from .serializers import (
    EleveSerializer, ContactParentSerializer, DossierSanteSerializer, 
    DossierAcademiqueSerializer, DossierMilitaireSerializer, 
    HebergementSerializer, DocumentEleveSerializer
)

class EleveViewSet(viewsets.ModelViewSet):
    queryset = Eleve.objects.select_related(
        'dossier_academique',
        'dossier_sante',
        'dossier_militaire',
        'contacts_parents',
        'hebergement',
        'documents',
    ).all()
    serializer_class = EleveSerializer

class ContactParentViewSet(viewsets.ModelViewSet):
    queryset = ContactParent.objects.all()
    serializer_class = ContactParentSerializer

class DossierSanteViewSet(viewsets.ModelViewSet):
    queryset = DossierSante.objects.all()
    serializer_class = DossierSanteSerializer

class DossierAcademiqueViewSet(viewsets.ModelViewSet):
    queryset = DossierAcademique.objects.all()
    serializer_class = DossierAcademiqueSerializer

class DossierMilitaireViewSet(viewsets.ModelViewSet):
    queryset = DossierMilitaire.objects.all()
    serializer_class = DossierMilitaireSerializer

class HebergementViewSet(viewsets.ModelViewSet):
    queryset = Hebergement.objects.all()
    serializer_class = HebergementSerializer

class DocumentEleveViewSet(viewsets.ModelViewSet):
    queryset = DocumentEleve.objects.all()
    serializer_class = DocumentEleveSerializer
