import { useState, useEffect, useCallback, useMemo } from 'react'
import { getOrders } from '../../api/orders'
import {
  Search, Download, X, Calendar, ShoppingBag, Clock, RefreshCw, CheckCircle
} from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useTheme } from '../../context/ThemeContext'

import DatePicker from '../../components/ui/DatePicker'
import EmptyState from '../../components/ui/EmptyState'
import Toast from '../../components/ui/Toast'
import StatCard from '../../components/ui/StatCard'
import MetricCardsLayout from '../../components/ui/MetricCardsLayout'
import Table from '../../components/ui/Table'

const ITEMS_PER_PAGE = 8

// 1. Función para estandarizar y convertir folios viejos al vuelo (ej: PED-0059 -> PED202609170059)
export const formatearFolioPedido = (folioOriginal, fechaCreacion) => {
  if (!folioOriginal) return 'PED-0000'
  const strFolio = String(folioOriginal)

  // Si ya es un folio nuevo (más de 10 caracteres y sin guiones), pasa directo
  if (strFolio.length > 10 && !strFolio.includes('-')) {
    return strFolio
  }

  // Extraemos la fecha del pedido y le quitamos los guiones
  let strFecha = ''
  try {
    const fecha = fechaCreacion ? new Date(fechaCreacion) : new Date()
    if (!isNaN(fecha.getTime())) {
      strFecha = fecha.toISOString().slice(0, 10).replace(/-/g, '')
    } else {
      strFecha = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    }
  } catch {
    strFecha = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  }

  // Rescatamos solo los números finales (ej. de "PED-0059" a "0059")
  const numeros = (strFolio.replace(/\D/g, '') || '0').padStart(4, '0')

  // Construimos el string unificado
  return `PED${strFecha}${numeros}`
}

export default function Orders() {
  const { borderSubtle, textSubtle, isLight, colorPrimario, primaryBtnText } = useTheme()
  const [orders, setOrders]   = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [toast, setToast]     = useState(null)
  const [resumen, setResumen] = useState({
    total_pedidos: 0,
    total_general: 0,
    ingresos_completados: 0,
    completados: 0,
    cancelados: 0,
    porcentaje_cancelados: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filtros
  const [search, setCustomerSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [canal, setCanal] = useState('all')
  const [estado, setEstado] = useState('all')
  const [pago, setPago] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Debounce search input (400ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
    }, 400)
    return () => clearTimeout(handler)
  }, [search])

  // Fetch orders from server with query params
  const fetchOrdersData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {}
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim()
      if (canal !== 'all') params.canal = canal
      if (estado !== 'all') params.estado = estado
      if (pago !== 'all') params.metodo_pago = pago
      if (dateFrom) params.fecha_desde = dateFrom
      if (dateTo) params.fecha_hasta = dateTo

      const res = await getOrders(params)
      const data = res?.data

      if (data && typeof data === 'object') {
        const orderList = Array.isArray(data.pedidos) ? data.pedidos : (Array.isArray(data) ? data : [])
        setOrders(orderList)

        if (data.resumen && typeof data.resumen === 'object') {
          setResumen({
            total_pedidos: data.resumen.total_pedidos || 0,
            total_general: parseFloat(data.resumen.total_general) || 0,
            ingresos_completados: parseFloat(data.resumen.ingresos_completados) || 0,
            completados: data.resumen.completados || 0,
            cancelados: data.resumen.cancelados || 0,
            porcentaje_cancelados: parseFloat(data.resumen.porcentaje_cancelados) || 0
          })
        } else {
          // Fallback calculation if server returns flat array
          const totalP = orderList.length
          const compList = orderList.filter(o => o.estado === 'completed' || o.estado === 'delivered' || o.status === 'completed')
          const cancList = orderList.filter(o => o.estado === 'cancelled' || o.status === 'cancelled')
          setResumen({
            total_pedidos: totalP,
            total_general: orderList.reduce((s, o) => s + (parseFloat(o.total || o.total_amount) || 0), 0),
            ingresos_completados: compList.reduce((s, o) => s + (parseFloat(o.total || o.total_amount) || 0), 0),
            completados: compList.length,
            cancelados: cancList.length,
            porcentaje_cancelados: totalP > 0 ? roundNumber((cancList.length / totalP) * 100, 1) : 0
          })
        }
      } else {
        setOrders([])
      }
    } catch (err) {
      console.error("Error loading orders:", err)
      setError("Error al cargar los pedidos")
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, canal, estado, pago, dateFrom, dateTo])

  useEffect(() => {
    fetchOrdersData()
  }, [fetchOrdersData])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, canal, estado, pago, dateFrom, dateTo])

  const totalPages = Math.ceil(orders.length / ITEMS_PER_PAGE) || 1
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE
  const indexOfFirstItem = (currentPage - 1) * ITEMS_PER_PAGE
  const currentOrders = orders.slice(indexOfFirstItem, indexOfLastItem)
  const startItem = orders.length === 0 ? 0 : indexOfFirstItem + 1
  const endItem = Math.min(indexOfLastItem, orders.length)

  const roundNumber = (num, decimals) => {
    return Number(Math.round(num + 'e' + decimals) + 'e-' + decimals)
  }

  const statusCounts = useMemo(() => {
    const list = Array.isArray(orders) ? orders : []
    return {
      all: list.length,
      pending: list.filter(o => (o.estado || o.status) === 'pending').length,
      preparing: list.filter(o => (o.estado || o.status) === 'preparing').length,
      ready: list.filter(o => (o.estado || o.status) === 'ready').length,
      completed: list.filter(o => ['completed', 'delivered'].includes(o.estado || o.status)).length,
      cancelled: list.filter(o => (o.estado || o.status) === 'cancelled').length
    }
  }, [orders])

  const hasActiveFilters = canal !== 'all' || estado !== 'all' || pago !== 'all' || dateFrom || dateTo || search

  const clearFilters = () => {
    setCanal('all')
    setEstado('all')
    setPago('all')
    setDateFrom('')
    setDateTo('')
    setCustomerSearch('')
    setDebouncedSearch('')
  }

  const hasOrdersData = Array.isArray(orders) && orders.length > 0

  // Exportación a Excel
  const exportToExcel = () => {
    if (!hasOrdersData) {
      setToast({ message: 'No hay datos disponibles para exportar', type: 'error' })
      return
    }

    const data = (Array.isArray(orders) ? orders : []).map(o => {
      let canalLabel = 'Local'
      if (o.canal === 'domicilio' || o.modality === 'delivery') canalLabel = 'Domicilio'
      else if (o.canal === 'pick-up' || o.canal === 'pickup' || o.modality === 'pickup') canalLabel = 'Pick-up'

      let pagoLabel = 'Terminal'
      if (o.metodo_pago === 'cash' || o.payment_method === 'cash') pagoLabel = 'Efectivo'
      else if (o.metodo_pago === 'transfer' || o.payment_method === 'transfer') pagoLabel = 'Transferencia'

      let estadoLabel = 'Pendiente'
      if (o.estado === 'preparing' || o.status === 'preparing') estadoLabel = 'En preparación'
      else if (o.estado === 'ready' || o.status === 'ready') estadoLabel = 'Listo'
      else if (o.estado === 'completed' || o.status === 'completed' || o.status === 'delivered') estadoLabel = 'Completado'
      else if (o.estado === 'cancelled' || o.status === 'cancelled') estadoLabel = 'Cancelado'

      const dateStr = o.fecha || (o.created_at ? new Date(o.created_at).toLocaleString('es-MX') : '')

      return {
        '# Pedido':     formatearFolioPedido(o.numero_pedido || o.folio || `PED-${String(o.id).padStart(4, '0')}`, o.created_at || o.fecha),
        'Cliente':      o.cliente || o.customer_name || 'Cliente General',
        'Canal':        canalLabel,
        'Pago':         pagoLabel,
        'Total':        `$${(parseFloat(o.total ?? o.total_amount ?? 0)).toFixed(2)}`,
        'Estado':       estadoLabel,
        'Fecha / Hora': dateStr,
      }
    })

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Pedidos')

    const fileName = `pedidos_aurum_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  // Exportación a CSV
  const exportToCSV = () => {
    if (!hasOrdersData) {
      setToast({ message: 'No hay datos disponibles para exportar', type: 'error' })
      return
    }

    const headers = ['# Pedido', 'Cliente', 'Canal', 'Pago', 'Total', 'Estado', 'Fecha / Hora']
    const rows = (Array.isArray(orders) ? orders : []).map(o => {
      let canalLabel = 'Local'
      if (o.canal === 'domicilio' || o.modality === 'delivery') canalLabel = 'Domicilio'
      else if (o.canal === 'pick-up' || o.canal === 'pickup' || o.modality === 'pickup') canalLabel = 'Pick-up'

      let pagoLabel = 'Terminal'
      if (o.metodo_pago === 'cash' || o.payment_method === 'cash') pagoLabel = 'Efectivo'
      else if (o.metodo_pago === 'transfer' || o.payment_method === 'transfer') pagoLabel = 'Transferencia'

      let estadoLabel = 'Pendiente'
      if (o.estado === 'preparing' || o.status === 'preparing') estadoLabel = 'En preparación'
      else if (o.estado === 'ready' || o.status === 'ready') estadoLabel = 'Listo'
      else if (o.estado === 'completed' || o.status === 'completed' || o.status === 'delivered') estadoLabel = 'Completado'
      else if (o.estado === 'cancelled' || o.status === 'cancelled') estadoLabel = 'Cancelado'

      const dateStr = o.fecha || (o.created_at ? new Date(o.created_at).toLocaleString('es-MX') : '')

      return [
        formatearFolioPedido(o.numero_pedido || o.folio || `PED-${String(o.id).padStart(4, '0')}`, o.created_at || o.fecha),
        o.cliente || o.customer_name || 'Cliente General',
        canalLabel,
        pagoLabel,
        `$${(parseFloat(o.total ?? o.total_amount ?? 0)).toFixed(2)}`,
        estadoLabel,
        dateStr
      ]
    })

    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.setAttribute("download", `pedidos_aurum_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Exportación a PDF
  const exportToPDF = () => {
    if (!hasOrdersData) {
      setToast({ message: 'No hay datos disponibles para exportar', type: 'error' })
      return
    }

    try {
      const doc = new jsPDF()

      doc.setFontSize(16)
      doc.text('Historial de Pedidos - Aurum', 14, 15)

      doc.setFontSize(10)
      doc.text(`Fecha de exportación: ${new Date().toLocaleString('es-MX')}`, 14, 22)

      const tableColumn = ['# Pedido', 'Cliente', 'Canal', 'Pago', 'Total', 'Estado', 'Fecha']
      const tableRows = (Array.isArray(orders) ? orders : []).map(o => {
        let canalLabel = 'Local'
        if (o.canal === 'domicilio' || o.modality === 'delivery') canalLabel = 'Domicilio'
        else if (o.canal === 'pick-up' || o.canal === 'pickup' || o.modality === 'pickup') canalLabel = 'Pick-up'

        let pagoLabel = 'Terminal'
        if (o.metodo_pago === 'cash' || o.payment_method === 'cash') pagoLabel = 'Efectivo'
        else if (o.metodo_pago === 'transfer' || o.payment_method === 'transfer') pagoLabel = 'Transferencia'

        let estadoLabel = 'Pendiente'
        if (o.estado === 'preparing' || o.status === 'preparing') estadoLabel = 'En prep.'
        else if (o.estado === 'ready' || o.status === 'ready') estadoLabel = 'Listo'
        else if (o.estado === 'completed' || o.status === 'completed' || o.status === 'delivered') estadoLabel = 'Completado'
        else if (o.estado === 'cancelled' || o.status === 'cancelled') estadoLabel = 'Cancelado'

        return [
          formatearFolioPedido(o.numero_pedido || o.folio || `PED-${String(o.id).padStart(4, '0')}`, o.created_at || o.fecha),
          o.cliente || o.customer_name || 'Cliente General',
          canalLabel,
          pagoLabel,
          `$${(parseFloat(o.total ?? o.total_amount ?? 0)).toFixed(2)}`,
          estadoLabel,
          o.fecha || (o.created_at ? new Date(o.created_at).toLocaleString('es-MX') : '')
        ]
      })

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 28,
        theme: 'striped',
        styles: { fontSize: 8 },
        headStyles: { fillStyle: 'f', fillColor: [30, 28, 46] }
      })

      doc.save(`pedidos_aurum_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (e) {
      console.error("PDF export error:", e)
      setToast({ message: "Error al generar PDF", type: "error" })
    }
  }

  return (
      <div className="space-y-5 p-4 md:p-6 lg:p-8 pb-24 font-sans animate-fadeIn">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-theme-text tracking-wide">Historial de Pedidos</h1>
        <p className="text-theme-text-muted text-sm mt-1">
          Consulta, filtra y exporta el registro completo de pedidos.
        </p>
      </div>

      {/* Tarjetas KPI de Métricas */}
      <div className="rounded-2xl p-6 border transition-colors duration-200 overflow-hidden" style={{ backgroundColor: 'var(--theme-surface)', borderColor: borderSubtle, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div className="flex xl:grid xl:grid-cols-4 gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory pb-4 w-full hide-scrollbar items-stretch scrollbar-none">
          {loading ? (
            <>
              <div className="flex-1 min-w-[280px] md:min-w-[320px] xl:min-w-0 snap-center"><div className="animate-shimmer rounded-xl h-24 w-full" /></div>
              <div className="flex-1 min-w-[280px] md:min-w-[320px] xl:min-w-0 snap-center"><div className="animate-shimmer rounded-xl h-24 w-full" /></div>
              <div className="flex-1 min-w-[280px] md:min-w-[320px] xl:min-w-0 snap-center"><div className="animate-shimmer rounded-xl h-24 w-full" /></div>
              <div className="flex-1 min-w-[280px] md:min-w-[320px] xl:min-w-0 snap-center"><div className="animate-shimmer rounded-xl h-24 w-full" /></div>
            </>
          ) : (
            <>
              <div className="flex-1 min-w-[280px] md:min-w-[320px] xl:min-w-0 snap-center">
                <StatCard
                  title="Pedidos Hoy"
                  value={resumen.total_pedidos || orders.length || 0}
                  subtitle="Registrados en el período"
                  icon={ShoppingBag}
                  color="orange"
                />
              </div>
              <div className="flex-1 min-w-[280px] md:min-w-[320px] xl:min-w-0 snap-center">
                <StatCard
                  title="Pendientes"
                  value={orders.filter(o => o.status === 'pendiente').length}
                  subtitle="Por atender / confirmar"
                  icon={Clock}
                  color="yellow"
                />
              </div>
              <div className="flex-1 min-w-[280px] md:min-w-[320px] xl:min-w-0 snap-center">
                <StatCard
                  title="En Proceso"
                  value={orders.filter(o => ['en_preparacion', 'preparando', 'listo', 'en_ruta'].includes(o.status)).length}
                  subtitle="En cocina o despacho"
                  icon={RefreshCw}
                  color="blue"
                />
              </div>
              <div className="flex-1 min-w-[280px] md:min-w-[320px] xl:min-w-0 snap-center">
                <StatCard
                  title="Completados"
                  value={resumen.completados || orders.filter(o => ['entregado', 'completado', 'cobrado'].includes(o.status)).length}
                  subtitle="Entregados exitosamente"
                  icon={CheckCircle}
                  color="green"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/5 border border-red-500/10 text-red-400 text-sm px-4 py-3 rounded-xl text-center font-medium animate-fadeIn">
          {error}
        </div>
      )}

      {/* Seccion Principal de Pedidos en Contenedor Nivel 1 */}
      <div className="rounded-2xl p-6 max-md:p-3 border transition-colors duration-200 space-y-5 max-md:space-y-3" style={{ backgroundColor: 'var(--theme-surface)', borderColor: borderSubtle, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        
        {/* Encabezado con Título y Botones de Exportación compactos a la altura del título */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-md:gap-3">
          <div>
            <h2 className="text-sm font-extrabold text-theme-text tracking-wide uppercase">HISTORIAL DE PEDIDOS</h2>
            <p className="text-theme-text-muted text-[10px] mt-0.5 font-bold uppercase tracking-wider">REGISTRO COMPLETO DE TRANSACCIONES Y PEDIDOS EN RESTAURANTE Y DOMICILIO</p>
          </div>
          <div className="flex items-center gap-2 max-md:flex-wrap max-md:gap-1.5 shrink-0">
            <button 
              onClick={exportToExcel}
              className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-xl shadow-xs transition-all duration-200 cursor-pointer text-xs"
              title="Exportar a Excel"
            >
              <Download size={13} className="shrink-0"/>
              <span>+ Excel</span>
            </button>
            <button 
              onClick={exportToCSV}
              className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white font-bold px-3 py-1.5 rounded-xl shadow-xs transition-all duration-200 cursor-pointer text-xs"
              title="Exportar a CSV"
            >
              <Download size={13} className="shrink-0"/>
              <span>+ CSV</span>
            </button>
            <button 
              onClick={exportToPDF}
              className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white font-bold px-3 py-1.5 rounded-xl shadow-xs transition-all duration-200 cursor-pointer text-xs"
              title="Exportar a PDF"
            >
              <Download size={13} className="shrink-0"/>
              <span>+ PDF</span>
            </button>
          </div>
        </div>

        {/* Buscador de pedidos */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setCustomerSearch(e.target.value)}
            placeholder="Buscar por folio, cliente o repartidor..."
            className="w-full bg-theme-input border border-theme-border-subtle rounded-2xl pl-10 pr-10 py-2.5 text-xs text-theme-text placeholder:text-theme-text-muted outline-none focus:border-brand-500/40 transition-colors"
          />
          {search && (
            <button 
              onClick={() => { setCustomerSearch(''); setDebouncedSearch('') }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text-muted hover:text-white/50 transition-colors cursor-pointer"
            >
              <X size={14}/>
            </button>
          )}
        </div>

        {/* Contenedor Maestro de Filtros: Pasa a flex-col en tablets/móviles para que no choquen */}
        <div className="flex justify-between items-center max-xl:flex-col max-xl:items-start gap-4 max-md:gap-3 mb-6 max-md:mb-3 w-full">
          
          {/* FILA 1: Píldoras de Estado */}
          <div className="flex flex-wrap max-md:flex-nowrap max-md:overflow-x-auto max-md:pb-2 hide-scrollbar items-center gap-2 pb-2 w-full sm:w-auto shrink-0">
            {[
              { key: 'all',       label: 'Todas' },
              { key: 'pending',   label: 'Pendiente' },
              { key: 'preparing', label: 'En prep.' },
              { key: 'ready',     label: 'Listo' },
              { key: 'completed', label: 'Completado' },
              { key: 'cancelled', label: 'Cancelado' },
            ].map(opt => {
              const isActive = estado === opt.key
              const count = statusCounts[opt.key] || 0
              return (
                <button 
                  key={opt.key} 
                  onClick={() => setEstado(opt.key)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isActive 
                      ? 'bg-[var(--theme-primary)] text-white shadow-sm' 
                      : 'bg-[var(--theme-primary)]/10 hover:bg-[var(--theme-primary)]/20 text-[var(--theme-primary)]'
                  }`}
                >
                  <span>{opt.label}</span>
                  <span className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                    isActive 
                      ? 'bg-white/25 text-white' 
                      : 'bg-[var(--theme-primary)]/20 text-[var(--theme-primary)]'
                  }`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* FILA 2: Selectores de Fecha y Botón Limpiar (Alineados abajo a la derecha o full-width en tablet) */}
          <div className="flex gap-3 max-md:gap-2 items-center max-xl:w-full max-md:flex-col shrink-0 max-md:w-full">
            <DatePicker
              value={dateFrom}
              onChange={setDateFrom}
              placeholder="Fecha Inicio"
              customPrefix=""
              fullWidth
            />
            <DatePicker
              value={dateTo}
              onChange={setDateTo}
              placeholder="Fecha Fin"
              customPrefix=""
              fullWidth
            />
            {hasActiveFilters && (
              <button 
                onClick={clearFilters}
                className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-red-500 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all cursor-pointer max-sm:w-full shrink-0"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="space-y-2.5">
              <div className="animate-shimmer rounded-lg h-12 w-full" />
              <div className="animate-shimmer rounded-lg h-12 w-full" />
              <div className="animate-shimmer rounded-lg h-12 w-full" />
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <Table shadow="shadow-lg" className="min-w-[800px]" headers={['# Pedido', 'Cliente', 'Canal', 'Pago', 'Total', 'Estado', 'Fecha / Hora']}>
              {currentOrders.map(order => {
                if (!order) return null
                const orderTotal = typeof order.total === 'number' ? order.total : (parseFloat(order.total || order.total_amount) || 0)
                
                const clientName = order.cliente || order.customer_name || 'Cliente General'
                const initialsLetter = clientName[0]?.toUpperCase() || 'C'

                const rawFolio = order.numero_pedido || order.folio || `PED-${String(order.id).padStart(4, '0')}`
                const numPedido = formatearFolioPedido(rawFolio, order.created_at || order.fecha)

                const orderCanal = order.canal || order.modality || 'local'
                const isDomicilio = orderCanal === 'domicilio' || orderCanal === 'delivery'
                const isPickup = orderCanal === 'pick-up' || orderCanal === 'pickup'

                const orderPago = order.metodo_pago || order.payment_method || 'cash'
                const isCash = orderPago === 'cash' || orderPago === 'efectivo'
                const isTransfer = orderPago === 'transfer' || orderPago === 'transferencia'

                const orderEstado = order.estado || order.status || 'pending'

                const formattedDate = order.fecha 
                  ? order.fecha 
                  : (order.created_at ? new Date(order.created_at).toLocaleString('es-MX') : '')

                return (
                  <tr 
                    key={order.id}
                    className="h-16 border-b transition-colors duration-150"
                    style={{ backgroundColor: 'var(--theme-surface)', borderColor: borderSubtle }}
                  >
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-bold text-sm tracking-[1px] text-slate-900 dark:text-white">
                        {numPedido}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                             style={{ backgroundColor: `${colorPrimario}20`, border: `1px solid ${colorPrimario}30`, color: colorPrimario }}>
                          {initialsLetter}
                        </div>
                        <div>
                          <span className="text-sm font-medium block" style={{ color: 'var(--theme-text)' }}>{clientName}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-sm font-bold tracking-wide
                        ${isDomicilio ? 'text-sky-600 dark:text-sky-400'
                        : isPickup    ? 'text-sky-600 dark:text-sky-400'
                        :               'text-emerald-600 dark:text-emerald-400'}`}>
                        {isDomicilio ? '🏠 Domicilio'
                         : isPickup  ? '🛍️ Pick-up'
                         :             '🍽️ Local'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-sm font-bold tracking-wide
                        ${isCash ? 'text-emerald-600 dark:text-emerald-400' 
                        : isTransfer ? 'text-sky-600 dark:text-sky-400'
                        : 'text-sky-600 dark:text-sky-400'}`}>
                        {isCash ? '💵 Efectivo' 
                         : isTransfer ? '📱 Transferencia'
                         : '💳 Terminal'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-bold text-sm" style={{ color: 'var(--theme-text)' }}>
                        ${orderTotal.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-sm font-bold tracking-wide
                        ${orderEstado === 'pending'   ? 'text-amber-600 dark:text-amber-400'
                        : orderEstado === 'preparing' ? 'text-purple-600 dark:text-purple-400'
                        : orderEstado === 'ready'     ? 'text-purple-600 dark:text-purple-400'
                        : orderEstado === 'completed' || orderEstado === 'delivered' ? 'text-emerald-600 dark:text-emerald-400'
                        :                               'text-rose-600 dark:text-rose-400'}`}>
                        {orderEstado === 'pending'   ? 'Pendiente'
                         : orderEstado === 'preparing' ? 'En preparación'
                         : orderEstado === 'ready'     ? 'Listo'
                         : orderEstado === 'completed' || orderEstado === 'delivered' ? 'Completado'
                         : 'Cancelado'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>
                          {formattedDate}
                        </p>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {currentOrders.length > 0 && Array.from({ length: ITEMS_PER_PAGE - currentOrders.length }).map((_, i) => (
                <tr key={`empty-${i}`} className="h-16 border-b border-transparent" style={{ backgroundColor: 'var(--theme-surface)' }}>
                  <td colSpan={7}></td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr style={{ backgroundColor: 'var(--theme-surface)' }}>
                  <td colSpan={7} className="p-0 border-none relative" style={{ backgroundColor: 'var(--theme-surface)' }}>
                    <div className="h-[32rem] sticky left-0 w-full flex items-center justify-center" style={{ backgroundColor: 'var(--theme-surface)' }}>
                      <EmptyState
                        title="Sin pedidos encontrados"
                        description={hasActiveFilters ? "Prueba ajustando los filtros o limpiándolos." : "Aún no tienes pedidos registrados."}
                        iconType="orders"
                      />
                    </div>
                  </td>
                </tr>
              )}
              </Table>
            </div>
          )}

          {/* Footer de Paginación */}
          {!loading && orders.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t" style={{ borderColor: borderSubtle }}>
              {/* Lado izquierdo: Conteo */}
              <div className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                Mostrando {startItem} a {endItem} de {orders.length} pedidos
              </div>

              {/* Lado derecho: Controles */}
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1 || orders.length === 0}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5"
                  style={currentPage > 1 && orders.length > 0 ? {
                    backgroundColor: 'var(--theme-primary)',
                    borderColor: 'var(--theme-primary)',
                    color: 'var(--theme-primary-contrast, #fff)',
                    cursor: 'pointer'
                  } : {
                    backgroundColor: 'var(--theme-surface)',
                    borderColor: borderSubtle,
                    color: 'var(--theme-text)',
                    opacity: 0.4,
                    cursor: 'not-allowed'
                  }}
                >
                  Anterior
                </button>

                <div className="px-3 py-1 text-xs font-bold font-mono rounded-xl" style={{ backgroundColor: 'var(--theme-input)', color: 'var(--theme-text)' }}>
                  {orders.length === 0 ? 1 : currentPage} / {totalPages || 1}
                </div>

                <button 
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage >= totalPages || orders.length === 0}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5"
                  style={currentPage < totalPages && orders.length > 0 ? {
                    backgroundColor: 'var(--theme-primary)',
                    borderColor: 'var(--theme-primary)',
                    color: 'var(--theme-primary-contrast, #fff)',
                    cursor: 'pointer'
                  } : {
                    backgroundColor: 'var(--theme-surface)',
                    borderColor: borderSubtle,
                    color: 'var(--theme-text)',
                    opacity: 0.4,
                    cursor: 'not-allowed'
                  }}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
