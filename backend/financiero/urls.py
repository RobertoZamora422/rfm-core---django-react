from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import (
    ContratoViewSet,
    CostoDirectoViewSet,
    DashboardFinancieroAPIView,
    GastoAdicionalViewSet,
    GastoRecurrenteViewSet,
    GastosResumenAPIView,
)

router = SimpleRouter()
router.register("contratos", ContratoViewSet, basename="contrato")
router.register("costos-directos", CostoDirectoViewSet, basename="costo-directo")
router.register(
    "gastos-recurrentes",
    GastoRecurrenteViewSet,
    basename="gasto-recurrente",
)
router.register(
    "gastos-adicionales",
    GastoAdicionalViewSet,
    basename="gasto-adicional",
)

urlpatterns = [
    path(
        "dashboard-financiero/",
        DashboardFinancieroAPIView.as_view(),
        name="dashboard-financiero",
    ),
    path(
        "gastos/resumen/",
        GastosResumenAPIView.as_view(),
        name="gastos-resumen",
    ),
]
urlpatterns += router.urls
