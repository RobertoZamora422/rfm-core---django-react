from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import (
    ContratoViewSet,
    CostoDirectoViewSet,
    DashboardFinancieroAPIView,
    GastoFijoMensualViewSet,
)

router = SimpleRouter()
router.register("contratos", ContratoViewSet, basename="contrato")
router.register("costos-directos", CostoDirectoViewSet, basename="costo-directo")
router.register("gastos-fijos", GastoFijoMensualViewSet, basename="gasto-fijo")

urlpatterns = [
    path(
        "dashboard-financiero/",
        DashboardFinancieroAPIView.as_view(),
        name="dashboard-financiero",
    ),
]
urlpatterns += router.urls
