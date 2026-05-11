from rest_framework import viewsets

from .models import Cotizacion
from .serializers import CotizacionSerializer


class CotizacionViewSet(viewsets.ModelViewSet):
    serializer_class = CotizacionSerializer
    search_fields = ["cliente__nombre", "cliente__telefono", "observaciones"]

    def get_queryset(self):
        queryset = Cotizacion.objects.select_related(
            "cliente",
            "tipo_evento",
            "paquete",
        )
        estado = self.request.query_params.get("estado")
        cliente = self.request.query_params.get("cliente")
        es_demo = self.request.query_params.get("es_demo")
        if estado:
            queryset = queryset.filter(estado=estado)
        if cliente:
            queryset = queryset.filter(cliente_id=cliente)
        if es_demo is not None:
            queryset = queryset.filter(es_demo=es_demo.lower() == "true")
        return queryset
