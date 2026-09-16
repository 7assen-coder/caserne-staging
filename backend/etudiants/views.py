import io
import os

from django.conf import settings
from django.http import FileResponse, Http404, HttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.audit import record_audit
from accounts.audit_mixins import AuditedModelViewSetMixin
from accounts.models import AuditEvent
from accounts.optimistic_lock import (
    assert_version_match,
    bump_version,
    parse_expected_version,
    serialize_current,
)
from accounts.optimistic_lock import OptimisticLockMixin
from accounts.permissions import (
    CanAccessMedia,
    CanImportEleves,
    CanListOrImportTemplate,
    EleveRolePermission,
    HasActiveAccess,
    can_edit_parents,
    can_edit_sante,
    can_view_parents,
    can_view_sante,
    eleves_queryset_for,
    get_user_fonction,
)

from .models import (
    Eleve, ContactParent, DossierSante, DossierAcademique,
    DossierMilitaire, Hebergement, DocumentEleve,
    ImportJob, ExportJob, JobStatus,
)
from .serializers import (
    EleveSerializer, EleveListSerializer, ContactParentSerializer, DossierSanteSerializer,
    DossierAcademiqueSerializer, DossierMilitaireSerializer,
    HebergementSerializer, DocumentEleveSerializer
)
from .pagination import ElevePagination
from .filters import apply_eleve_list_filters
from .cache_keys import (
    HOT_LIST_QUERY_ALLOWLIST,
    cache_get_or_set,
    hot_list_cache_key,
    hot_list_ttl,
)
from .dashboard_stats import get_dashboard_stats_cached
from .jobs import IMPORT_MAX_BYTES, IMPORT_MAX_ROWS, job_owner_or_staff
from .importers import (
    read_excel,
    read_csv,
    generate_excel_template,
    generate_csv_template,
)
from .tasks import run_bulk_import, build_eleves_export


class ScopedEleveQuerysetMixin:
    """Filter primary Eleve queryset by RBAC scope."""

    permission_classes = [IsAuthenticated, HasActiveAccess, EleveRolePermission]

    def get_queryset(self):
        return eleves_queryset_for(self.request.user)


class ScopedRelatedQuerysetMixin:
    """Filter related 1:1 models by parent élève scope."""

    permission_classes = [IsAuthenticated, HasActiveAccess, EleveRolePermission]
    eleve_lookup = 'eleve'

    def get_queryset(self):
        eleves = eleves_queryset_for(self.request.user)
        return self.queryset.model.objects.filter(
            **{f'{self.eleve_lookup}__in': eleves}
        ).select_related(self.eleve_lookup)


class EleveViewSet(OptimisticLockMixin, AuditedModelViewSetMixin, ScopedEleveQuerysetMixin, viewsets.ModelViewSet):
    queryset = Eleve.objects.all()
    serializer_class = EleveSerializer
    pagination_class = ElevePagination
    audit_resource_type = AuditEvent.RESOURCE_ELEVE
    optimistic_lock_resource = AuditEvent.RESOURCE_ELEVE

    SEMESTRE_KEYS = {
        'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S3DD', 'S4DD', 'S5M', 'S5E', 'S5DD',
    }
    SEMESTRE_VALUES = {'integral', 'partial', 'none'}

    def get_serializer_class(self):
        if self.action == 'list':
            return EleveListSerializer
        return EleveSerializer

    def get_queryset(self):
        if getattr(self, 'action', None) == 'list':
            return eleves_queryset_for(self.request.user, for_list=True)
        return eleves_queryset_for(self.request.user)

    def filter_queryset(self, queryset):
        qs = super().filter_queryset(queryset)
        if getattr(self, 'action', None) == 'list':
            qs = apply_eleve_list_filters(qs, self.request.query_params)
        return qs

    def _hot_list_eligible(self) -> bool:
        params = self.request.query_params
        page = params.get('page', '1')
        page_size = params.get('page_size', str(getattr(self.pagination_class, 'page_size', 25)))
        try:
            page_i = int(page)
            size_i = int(page_size)
        except (TypeError, ValueError):
            return False
        if page_i != 1 or size_i not in (25, 50):
            return False
        for key in params.keys():
            if key not in HOT_LIST_QUERY_ALLOWLIST:
                return False
        return True

    def list(self, request, *args, **kwargs):
        if not self._hot_list_eligible():
            return super().list(request, *args, **kwargs)

        role = get_user_fonction(request.user) or 'unknown'
        profile = getattr(request.user, 'profile', None)
        scope_id = str(getattr(profile, 'eleve_id', None) or request.user.pk)
        query_items = [(k, request.query_params.get(k)) for k in sorted(request.query_params.keys())]
        key = hot_list_cache_key(role=role, scope_id=scope_id, query_items=query_items)

        def produce():
            response = super(EleveViewSet, self).list(request, *args, **kwargs)
            return response.data

        data = cache_get_or_set(key, produce, hot_list_ttl())
        return Response(data)

    @action(detail=False, methods=['get'], url_path='stats')
    def dashboard_stats(self, request):
        data = get_dashboard_stats_cached(request.user)
        return Response(data)

    def _get_or_create_academique(self, eleve):
        dossier, _ = DossierAcademique.objects.get_or_create(
            eleve=eleve,
            defaults={
                'departement': 'IRT',
                'niveau_actuel': '3',
                'semestre_actuel': 'S5',
                'parcours': 'En cours normal',
                'donnees_semestres': {},
            },
        )
        return dossier

    @action(detail=True, methods=['patch'], url_path='scolarite/semestres')
    def patch_semestre(self, request, pk=None):
        from django.db import transaction

        with transaction.atomic():
            eleve = Eleve.objects.select_for_update().get(pk=pk)
            self.check_object_permissions(request, eleve)
            expected = parse_expected_version(request)
            assert_version_match(
                eleve,
                expected,
                resource=self.audit_resource_type,
                current=serialize_current(
                    eleve,
                    serializer_class=EleveSerializer,
                    context=self.get_serializer_context(),
                ),
            )
            code = request.data.get('code')
            statut = request.data.get('statut')
            if code not in self.SEMESTRE_KEYS:
                return Response({'detail': 'Code semestre invalide.'}, status=status.HTTP_400_BAD_REQUEST)
            if statut not in self.SEMESTRE_VALUES and statut is not None and statut != '':
                return Response({'detail': 'Statut semestre invalide.'}, status=status.HTTP_400_BAD_REQUEST)
            dossier = self._get_or_create_academique(eleve)
            data = dict(dossier.donnees_semestres or {})
            if not statut:
                data.pop(code, None)
            else:
                data[code] = statut
            dossier.donnees_semestres = data
            dossier.save(update_fields=['donnees_semestres'])
            bump_version(eleve)
            record_audit(
                request=request,
                action=AuditEvent.ACTION_UPDATE,
                resource_type=AuditEvent.RESOURCE_ACADEMIQUE,
                resource_id=str(dossier.pk),
                eleve=eleve,
                summary=f'semestre {code}={statut}',
            )
            return Response({
                'eleveId': eleve.pk,
                'semestres': data,
                'row_version': eleve.row_version,
            })

    @action(detail=True, methods=['patch'], url_path='scolarite/mobilite')
    def patch_mobilite(self, request, pk=None):
        from django.db import transaction

        with transaction.atomic():
            eleve = Eleve.objects.select_for_update().get(pk=pk)
            self.check_object_permissions(request, eleve)
            expected = parse_expected_version(request)
            assert_version_match(
                eleve,
                expected,
                resource=self.audit_resource_type,
                current=serialize_current(
                    eleve,
                    serializer_class=EleveSerializer,
                    context=self.get_serializer_context(),
                ),
            )
            dossier = self._get_or_create_academique(eleve)
            type_m = request.data.get('type') or ''
            etablissement = request.data.get('etablissement') or ''
            specialite = request.data.get('specialite') or ''
            raison = request.data.get('raison') or ''
            annee_debut = request.data.get('anneeDebut') or request.data.get('annee_debut') or ''
            annee_fin = request.data.get('anneeFin') or request.data.get('annee_fin') or ''

            dossier.type_mobilite = type_m or None
            dossier.specialite_mobilite = specialite or None
            dossier.raison_mobilite = raison or None
            dossier.annee_debut_mobilite = annee_debut or None
            dossier.annee_fin_mobilite = annee_fin or None
            if (type_m or '').lower() in ('echange', 'échange', 'exchange'):
                dossier.etablissement_echange = etablissement or None
            elif etablissement:
                dossier.etablissement_double_diplome = etablissement or None
            elif not type_m:
                dossier.etablissement_echange = None
                dossier.etablissement_double_diplome = None
            dossier.save()
            bump_version(eleve)
            record_audit(
                request=request,
                action=AuditEvent.ACTION_UPDATE,
                resource_type=AuditEvent.RESOURCE_ACADEMIQUE,
                resource_id=str(dossier.pk),
                eleve=eleve,
                summary='mobilite update',
            )
            return Response({
                'eleveId': eleve.pk,
                'row_version': eleve.row_version,
                'mobilite': {
                    'type': dossier.type_mobilite or '',
                    'etablissement': dossier.etablissement_echange
                    or dossier.etablissement_double_diplome
                    or '',
                    'specialite': dossier.specialite_mobilite or '',
                    'raison': dossier.raison_mobilite or '',
                    'anneeDebut': dossier.annee_debut_mobilite or '',
                    'anneeFin': dossier.annee_fin_mobilite or '',
                },
            })


class ContactParentViewSet(AuditedModelViewSetMixin, ScopedRelatedQuerysetMixin, viewsets.ModelViewSet):
    queryset = ContactParent.objects.all()
    serializer_class = ContactParentSerializer
    audit_resource_type = AuditEvent.RESOURCE_CONTACT

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            if not can_view_parents(request.user):
                from rest_framework.exceptions import PermissionDenied

                raise PermissionDenied(
                    "Vous n'avez pas la permission de consulter les contacts parents."
                )
        elif request.method in ('POST', 'PUT', 'PATCH', 'DELETE'):
            if not can_edit_parents(request.user):
                from rest_framework.exceptions import PermissionDenied

                raise PermissionDenied(
                    "Vous n'avez pas la permission de modifier les contacts parents."
                )


class DossierSanteViewSet(AuditedModelViewSetMixin, ScopedRelatedQuerysetMixin, viewsets.ModelViewSet):
    queryset = DossierSante.objects.all()
    serializer_class = DossierSanteSerializer
    audit_resource_type = AuditEvent.RESOURCE_SANTE

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            if not can_view_sante(request.user):
                from rest_framework.exceptions import PermissionDenied

                raise PermissionDenied(
                    "Vous n'avez pas la permission de consulter le dossier santé."
                )
        elif request.method in ('POST', 'PUT', 'PATCH', 'DELETE'):
            if not can_edit_sante(request.user):
                from rest_framework.exceptions import PermissionDenied

                raise PermissionDenied(
                    "Vous n'avez pas la permission de modifier le dossier santé."
                )

class DossierAcademiqueViewSet(AuditedModelViewSetMixin, ScopedRelatedQuerysetMixin, viewsets.ModelViewSet):
    queryset = DossierAcademique.objects.all()
    serializer_class = DossierAcademiqueSerializer
    audit_resource_type = AuditEvent.RESOURCE_ACADEMIQUE


class DossierMilitaireViewSet(AuditedModelViewSetMixin, ScopedRelatedQuerysetMixin, viewsets.ModelViewSet):
    queryset = DossierMilitaire.objects.all()
    serializer_class = DossierMilitaireSerializer
    audit_resource_type = AuditEvent.RESOURCE_MILITAIRE


class HebergementViewSet(AuditedModelViewSetMixin, ScopedRelatedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Hebergement.objects.all()
    serializer_class = HebergementSerializer
    audit_resource_type = AuditEvent.RESOURCE_HEBERGEMENT


class DocumentEleveViewSet(AuditedModelViewSetMixin, ScopedRelatedQuerysetMixin, viewsets.ModelViewSet):
    queryset = DocumentEleve.objects.all()
    serializer_class = DocumentEleveSerializer
    audit_resource_type = AuditEvent.RESOURCE_DOCUMENT


class ProtectedMediaView(APIView):
    """
    Sert les fichiers MEDIA derrière JWT + RBAC (Phase 24).

    MEDIA_DELIVERY=stream (default): FileResponse from default_storage (FS or S3/MinIO).
    MEDIA_DELIVERY=xaccel: nginx internal redirect — local disk + Compose only.
    """

    permission_classes = [IsAuthenticated, HasActiveAccess, CanAccessMedia]

    def get(self, request, media_path):
        from django.core.files.storage import default_storage

        from etudiants.media_access import normalize_media_key, user_may_access_media

        key = normalize_media_key(media_path)
        if not key or '..' in key.split('/'):
            raise Http404

        if not user_may_access_media(request.user, key):
            return Response({'detail': 'Accès refusé.'}, status=status.HTTP_403_FORBIDDEN)

        if not default_storage.exists(key):
            # Local-disk fallback path check for transitional FS layouts
            media_root = os.path.abspath(settings.MEDIA_ROOT)
            full_path = os.path.normpath(os.path.join(media_root, key))
            if not (full_path.startswith(media_root + os.sep) and os.path.isfile(full_path)):
                raise Http404

        record_audit(
            request=request,
            action=AuditEvent.ACTION_DOWNLOAD,
            resource_type=AuditEvent.RESOURCE_DOCUMENT,
            resource_id=key[:64],
            summary=f'Téléchargement média {key}'[:255],
        )

        delivery = getattr(settings, 'MEDIA_DELIVERY', 'stream')
        use_s3 = getattr(settings, 'USE_S3_MEDIA', False)

        if delivery == 'xaccel' and not use_s3:
            media_root = os.path.abspath(settings.MEDIA_ROOT)
            full_path = os.path.normpath(os.path.join(media_root, key))
            if not full_path.startswith(media_root + os.sep) or not os.path.isfile(full_path):
                raise Http404
            response = HttpResponse()
            response['X-Accel-Redirect'] = f'/protected-media/{key}'
            response['Cache-Control'] = 'private, no-store'
            del response['Content-Type']
            return response

        # stream (default) — works on Render, MinIO, local
        import mimetypes

        try:
            fh = default_storage.open(key, 'rb')
        except Exception as exc:  # noqa: BLE001
            # Last resort: local path if storage open fails but file on disk
            media_root = os.path.abspath(settings.MEDIA_ROOT)
            full_path = os.path.normpath(os.path.join(media_root, key))
            if full_path.startswith(media_root + os.sep) and os.path.isfile(full_path):
                fh = open(full_path, 'rb')  # noqa: SIM115
            else:
                raise Http404 from exc

        content_type, _ = mimetypes.guess_type(key)
        response = FileResponse(fh, as_attachment=False, content_type=content_type or 'application/octet-stream')
        response['Cache-Control'] = 'private, no-store'
        response['Content-Disposition'] = f'inline; filename="{os.path.basename(key)}"'
        try:
            size = default_storage.size(key)
            response['Content-Length'] = size
        except Exception:  # noqa: BLE001
            pass
        return response


class ImportElevesView(APIView):
    """
    POST /api/v1/eleves/import/
    Upload a .xlsx or .csv file → Celery ImportJob (202).
    Sync only when CELERY_TASK_ALWAYS_EAGER or ?sync=1 (tests/dev).
    """
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated, HasActiveAccess, CanImportEleves]

    def post(self, request):
        uploaded = request.FILES.get('file')
        if not uploaded:
            return Response({'error': 'Aucun fichier fourni. Champ attendu : "file".'}, status=400)

        name = uploaded.name.lower()
        if not (name.endswith('.xlsx') or name.endswith('.csv')):
            return Response(
                {'error': 'Format non supporté. Fournissez un fichier .xlsx ou .csv.'},
                status=400,
            )

        if uploaded.size and uploaded.size > IMPORT_MAX_BYTES:
            return Response(
                {
                    'error': (
                        f'Fichier trop volumineux ({uploaded.size} octets). '
                        f'Maximum : {IMPORT_MAX_BYTES // (1024 * 1024)} Mo.'
                    ),
                },
                status=400,
            )

        # Peek row count + format detect before enqueue
        try:
            if name.endswith('.xlsx'):
                rows, _meta = read_excel(uploaded)
            else:
                rows = read_csv(uploaded)
        except Exception as exc:
            return Response({'error': f'Erreur de lecture du fichier : {exc}'}, status=400)

        if not rows:
            return Response({'error': 'Le fichier est vide ou ne contient que des en-têtes.'}, status=400)
        if len(rows) > IMPORT_MAX_ROWS:
            return Response(
                {
                    'error': (
                        f'Trop de lignes ({len(rows)}). '
                        f'Maximum autorisé : {IMPORT_MAX_ROWS}.'
                    ),
                },
                status=400,
            )

        uploaded.seek(0)
        job = ImportJob(
            created_by=request.user,
            status=JobStatus.PENDING,
            original_name=uploaded.name[:255],
        )
        job.source_file.save(uploaded.name, uploaded, save=False)
        job.save()

        want_sync = (
            settings.CELERY_TASK_ALWAYS_EAGER
            or (
                request.query_params.get('sync') == '1'
                and (settings.DEBUG or request.user.is_staff)
            )
        )

        if want_sync:
            try:
                run_bulk_import(str(job.id))
            except Exception:
                pass
            job.refresh_from_db()
            report = job.report or {}
            record_audit(
                request=request,
                action=AuditEvent.ACTION_IMPORT,
                resource_type=AuditEvent.RESOURCE_IMPORT,
                summary=(
                    f"Import élèves créé={report.get('created', 0)} "
                    f"err={len(report.get('errors') or [])}"
                )[:255],
                changes={'report': {
                    'created': report.get('created'),
                    'skipped': report.get('skipped'),
                    'error_count': len(report.get('errors') or []),
                    'job_id': str(job.id),
                }},
            )
            if job.status == JobStatus.FAILED:
                return Response(
                    {'id': str(job.id), 'status': job.status, 'error': job.error_message, **report},
                    status=400,
                )
            http_status = status.HTTP_201_CREATED if report.get('created', 0) > 0 else status.HTTP_200_OK
            return Response({'id': str(job.id), 'status': job.status, **report}, status=http_status)

        run_bulk_import.delay(str(job.id))
        record_audit(
            request=request,
            action=AuditEvent.ACTION_IMPORT,
            resource_type=AuditEvent.RESOURCE_IMPORT,
            summary=f'Import élèves en file job={job.id}'[:255],
            changes={'job_id': str(job.id), 'original_name': job.original_name},
        )
        return Response(
            {'id': str(job.id), 'status': JobStatus.PENDING},
            status=status.HTTP_202_ACCEPTED,
        )


class ImportJobDetailView(APIView):
    """GET /api/v1/eleves/import/jobs/<uuid>/"""

    permission_classes = [IsAuthenticated, HasActiveAccess, CanImportEleves]

    def get(self, request, job_id):
        try:
            job = ImportJob.objects.get(pk=job_id)
        except (ImportJob.DoesNotExist, ValueError):
            return Response({'error': 'Job introuvable.'}, status=404)
        if not job_owner_or_staff(request.user, job):
            return Response({'error': 'Accès refusé.'}, status=403)
        report = job.report or {}
        return Response({
            'id': str(job.id),
            'status': job.status,
            'original_name': job.original_name,
            'error_message': job.error_message,
            'created': report.get('created', 0),
            'skipped': report.get('skipped', 0),
            'errors': report.get('errors', []),
            'row_count': report.get('row_count'),
            'created_at': job.created_at,
            'started_at': job.started_at,
            'finished_at': job.finished_at,
        })


class ImportJobErrorsCsvView(APIView):
    """GET /api/v1/eleves/import/jobs/<uuid>/errors/"""

    permission_classes = [IsAuthenticated, HasActiveAccess, CanImportEleves]

    def get(self, request, job_id):
        try:
            job = ImportJob.objects.get(pk=job_id)
        except (ImportJob.DoesNotExist, ValueError):
            return Response({'error': 'Job introuvable.'}, status=404)
        if not job_owner_or_staff(request.user, job):
            return Response({'error': 'Accès refusé.'}, status=403)
        errors = (job.report or {}).get('errors') or []
        buf = io.StringIO()
        buf.write('row,field,message\n')
        for err in errors:
            if isinstance(err, dict):
                row = err.get('row', '')
                field = err.get('field', '')
                msg = str(err.get('message', '')).replace('"', "'")
                buf.write(f'{row},{field},"{msg}"\n')
            else:
                buf.write(f',,"{str(err).replace(chr(34), chr(39))}"\n')
        resp = HttpResponse(buf.getvalue().encode('utf-8-sig'), content_type='text/csv; charset=utf-8-sig')
        resp['Content-Disposition'] = f'attachment; filename="import_errors_{job_id}.csv"'
        return resp


class ExportElevesView(APIView):
    """POST /api/v1/eleves/export/ → 202 ExportJob (xlsx)."""

    permission_classes = [IsAuthenticated, HasActiveAccess, CanListOrImportTemplate]

    def post(self, request):
        fmt = (request.data.get('format') or ExportJob.FORMAT_XLSX).lower()
        if fmt != ExportJob.FORMAT_XLSX:
            return Response(
                {'error': 'Seul le format xlsx est supporté côté serveur (PDF reste client).'},
                status=400,
            )
        filters = request.data.get('filters') or {}
        columns = request.data.get('columns') or []
        if not isinstance(filters, dict):
            return Response({'error': 'filters doit être un objet.'}, status=400)
        if not isinstance(columns, list):
            return Response({'error': 'columns doit être une liste.'}, status=400)

        job = ExportJob.objects.create(
            created_by=request.user,
            status=JobStatus.PENDING,
            format=ExportJob.FORMAT_XLSX,
            filters=filters,
            columns=columns,
        )

        want_sync = settings.CELERY_TASK_ALWAYS_EAGER or (
            request.query_params.get('sync') == '1' and (settings.DEBUG or request.user.is_staff)
        )
        if want_sync:
            try:
                build_eleves_export(str(job.id))
            except Exception:
                pass
            job.refresh_from_db()
            return Response(
                {
                    'id': str(job.id),
                    'status': job.status,
                    'row_count': job.row_count,
                    'error_message': job.error_message,
                },
                status=status.HTTP_200_OK if job.status == JobStatus.SUCCEEDED else 400,
            )

        build_eleves_export.delay(str(job.id))
        return Response(
            {'id': str(job.id), 'status': JobStatus.PENDING},
            status=status.HTTP_202_ACCEPTED,
        )


class ExportJobDetailView(APIView):
    """GET /api/v1/eleves/export/jobs/<uuid>/"""

    permission_classes = [IsAuthenticated, HasActiveAccess, CanListOrImportTemplate]

    def get(self, request, job_id):
        try:
            job = ExportJob.objects.get(pk=job_id)
        except (ExportJob.DoesNotExist, ValueError):
            return Response({'error': 'Job introuvable.'}, status=404)
        if not job_owner_or_staff(request.user, job):
            return Response({'error': 'Accès refusé.'}, status=403)
        return Response({
            'id': str(job.id),
            'status': job.status,
            'format': job.format,
            'row_count': job.row_count,
            'error_message': job.error_message,
            'ready': job.status == JobStatus.SUCCEEDED and bool(job.result_file),
            'created_at': job.created_at,
            'finished_at': job.finished_at,
        })


class ExportJobDownloadView(APIView):
    """GET /api/v1/eleves/export/jobs/<uuid>/fichier/"""

    permission_classes = [IsAuthenticated, HasActiveAccess, CanListOrImportTemplate]

    def get(self, request, job_id):
        try:
            job = ExportJob.objects.get(pk=job_id)
        except (ExportJob.DoesNotExist, ValueError):
            return Response({'error': 'Job introuvable.'}, status=404)
        if not job_owner_or_staff(request.user, job):
            return Response({'error': 'Accès refusé.'}, status=403)
        if job.status != JobStatus.SUCCEEDED or not job.result_file:
            return Response({'error': 'Fichier pas encore prêt.'}, status=409)
        return FileResponse(
            job.result_file.open('rb'),
            as_attachment=True,
            filename=os.path.basename(job.result_file.name) or f'export_{job_id}.xlsx',
        )


class ImportTemplateView(APIView):
    """
    GET /api/v1/eleves/import/template/?type=xlsx|csv
    """
    permission_classes = [IsAuthenticated, HasActiveAccess, CanListOrImportTemplate]

    def get(self, request):
        try:
            fmt = request.GET.get('type', 'xlsx').lower()
            if fmt == 'csv':
                content = generate_csv_template().encode('utf-8-sig')
                resp = HttpResponse(content, content_type='text/csv; charset=utf-8-sig')
                resp['Content-Disposition'] = 'attachment; filename="modele_import_etudiants.csv"'
                return resp
            content = generate_excel_template()
            resp = HttpResponse(
                content,
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            )
            resp['Content-Disposition'] = 'attachment; filename="modele_import_etudiants.xlsx"'
            return resp
        except Exception as exc:
            return Response({'error': str(exc)}, status=500)
