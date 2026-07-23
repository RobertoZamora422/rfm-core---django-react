from django.contrib import admin
from django.urls import include, path

from .views import api_root, health_check, readiness_check

urlpatterns = [
    path('', api_root, name='api-root'),
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='api-health'),
    path('api/ready/', readiness_check, name='api-ready'),
    path('api/', include('negocio.urls')),
    path('api/', include('comercial.urls')),
    path('api/', include('financiero.urls')),
    path('api/auth/', include('accounts.urls')),
    path('api/reportes/', include('reportes.urls')),
]
