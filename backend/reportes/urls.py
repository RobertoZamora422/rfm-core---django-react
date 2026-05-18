from django.urls import path

from .views import (
    ReporteComercialAPIView,
    ReporteEventosAPIView,
    ReporteFinancieroAPIView,
    ReportePaquetesAPIView,
)


urlpatterns = [
    path("comercial/", ReporteComercialAPIView.as_view(), name="reporte-comercial"),
    path("financiero/", ReporteFinancieroAPIView.as_view(), name="reporte-financiero"),
    path("eventos/", ReporteEventosAPIView.as_view(), name="reporte-eventos"),
    path("paquetes/", ReportePaquetesAPIView.as_view(), name="reporte-paquetes"),
]
