from rest_framework.routers import SimpleRouter

from .views import ContratoViewSet, CostoDirectoViewSet, GastoFijoMensualViewSet

router = SimpleRouter()
router.register("contratos", ContratoViewSet, basename="contrato")
router.register("costos-directos", CostoDirectoViewSet, basename="costo-directo")
router.register("gastos-fijos", GastoFijoMensualViewSet, basename="gasto-fijo")

urlpatterns = router.urls
