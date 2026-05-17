from django.db.models import Q
from django.utils.dateparse import parse_date
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

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
        tipo_evento = self.request.query_params.get("tipo_evento")
        buscar = (
            self.request.query_params.get("buscar")
            or self.request.query_params.get("search")
            or ""
        ).strip()
        fecha_desde = self._parse_query_date(
            self.request.query_params.get("desde"),
            "desde",
        )
        fecha_hasta = self._parse_query_date(
            self.request.query_params.get("hasta"),
            "hasta",
        )
        es_demo = self.request.query_params.get("es_demo")

        if fecha_desde and fecha_hasta and fecha_desde > fecha_hasta:
            raise ValidationError({"hasta": "La fecha hasta no puede ser anterior a desde."})

        if estado_contrato:
            queryset = queryset.filter(estado_contrato=estado_contrato)
        if estado_pago:
            queryset = queryset.filter(estado_pago=estado_pago)
        if cliente:
            queryset = queryset.filter(cliente_id=cliente)
        if tipo_evento:
            queryset = queryset.filter(tipo_evento_id=tipo_evento)
        if fecha_desde:
            queryset = queryset.filter(fecha_evento__gte=fecha_desde)
        if fecha_hasta:
            queryset = queryset.filter(fecha_evento__lte=fecha_hasta)
        if buscar:
            queryset = queryset.filter(
                Q(cliente__nombre__icontains=buscar)
                | Q(cliente__telefono__icontains=buscar)
            )
        if es_demo is not None:
            queryset = queryset.filter(es_demo=es_demo.lower() == "true")
        return queryset

    @staticmethod
    def _parse_query_date(value, field_name):
        if not value:
            return None

        parsed = parse_date(value)
        if parsed is None:
            raise ValidationError({field_name: "Use el formato YYYY-MM-DD."})
        return parsed

    @action(detail=True, methods=["post"], url_path="cancelar")
    def cancelar(self, request, pk=None):
        contrato = self.get_object()
        contrato.estado_contrato = Contrato.EstadoContrato.CANCELADO
        contrato.save(update_fields=["estado_contrato", "actualizado_en"])
        return Response(ContratoSerializer(contrato).data, status=status.HTTP_200_OK)


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
