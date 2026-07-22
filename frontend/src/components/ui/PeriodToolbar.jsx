import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { getCurrentPeriodValue, getPeriodLabel, shiftPeriod } from '../../utils/periods'
import { Button } from './Button'
import { Card } from './Card'
import { Input } from './Input'

export function PeriodToolbar({ id, label = 'Periodo', onChange, value }) {
  const handleStep = (delta) => onChange(shiftPeriod(value, delta))

  return (
    <Card className="period-toolbar">
      <div className="period-toolbar__intro">
        <span>{label}</span>
        <strong aria-live="polite">{getPeriodLabel(value)}</strong>
      </div>
      <div className="period-toolbar__navigation" aria-label={`Cambiar ${label.toLowerCase()}`}>
        <Input
          icon={CalendarDays}
          id={id}
          label="Mes y año"
          onChange={(event) => {
            if (event.target.value) onChange(event.target.value)
          }}
          required
          type="month"
          value={value}
        />
        <div className="period-toolbar__steps">
          <Button aria-label="Ver mes anterior" icon={ChevronLeft} onClick={() => handleStep(-1)} variant="ghost">
            Anterior
          </Button>
          <Button icon={CalendarDays} onClick={() => onChange(getCurrentPeriodValue())} variant="secondary">
            Mes actual
          </Button>
          <Button aria-label="Ver mes siguiente" icon={ChevronRight} onClick={() => handleStep(1)} variant="ghost">
            Siguiente
          </Button>
        </div>
      </div>
    </Card>
  )
}
