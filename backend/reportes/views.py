from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import DateRangeReportQuerySerializer, MonthYearReportQuerySerializer
from .services import (
    reporte_comercial,
    reporte_eventos,
    reporte_financiero,
    reporte_paquetes,
)


class ReporteComercialAPIView(APIView):
    def get(self, request):
        serializer = DateRangeReportQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        return Response(reporte_comercial(desde=data["desde"], hasta=data["hasta"]))


class ReporteFinancieroAPIView(APIView):
    def get(self, request):
        serializer = MonthYearReportQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        return Response(reporte_financiero(mes=data["mes"], anio=data["anio"]))


class ReporteEventosAPIView(APIView):
    def get(self, request):
        serializer = DateRangeReportQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        return Response(reporte_eventos(desde=data["desde"], hasta=data["hasta"]))


class ReportePaquetesAPIView(APIView):
    def get(self, request):
        serializer = DateRangeReportQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        return Response(reporte_paquetes(desde=data["desde"], hasta=data["hasta"]))
