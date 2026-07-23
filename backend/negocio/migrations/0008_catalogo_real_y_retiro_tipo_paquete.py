from decimal import Decimal

import negocio.validators
from django.db import migrations, models


COMUNES = [
    (
        "Local iluminado",
        "Espacio con capacidad de hasta 450 personas.",
    ),
    (
        "Espacios decorados",
        "Centros de mesa, luces de colores, giratorias, columpio y arco de entrada principal decorados.",
    ),
    ("Mesa de billar", ""),
    (
        "Menaje completo",
        "Sillas, mesas y mantelería para el evento.",
    ),
    (
        "Servicio de atención",
        "Meseros, vajilla y cristalería de acuerdo con el paquete.",
    ),
]


PAQUETES = [
    {
        "nombre": "Estándar $10",
        "precio": Decimal("10.00"),
        "categoria": "estandar",
        "orden": 1,
        "resumen": "Una propuesta esencial con plato fuerte, acompañamientos y bebida.",
        "etiqueta": "Esencial",
        "destacado": False,
        "items": [
            (
                "principal",
                "Plato fuerte con una proteína",
                "Cerdo o pollo con salsa de vino tinto, tamarindo, pasas o mango.",
                None,
            ),
            ("principal", "Arroz festivo sencillo", "", None),
            ("principal", "Ensalada de verduras", "", None),
            ("principal", "Gaseosa", "", None),
            (
                "condicion",
                "Decoración de mesa principal gratis",
                "Se incluye al alcanzar el mínimo indicado.",
                190,
            ),
        ],
    },
    {
        "nombre": "Estándar $13",
        "precio": Decimal("13.00"),
        "categoria": "estandar",
        "orden": 2,
        "resumen": "Más acompañamientos y bebidas para una celebración completa.",
        "etiqueta": "Estándar completo",
        "destacado": False,
        "items": [
            (
                "principal",
                "Plato fuerte con una proteína",
                "Cerdo o pollo con salsa de vino tinto, tamarindo, pasas o mango.",
                None,
            ),
            ("principal", "Arroz festivo medio", "", None),
            (
                "principal",
                "Ensalada a elección",
                "Ensalada de verduras o ensalada rusa.",
                None,
            ),
            ("principal", "Gaseosa, agua y brindis", "", None),
            (
                "condicion",
                "Decoración de mesa principal gratis",
                "Se incluye al alcanzar el mínimo indicado.",
                175,
            ),
        ],
    },
    {
        "nombre": "Premium $15",
        "precio": Decimal("15.00"),
        "categoria": "premium",
        "orden": 1,
        "resumen": "Menú ampliado con postre y DJ incluido.",
        "etiqueta": "Premium",
        "destacado": False,
        "items": [
            (
                "principal",
                "Plato fuerte con una proteína",
                "Cerdo, pollo o pescado con salsa a elección.",
                None,
            ),
            ("principal", "Arroz festivo completo", "", None),
            (
                "principal",
                "Ensalada a elección",
                "Verduras, rusa o frutas.",
                None,
            ),
            ("principal", "Gaseosa, agua y brindis", "", None),
            ("principal", "Postre", "", None),
            ("detalle", "DJ incluido", "", None),
            (
                "condicion",
                "Decoración de mesa principal gratis",
                "Se incluye al alcanzar el mínimo indicado.",
                150,
            ),
        ],
    },
    {
        "nombre": "Premium $18",
        "precio": Decimal("18.00"),
        "categoria": "premium",
        "orden": 2,
        "resumen": "Experiencia premium con bocaditos, torta, DJ y descorche.",
        "etiqueta": "Más elegido",
        "destacado": True,
        "items": [
            (
                "principal",
                "Plato fuerte con una proteína",
                "Cerdo, pollo, pescado o camarón con salsa a elección.",
                None,
            ),
            ("principal", "Arroz festivo completo", "", None),
            (
                "principal",
                "Ensalada a elección",
                "Verduras, rusa, frutas o macarrones.",
                None,
            ),
            ("principal", "Gaseosa, agua y brindis", "", None),
            ("principal", "Postre, bocaditos y torta", "", None),
            ("detalle", "DJ incluido", "", None),
            (
                "condicion",
                "Decoración principal y descorche gratis",
                "Puedes traer tus propias bebidas al alcanzar el mínimo indicado.",
                125,
            ),
        ],
    },
    {
        "nombre": "VIP $21",
        "precio": Decimal("21.00"),
        "categoria": "vip",
        "orden": 1,
        "resumen": "Doble proteína, estación de café y entretenimiento a elección.",
        "etiqueta": "VIP flexible",
        "destacado": False,
        "items": [
            (
                "principal",
                "Plato fuerte con doble proteína",
                "Cerdo, pollo, pescado o camarón con salsa a elección.",
                None,
            ),
            ("principal", "Arroz festivo completo", "", None),
            (
                "principal",
                "Ensalada a elección",
                "Verduras, rusa, frutas o macarrones.",
                None,
            ),
            ("principal", "Gaseosa, agua y brindis", "", None),
            (
                "principal",
                "Postre, bocaditos, torta y estación de café",
                "",
                None,
            ),
            (
                "detalle",
                "DJ y entretenimiento a elección",
                "Elige maestro de ceremonia o presentación musical en vivo.",
                None,
            ),
            (
                "condicion",
                "Decoración principal y descorche gratis",
                "Puedes traer tus propias bebidas al alcanzar el mínimo indicado.",
                100,
            ),
        ],
    },
    {
        "nombre": "VIP $23",
        "precio": Decimal("23.00"),
        "categoria": "vip",
        "orden": 2,
        "resumen": "La experiencia más completa con producción musical especial.",
        "etiqueta": "Experiencia total",
        "destacado": False,
        "items": [
            (
                "principal",
                "Plato fuerte con doble proteína",
                "Cerdo, pollo, pescado o camarón con salsa a elección.",
                None,
            ),
            ("principal", "Arroz festivo completo", "", None),
            (
                "principal",
                "Ensalada a elección",
                "Verduras, rusa, frutas o macarrones.",
                None,
            ),
            ("principal", "Gaseosa, agua y brindis", "", None),
            (
                "principal",
                "Postre, bocaditos, torta y estación de café",
                "",
                None,
            ),
            (
                "detalle",
                "DJ, maestro de ceremonia y música en vivo",
                "Incluye una presentación musical especial.",
                None,
            ),
            (
                "condicion",
                "Decoración principal y descorche gratis",
                "Puedes traer tus propias bebidas al alcanzar el mínimo indicado.",
                80,
            ),
        ],
    },
]


def cargar_catalogo_real(apps, schema_editor):
    Paquete = apps.get_model("negocio", "Paquete")
    Beneficio = apps.get_model("negocio", "BeneficioPaquete")
    Cotizacion = apps.get_model("comercial", "Cotizacion")
    Contrato = apps.get_model("financiero", "Contrato")

    # Una instalación limpia conserva la política del proyecto de no insertar
    # datos operativos automáticamente. El catálogo real se completa únicamente
    # cuando la instalación ya tenía paquetes administrados.
    if not Paquete.objects.exists():
        return

    alquileres = list(
        Paquete.objects.filter(tipo_servicio="alquiler").values_list("id", flat=True)
    )
    if alquileres:
        Cotizacion.objects.filter(paquete_id__in=alquileres).update(paquete=None)
        Contrato.objects.filter(paquete_id__in=alquileres).update(paquete=None)
        Paquete.objects.filter(id__in=alquileres).delete()

    oficiales = set()
    for definicion in PAQUETES:
        paquete = (
            Paquete.objects.filter(
                tipo_servicio="servicio_completo",
                precio_por_persona=definicion["precio"],
            )
            .order_by("-activo", "id")
            .first()
        )
        if paquete is None:
            paquete = Paquete.objects.create(
                nombre=definicion["nombre"],
                tipo_servicio="servicio_completo",
                precio_por_persona=definicion["precio"],
                descripcion="",
                activo=True,
            )
        paquete.nombre = definicion["nombre"]
        paquete.categoria = definicion["categoria"]
        paquete.orden = definicion["orden"]
        paquete.resumen_corto = definicion["resumen"]
        paquete.etiqueta_comercial = definicion["etiqueta"]
        paquete.destacado = definicion["destacado"]
        paquete.activo = True
        paquete.save(
            update_fields=[
                "nombre",
                "categoria",
                "orden",
                "resumen_corto",
                "etiqueta_comercial",
                "destacado",
                "activo",
            ]
        )
        oficiales.add(paquete.id)
        Beneficio.objects.filter(paquete=paquete).delete()
        for orden, (tipo, titulo, detalle, minimo) in enumerate(
            definicion["items"],
            start=1,
        ):
            Beneficio.objects.create(
                paquete=paquete,
                tipo=tipo,
                titulo=titulo,
                detalle=detalle,
                orden=orden,
                minimo_invitados=minimo,
                activo=True,
            )

    for paquete in Paquete.objects.filter(
        tipo_servicio="servicio_completo"
    ).exclude(id__in=oficiales):
        if paquete.precio_por_persona <= 0:
            paquete.precio_por_persona = Decimal("0.01")
            paquete.activo = False
            paquete.etiqueta_comercial = "Requiere revisión"
        if paquete.precio_por_persona < 15:
            paquete.categoria = "estandar"
        elif paquete.precio_por_persona < 21:
            paquete.categoria = "premium"
        else:
            paquete.categoria = "vip"
        paquete.orden = max(paquete.orden, 90)
        if not paquete.resumen_corto:
            paquete.resumen_corto = (paquete.descripcion or "").replace("\n", " ")[:240]
        paquete.save(
            update_fields=[
                "precio_por_persona",
                "activo",
                "etiqueta_comercial",
                "categoria",
                "orden",
                "resumen_corto",
            ]
        )
        if paquete.descripcion and not Beneficio.objects.filter(paquete=paquete).exists():
            Beneficio.objects.create(
                paquete=paquete,
                tipo="detalle",
                titulo="Información del paquete",
                detalle=paquete.descripcion[:300],
                orden=1,
                activo=True,
            )

    Beneficio.objects.filter(paquete__isnull=True).delete()
    for orden, (titulo, detalle) in enumerate(COMUNES, start=1):
        Beneficio.objects.create(
            paquete=None,
            tipo="principal",
            titulo=titulo,
            detalle=detalle,
            orden=orden,
            activo=True,
        )


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ("negocio", "0007_estructura_oferta_paquetes"),
        ("comercial", "0006_oferta_historica_y_tipo_servicio"),
        ("financiero", "0006_tipo_servicio_y_oferta_historica"),
    ]

    operations = [
        migrations.RunPython(
            cargar_catalogo_real,
            migrations.RunPython.noop,
            atomic=True,
        ),
        migrations.RemoveConstraint(
            model_name="paquete",
            name="paquete_precio_por_persona_no_negativo",
        ),
        migrations.RemoveField(
            model_name="paquete",
            name="descripcion",
        ),
        migrations.RemoveField(
            model_name="paquete",
            name="tipo_servicio",
        ),
        migrations.AlterModelOptions(
            name="paquete",
            options={
                "ordering": [
                    "categoria",
                    "orden",
                    "precio_por_persona",
                    "nombre",
                ]
            },
        ),
        migrations.AlterField(
            model_name="paquete",
            name="precio_por_persona",
            field=models.DecimalField(
                decimal_places=2,
                max_digits=12,
                validators=[negocio.validators.validate_non_negative],
            ),
        ),
        migrations.AddConstraint(
            model_name="paquete",
            constraint=models.CheckConstraint(
                condition=models.Q(("precio_por_persona__gt", 0)),
                name="paquete_precio_por_persona_positivo",
            ),
        ),
    ]
