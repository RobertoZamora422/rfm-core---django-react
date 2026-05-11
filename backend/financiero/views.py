from rest_framework import viewsets

from .models import Contrato, CostoDirecto, GastoFijoMensual
from .serializers import (
    ContratoSerializer,
    CostoDirectoSerializer,
    GastoFijoMensualSerializer,
)


class ContratoViewSet(viewsets.ModelViewSet):
    serializer_class = ContratoSerializer
    search_fields = ["cliente__nombre", "cliente__telefono", "observaciones"]

    def get_queryset(self):
        queryset = Contrato.objects.select_related(
            "cotizacion",
            "cliente",
            "tipo_evento",
            "paquete",
        )
        estado_contrato = self.request.query_params.get("estado_contrato")
        estado_pago = self.request.query_params.get("estado_pago")
        cliente = self.request.query_params.get("cliente")
        es_demo = self.request.query_params.get("es_demo")
        if estado_contrato:
            queryset = queryset.filter(estado_contrato=estado_contrato)
        if estado_pago:
            queryset = queryset.filter(estado_pago=estado_pago)
        if cliente:
            queryset = queryset.filter(cliente_id=cliente)
        if es_demo is not None:
            queryset = queryset.filter(es_demo=es_demo.lower() == "true")
        return queryset


class CostoDirectoViewSet(viewsets.ModelViewSet):
    serializer_class = CostoDirectoSerializer
    search_fields = ["concepto", "contrato__cliente__nombre", "observaciones"]

    def get_queryset(self):
        queryset = CostoDirecto.objects.select_related("contrato", "contrato__cliente")
        contrato = self.request.query_params.get("contrato")
        es_demo = self.request.query_params.get("es_demo")
        if contrato:
            queryset = queryset.filter(contrato_id=contrato)
        if es_demo is not None:
            queryset = queryset.filter(es_demo=es_demo.lower() == "true")
        return queryset


class GastoFijoMensualViewSet(viewsets.ModelViewSet):
    queryset = GastoFijoMensual.objects.all()
    serializer_class = GastoFijoMensualSerializer
    search_fields = ["concepto", "observaciones"]

    def get_queryset(self):
        queryset = super().get_queryset()
        mes = self.request.query_params.get("mes")
        anio = self.request.query_params.get("anio")
        es_demo = self.request.query_params.get("es_demo")
        if mes:
            queryset = queryset.filter(mes=mes)
        if anio:
            queryset = queryset.filter(anio=anio)
        if es_demo is not None:
            queryset = queryset.filter(es_demo=es_demo.lower() == "true")
        return queryset
