from datetime import date, timedelta
from decimal import Decimal

from comercial.models import Cotizacion
from financiero.models import Contrato, CostoDirecto, GastoFijoMensual
from negocio.models import Cliente, ConfiguracionNegocio, Paquete, TipoEvento


BASE_TIPOS_EVENTO = [
    ("Boda", "Celebración matrimonial."),
    ("Quinceañera", "Evento social de quince años."),
    ("Cumpleaños", "Celebración familiar o social."),
    ("Evento corporativo", "Evento empresarial o institucional."),
    ("Bautizo", "Celebración religiosa y familiar."),
]

BASE_PAQUETES = [
    {
        "nombre": "Alquiler del local",
        "tipo_servicio": Paquete.TipoServicio.ALQUILER,
        "precio_por_persona": Decimal("0.00"),
        "descripcion": "Uso del salón de eventos sin servicio integral por persona.",
    },
    {
        "nombre": "Servicio completo estándar",
        "tipo_servicio": Paquete.TipoServicio.SERVICIO_COMPLETO,
        "precio_por_persona": Decimal("28.00"),
        "descripcion": "Servicio completo referencial para eventos sociales.",
    },
    {
        "nombre": "Servicio completo premium",
        "tipo_servicio": Paquete.TipoServicio.SERVICIO_COMPLETO,
        "precio_por_persona": Decimal("38.00"),
        "descripcion": "Servicio completo referencial con mayor cobertura.",
    },
]


def seed_base_data():
    counts = {
        "tipos_evento": 0,
        "paquetes": 0,
        "configuraciones": 0,
    }

    for nombre, descripcion in BASE_TIPOS_EVENTO:
        _, created = TipoEvento.objects.update_or_create(
            nombre=nombre,
            defaults={"descripcion": descripcion, "activo": True},
        )
        counts["tipos_evento"] += int(created)

    for paquete in BASE_PAQUETES:
        _, created = Paquete.objects.update_or_create(
            nombre=paquete["nombre"],
            defaults={
                "tipo_servicio": paquete["tipo_servicio"],
                "precio_por_persona": paquete["precio_por_persona"],
                "descripcion": paquete["descripcion"],
                "activo": True,
            },
        )
        counts["paquetes"] += int(created)

    configuracion = ConfiguracionNegocio.objects.filter(activo=True).first()
    defaults = {
        "nombre_negocio": "Rancho Flor María",
        "tarifa_base_alquiler": Decimal("1200.00"),
        "invitados_incluidos_alquiler": 80,
        "costo_invitado_adicional": Decimal("12.00"),
        "capacidad_maxima": 250,
        "activo": True,
    }
    if configuracion:
        for field, value in defaults.items():
            setattr(configuracion, field, value)
        configuracion.save()
    else:
        ConfiguracionNegocio.objects.create(**defaults)
        counts["configuraciones"] += 1

    return counts


def clear_demo_data():
    counts = {
        "costos_directos": CostoDirecto.objects.filter(es_demo=True).count(),
        "contratos": Contrato.objects.filter(es_demo=True).count(),
        "cotizaciones": Cotizacion.objects.filter(es_demo=True).count(),
        "gastos_fijos": GastoFijoMensual.objects.filter(es_demo=True).count(),
        "clientes": Cliente.objects.filter(es_demo=True).count(),
    }

    CostoDirecto.objects.filter(es_demo=True).delete()
    Contrato.objects.filter(es_demo=True).delete()
    Cotizacion.objects.filter(es_demo=True).delete()
    GastoFijoMensual.objects.filter(es_demo=True).delete()
    Cliente.objects.filter(es_demo=True).delete()

    return counts


def seed_demo_data():
    seed_base_data()
    clear_demo_data()

    today = date.today()
    boda = TipoEvento.objects.get(nombre="Boda")
    cumpleanos = TipoEvento.objects.get(nombre="Cumpleaños")
    corporativo = TipoEvento.objects.get(nombre="Evento corporativo")
    alquiler = Paquete.objects.get(nombre="Alquiler del local")
    estandar = Paquete.objects.get(nombre="Servicio completo estándar")
    premium = Paquete.objects.get(nombre="Servicio completo premium")

    cliente_1 = Cliente.objects.create(
        nombre="Cliente Demo Boda",
        telefono="+593 987654321",
        correo="boda.demo@example.com",
        observaciones="Registro demo para flujo comercial.",
        es_demo=True,
    )
    cliente_2 = Cliente.objects.create(
        nombre="Cliente Demo Corporativo",
        telefono="+593 987654322",
        correo="corporativo.demo@example.com",
        observaciones="Registro demo para contrato confirmado.",
        es_demo=True,
    )
    cliente_3 = Cliente.objects.create(
        nombre="Cliente Demo Cumpleaños",
        telefono="+593 987654323",
        correo="cumple.demo@example.com",
        observaciones="Registro demo para cotización descartada.",
        es_demo=True,
    )

    cotizacion_1 = Cotizacion.objects.create(
        cliente=cliente_1,
        tipo_evento=boda,
        paquete=premium,
        fecha_tentativa=today + timedelta(days=45),
        numero_invitados=120,
        tipo_servicio=Paquete.TipoServicio.SERVICIO_COMPLETO,
        estado=Cotizacion.Estado.CONFIRMADA,
        total_estimado=Decimal("4560.00"),
        observaciones="Cotización demo confirmada.",
        es_demo=True,
    )
    cotizacion_2 = Cotizacion.objects.create(
        cliente=cliente_2,
        tipo_evento=corporativo,
        paquete=alquiler,
        fecha_tentativa=today + timedelta(days=20),
        numero_invitados=90,
        tipo_servicio=Paquete.TipoServicio.ALQUILER,
        estado=Cotizacion.Estado.CONVERTIDA,
        total_estimado=Decimal("1320.00"),
        observaciones="Cotización demo convertida.",
        es_demo=True,
    )
    Cotizacion.objects.create(
        cliente=cliente_3,
        tipo_evento=cumpleanos,
        paquete=estandar,
        fecha_tentativa=today + timedelta(days=70),
        numero_invitados=60,
        tipo_servicio=Paquete.TipoServicio.SERVICIO_COMPLETO,
        estado=Cotizacion.Estado.DESCARTADA,
        total_estimado=Decimal("1680.00"),
        observaciones="Cotización demo descartada.",
        es_demo=True,
    )

    contrato_1 = Contrato.objects.create(
        cotizacion=cotizacion_1,
        cliente=cliente_1,
        tipo_evento=boda,
        paquete=premium,
        fecha_evento=today + timedelta(days=45),
        numero_invitados=120,
        valor_final=Decimal("4560.00"),
        monto_abonado=Decimal("1500.00"),
        estado_contrato=Contrato.EstadoContrato.CONFIRMADO,
        observaciones="Contrato demo con abono parcial.",
        es_demo=True,
    )
    contrato_2 = Contrato.objects.create(
        cotizacion=cotizacion_2,
        cliente=cliente_2,
        tipo_evento=corporativo,
        paquete=alquiler,
        fecha_evento=today + timedelta(days=20),
        numero_invitados=90,
        valor_final=Decimal("1320.00"),
        monto_abonado=Decimal("1320.00"),
        estado_contrato=Contrato.EstadoContrato.CONFIRMADO,
        observaciones="Contrato demo pagado.",
        es_demo=True,
    )

    CostoDirecto.objects.bulk_create(
        [
            CostoDirecto(
                contrato=contrato_1,
                concepto="Catering demo",
                valor=Decimal("1850.00"),
                fecha=contrato_1.fecha_evento,
                observaciones="Costo directo demo.",
                es_demo=True,
            ),
            CostoDirecto(
                contrato=contrato_1,
                concepto="Decoración demo",
                valor=Decimal("600.00"),
                fecha=contrato_1.fecha_evento,
                observaciones="Costo directo demo.",
                es_demo=True,
            ),
            CostoDirecto(
                contrato=contrato_2,
                concepto="Limpieza demo",
                valor=Decimal("180.00"),
                fecha=contrato_2.fecha_evento,
                observaciones="Costo directo demo.",
                es_demo=True,
            ),
        ]
    )

    GastoFijoMensual.objects.bulk_create(
        [
            GastoFijoMensual(
                concepto="Servicios básicos demo",
                valor=Decimal("320.00"),
                mes=today.month,
                anio=today.year,
                observaciones="Gasto fijo demo.",
                es_demo=True,
            ),
            GastoFijoMensual(
                concepto="Mantenimiento demo",
                valor=Decimal("450.00"),
                mes=today.month,
                anio=today.year,
                observaciones="Gasto fijo demo.",
                es_demo=True,
            ),
        ]
    )

    return {
        "clientes": 3,
        "cotizaciones": 3,
        "contratos": 2,
        "costos_directos": 3,
        "gastos_fijos": 2,
    }
