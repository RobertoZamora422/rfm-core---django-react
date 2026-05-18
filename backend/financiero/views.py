from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q, Sum
from django.utils.dateparse import parse_date
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Contrato, CostoDirecto, GastoFijoMensual
from .serializers import (
    ContratoSerializer,
    CostoDirectoSerializer,
    GastoFijoMensualSerializer,
)
from .services import dashboard_financiero


def _raise_api_validation_error(exc):
    if hasattr(exc, "message_dict"):
        raise ValidationError(exc.message_dict)
    raise ValidationError(getattr(exc, "messages", [str(exc)]))


def _parse_query_date(value, field_name):
    if not value:
        return None

    parsed = parse_date(value)
    if parsed is None:
        raise ValidationError({field_name: "Use el formato YYYY-MM-DD."})
    return parsed


def _parse_int_query(value, field_name, min_value=None, max_value=None):
    if value in (None, ""):
        return None

    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise ValidationError({field_name: "Debe ser un numero entero."})

    if min_value is not None and parsed < min_value:
        raise ValidationError({field_name: f"Debe ser mayor o igual a {min_value}."})
    if max_value is not None and parsed > max_value:
        raise ValidationError({field_name: f"Debe ser menor o igual a {max_value}."})
    return parsed


def _serialize_decimal(value):
    return str((value or Decimal("0.00")).quantize(Decimal("0.01")))


class CleanModelValidationMixin:
    def perform_create(self, serializer):
        try:
            serializer.save()
        except DjangoValidationError as exc:
            _raise_api_validation_error(exc)

    def perform_update(self, serializer):
        try:
            serializer.save()
        except DjangoValidationError as exc:
            _raise_api_validation_error(exc)


class ContratoViewSet(CleanModelValidationMixin, viewsets.ModelViewSet):
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
        fecha_desde = _parse_query_date(
            self.request.query_params.get("desde"),
            "desde",
        )
        fecha_hasta = _parse_query_date(
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

    @action(detail=True, methods=["post"], url_path="cancelar")
    def cancelar(self, request, pk=None):
        contrato = self.get_object()
        contrato.estado_contrato = Contrato.EstadoContrato.CANCELADO
        contrato.save(update_fields=["estado_contrato", "actualizado_en"])
        return Response(ContratoSerializer(contrato).data, status=status.HTTP_200_OK)


class CostoDirectoViewSet(CleanModelValidationMixin, viewsets.ModelViewSet):
    serializer_class = CostoDirectoSerializer
    search_fields = [
        "concepto",
        "contrato__cliente__nombre",
        "contrato__cliente__telefono",
        "observaciones",
    ]

    def get_queryset(self):
        queryset = CostoDirecto.objects.select_related(
            "contrato",
            "contrato__cliente",
            "contrato__tipo_evento",
            "contrato__paquete",
        )
        contrato = _parse_int_query(
            self.request.query_params.get("contrato"),
            "contrato",
            min_value=1,
        )
        buscar = (
            self.request.query_params.get("buscar")
            or self.request.query_params.get("search")
            or ""
        ).strip()
        fecha_desde = _parse_query_date(
            self.request.query_params.get("desde"),
            "desde",
        )
        fecha_hasta = _parse_query_date(
            self.request.query_params.get("hasta"),
            "hasta",
        )
        es_demo = self.request.query_params.get("es_demo")

        if fecha_desde and fecha_hasta and fecha_desde > fecha_hasta:
            raise ValidationError({"hasta": "La fecha hasta no puede ser anterior a desde."})

        if contrato:
            queryset = queryset.filter(contrato_id=contrato)
        if buscar:
            queryset = queryset.filter(
                Q(concepto__icontains=buscar)
                | Q(contrato__cliente__nombre__icontains=buscar)
                | Q(contrato__cliente__telefono__icontains=buscar)
            )
        if fecha_desde:
            queryset = queryset.filter(fecha__gte=fecha_desde)
        if fecha_hasta:
            queryset = queryset.filter(fecha__lte=fecha_hasta)
        if es_demo is not None:
            queryset = queryset.filter(es_demo=es_demo.lower() == "true")
        return queryset


class GastoFijoMensualViewSet(CleanModelValidationMixin, viewsets.ModelViewSet):
    queryset = GastoFijoMensual.objects.all()
    serializer_class = GastoFijoMensualSerializer
    search_fields = ["concepto", "observaciones"]

    def get_queryset(self):
        queryset = super().get_queryset()
        mes = _parse_int_query(
            self.request.query_params.get("mes"),
            "mes",
            min_value=1,
            max_value=12,
        )
        anio = _parse_int_query(
            self.request.query_params.get("anio"),
            "anio",
            min_value=2000,
        )
        buscar = (
            self.request.query_params.get("concepto")
            or self.request.query_params.get("buscar")
            or self.request.query_params.get("search")
            or ""
        ).strip()
        es_demo = self.request.query_params.get("es_demo")
        if mes:
            queryset = queryset.filter(mes=mes)
        if anio:
            queryset = queryset.filter(anio=anio)
        if buscar:
            queryset = queryset.filter(concepto__icontains=buscar)
        if es_demo is not None:
            queryset = queryset.filter(es_demo=es_demo.lower() == "true")
        return queryset

    @action(detail=False, methods=["get"], url_path="resumen")
    def resumen(self, request):
        total = self.get_queryset().aggregate(total=Sum("valor"))["total"]
        return Response({"total_periodo": _serialize_decimal(total)})


class DashboardFinancieroAPIView(APIView):
    def get(self, request):
        mes = _parse_int_query(
            request.query_params.get("mes"),
            "mes",
            min_value=1,
            max_value=12,
        )
        anio = _parse_int_query(
            request.query_params.get("anio"),
            "anio",
            min_value=2000,
        )
        return Response(dashboard_financiero(mes=mes, anio=anio))
