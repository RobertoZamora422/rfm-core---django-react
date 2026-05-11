from django.contrib import admin
from django.urls import include, path

from .views import health_check

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='api-health'),
    path('api/', include('negocio.urls')),
    path('api/', include('comercial.urls')),
    path('api/', include('financiero.urls')),
    path('api/auth/', include('accounts.urls')),
    path('api/reportes/', include('reportes.urls')),
]
