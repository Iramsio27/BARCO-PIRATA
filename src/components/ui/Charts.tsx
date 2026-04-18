import { useMemo } from 'react'
import { clsx } from 'clsx'
import { useAdminTheme } from '@app/providers/AdminThemeProvider'

// ════════════════════════════════════════════════════════════════════════
//   Paleta de colores sensible al tema
// ════════════════════════════════════════════════════════════════════════
function useChartColors() {
  const { resolvedTheme } = useAdminTheme()
  return resolvedTheme === 'dark'
    ? {
        axis:   '#64748b',
        grid:   'rgba(255,255,255,0.08)',
        text:   '#cbd5e1',
        bar:    '#F7C948',
        barAlt: '#F0B429',
        line:   '#F7C948',
        area:   'rgba(247,201,72,0.20)',
        accent: '#F7C948',
      }
    : {
        axis:   '#94a3b8',
        grid:   'rgba(13,32,64,0.08)',
        text:   '#475569',
        bar:    '#F0B429',
        barAlt: '#DE911D',
        line:   '#0D2040',
        area:   'rgba(13,32,64,0.10)',
        accent: '#F0B429',
      }
}

// ════════════════════════════════════════════════════════════════════════
//   BarChart
// ════════════════════════════════════════════════════════════════════════

export interface BarChartProps {
  data: Array<{ label: string; value: number; sublabel?: string }>
  /** Formateador del valor para mostrar arriba de cada barra */
  valueFormatter?: (v: number) => string
  height?: number
  className?: string
  /** Número de líneas horizontales de la cuadrícula */
  gridLines?: number
}

export function BarChart({
  data,
  valueFormatter = (v) => String(v),
  height = 280,
  className,
  gridLines = 4,
}: BarChartProps) {
  const colors = useChartColors()

  const { max, barWidth, gap } = useMemo(() => {
    const maxVal = Math.max(1, ...data.map((d) => d.value))
    // Redondea hacia arriba al múltiplo "bonito" más cercano
    const niceMax = niceCeil(maxVal)
    const count = data.length
    const innerW = 100
    const gap = count > 0 ? Math.max(1, Math.min(4, 100 / count / 3)) : 1
    const barW = count > 0 ? (innerW - gap * (count + 1)) / count : 0
    return { max: niceMax, barWidth: barW, gap }
  }, [data])

  if (!data.length) {
    return (
      <div
        className={clsx('flex items-center justify-center rounded-xl admin-surface border admin-border', className)}
        style={{ height }}
      >
        <p className="text-sm admin-text-muted">Sin datos en el período seleccionado</p>
      </div>
    )
  }

  return (
    <div className={clsx('w-full', className)} style={{ height }}>
      <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="w-full h-[85%]" aria-hidden>
        {/* Grid horizontal */}
        {Array.from({ length: gridLines }).map((_, i) => {
          const y = 60 - (i / (gridLines - 1)) * 58 - 1
          return (
            <line
              key={i}
              x1={0} x2={100}
              y1={y} y2={y}
              stroke={colors.grid}
              strokeWidth={0.15}
            />
          )
        })}
        {/* Barras */}
        {data.map((d, i) => {
          const ratio  = d.value / max
          const barH   = ratio * 58
          const x      = gap + i * (barWidth + gap)
          const y      = 60 - barH - 1
          return (
            <g key={`${d.label}-${i}`}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={0.5}
                fill={colors.bar}
                opacity={0.95}
              >
                <title>{`${d.label}: ${valueFormatter(d.value)}`}</title>
              </rect>
            </g>
          )
        })}
      </svg>
      {/* Etiquetas X */}
      <div className="w-full grid gap-1 mt-2" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
        {data.map((d, i) => (
          <div key={`${d.label}-${i}-lbl`} className="text-[10px] text-center admin-text-muted truncate" title={d.label}>
            <div className="font-semibold admin-text-body">{valueFormatter(d.value)}</div>
            <div>{d.label}</div>
            {d.sublabel && <div className="admin-text-subtle">{d.sublabel}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════
//   LineChart / AreaChart
// ════════════════════════════════════════════════════════════════════════

export interface LineChartProps {
  data: Array<{ label: string; value: number }>
  valueFormatter?: (v: number) => string
  height?: number
  className?: string
  /** Rellena el área debajo de la línea */
  area?: boolean
}

export function LineChart({
  data,
  valueFormatter = (v) => String(v),
  height = 280,
  className,
  area = true,
}: LineChartProps) {
  const colors = useChartColors()

  if (!data.length) {
    return (
      <div
        className={clsx('flex items-center justify-center rounded-xl admin-surface border admin-border', className)}
        style={{ height }}
      >
        <p className="text-sm admin-text-muted">Sin datos en el período seleccionado</p>
      </div>
    )
  }

  const max = niceCeil(Math.max(1, ...data.map((d) => d.value)))
  const step = data.length > 1 ? 100 / (data.length - 1) : 0
  const points = data.map((d, i) => {
    const x = data.length === 1 ? 50 : i * step
    const y = 60 - (d.value / max) * 58 - 1
    return { x, y, value: d.value, label: d.label }
  })

  const pathLine = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const pathArea = `${pathLine} L ${points[points.length - 1].x} 60 L ${points[0].x} 60 Z`

  return (
    <div className={clsx('w-full', className)} style={{ height }}>
      <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="w-full h-[85%]" aria-hidden>
        {[0, 1, 2, 3].map((i) => {
          const y = 60 - (i / 3) * 58 - 1
          return <line key={i} x1={0} x2={100} y1={y} y2={y} stroke={colors.grid} strokeWidth={0.15} />
        })}
        {area && points.length > 1 && (
          <path d={pathArea} fill={colors.area} />
        )}
        <path d={pathLine} fill="none" stroke={colors.line} strokeWidth={0.6} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p) => (
          <circle key={`${p.label}-${p.x}`} cx={p.x} cy={p.y} r={0.9} fill={colors.accent}>
            <title>{`${p.label}: ${valueFormatter(p.value)}`}</title>
          </circle>
        ))}
      </svg>
      <div className="w-full grid gap-1 mt-2" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
        {data.map((d, i) => (
          <div key={`${d.label}-${i}-lbl`} className="text-[10px] text-center admin-text-muted truncate" title={d.label}>
            <div className="font-semibold admin-text-body">{valueFormatter(d.value)}</div>
            <div>{d.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════
//   DonutChart — distribución (por paquete o método de pago)
// ════════════════════════════════════════════════════════════════════════

export interface DonutChartProps {
  data: Array<{ label: string; value: number; color?: string; icon?: string }>
  valueFormatter?: (v: number) => string
  centerValue?: string
  centerLabel?: string
  className?: string
  size?: number
}

const DEFAULT_DONUT_COLORS = [
  '#F0B429', // gold-500
  '#0D2040', // navy-900
  '#DC2626', // pirate-500
  '#2A5E9E', // navy-500
  '#F7C948', // gold-400
  '#94A3B8', // slate-400
]

export function DonutChart({
  data,
  valueFormatter = (v) => String(v),
  centerValue,
  centerLabel,
  className,
  size = 180,
}: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0)

  if (!total) {
    return (
      <div
        className={clsx('flex items-center justify-center rounded-xl admin-surface border admin-border', className)}
        style={{ height: size + 40 }}
      >
        <p className="text-sm admin-text-muted">Sin datos</p>
      </div>
    )
  }

  const radius = 40
  const circumference = 2 * Math.PI * radius
  let offset = 0

  const segments = data.map((d, i) => {
    const pct = d.value / total
    const dash = pct * circumference
    const seg = {
      ...d,
      color: d.color ?? DEFAULT_DONUT_COLORS[i % DEFAULT_DONUT_COLORS.length],
      pct,
      dash,
      offset: -offset,
    }
    offset += dash
    return seg
  })

  return (
    <div className={clsx('flex flex-col sm:flex-row items-center gap-6', className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx={50} cy={50} r={radius} fill="none" stroke="currentColor" strokeWidth={14} className="admin-text-subtle opacity-20" />
          {segments.map((s, i) => (
            <circle
              key={`${s.label}-${i}`}
              cx={50} cy={50} r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={14}
              strokeDasharray={`${s.dash} ${circumference - s.dash}`}
              strokeDashoffset={s.offset}
              strokeLinecap="butt"
            >
              <title>{`${s.label}: ${valueFormatter(s.value)} (${Math.round(s.pct * 100)}%)`}</title>
            </circle>
          ))}
        </svg>
        {(centerValue || centerLabel) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {centerValue && <span className="text-2xl font-bold admin-text-title">{centerValue}</span>}
            {centerLabel && <span className="text-xs admin-text-muted uppercase tracking-wider mt-0.5">{centerLabel}</span>}
          </div>
        )}
      </div>

      {/* Leyenda */}
      <ul className="flex-1 space-y-2 w-full min-w-0">
        {segments.map((s, i) => (
          <li key={`${s.label}-${i}-leg`} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="flex-1 truncate admin-text-body">
              {s.icon && <span className="mr-1">{s.icon}</span>}{s.label}
            </span>
            <span className="admin-text-muted tabular-nums">{Math.round(s.pct * 100)}%</span>
            <span className="font-semibold admin-text-title tabular-nums">{valueFormatter(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════
//   Helpers
// ════════════════════════════════════════════════════════════════════════

/** Redondea un máximo a un valor "bonito" para el eje (1, 2, 5, 10, 20, 50, ...) */
function niceCeil(value: number): number {
  if (value <= 0) return 1
  const exp  = Math.floor(Math.log10(value))
  const base = Math.pow(10, exp)
  const norm = value / base
  let nice: number
  if      (norm <= 1)   nice = 1
  else if (norm <= 2)   nice = 2
  else if (norm <= 2.5) nice = 2.5
  else if (norm <= 5)   nice = 5
  else                  nice = 10
  return nice * base
}
