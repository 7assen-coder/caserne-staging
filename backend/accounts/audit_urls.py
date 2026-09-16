from django.urls import path

from .audit_views import AuditEventDetailView, AuditEventListView

urlpatterns = [
    path('', AuditEventListView.as_view()),
    path('<int:pk>/', AuditEventDetailView.as_view()),
]
