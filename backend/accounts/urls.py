from django.urls import path

from .views import CookieTokenRefreshView, LoginView, LogoutView, MeView

urlpatterns = [
    path('login/', LoginView.as_view()),
    path('logout/', LogoutView.as_view()),
    path('me/', MeView.as_view()),
    path('token/refresh/', CookieTokenRefreshView.as_view()),
]
