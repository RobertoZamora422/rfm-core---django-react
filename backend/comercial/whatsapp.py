"""Mensajes contextuales de WhatsApp para solicitudes públicas."""

from decimal import Decimal
from urllib.parse import quote


MODALIDADES = {
    "alquiler": "Solo alquiler",
    "servicio_completo": "Servicio completo",
    "no_estoy_seguro": "No estoy seguro",
}


def _money(value):
    if value is None:
        return None
    return f"${Decimal(value).quantize(Decimal('0.01'))}"


def _url(numero, mensaje):
    if not numero:
        return None
    return f"https://wa.me/{numero}?text={quote(mensaje, safe='')}"


def _accion(*, etiqueta, lineas, numero):
    mensaje = "\n".join(linea for linea in lineas if linea)
    return {
        "etiqueta": etiqueta,
        "mensaje": mensaje,
        "url": _url(numero, mensaje),
    }


def _lineas_base(cotizacion, configuracion):
    nombre_negocio = configuracion.nombre_negocio if configuracion else "Rancho Flor María"
    return [
        f"Hola, vengo de la pre-cotización web de {nombre_negocio}.",
        f"Pre-cotización: #{cotizacion.id}",
        f"Nombre: {cotizacion.persona.nombre}",
        f"Evento: {cotizacion.tipo_evento.nombre}",
        f"Fecha tentativa: {cotizacion.fecha_tentativa.strftime('%d/%m/%Y')}",
        f"Invitados: {cotizacion.numero_invitados}",
        f"Modalidad de interés: {MODALIDADES.get(cotizacion.tipo_servicio, cotizacion.tipo_servicio)}",
    ]


def construir_acciones_whatsapp(cotizacion, calculo, configuracion):
    numero = configuracion.whatsapp_numero_url if configuracion else ""
    base = _lineas_base(cotizacion, configuracion)
    respuesta = {
        "disponible": bool(numero),
        "principal": None,
        "paquetes": [],
        "alternativas": {},
    }

    if cotizacion.tipo_servicio == "alquiler":
        respuesta["principal"] = _accion(
            etiqueta="Continuar por WhatsApp",
            lineas=[
                *base,
                f"Valor estimado: {_money(calculo.get('total_estimado'))}",
                "Deseo confirmar disponibilidad y conocer las condiciones del alquiler.",
            ],
            numero=numero,
        )
        return respuesta

    if cotizacion.tipo_servicio == "servicio_completo":
        paquete_seleccionado = calculo.get("paquete_seleccionado") or {}
        preferencia = (
            [
                f"Paquete preferido: {paquete_seleccionado.get('nombre')}",
                f"Estimación del paquete: {_money(paquete_seleccionado.get('total_estimado'))}",
            ]
            if paquete_seleccionado.get("nombre")
            else ["Aún no he elegido un paquete."]
        )
        respuesta["principal"] = _accion(
            etiqueta="Continuar por WhatsApp",
            lineas=[
                *base,
                *preferencia,
                "Quisiera orientación para personalizar mi evento.",
            ],
            numero=numero,
        )
        respuesta["paquetes"] = [
            {
                "paquete_id": paquete["id"],
                **_accion(
                    etiqueta="Consultar este paquete",
                    lineas=[
                        *base,
                        f"Paquete de interés: {paquete['nombre']}",
                        f"Total estimado: {_money(paquete.get('total_estimado'))}",
                        "Deseo confirmar detalles y disponibilidad de esta opción.",
                    ],
                    numero=numero,
                ),
            }
            for paquete in calculo.get("paquetes", [])
        ]
        return respuesta

    respuesta["principal"] = _accion(
        etiqueta="Continuar por WhatsApp",
        lineas=[
            *base,
            "Quisiera orientación para elegir y personalizar la mejor opción para mi evento.",
        ],
        numero=numero,
    )
    respuesta["alternativas"] = {
        "alquiler": _accion(
            etiqueta="Quiero consultar el alquiler",
            lineas=[
                *base,
                "Quiero conocer mejor la opción de solo alquiler.",
                f"Estimación de alquiler: {_money(calculo.get('alquiler', {}).get('total_estimado'))}",
            ],
            numero=numero,
        ),
        "servicio_completo": _accion(
            etiqueta="Quiero conocer los paquetes",
            lineas=[
                *base,
                "Quiero conocer las opciones de servicio completo.",
            ],
            numero=numero,
        ),
    }
    return respuesta
