from django.contrib import admin
from django.urls import include, path

from .views import health_check

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='api-health'),
    path('api/accounts/', include('accounts.urls')),
    path('api/negocio/', include('negocio.urls')),
    path('api/comercial/', include('comercial.urls')),
    path('api/financiero/', include('financiero.urls')),
    path('api/reportes/', include('reportes.urls')),
]
