from django.urls import path

from .password_views import (
    ChangePasswordView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    PasswordResetVerifyView,
)
from .views import (
    CookieTokenRefreshView,
    CsrfCookieView,
    LoginView,
    LogoutView,
    MeView,
    MilitaryUserDetailView,
    MilitaryUserListCreateView,
    ProvisionStudentView,
)

urlpatterns = [
    path('csrf/', CsrfCookieView.as_view()),
    path('login/', LoginView.as_view()),
    path('logout/', LogoutView.as_view()),
    path('me/', MeView.as_view()),
    path('refresh/', CookieTokenRefreshView.as_view()),
    path('password/', ChangePasswordView.as_view()),
    path('password/reset/', PasswordResetRequestView.as_view()),
    path('password/reset/verify/', PasswordResetVerifyView.as_view()),
    path('password/reset/confirm/', PasswordResetConfirmView.as_view()),
    path('users/', MilitaryUserListCreateView.as_view()),
    path('users/provision/', ProvisionStudentView.as_view()),
    path('users/<int:pk>/', MilitaryUserDetailView.as_view()),
]
