import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PreCotizacionResult } from './PreCotizacionResult'

const cotizacion = {
  id: 24,
  tipo_evento_nombre: 'Boda',
  fecha_tentativa: '2026-07-31',
  numero_invitados: 125,
  tipo_servicio: 'alquiler',
}

const whatsapp = {
  principal: {
    etiqueta: 'Continuar por WhatsApp',
    url: 'https://wa.me/593991234567?text=Nombre%3A%20Ana',
  },
}

const rentalCalculation = {
  tipo_servicio: 'alquiler',
  total_estimado: '1312.50',
  tarifa_base_alquiler: '1000.00',
  invitados_incluidos_alquiler: 100,
  invitados_adicionales: 25,
  costo_invitado_adicional: '12.50',
  costo_adicional: '312.50',
  beneficios_principales: [
    {
      id: 1,
      tipo: 'principal',
      titulo: 'Jardín iluminado',
      detalle: 'Entorno natural preparado.',
    },
    {
      id: 2,
      tipo: 'detalle',
      titulo: 'No es principal',
      detalle: 'No debe mostrarse en este bloque.',
    },
  ],
}

const serviceCalculation = {
  tipo_servicio: 'servicio_completo',
  incluidos_en_todos: [
    {
      id: 1,
      tipo: 'principal',
      titulo: 'Jardín iluminado',
      detalle: 'Entorno natural preparado.',
    },
  ],
  paquetes: [
    {
      id: 7,
      nombre: 'Premium',
      categoria: 'premium',
      categoria_display: 'Premium',
      resumen_corto: 'Menú y atención integral.',
      precio_por_persona: '20.00',
      total_estimado: '2500.00',
      beneficios: [],
    },
    {
      id: 8,
      nombre: 'VIP',
      categoria: 'vip',
      categoria_display: 'VIP',
      resumen_corto: 'Experiencia total.',
      precio_por_persona: '25.00',
      total_estimado: '3125.00',
      beneficios: [],
    },
  ],
}

function renderResult(calculo, type = calculo.tipo_servicio) {
  render(
    <PreCotizacionResult
      isSavingPreference={false}
      isStale={false}
      isSubmitting={false}
      onClearPackage={vi.fn()}
      onPackageConsult={vi.fn()}
      preferenceError=""
      result={{
        cotizacion: { ...cotizacion, tipo_servicio: type },
        calculo,
        whatsapp,
      }}
      selectedPackageId=""
    />,
  )
}

describe('PreCotizacionResult', () => {
  it('renderiza el banner horizontal con las cuatro elecciones del evento', () => {
    renderResult(rentalCalculation)

    expect(screen.getByText('Boda')).toBeInTheDocument()
    expect(screen.getByText('31/07/2026')).toBeInTheDocument()
    expect(screen.getByText('125 invitados')).toBeInTheDocument()
    expect(screen.getByText('Solo alquiler', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Tipo de evento')).toBeInTheDocument()
    expect(screen.getByText('Fecha tentativa')).toBeInTheDocument()
    expect(screen.getByText('Cantidad')).toBeInTheDocument()
    expect(screen.getByText('Modalidad elegida')).toBeInTheDocument()
  })

  it('renderiza solo alquiler con beneficios principales y desglose del backend', () => {
    renderResult(rentalCalculation)

    expect(screen.getByRole('heading', { name: 'Esta opción es ideal para ti' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Beneficios incluidos' })).toBeInTheDocument()
    expect(screen.getByText('Jardín iluminado')).toBeInTheDocument()
    expect(screen.queryByText('No es principal')).not.toBeInTheDocument()
    expect(screen.getByText('Invitados adicionales')).toBeInTheDocument()
    expect(screen.getByText('Valor por invitado adicional')).toBeInTheDocument()
    expect(screen.getByText('Subtotal adicional')).toBeInTheDocument()
  })

  it('muestra todos los paquetes de servicio completo y permite continuar sin elegir', () => {
    renderResult(serviceCalculation)

    expect(screen.getByRole('heading', {
      name: 'Nosotros nos encargamos, tú solo disfrutas',
    })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Premium' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'VIP' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Elegir este paquete' })).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'Continuar por WhatsApp' })).toBeInTheDocument()
  })

  it('ordena alquiler, beneficios comunes, servicio completo y CTA al comparar', () => {
    const comparison = {
      tipo_servicio: 'no_estoy_seguro',
      alquiler: rentalCalculation,
      servicio_completo: {
        incluidos_en_todos: serviceCalculation.incluidos_en_todos,
        categorias: [
          {
            categoria: 'premium',
            categoria_display: 'Premium',
            resumen: 'Menú y atención integral.',
            precio_por_persona_desde: '20.00',
            precio_por_persona_hasta: '25.00',
          },
        ],
      },
    }
    renderResult(comparison, 'no_estoy_seguro')

    const rental = screen.getByRole('heading', { name: 'Solo alquiler' })
    const benefits = screen.getByRole('heading', { name: 'Beneficios comunes' })
    const service = screen.getByRole('heading', { name: 'Servicio completo' })
    const cta = screen.getByRole('heading', { name: '¿Necesitas ayuda para elegir?' })

    expect(rental.compareDocumentPosition(benefits) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(benefits.compareDocumentPosition(service) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(service.compareDocumentPosition(cta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByText('Cualquier camino es posible para tu evento')).toBeInTheDocument()
  })

  it('mantiene la composición móvil completa sin errores de consola', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })

    renderResult(serviceCalculation)

    for (const label of ['Tipo de evento', 'Fecha tentativa', 'Cantidad', 'Modalidad elegida']) {
      expect(screen.getByText(label, { selector: 'span' })).toBeInTheDocument()
    }
    expect(document.body.scrollWidth).toBeLessThanOrEqual(window.innerWidth)
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
