from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.audit_mixins import AuditedModelViewSetMixin
from accounts.models import AuditEvent
from accounts.optimistic_lock import OptimisticLockMixin, bump_version, parse_expected_version, assert_version_match, serialize_current
from accounts.permissions import EleveRolePermission, HasActiveAccess, eleves_queryset_for
from etudiants.models import Eleve

from .models import (
    AppelLigne,
    AppelPresence,
    ConsultationMedicale,
    Demande,
    DroitsBatch,
    DroitsLigne,
    EquipementItem,
    JournalEvenement,
    Sanction,
)
from .serializers import (
    AppelLigneSerializer,
    AppelPresenceSerializer,
    ConsultationMedicaleSerializer,
    DemandeSerializer,
    DroitsBatchSerializer,
    DroitsLigneSerializer,
    EquipementItemSerializer,
    JournalEvenementSerializer,
    SanctionSerializer,
)


class ScopedOpsMixin:
    """Filter by élève RBAC scope when model has eleve FK."""

    permission_classes = [IsAuthenticated, HasActiveAccess, EleveRolePermission]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    eleve_lookup = 'eleve'

    def get_queryset(self):
        eleves = eleves_queryset_for(self.request.user)
        qs = self.queryset.model.objects.filter(**{f'{self.eleve_lookup}__in': eleves})
        eleve_id = self.request.query_params.get('eleve')
        if eleve_id:
            qs = qs.filter(**{self.eleve_lookup: eleve_id})
        return qs.select_related(self.eleve_lookup)


class EquipementItemViewSet(OptimisticLockMixin, AuditedModelViewSetMixin, ScopedOpsMixin, viewsets.ModelViewSet):
    queryset = EquipementItem.objects.all()
    serializer_class = EquipementItemSerializer
    audit_resource_type = AuditEvent.RESOURCE_EQUIPEMENT
    optimistic_lock_resource = AuditEvent.RESOURCE_EQUIPEMENT

    def audit_eleve(self, instance):
        return instance.eleve

    @action(detail=True, methods=['post'], url_path='retour')
    def mark_returned(self, request, pk=None):
        from django.db import transaction

        with transaction.atomic():
            item = EquipementItem.objects.select_for_update().get(pk=pk)
            self.check_object_permissions(request, item)
            expected = parse_expected_version(request)
            assert_version_match(
                item,
                expected,
                resource=self.audit_resource_type,
                current=serialize_current(
                    item,
                    serializer_class=EquipementItemSerializer,
                    context=self.get_serializer_context(),
                ),
            )
            item.etat = EquipementItem.ETAT_RENDU
            item.date_retour = request.data.get('date_retour') or timezone.localdate()
            item.save(update_fields=['etat', 'date_retour', 'updated_at'])
            bump_version(item)
            return Response(self.get_serializer(item).data)


class SanctionViewSet(OptimisticLockMixin, AuditedModelViewSetMixin, ScopedOpsMixin, viewsets.ModelViewSet):
    queryset = Sanction.objects.all()
    serializer_class = SanctionSerializer
    audit_resource_type = AuditEvent.RESOURCE_SANCTION
    optimistic_lock_resource = AuditEvent.RESOURCE_SANCTION

    def audit_eleve(self, instance):
        return instance.eleve


class DemandeViewSet(OptimisticLockMixin, AuditedModelViewSetMixin, ScopedOpsMixin, viewsets.ModelViewSet):
    queryset = Demande.objects.all()
    serializer_class = DemandeSerializer
    audit_resource_type = AuditEvent.RESOURCE_DEMANDE
    optimistic_lock_resource = AuditEvent.RESOURCE_DEMANDE

    def audit_eleve(self, instance):
        return instance.eleve


class ConsultationMedicaleViewSet(OptimisticLockMixin, AuditedModelViewSetMixin, ScopedOpsMixin, viewsets.ModelViewSet):
    queryset = ConsultationMedicale.objects.all()
    serializer_class = ConsultationMedicaleSerializer
    audit_resource_type = AuditEvent.RESOURCE_CONSULTATION
    optimistic_lock_resource = AuditEvent.RESOURCE_CONSULTATION

    def audit_eleve(self, instance):
        return instance.eleve


class JournalEvenementViewSet(OptimisticLockMixin, AuditedModelViewSetMixin, ScopedOpsMixin, viewsets.ModelViewSet):
    queryset = JournalEvenement.objects.all()
    serializer_class = JournalEvenementSerializer
    audit_resource_type = AuditEvent.RESOURCE_JOURNAL
    optimistic_lock_resource = AuditEvent.RESOURCE_JOURNAL

    def audit_eleve(self, instance):
        return instance.eleve


class DroitsBatchViewSet(OptimisticLockMixin, AuditedModelViewSetMixin, viewsets.ModelViewSet):
    queryset = DroitsBatch.objects.all().prefetch_related('lignes')
    serializer_class = DroitsBatchSerializer
    permission_classes = [IsAuthenticated, HasActiveAccess, EleveRolePermission]
    audit_resource_type = AuditEvent.RESOURCE_DROITS
    optimistic_lock_resource = AuditEvent.RESOURCE_DROITS
    require_version_on_write = True

    def get_queryset(self):
        qs = DroitsBatch.objects.all().prefetch_related('lignes')
        annee = self.request.query_params.get('annee')
        mois = self.request.query_params.get('mois')
        compagnie = self.request.query_params.get('compagnie')
        if annee:
            qs = qs.filter(annee=annee)
        if mois:
            qs = qs.filter(mois=mois)
        if compagnie:
            qs = qs.filter(compagnie=compagnie)
        return qs

    @action(detail=False, methods=['post'], url_path='assurer')
    def load_or_create(self, request):
        annee = int(request.data.get('annee'))
        mois = int(request.data.get('mois'))
        compagnie = request.data.get('compagnie') or ''
        default_montant = request.data.get('default_montant') or 0
        batch, _created = DroitsBatch.objects.get_or_create(
            annee=annee,
            mois=mois,
            compagnie=compagnie,
            defaults={'default_montant': default_montant},
        )
        return Response(self.get_serializer(batch).data)

    @action(detail=True, methods=['post'])
    def seed(self, request, pk=None):
        batch = self.get_object()
        eleves = eleves_queryset_for(request.user).filter(
            dossier_militaire__compagnie=batch.compagnie
        )
        created = 0
        for eleve in eleves:
            _, was_created = DroitsLigne.objects.get_or_create(
                batch=batch,
                eleve=eleve,
                defaults={
                    'montant': batch.default_montant,
                    'etat': 'non_percu',
                },
            )
            if was_created:
                created += 1
        batch.refresh_from_db()
        data = self.get_serializer(batch).data
        data['seeded'] = created
        return Response(data)

    @action(detail=True, methods=['post'], url_path='valider')
    def validate_batch(self, request, pk=None):
        from django.db import transaction

        with transaction.atomic():
            batch = DroitsBatch.objects.select_for_update().get(pk=pk)
            expected = parse_expected_version(request)
            assert_version_match(
                batch,
                expected,
                resource=self.audit_resource_type,
                current=serialize_current(
                    batch,
                    serializer_class=DroitsBatchSerializer,
                    context=self.get_serializer_context(),
                ),
            )
            batch.validated_at = timezone.now()
            batch.save(update_fields=['validated_at', 'updated_at'])
            bump_version(batch)
            return Response(self.get_serializer(batch).data)

    @action(detail=True, methods=['post'])
    def unlock(self, request, pk=None):
        from django.db import transaction

        with transaction.atomic():
            batch = DroitsBatch.objects.select_for_update().get(pk=pk)
            expected = parse_expected_version(request)
            assert_version_match(
                batch,
                expected,
                resource=self.audit_resource_type,
                current=serialize_current(
                    batch,
                    serializer_class=DroitsBatchSerializer,
                    context=self.get_serializer_context(),
                ),
            )
            batch.validated_at = None
            batch.save(update_fields=['validated_at', 'updated_at'])
            bump_version(batch)
            return Response(self.get_serializer(batch).data)


class DroitsLigneViewSet(OptimisticLockMixin, AuditedModelViewSetMixin, ScopedOpsMixin, viewsets.ModelViewSet):
    queryset = DroitsLigne.objects.all()
    serializer_class = DroitsLigneSerializer
    audit_resource_type = AuditEvent.RESOURCE_DROITS
    optimistic_lock_resource = AuditEvent.RESOURCE_DROITS

    def get_queryset(self):
        qs = super().get_queryset()
        batch_id = self.request.query_params.get('batch')
        if batch_id:
            qs = qs.filter(batch_id=batch_id)
        return qs.select_related('eleve', 'batch')

    def audit_eleve(self, instance):
        return instance.eleve


class AppelPresenceViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    queryset = AppelPresence.objects.all().prefetch_related('lignes')
    serializer_class = AppelPresenceSerializer
    permission_classes = [IsAuthenticated, HasActiveAccess, EleveRolePermission]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    audit_resource_type = AuditEvent.RESOURCE_PRESENCE

    def get_queryset(self):
        qs = AppelPresence.objects.all().prefetch_related('lignes__eleve')
        compagnie = self.request.query_params.get('compagnie')
        section = self.request.query_params.get('section')
        if compagnie:
            qs = qs.filter(compagnie=compagnie)
        if section:
            qs = qs.filter(section=section)
        return qs

    @action(detail=True, methods=['put', 'post'], url_path='lignes')
    def bulk_lignes(self, request, pk=None):
        appel = self.get_object()
        rows = request.data if isinstance(request.data, list) else request.data.get('lignes', [])
        eleves = eleves_queryset_for(request.user)
        saved = []
        for row in rows:
            eleve_id = row.get('eleve') or row.get('eleve_id')
            if not eleves.filter(pk=eleve_id).exists():
                continue
            ligne, _ = AppelLigne.objects.update_or_create(
                appel=appel,
                eleve_id=eleve_id,
                defaults={
                    'statut': row.get('statut') or 'present',
                    'motif': row.get('motif') or None,
                },
            )
            saved.append(ligne)
        return Response(AppelLigneSerializer(saved, many=True).data)
