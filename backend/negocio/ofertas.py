"""Construcción y lectura de instantáneas históricas de la oferta aplicada."""

from copy import deepcopy
from decimal import Decimal

from .models import BeneficioPaquete


SNAPSHOT_VERSION = 1


def money(value):
    if value is None:
        return None
    return str(Decimal(value).quantize(Decimal("0.01")))


def valores_snapshot(value):
    if isinstance(value, Decimal):
        return money(value)
    if isinstance(value, list):
        return [valores_snapshot(item) for item in value]
    if isinstance(value, dict):
        return {
            clave: valores_snapshot(item)
            for clave, item in value.items()
        }
    return deepcopy(value)


def serializar_beneficio(beneficio):
    return {
        "id": beneficio.id,
        "tipo": beneficio.tipo,
        "tipo_display": beneficio.get_tipo_display(),
        "titulo": beneficio.titulo,
        "detalle": beneficio.detalle,
        "orden": beneficio.orden,
        "minimo_invitados": beneficio.minimo_invitados,
        "maximo_invitados": beneficio.maximo_invitados,
    }


def beneficios_comunes_activos():
    return list(
        BeneficioPaquete.objects.filter(paquete__isnull=True, activo=True).order_by(
            "orden", "id"
        )
    )


def beneficios_activos_paquete(paquete):
    cache = getattr(paquete, "_prefetched_objects_cache", {})
    if "beneficios" in cache:
        return sorted(
            [item for item in cache["beneficios"] if item.activo],
            key=lambda item: (item.orden, item.id),
        )
    return list(paquete.beneficios.filter(activo=True).order_by("orden", "id"))


def recomendar_paquetes(paquetes, preferencias=None):
    preferencias = preferencias or {}
    nivel = preferencias.get("nivel_experiencia", "equilibrado")
    entretenimiento = preferencias.get("entretenimiento", "indiferente")
    prioridad_categoria = {
        "esencial": ["estandar", "premium", "vip"],
        "equilibrado": ["premium", "estandar", "vip"],
        "completo": ["vip", "premium", "estandar"],
    }.get(nivel, ["premium", "estandar", "vip"])
    categoria_rank = {
        categoria: index for index, categoria in enumerate(prioridad_categoria)
    }

    def score(paquete):
        entertainment_bonus = 0
        if entretenimiento == "importante":
            textos = " ".join(
                f"{item.titulo} {item.detalle}".lower()
                for item in paquete.beneficios.all()
                if item.activo
            )
            entertainment_bonus = -1 if any(
                term in textos for term in ("dj", "música", "musical", "ceremonia")
            ) else 1
        return (
            entertainment_bonus,
            categoria_rank.get(paquete.categoria, len(categoria_rank)),
            0 if paquete.destacado else 1,
            paquete.orden,
            paquete.precio_por_persona,
            paquete.id,
        )

    return sorted(paquetes, key=score)[: min(3, len(paquetes))]


def serializar_paquete(paquete, *, numero_invitados=None, comunes=None):
    total_estimado = None
    if numero_invitados:
        total_estimado = paquete.precio_por_persona * Decimal(numero_invitados)
    return {
        "id": paquete.id,
        "nombre": paquete.nombre,
        "categoria": paquete.categoria,
        "categoria_display": paquete.get_categoria_display(),
        "orden": paquete.orden,
        "resumen_corto": paquete.resumen_corto,
        "etiqueta_comercial": paquete.etiqueta_comercial,
        "destacado": paquete.destacado,
        "precio_por_persona": money(paquete.precio_por_persona),
        "total_estimado": money(total_estimado),
        "beneficios": [
            serializar_beneficio(item) for item in beneficios_activos_paquete(paquete)
        ],
        "incluidos_en_todos": [
            serializar_beneficio(item)
            for item in (comunes if comunes is not None else beneficios_comunes_activos())
        ],
    }


def snapshot_paquete(
    paquete,
    *,
    numero_invitados,
    total_estimado,
    origen="operacion",
    comunes=None,
):
    return {
        "version": SNAPSHOT_VERSION,
        "origen": origen,
        "tipo_servicio": "servicio_completo",
        "numero_invitados": numero_invitados,
        "total_estimado": money(total_estimado),
        "paquete": serializar_paquete(
            paquete,
            numero_invitados=numero_invitados,
            comunes=comunes,
        ),
    }


def snapshot_catalogo_servicio_completo(
    calculo,
    *,
    numero_invitados,
    origen="operacion",
):
    """Conserva el catálogo ofrecido cuando el interesado aún no elige paquete."""
    return {
        "version": SNAPSHOT_VERSION,
        "origen": origen,
        "tipo_servicio": "servicio_completo",
        "numero_invitados": numero_invitados,
        "total_estimado": None,
        "catalogo": {
            "total_estimado_minimo": money(
                calculo.get("total_estimado_minimo")
            ),
            "incluidos_en_todos": deepcopy(
                calculo.get("incluidos_en_todos") or []
            ),
            "paquetes": deepcopy(calculo.get("paquetes") or []),
        },
    }


def snapshot_paquete_desde_oferta(
    oferta_snapshot,
    *,
    paquete,
    numero_invitados,
    total_estimado,
    origen,
    tipo_servicio="servicio_completo",
):
    """Actualiza cifras sin volver a leer nombre, precio o beneficios vigentes."""
    oferta_snapshot = oferta_snapshot or {}
    paquete_snapshot = oferta_snapshot.get("paquete") or {}
    if not paquete or paquete_snapshot.get("id") != paquete.id:
        return None

    snapshot = deepcopy(oferta_snapshot)
    snapshot.update(
        {
            "version": snapshot.get("version", SNAPSHOT_VERSION),
            "origen": origen,
            "tipo_servicio": tipo_servicio,
            "numero_invitados": numero_invitados,
            "total_estimado": money(total_estimado),
        }
    )
    precio = paquete_snapshot.get("precio_por_persona")
    if precio is not None:
        snapshot["paquete"]["total_estimado"] = money(
            Decimal(precio) * Decimal(numero_invitados)
        )
    return snapshot


def snapshot_alquiler(
    configuracion,
    *,
    numero_invitados,
    total_estimado,
    origen="operacion",
    parametros_disponibles=True,
    beneficios_principales=None,
):
    snapshot = {
        "version": SNAPSHOT_VERSION,
        "origen": origen,
        "tipo_servicio": "alquiler",
        "numero_invitados": numero_invitados,
        "total_estimado": money(total_estimado),
        "alquiler": {
            "parametros_disponibles": bool(configuracion and parametros_disponibles),
            "beneficios_principales": deepcopy(
                beneficios_principales
                if beneficios_principales is not None
                else [
                    serializar_beneficio(item)
                    for item in beneficios_comunes_activos()
                    if item.tipo == BeneficioPaquete.Tipo.PRINCIPAL
                ]
            ),
        },
    }
    if configuracion and parametros_disponibles:
        adicionales = max(
            numero_invitados - configuracion.invitados_incluidos_alquiler,
            0,
        )
        snapshot["alquiler"].update(
            {
                "configuracion_id": configuracion.id,
                "tarifa_base": money(configuracion.tarifa_base_alquiler),
                "invitados_incluidos": configuracion.invitados_incluidos_alquiler,
                "costo_invitado_adicional": money(
                    configuracion.costo_invitado_adicional
                ),
                "invitados_adicionales": adicionales,
                "costo_adicional": money(
                    Decimal(adicionales) * configuracion.costo_invitado_adicional
                ),
            }
        )
    return snapshot


def snapshot_alquiler_desde_oferta(
    oferta_snapshot,
    *,
    numero_invitados,
    total_estimado,
    origen="conversion",
):
    """Reutiliza las condiciones de alquiler cotizadas, sin consultar la configuración actual."""
    oferta_snapshot = oferta_snapshot or {}
    parametros = oferta_snapshot.get("alquiler")
    if not parametros:
        parametros = oferta_snapshot.get("alternativa_alquiler")
    if not parametros or not parametros.get("parametros_disponibles"):
        return None

    invitados_incluidos = parametros.get("invitados_incluidos")
    costo_invitado_adicional = parametros.get("costo_invitado_adicional")
    tarifa_base = parametros.get("tarifa_base")
    if (
        invitados_incluidos is None
        or costo_invitado_adicional is None
        or tarifa_base is None
    ):
        return None

    adicionales = max(numero_invitados - int(invitados_incluidos), 0)
    costo_adicional = Decimal(adicionales) * Decimal(costo_invitado_adicional)
    return {
        "version": SNAPSHOT_VERSION,
        "origen": origen,
        "tipo_servicio": "alquiler",
        "numero_invitados": numero_invitados,
        "total_estimado": money(total_estimado),
        "alquiler": {
            "parametros_disponibles": True,
            "configuracion_id": parametros.get("configuracion_id"),
            "tarifa_base": money(tarifa_base),
            "invitados_incluidos": int(invitados_incluidos),
            "costo_invitado_adicional": money(costo_invitado_adicional),
            "invitados_adicionales": adicionales,
            "costo_adicional": money(costo_adicional),
            "beneficios_principales": deepcopy(
                parametros.get("beneficios_principales") or []
            ),
        },
    }


def snapshot_no_estoy_seguro_desde_oferta(
    oferta_snapshot,
    *,
    paquete,
    numero_invitados,
    total_estimado,
    origen,
):
    oferta_snapshot = oferta_snapshot or {}
    paquete_snapshot = oferta_snapshot.get("paquete") or {}
    paquete_id = paquete.id if paquete else None
    if oferta_snapshot.get("tipo_servicio") != "no_estoy_seguro":
        return None
    if (paquete_snapshot.get("id") or None) != paquete_id:
        return None

    snapshot = deepcopy(oferta_snapshot)
    snapshot.update(
        {
            "version": snapshot.get("version", SNAPSHOT_VERSION),
            "origen": origen,
            "tipo_servicio": "no_estoy_seguro",
            "numero_invitados": numero_invitados,
            "total_estimado": money(total_estimado),
        }
    )
    if paquete_snapshot.get("precio_por_persona") is not None:
        snapshot["paquete"]["total_estimado"] = money(
            Decimal(paquete_snapshot["precio_por_persona"])
            * Decimal(numero_invitados)
        )
    alquiler = snapshot_alquiler_desde_oferta(
        oferta_snapshot,
        numero_invitados=numero_invitados,
        total_estimado=total_estimado,
        origen=origen,
    )
    if alquiler:
        snapshot["alternativa_alquiler"] = alquiler["alquiler"]
    return snapshot


def snapshot_no_estoy_seguro(
    *,
    numero_invitados,
    total_estimado,
    paquete=None,
    configuracion=None,
    preferencias=None,
    comparacion=None,
    origen="operacion",
):
    snapshot = {
        "version": SNAPSHOT_VERSION,
        "origen": origen,
        "tipo_servicio": "no_estoy_seguro",
        "numero_invitados": numero_invitados,
        "total_estimado": money(total_estimado),
        "preferencias": preferencias or {},
    }
    if comparacion:
        snapshot["comparacion"] = valores_snapshot(comparacion)
    if configuracion:
        snapshot["alternativa_alquiler"] = snapshot_alquiler(
            configuracion,
            numero_invitados=numero_invitados,
            total_estimado=total_estimado,
            origen=origen,
        )["alquiler"]
    if paquete:
        snapshot["paquete"] = serializar_paquete(
            paquete,
            numero_invitados=numero_invitados,
        )
    return snapshot


def nombre_paquete_snapshot(snapshot):
    return (snapshot or {}).get("paquete", {}).get("nombre", "")


def precio_paquete_snapshot(snapshot):
    return (snapshot or {}).get("paquete", {}).get("precio_por_persona")


def presentacion_paquete(*, tipo_servicio, snapshot, paquete=None):
    if tipo_servicio == "alquiler":
        return "Alquiler del local"
    nombre = nombre_paquete_snapshot(snapshot)
    if nombre:
        return nombre
    if paquete:
        return paquete.nombre
    if tipo_servicio == "servicio_completo" and (snapshot or {}).get("catalogo"):
        return "Por definir"
    if tipo_servicio == "no_estoy_seguro":
        return "Por definir"
    return "Requiere revisión"
