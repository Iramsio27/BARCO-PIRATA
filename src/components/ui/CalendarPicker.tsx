import { useState, useEffect, useCallback } from 'react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, format, isSameMonth,
  isBefore, startOfDay, isSameDay, parse,
} from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, X, CalendarDays } from 'lucide-react'
import { clsx } from 'clsx'
import { useTranslation } from 'react-i18next'
import { MAX_ADVANCE_DAYS } from '@constants/index'

interface CalendarPickerProps {
  value: string | null          // 'yyyy-MM-dd'
  onChange: (iso: string) => void
  closedWeekday?: number        // 0=dom … 6=sáb
  isOpen: boolean
  onClose: () => void
}

export function CalendarPicker({
  value,
  onChange,
  closedWeekday = 1,
  isOpen,
  onClose,
}: CalendarPickerProps) {
  const { i18n } = useTranslation()
  const dfLocale  = i18n.resolvedLanguage === 'en' ? enUS : es

  const today   = startOfDay(new Date())
  const maxDate = addDays(today, MAX_ADVANCE_DAYS)

  const initialMonth = value
    ? startOfMonth(parse(value, 'yyyy-MM-dd', new Date()))
    : startOfMonth(today)

  const [viewMonth, setViewMonth] = useState(initialMonth)

  // Sincroniza el mes visible si el valor externo cambia mientras está cerrado
  useEffect(() => {
    if (value) {
      setViewMonth(startOfMonth(parse(value, 'yyyy-MM-dd', new Date())))
    }
  }, [value, isOpen])

  const handleSelect = useCallback((date: Date) => {
    onChange(format(date, 'yyyy-MM-dd'))
    onClose()
  }, [onChange, onClose])

  // Cierra con Escape
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // ─── Construir grilla del mes ─────────────────────────────────────────
  const monthStart = startOfMonth(viewMonth)
  const monthEnd   = endOfMonth(viewMonth)
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 1 }) // lunes primero
  const gridEnd    = endOfWeek(monthEnd,   { weekStartsOn: 1 })

  const cells: Date[] = []
  let cur = gridStart
  while (cur <= gridEnd) { cells.push(cur); cur = addDays(cur, 1) }

  const canPrev = isBefore(today, monthStart) || isSameDay(today, monthStart)
    ? false
    : true
  // Solo permite retroceder si el mes anterior aún tiene días futuros
  const prevMonth = subMonths(viewMonth, 1)
  const prevOk    = endOfMonth(prevMonth) >= today

  const nextOk    = startOfMonth(addMonths(viewMonth, 1)) <= maxDate

  const weekdays = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

  return (
    /* ── Backdrop ── */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Blur/oscuro */}
      <div className="absolute inset-0 bg-navy-950/70 backdrop-blur-sm" />

      {/* ── Panel del calendario ── */}
      <div
        className="relative z-10 w-full max-w-sm animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Borde dorado con gradiente */}
        <div className="rounded-2xl bg-gold-gradient p-[2px] shadow-modal">
          <div className="rounded-2xl bg-navy-900 overflow-hidden">

            {/* ── Cabecera ── */}
            <div className="bg-wave-gradient px-5 pt-5 pb-4">
              {/* Título + cierre */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-gold-400" />
                  <span className="font-display text-gold-400 text-sm font-bold tracking-widest uppercase">
                    Seleccionar Fecha
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-navy-300 hover:text-gold-400 hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Navegación mes */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => prevOk && setViewMonth(subMonths(viewMonth, 1))}
                  disabled={!prevOk}
                  className="p-2 rounded-xl border border-white/20 text-white hover:border-gold-400 hover:text-gold-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="font-display font-bold text-white tracking-wider capitalize">
                  {format(viewMonth, 'MMMM yyyy', { locale: dfLocale })}
                </span>

                <button
                  type="button"
                  onClick={() => nextOk && setViewMonth(addMonths(viewMonth, 1))}
                  disabled={!nextOk}
                  className="p-2 rounded-xl border border-white/20 text-white hover:border-gold-400 hover:text-gold-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── Cuerpo del calendario ── */}
            <div className="px-4 pb-5 pt-3">

              {/* Nombres de día */}
              <div className="grid grid-cols-7 mb-1">
                {weekdays.map((d) => (
                  <div
                    key={d}
                    className="text-center text-[10px] font-bold text-gold-500 tracking-widest py-1"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Celdas */}
              <div className="grid grid-cols-7 gap-y-1">
                {cells.map((d) => {
                  const iso         = format(d, 'yyyy-MM-dd')
                  const inMonth     = isSameMonth(d, viewMonth)
                  const isPast      = isBefore(d, today)
                  const isOverMax   = d > maxDate
                  const isClosed    = d.getDay() === closedWeekday
                  const isDisabled  = isPast || isOverMax || isClosed || !inMonth
                  const isSelected  = value === iso
                  const isToday     = isSameDay(d, today)

                  return (
                    <button
                      key={iso}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => !isDisabled && handleSelect(d)}
                      className={clsx(
                        'relative mx-auto flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold transition-all',
                        // Seleccionado
                        isSelected && inMonth &&
                          'bg-gold-gradient text-navy-900 shadow-gold scale-110 font-bold',
                        // Hoy (no seleccionado)
                        isToday && !isSelected &&
                          'border border-gold-400 text-gold-400',
                        // Disponible normal
                        !isSelected && !isDisabled &&
                          'text-white hover:bg-white/10 hover:text-gold-300',
                        // Fuera del mes
                        !inMonth &&
                          'opacity-0 pointer-events-none',
                        // Deshabilitado (pasado / cerrado / fuera de rango)
                        isDisabled && inMonth &&
                          'text-navy-600 cursor-not-allowed',
                        // Cerrado (lunes) con tachado
                        isClosed && inMonth &&
                          'line-through text-pirate-800',
                      )}
                    >
                      {format(d, 'd')}
                      {/* Punto indicador "hoy" */}
                      {isToday && !isSelected && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gold-400" />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Leyenda */}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/10">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-gold-400 shadow-gold" />
                  <span className="text-[10px] text-navy-400">Hoy</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xl bg-gold-gradient" />
                  <span className="text-[10px] text-navy-400">Seleccionado</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-pirate-800 line-through font-semibold">L</span>
                  <span className="text-[10px] text-navy-400">Cerrado</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
