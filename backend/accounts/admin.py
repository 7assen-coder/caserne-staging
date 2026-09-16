from django.contrib import admin

from .models import AuditEvent, LoginAttempt, UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'phone',
        'matricule',
        'fonction',
        'scope_compagnie',
        'scope_section',
        'is_active_access',
        'must_change_password',
        'grade',
    )
    list_filter = ('fonction', 'is_active_access', 'must_change_password')
    search_fields = ('phone', 'matricule', 'user__email', 'user__username', 'scope_section', 'scope_compagnie')
    raw_id_fields = ('eleve',)


@admin.register(LoginAttempt)
class LoginAttemptAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'identifier', 'ip', 'success')
    list_filter = ('success',)
    search_fields = ('identifier', 'ip')
    readonly_fields = ('created_at', 'identifier', 'ip', 'success', 'user_agent')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(AuditEvent)
class AuditEventAdmin(admin.ModelAdmin):
    list_display = (
        'created_at',
        'action',
        'resource_type',
        'eleve_matricule',
        'actor_email',
        'actor_role',
        'success',
        'summary',
    )
    list_filter = ('action', 'resource_type', 'success', 'actor_role')
    search_fields = ('actor_email', 'eleve_matricule', 'summary', 'resource_id', 'path')
    readonly_fields = (
        'created_at',
        'actor',
        'actor_email',
        'actor_role',
        'ip',
        'user_agent',
        'action',
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
    date_hierarchy = 'created_at'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
