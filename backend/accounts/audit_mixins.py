"""Auditing mixins for DRF viewsets."""

from rest_framework.response import Response

from accounts.audit import build_changes, record_audit
from accounts.models import AuditEvent


class AuditedModelViewSetMixin:
    """
    record VIEW on retrieve; CREATE/UPDATE/DELETE on mutations.
    Subclasses set audit_resource_type and optionally resolve eleve via audit_eleve().
    """

    audit_resource_type = 'eleve'

    def audit_eleve(self, instance):
        if self.audit_resource_type == AuditEvent.RESOURCE_ELEVE:
            return instance
        return getattr(instance, 'eleve', None)

    def audit_summary(self, action, instance):
        matricule = ''
        eleve = self.audit_eleve(instance)
        if eleve is not None:
            matricule = getattr(eleve, 'matricule', '') or ''
        return f'{action} {self.audit_resource_type} {getattr(instance, "pk", "")} {matricule}'.strip()

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        record_audit(
            request=request,
            action=AuditEvent.ACTION_VIEW,
            resource_type=self.audit_resource_type,
            resource_id=str(instance.pk),
            eleve=self.audit_eleve(instance),
            summary=self.audit_summary('Consultation', instance),
        )
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def perform_create(self, serializer):
        super().perform_create(serializer)
        instance = serializer.instance
        record_audit(
            request=self.request,
            action=AuditEvent.ACTION_CREATE,
            resource_type=self.audit_resource_type,
            resource_id=str(instance.pk),
            eleve=self.audit_eleve(instance),
            summary=self.audit_summary('Création', instance),
        )

    def perform_update(self, serializer):
        instance = self.get_object()
        changes = build_changes(instance, serializer.validated_data)
        super().perform_update(serializer)
        instance = serializer.instance
        record_audit(
            request=self.request,
            action=AuditEvent.ACTION_UPDATE,
            resource_type=self.audit_resource_type,
            resource_id=str(instance.pk),
            eleve=self.audit_eleve(instance),
            summary=self.audit_summary('Modification', instance),
            changes=changes,
        )

    def perform_destroy(self, instance):
        pk = instance.pk
        eleve = self.audit_eleve(instance)
        summary = self.audit_summary('Suppression', instance)
        super().perform_destroy(instance)
        record_audit(
            request=self.request,
            action=AuditEvent.ACTION_DELETE,
            resource_type=self.audit_resource_type,
            resource_id=str(pk),
            eleve=eleve,
            summary=summary,
        )
