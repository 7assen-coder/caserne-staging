"""Read-only audit API for military accountability."""

from django.utils.dateparse import parse_date, parse_datetime
from rest_framework import serializers
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated

from .models import AuditEvent
from .permissions import CanViewAudit, HasActiveAccess


class AuditEventSerializer(serializers.ModelSerializer):
    action_label = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = AuditEvent
        fields = (
            'id',
            'created_at',
            'actor',
            'actor_email',
            'actor_role',
            'ip',
            'action',
            'action_label',
            'resource_type',
            'resource_id',
            'eleve',
            'eleve_matricule',
            'path',
            'method',
            'summary',
            'changes',
            'success',
        )
        read_only_fields = fields


class AuditPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200


class AuditEventListView(ListAPIView):
    permission_classes = [IsAuthenticated, HasActiveAccess, CanViewAudit]
    serializer_class = AuditEventSerializer
    pagination_class = AuditPagination

    def get_queryset(self):
        qs = AuditEvent.objects.all().select_related('actor', 'eleve')
        params = self.request.query_params

        eleve = params.get('eleve')
        if eleve:
            qs = qs.filter(eleve_id=eleve)

        actor = params.get('actor')
        if actor:
            qs = qs.filter(actor_id=actor)

        action = params.get('action')
        if action:
            qs = qs.filter(action=action)

        actor_email = (params.get('actor_email') or '').strip()
        if actor_email:
            qs = qs.filter(actor_email__icontains=actor_email)

        matricule = (params.get('matricule') or params.get('eleve_matricule') or '').strip()
        if matricule:
            qs = qs.filter(eleve_matricule__icontains=matricule)

        resource_type = params.get('resource_type')
        if resource_type:
            qs = qs.filter(resource_type=resource_type)

        date_from = params.get('date_from')
        if date_from:
            dt = parse_datetime(date_from) or parse_date(date_from)
            if dt:
                qs = qs.filter(created_at__gte=dt)

        date_to = params.get('date_to')
        if date_to:
            dt = parse_datetime(date_to) or parse_date(date_to)
            if dt:
                qs = qs.filter(created_at__lte=dt)

        return qs


class AuditEventDetailView(RetrieveAPIView):
    permission_classes = [IsAuthenticated, HasActiveAccess, CanViewAudit]
    serializer_class = AuditEventSerializer
    queryset = AuditEvent.objects.all().select_related('actor', 'eleve')
