from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from config.pagination import OptionalPageNumberPagination

from .models import BeneficioPaquete, ConfiguracionNegocio, Paquete, Persona, TipoEvento
from .ofertas import (
    beneficios_comunes_activos,
    recomendar_paquetes,
    serializar_beneficio,
    serializar_paquete,
)
from .serializers import (
    PersonaDetalleSerializer,
    PersonaSerializer,
    ConfiguracionNegocioSerializer,
    PaqueteSerializer,
    BeneficioPaqueteSerializer,
    PublicConfiguracionNegocioSerializer,
    PublicPaqueteSerializer,
    PublicTipoEventoSerializer,
    TipoEventoSerializer,
)
from .selectors import (
    buscar_persona_por_telefono,
    filtrar_personas,
    personas_con_detalle,
    personas_con_resumen,
)
from .services import inicio_resumen


class DeactivateInsteadOfDeleteMixin:
    resource_label = "registro"

    def destroy(self, request, *args, **kwargs):
        raise ValidationError(
            {
                "activo": (
                    f"Este {self.resource_label} no se elimina para proteger el historial. "
                    "Desactívelo si ya no debe ofrecerse en nuevos registros."
                )
            }
        )


class PersonaViewSet(viewsets.ModelViewSet):
    serializer_class = PersonaSerializer
    pagination_class = OptionalPageNumberPagination
    search_fields = ["nombre", "telefono", "correo"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return PersonaDetalleSerializer
        return PersonaSerializer

    def get_queryset(self):
        queryset = personas_con_resumen()
        buscar = (
            self.request.query_params.get("buscar")
            or self.request.query_params.get("search")
            or ""
        ).strip()
        clasificacion = self.request.query_params.get("clasificacion")
        queryset = filtrar_personas(queryset, buscar)
        if clasificacion == "cliente":
            queryset = queryset.filter(contratos_count__gt=0)
        elif clasificacion == "interesado":
            queryset = queryset.filter(contratos_count=0)
        return queryset

    def retrieve(self, request, *args, **kwargs):
        persona = get_object_or_404(personas_con_detalle(), pk=kwargs["pk"])
        return Response(self.get_serializer(persona).data)

    def destroy(self, request, *args, **kwargs):
        raise ValidationError(
            {
                "persona": (
                    "Las personas no se eliminan porque conservan el historial comercial y financiero."
                )
            }
        )

    @action(detail=False, methods=["get"], url_path="resumen")
    def resumen(self, request):
        queryset = Persona.objects.all()
        buscar = (request.query_params.get("buscar") or "").strip()
        queryset = filtrar_personas(queryset, buscar)
        resumen = queryset.aggregate(
            total=Count("id", distinct=True),
            clientes=Count("id", filter=Q(contratos__isnull=False), distinct=True),
        )
        resumen["interesados"] = resumen["total"] - resumen["clientes"]
        return Response(resumen)

    @action(detail=False, methods=["get"], url_path="coincidencias")
    def coincidencias(self, request):
        buscar = (request.query_params.get("buscar") or "").strip()
        exclude_id = request.query_params.get("exclude")
        if len(buscar) < 2:
            return Response({"exacta_telefono": None, "sugerencias": []})

        exacta = buscar_persona_por_telefono(buscar, exclude_id=exclude_id)
        suggestions_queryset = filtrar_personas(personas_con_resumen(), buscar)
        if exclude_id:
            suggestions_queryset = suggestions_queryset.exclude(pk=exclude_id)
        sugerencias = list(suggestions_queryset[:8])
        if exacta and all(item.id != exacta.id for item in sugerencias):
            exacta = personas_con_resumen().get(pk=exacta.pk)
            sugerencias.insert(0, exacta)

        serializer = PersonaSerializer(sugerencias, many=True)
        exacta_data = None
        if exacta:
            exacta_resumen = next(
                (item for item in sugerencias if item.id == exacta.id),
                exacta,
            )
            exacta_data = PersonaSerializer(exacta_resumen).data
        return Response(
            {
                "exacta_telefono": exacta_data,
                "sugerencias": serializer.data,
            }
        )


class TipoEventoViewSet(DeactivateInsteadOfDeleteMixin, viewsets.ModelViewSet):
    queryset = TipoEvento.objects.all()
    serializer_class = TipoEventoSerializer
    search_fields = ["nombre", "descripcion"]
    resource_label = "tipo de evento"
    pagination_class = OptionalPageNumberPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        activo = self.request.query_params.get("activo")
        buscar = (
            self.request.query_params.get("buscar")
            or self.request.query_params.get("search")
            or ""
        ).strip()
        if buscar:
            queryset = queryset.filter(
                Q(nombre__icontains=buscar) | Q(descripcion__icontains=buscar)
            )
        if activo is not None:
            queryset = queryset.filter(activo=activo.lower() == "true")
        return queryset


class PaqueteViewSet(DeactivateInsteadOfDeleteMixin, viewsets.ModelViewSet):
    queryset = Paquete.objects.prefetch_related("beneficios")
    serializer_class = PaqueteSerializer
    search_fields = ["nombre", "resumen_corto", "etiqueta_comercial"]
    resource_label = "paquete"
    pagination_class = OptionalPageNumberPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        activo = self.request.query_params.get("activo")
        categoria = self.request.query_params.get("categoria")
        buscar = (
            self.request.query_params.get("buscar")
            or self.request.query_params.get("search")
            or ""
        ).strip()
        if buscar:
            queryset = queryset.filter(
                Q(nombre__icontains=buscar)
                | Q(resumen_corto__icontains=buscar)
                | Q(etiqueta_comercial__icontains=buscar)
                | Q(beneficios__titulo__icontains=buscar)
            )
        if activo is not None:
            queryset = queryset.filter(activo=activo.lower() == "true")
        if categoria:
            queryset = queryset.filter(categoria=categoria)
        return queryset.distinct()


class BeneficioPaqueteViewSet(viewsets.ModelViewSet):
    serializer_class = BeneficioPaqueteSerializer
    pagination_class = OptionalPageNumberPagination
    search_fields = ["titulo", "detalle"]

    def get_queryset(self):
        queryset = BeneficioPaquete.objects.select_related("paquete")
        alcance = self.request.query_params.get("alcance")
        paquete = self.request.query_params.get("paquete")
        activo = self.request.query_params.get("activo")
        if alcance == "comunes":
            queryset = queryset.filter(paquete__isnull=True)
        elif alcance == "paquete":
            queryset = queryset.filter(paquete__isnull=False)
        if paquete:
            queryset = queryset.filter(paquete_id=paquete)
        if activo is not None:
            queryset = queryset.filter(activo=activo.lower() == "true")
        return queryset


class ConfiguracionNegocioViewSet(viewsets.ModelViewSet):
    queryset = ConfiguracionNegocio.objects.all()
    serializer_class = ConfiguracionNegocioSerializer
    search_fields = ["nombre_negocio"]

    def get_queryset(self):
        queryset = super().get_queryset()
        activo = self.request.query_params.get("activo")
        if activo is not None:
            queryset = queryset.filter(activo=activo.lower() == "true")
        return queryset

    def destroy(self, request, *args, **kwargs):
        raise ValidationError(
            {
                "configuracion": "La configuracion vigente no puede eliminarse porque alimenta los calculos publicos."
            }
        )


class InicioResumenAPIView(APIView):
    def get(self, request):
        return Response(inicio_resumen())


class PublicTiposEventoAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        queryset = TipoEvento.objects.filter(activo=True).order_by("nombre")
        return Response(PublicTipoEventoSerializer(queryset, many=True).data)


class PublicPaquetesAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        numero_invitados = request.query_params.get("numero_invitados")
        if numero_invitados:
            try:
                numero_invitados = int(numero_invitados)
            except (TypeError, ValueError):
                raise ValidationError(
                    {"numero_invitados": "Ingresa un número de invitados válido."}
                )
            if numero_invitados <= 0:
                raise ValidationError(
                    {"numero_invitados": "El número de invitados debe ser mayor que cero."}
                )

        queryset = (
            Paquete.objects.filter(activo=True)
            .prefetch_related("beneficios")
            .order_by("categoria", "orden", "precio_por_persona", "id")
        )
        paquetes = list(queryset)
        comunes = beneficios_comunes_activos()
        recomendados = recomendar_paquetes(
            paquetes,
            {
                "nivel_experiencia": request.query_params.get(
                    "nivel_experiencia",
                    "equilibrado",
                ),
                "entretenimiento": request.query_params.get(
                    "entretenimiento",
                    "indiferente",
                ),
            },
        )
        return Response(
            {
                "incluidos_en_todos": [
                    serializar_beneficio(item) for item in comunes
                ],
                "paquetes": [
                    serializar_paquete(
                        paquete,
                        numero_invitados=numero_invitados,
                        comunes=[],
                    )
                    for paquete in paquetes
                ],
                "recomendados": [paquete.id for paquete in recomendados],
            }
        )


class PublicConfiguracionAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        configuracion = ConfiguracionNegocio.objects.filter(activo=True).first()
        if configuracion is None:
            return Response({})
        return Response(PublicConfiguracionNegocioSerializer(configuracion).data)
