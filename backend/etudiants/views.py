import io
from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import (
    Eleve, ContactParent, DossierSante, DossierAcademique,
    DossierMilitaire, Hebergement, DocumentEleve
)
from .serializers import (
    EleveSerializer, ContactParentSerializer, DossierSanteSerializer,
    DossierAcademiqueSerializer, DossierMilitaireSerializer,
    HebergementSerializer, DocumentEleveSerializer
)
from .importers import (
    BulkImporter, read_excel, read_csv,
    generate_excel_template, generate_csv_template,
)


class EleveViewSet(viewsets.ModelViewSet):
    queryset = Eleve.objects.select_related(
        'dossier_academique', 'dossier_sante', 'dossier_militaire',
        'contacts_parents', 'hebergement', 'documents',
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


# ─── Import endpoints ──────────────────────────────────────────────────────────

class ImportElevesView(APIView):
    """
    POST /api/import/eleves/
    Upload a .xlsx or .csv file to bulk-import students.

    multipart/form-data:
      file  — the Excel (.xlsx) or CSV (.csv) file

    Returns JSON: { created, skipped, errors: [{row, field, message}] }

    Quick curl test:
      curl -X POST http://localhost:8000/api/import/eleves/ \\
           -H "Authorization: Bearer <token>" \\
           -F "file=@students.xlsx"
    """
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        uploaded = request.FILES.get('file')
        if not uploaded:
            return Response({'error': 'Aucun fichier fourni. Champ attendu : "file".'}, status=400)

        name = uploaded.name.lower()
        try:
            if name.endswith('.xlsx'):
                rows = read_excel(uploaded)
            elif name.endswith('.csv'):
                rows = read_csv(uploaded)
            else:
                return Response(
                    {'error': 'Format non supporté. Fournissez un fichier .xlsx ou .csv.'},
                    status=400,
                )
        except Exception as exc:
            return Response({'error': f'Erreur de lecture du fichier : {exc}'}, status=400)

        if not rows:
            return Response({'error': 'Le fichier est vide ou ne contient que des en-têtes.'}, status=400)

        report = BulkImporter().run(rows)
        http_status = status.HTTP_201_CREATED if report['created'] > 0 else status.HTTP_200_OK
        return Response(report, status=http_status)


class ImportTemplateView(APIView):
    """
    GET /api/import/template/?format=xlsx   → télécharge le modèle Excel
    GET /api/import/template/?format=csv    → télécharge le modèle CSV

    Accessible sans authentification pour faciliter les tests.
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            # 'format' is reserved by DRF — use 'type' instead
            fmt = request.GET.get('type', 'xlsx').lower()
            if fmt == 'csv':
                content = generate_csv_template().encode('utf-8-sig')
                resp = HttpResponse(content, content_type='text/csv; charset=utf-8-sig')
                resp['Content-Disposition'] = 'attachment; filename="modele_import_etudiants.csv"'
                return resp
            # default: xlsx
            content = generate_excel_template()
            resp = HttpResponse(
                content,
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            )
            resp['Content-Disposition'] = 'attachment; filename="modele_import_etudiants.xlsx"'
            return resp
        except Exception as exc:
            import traceback
            traceback.print_exc()
            return Response({'error': str(exc)}, status=500)
