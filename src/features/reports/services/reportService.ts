import { supabase } from '@lib/supabase'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { DailyReport } from '@app-types/index'
import { formatDate, formatCurrency } from '@utils/formatters'

export const reportService = {
  async getDailyReport(date: string): Promise<DailyReport> {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('date', date)
      .neq('status', 'cancelada')
      .order('time', { ascending: true })

    if (error) throw new Error(error.message)

    const rows = (data ?? []) as Record<string, unknown>[]

    const report: DailyReport = {
      date,
      totalReservations: rows.length,
      totalPeople: rows.reduce((sum, r) => sum + (r.number_of_people as number), 0),
      totalRevenue: rows.reduce((sum, r) => sum + (r.total as number), 0),
      byPackage: {
        CON_COMIDA:  { count: 0, revenue: 0 },
        SOLO_BEBIDAS: { count: 0, revenue: 0 },
        SOLO_PASEO:  { count: 0, revenue: 0 },
      },
      byPaymentMethod: {},
      reservations: rows.map((r) => ({
        id: r.id as string,
        contactName: r.contact_name as string,
        contactPhone: r.contact_phone as string,
        date: r.date as string,
        time: r.time as string,
        numberOfPeople: r.number_of_people as number,
        packageId: r.package_id as DailyReport['reservations'][0]['packageId'],
        serviceType: r.service_type as 'individual' | 'grupal',
        subtotal: r.subtotal as number,
        discount: r.discount as number,
        total: r.total as number,
        status: r.status as DailyReport['reservations'][0]['status'],
        paymentMethod: r.payment_method as DailyReport['reservations'][0]['paymentMethod'],
        paymentId: r.payment_id as string | null,
        notes: r.notes as string | null,
        createdAt: r.created_at as string,
        updatedAt: r.updated_at as string,
      })),
    }

    // Agrega por paquete y método de pago
    for (const r of rows) {
      const pkg = r.package_id as string
      const method = (r.payment_method as string) ?? 'sin_pago'
      const total = r.total as number

      if (pkg in report.byPackage) {
        report.byPackage[pkg as keyof typeof report.byPackage].count++
        report.byPackage[pkg as keyof typeof report.byPackage].revenue += total
      }

      if (!report.byPaymentMethod[method]) {
        report.byPaymentMethod[method] = { count: 0, revenue: 0 }
      }
      report.byPaymentMethod[method].count++
      report.byPaymentMethod[method].revenue += total
    }

    return report
  },

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

  exportToPDF(report: DailyReport): void {
    const doc = new jsPDF()

    doc.setFontSize(18)
    doc.text('Barco Pirata – Reporte Diario', 14, 20)
    doc.setFontSize(11)
    doc.text(`Fecha: ${formatDate(report.date)}`, 14, 30)
    doc.text(`Total reservaciones: ${report.totalReservations}`, 14, 38)
    doc.text(`Total personas: ${report.totalPeople}`, 14, 46)
    doc.text(`Ingresos totales: ${formatCurrency(report.totalRevenue)}`, 14, 54)

    autoTable(doc, {
      startY: 62,
      head: [['Nombre', 'Hora', 'Personas', 'Paquete', 'Total', 'Estado', 'Pago']],
      body: report.reservations.map((r) => [
        r.contactName,
        r.time,
        r.numberOfPeople,
        r.packageId.replace(/_/g, ' '),
        formatCurrency(r.total),
        r.status,
        r.paymentMethod ?? '–',
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [21, 31, 82] },
    })

    doc.save(`reporte_${report.date}.pdf`)
  },
}
