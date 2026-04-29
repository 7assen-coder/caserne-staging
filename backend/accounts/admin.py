from django.contrib import admin

from .models import UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'phone', 'matricule', 'fonction', 'grade')
    search_fields = ('phone', 'matricule', 'user__email', 'user__username')
