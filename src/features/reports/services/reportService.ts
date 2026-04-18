import { supabase } from '@lib/supabase'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTableFn from 'jspdf-autotable'
import type { UserOptions } from 'jspdf-autotable'
import { format, parseISO } from 'date-fns'

// Rolldown a veces no resuelve el default export correctamente; jspdf-autotable
// también se registra como método en el prototipo de jsPDF (doc.autoTable).
// Este helper elige la forma disponible en runtime.
function autoTable(doc: jsPDF, options: UserOptions): void {
  if (typeof autoTableFn === 'function') {
    autoTableFn(doc, options)
    return
  }
  const asMethod = (doc as unknown as { autoTable?: (o: UserOptions) => void }).autoTable
  if (typeof asMethod === 'function') {
    asMethod.call(doc, options)
    return
  }
  throw new Error('jspdf-autotable no se cargó correctamente (ni default export ni método en jsPDF).')
}
import { es } from 'date-fns/locale'
import type { DailyReport, Reservation } from '@app-types/index'
import type { PackageId } from '@constants/index'
import { formatDate, formatCurrency } from '@utils/formatters'

// ════════════════════════════════════════════════════════════════════════
//   Tipos extendidos para reportes por rango
// ════════════════════════════════════════════════════════════════════════

export type Granularity = 'day' | 'month' | 'year'

export interface RangeReport {
  /** ISO 'YYYY-MM-DD' — extremo inferior del rango (inclusive) */
  startDate: string
  /** ISO 'YYYY-MM-DD' — extremo superior del rango (inclusive) */
  endDate: string
  granularity: Granularity
  totalReservations: number
  totalPeople: number
  totalRevenue: number
  byPackage: Record<PackageId, { count: number; revenue: number }>
  byPaymentMethod: Record<string, { count: number; revenue: number }>
  /** Serie temporal agrupada según `granularity` — cada punto listo para graficar */
  series: Array<{
    /** Clave legible del punto (ej. "17 Abr", "Abr 2026", "2026") */
    label: string
    /** Clave ISO (ej. "2026-04-17", "2026-04", "2026") */
    key: string
    reservations: number
    people: number
    revenue: number
  }>
  reservations: Reservation[]
}

// ════════════════════════════════════════════════════════════════════════
//   Helpers
// ════════════════════════════════════════════════════════════════════════
function rowToReservation(r: Record<string, unknown>): Reservation {
  return {
    id: r.id as string,
    contactName: r.contact_name as string,
    contactPhone: r.contact_phone as string,
    date: r.date as string,
    time: r.time as string,
    numberOfPeople: r.number_of_people as number,
    packageId: r.package_id as Reservation['packageId'],
    serviceType: r.service_type as Reservation['serviceType'],
    subtotal: r.subtotal as number,
    discount: r.discount as number,
    total: r.total as number,
    status: r.status as Reservation['status'],
    paymentMethod: r.payment_method as Reservation['paymentMethod'],
    paymentId: r.payment_id as Reservation['paymentId'],
    notes: r.notes as string | null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }
}

/** Devuelve la "clave" y el "label" legible según la granularidad. */
function bucket(dateIso: string, gran: Granularity): { key: string; label: string } {
  const d = parseISO(dateIso)
  if (gran === 'day') {
    return {
      key:   format(d, 'yyyy-MM-dd'),
      label: format(d, 'd MMM', { locale: es }),
    }
  }
  if (gran === 'month') {
    return {
      key:   format(d, 'yyyy-MM'),
      label: format(d, 'MMM yyyy', { locale: es }),
    }
  }
  return {
    key:   format(d, 'yyyy'),
    label: format(d, 'yyyy'),
  }
}

// ════════════════════════════════════════════════════════════════════════
//   Servicio
// ════════════════════════════════════════════════════════════════════════
export const reportService = {
  /** Reporte de un único día (compat con vista anterior). */
  async getDailyReport(date: string): Promise<DailyReport> {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('date', date)
      .neq('status', 'cancelada')
      .order('time', { ascending: true })

    if (error) throw new Error(error.message)

    const reservations = ((data ?? []) as Record<string, unknown>[]).map(rowToReservation)

    const report: DailyReport = {
      date,
      totalReservations: reservations.length,
      totalPeople: reservations.reduce((s, r) => s + r.numberOfPeople, 0),
      totalRevenue: reservations.reduce((s, r) => s + r.total, 0),
      byPackage: {
        CON_COMIDA:   { count: 0, revenue: 0 },
        SOLO_BEBIDAS: { count: 0, revenue: 0 },
        SOLO_PASEO:   { count: 0, revenue: 0 },
      },
      byPaymentMethod: {},
      reservations,
    }

    for (const r of reservations) {
      const method = r.paymentMethod ?? 'sin_pago'
      if (r.packageId in report.byPackage) {
        report.byPackage[r.packageId].count++
        report.byPackage[r.packageId].revenue += r.total
      }
      if (!report.byPaymentMethod[method]) report.byPaymentMethod[method] = { count: 0, revenue: 0 }
      report.byPaymentMethod[method].count++
      report.byPaymentMethod[method].revenue += r.total
    }

    return report
  },

  /** Reporte por rango arbitrario, agrupado por día/mes/año. */
  async getRangeReport(
    startDate: string,
    endDate: string,
    granularity: Granularity,
  ): Promise<RangeReport> {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .neq('status', 'cancelada')
      .order('date', { ascending: true })
      .order('time', { ascending: true })

    if (error) throw new Error(error.message)

    const reservations = ((data ?? []) as Record<string, unknown>[]).map(rowToReservation)

    const byPackage: RangeReport['byPackage'] = {
      CON_COMIDA:   { count: 0, revenue: 0 },
      SOLO_BEBIDAS: { count: 0, revenue: 0 },
      SOLO_PASEO:   { count: 0, revenue: 0 },
    }
    const byPaymentMethod: RangeReport['byPaymentMethod'] = {}
    const bucketsMap = new Map<string, RangeReport['series'][number]>()

    for (const r of reservations) {
      const method = r.paymentMethod ?? 'sin_pago'

      if (r.packageId in byPackage) {
        byPackage[r.packageId].count++
        byPackage[r.packageId].revenue += r.total
      }
      if (!byPaymentMethod[method]) byPaymentMethod[method] = { count: 0, revenue: 0 }
      byPaymentMethod[method].count++
      byPaymentMethod[method].revenue += r.total

      const { key, label } = bucket(r.date, granularity)
      const existing = bucketsMap.get(key)
      if (existing) {
        existing.reservations++
        existing.people  += r.numberOfPeople
        existing.revenue += r.total
      } else {
        bucketsMap.set(key, {
          key, label,
          reservations: 1,
          people:  r.numberOfPeople,
          revenue: r.total,
        })
      }
    }

    const series = Array.from(bucketsMap.values()).sort((a, b) => a.key.localeCompare(b.key))

    return {
      startDate, endDate, granularity,
      totalReservations: reservations.length,
      totalPeople:  reservations.reduce((s, r) => s + r.numberOfPeople, 0),
      totalRevenue: reservations.reduce((s, r) => s + r.total, 0),
      byPackage,
      byPaymentMethod,
      series,
      reservations,
    }
  },

  // ════════════════════════════════════════════════════════════════════
  //   Exports — Excel
  // ════════════════════════════════════════════════════════════════════
  exportToExcel(report: DailyReport): void {
    const rows = report.reservations.map((r) => ({
      'Nombre': r.contactName,
      'Teléfono': r.contactPhone,
      'Hora': r.time,
      'Personas': r.numberOfPeople,
      'Paquete': r.packageId.replace(/_/g, ' '),
      'Tipo': r.serviceType,
      'Subtotal': r.subtotal,
      'Descuento': r.discount,
      'Total': r.total,
      'Estado': r.status,
      'Método de Pago': r.paymentMethod ?? '–',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Reservaciones')
    XLSX.writeFile(wb, `reservaciones_${report.date}.xlsx`)
  },

  /** Excel de rango — 2 hojas (detalle + serie temporal). */
  exportRangeToExcel(report: RangeReport): void {
    const wb = XLSX.utils.book_new()

    const detail = report.reservations.map((r) => ({
      'Fecha': r.date,
      'Hora': r.time,
      'Nombre': r.contactName,
      'Teléfono': r.contactPhone,
      'Personas': r.numberOfPeople,
      'Paquete': r.packageId.replace(/_/g, ' '),
      'Tipo': r.serviceType,
      'Subtotal': r.subtotal,
      'Descuento': r.discount,
      'Total': r.total,
      'Estado': r.status,
      'Pago': r.paymentMethod ?? '–',
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detail), 'Detalle')

    const series = report.series.map((p) => ({
      'Período':       p.label,
      'Reservaciones': p.reservations,
      'Personas':      p.people,
      'Ingresos':      p.revenue,
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(series), 'Serie')

    XLSX.writeFile(wb, `reporte_${report.startDate}_a_${report.endDate}.xlsx`)
  },

  // ════════════════════════════════════════════════════════════════════
  //   Exports — PDF (con try/catch para evitar "clicks fantasma")
  // ════════════════════════════════════════════════════════════════════
  exportToPDF(report: DailyReport): void {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      // Header decorado
      doc.setFillColor(21, 31, 82)
      doc.rect(0, 0, 210, 28, 'F')
      doc.setTextColor(247, 201, 72)
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('BARCO PIRATA', 14, 13)
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text('Reporte Diario de Operaciones', 14, 21)

      // Fecha + KPIs
      doc.setTextColor(21, 31, 82)
      doc.setFontSize(10)
      doc.text(`Fecha: ${formatDate(report.date)}`, 14, 38)

      const kpis: Array<[string, string]> = [
        ['Reservaciones',    String(report.totalReservations)],
        ['Personas totales', String(report.totalPeople)],
        ['Ingresos totales', formatCurrency(report.totalRevenue)],
      ]
      let x = 14
      kpis.forEach(([label, value]) => {
        doc.setFillColor(247, 247, 250)
        doc.rect(x, 44, 60, 18, 'F')
        doc.setFontSize(8)
        doc.setTextColor(100, 116, 139)
        doc.text(label.toUpperCase(), x + 3, 50)
        doc.setFontSize(13)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(21, 31, 82)
        doc.text(value, x + 3, 58)
        doc.setFont('helvetica', 'normal')
        x += 63
      })

      // Tabla
      autoTable(doc, {
        startY: 70,
        head: [['Hora', 'Cliente', 'Personas', 'Paquete', 'Total', 'Estado', 'Pago']],
        body: report.reservations.map((r) => [
          r.time,
          r.contactName,
          String(r.numberOfPeople),
          r.packageId.replace(/_/g, ' '),
          formatCurrency(r.total),
          r.status,
          r.paymentMethod ?? '-',
        ]),
        styles: { fontSize: 9, cellPadding: 2.5 },
        headStyles: { fillColor: [21, 31, 82], textColor: [247, 201, 72], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [247, 247, 250] },
        margin: { left: 14, right: 14 },
      })

      // Footer
      const totalPages = doc.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(120, 130, 150)
        doc.text(
          `Generado: ${format(new Date(), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}`,
          14, 290,
        )
        doc.text(`Página ${i} de ${totalPages}`, 196, 290, { align: 'right' })
      }

      doc.save(`reporte_${report.date}.pdf`)
    } catch (err) {
      console.error('[reportService.exportToPDF]', err)
      const msg = err instanceof Error ? err.message : String(err)
      alert(`No se pudo generar el PDF.\n\nError: ${msg}\n\nRevisa la consola del navegador para más detalles.`)
    }
  },

  /** PDF de rango en horizontal. Incluye KPIs + tabla de serie + detalle de reservaciones. */
  exportRangeToPDF(report: RangeReport): void {
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pageWidth = 297

      // Header
      doc.setFillColor(21, 31, 82)
      doc.rect(0, 0, pageWidth, 28, 'F')
      doc.setTextColor(247, 201, 72)
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('BARCO PIRATA', 14, 13)
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text('Reporte por Período', 14, 21)

      // Rango + granularidad
      doc.setTextColor(21, 31, 82)
      doc.setFontSize(10)
      const granLabel = report.granularity === 'day'
        ? 'Diario'
        : report.granularity === 'month'
          ? 'Mensual'
          : 'Anual'
      doc.text(
        `Período: ${formatDate(report.startDate)}  ->  ${formatDate(report.endDate)}   |   Agrupación: ${granLabel}`,
        14, 38,
      )

      // KPIs
      const avgTicket = report.totalReservations
        ? report.totalRevenue / report.totalReservations
        : 0
      const kpis: Array<[string, string]> = [
        ['Reservaciones',    String(report.totalReservations)],
        ['Personas totales', String(report.totalPeople)],
        ['Ingresos totales', formatCurrency(report.totalRevenue)],
        ['Ticket promedio',  formatCurrency(avgTicket)],
      ]
      let x = 14
      kpis.forEach(([label, value]) => {
        doc.setFillColor(247, 247, 250)
        doc.rect(x, 44, 65, 18, 'F')
        doc.setFontSize(8)
        doc.setTextColor(100, 116, 139)
        doc.text(label.toUpperCase(), x + 3, 50)
        doc.setFontSize(13)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(21, 31, 82)
        doc.text(value, x + 3, 58)
        doc.setFont('helvetica', 'normal')
        x += 68
      })

      // Serie temporal
      autoTable(doc, {
        startY: 70,
        head: [['Período', 'Reservaciones', 'Personas', 'Ingresos']],
        body: report.series.map((p) => [
          p.label,
          String(p.reservations),
          String(p.people),
          formatCurrency(p.revenue),
        ]),
        styles: { fontSize: 9, cellPadding: 2.5 },
        headStyles: { fillColor: [21, 31, 82], textColor: [247, 201, 72], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [247, 247, 250] },
        margin: { left: 14, right: 14 },
      })

      // Footer
      const totalPages = doc.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(120, 130, 150)
        doc.text(
          `Generado: ${format(new Date(), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}`,
          14, 205,
        )
        doc.text(`Página ${i} de ${totalPages}`, pageWidth - 14, 205, { align: 'right' })
      }

      doc.save(`reporte_${report.startDate}_a_${report.endDate}.pdf`)
    } catch (err) {
      console.error('[reportService.exportRangeToPDF]', err)
      const msg = err instanceof Error ? err.message : String(err)
      alert(`No se pudo generar el PDF.\n\nError: ${msg}\n\nRevisa la consola del navegador para más detalles.`)
    }
  },
}
