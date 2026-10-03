import { useState, useMemo, useEffect } from 'react'
import {
  CreditCard, Banknote, Wifi,
  Clock, Search, Download, Eye, CheckCircle2,
  XCircle, FileText, User, Calendar, Receipt, AlertCircle, MapPin, Phone, RefreshCw, X
} from 'lucide-react'
import Modal from '../../../components/ui/Modal'
import Toast from '../../../components/ui/Toast'
import StatCard from '../../../components/ui/StatCard'
import MetricCardsLayout from '../../../components/ui/MetricCardsLayout'
import EmptyState from '../../../components/ui/EmptyState'
import Table from '../../../components/ui/Table'
import Dropdown from '../../../components/ui/Dropdown'
import { adminGetPayments, adminGetPaymentDetail } from '../../../api/payments'
import { useTheme } from '../../../context/ThemeContext'

const ITEMS_PER_PAGE = 8

const TIEMPO_OPTIONS = [
  { value: 'hoy', label: 'Hoy (Turno actual)' },
  { value: '30dias', label: 'Historial 30 días' },
  { value: '60dias', label: 'Historial 60 días' },
  { value: 'todos', label: 'Todo el historial' },
]

const METODO_OPTIONS = [
  { value: 'todos', label: 'Cualquier Método' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'terminal', label: 'Terminal' },
  { value: 'transferencia', label: 'Transferencia' },
]

const ESTADO_OPTIONS = [
  { value: 'todos', label: 'Cualquier Estado' },
  { value: 'pagado', label: 'Pagado' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'cancelado', label: 'Cancelado' },
]

/* ── Helpers ── */
const fmt = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// Función para estandarizar folios viejos al vuelo (ej: PAG-0063 -> PAG202609060063)
export const formatearFolioPago = (folioOriginal, fechaCreacion) => {
  if (!folioOriginal) return 'PAG-0000'
  
  // Si ya viene en el formato nuevo (más de 10 caracteres y sin guión), lo dejamos igual
  if (folioOriginal.length > 10 && !folioOriginal.includes('-')) {
    return folioOriginal
  }

  // Extraemos la fecha (YYYYMMDD)
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
  
  // Extraemos solo los números del folio viejo (ej. de "PAG-0063" sacamos "0063")
  const numeros = String(folioOriginal).replace(/\D/g, '').padStart(4, '0')

  // Retornamos el formato bancario estandarizado
  return `PAG${strFecha}${numeros}`
}

const STATUS_MAP_LABEL = {
  paid: 'Pagado',
  pending: 'Pendiente',
  cancelled: 'Cancelado'
}

const METHOD_MAP_LABEL = {
  cash: 'Efectivo',
  terminal: 'Terminal',
  transfer: 'Transferencia'
}

const STATUS_CFG = {
  paid:      { icon: CheckCircle2, color: 'text-emerald-500 dark:text-emerald-400', label: 'Pagado' },
  pagado:    { icon: CheckCircle2, color: 'text-emerald-500 dark:text-emerald-400', label: 'Pagado' },
  pending:   { icon: Clock,        color: 'text-amber-500 dark:text-amber-400',     label: 'Pendiente' },
  pendiente: { icon: Clock,        color: 'text-amber-500 dark:text-amber-400',     label: 'Pendiente' },
  cancelled: { icon: XCircle,      color: 'text-rose-500 dark:text-rose-400',       label: 'Cancelado' },
  cancelado: { icon: XCircle,      color: 'text-rose-500 dark:text-rose-400',       label: 'Cancelado' },
}

const METHOD_COLORS = {
  cash: 'text-emerald-500 dark:text-emerald-400',
  efectivo: 'text-emerald-500 dark:text-emerald-400',
  terminal: 'text-sky-500 dark:text-sky-400',
  tarjeta: 'text-sky-500 dark:text-sky-400',
  transfer: 'text-purple-500 dark:text-purple-400',
  transferencia: 'text-purple-500 dark:text-purple-400'
}

const METHOD_ICONS = {
  cash:     Banknote,
  terminal: CreditCard,
  transfer: Wifi,
}

/* ── KPI Card ── */
function KpiCard({ label, value, icon: Icon, accent = 'brand' }) {
  const { bgCard, borderSubtle } = useTheme()
  const cardStyles = {
    brand: {
      iconBg: 'bg-brand-600/10 border-brand-500/20 text-brand-400',
      glow: 'hover:border-brand-500/40 hover:shadow-2xl hover:shadow-brand-600/25',
    },
    emerald: {
      iconBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      glow: 'hover:border-emerald-500/40 hover:shadow-2xl hover:shadow-emerald-500/25',
    },
    blue: {
      iconBg: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
      glow: 'hover:border-blue-500/40 hover:shadow-2xl hover:shadow-blue-500/25',
    },
    amber: {
      iconBg: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
      glow: 'hover:border-yellow-500/40 hover:shadow-2xl hover:shadow-yellow-500/25',
    }
  }

  const s = cardStyles[accent] || cardStyles.brand

  return (
    <div 
      style={{ backgroundColor: bgCard, borderColor: borderSubtle }}
      className={`border rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden group hover:-translate-y-1 shadow-lg transition-all duration-300 ${s.glow}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none opacity-40" />

      <div className="flex items-start justify-between relative z-10">
        <p className="text-theme-text-muted text-[11px] font-bold uppercase tracking-wider">{label}</p>
        {Icon && (
          <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${s.iconBg}`}>
            <Icon size={16} />
          </div>
        )}
      </div>
      
      <div className="relative z-10 mt-1">
        <p className="text-3xl font-black text-theme-text">{value}</p>
      </div>

      {Icon && (
        <div className="absolute bottom-3.5 right-3.5 opacity-[0.03] pointer-events-none text-theme-text group-hover:scale-110 transition-transform duration-300">
          <Icon size={56} />
        </div>
      )}
    </div>
  )
}

/* ── Status Badge ── */
function StatusBadge({ status }) {
  const norm = (status || 'pending').toLowerCase()
  const cfg = STATUS_CFG[norm] || STATUS_CFG.pending
  const { icon: Icon, color, label } = cfg
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold tracking-wide ${color}`}>
      <Icon size={14} className="shrink-0 stroke-[2.5]" />
      <span>{label}</span>
    </span>
  )
}

/* ── Detail Row ── */
function DetailRow({ label, value, icon: Icon }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3.5 border-b border-slate-200 dark:border-slate-700/80 last:border-0 hover:bg-slate-50/80 dark:hover:bg-theme-input/30 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-theme-input border border-slate-300 dark:border-slate-600 flex items-center justify-center text-theme-text-muted shrink-0 shadow-xs">
            <Icon size={14} />
          </div>
        )}
        <span className="text-xs font-semibold text-theme-text-muted">{label}</span>
      </div>
      <div className="text-xs font-bold text-theme-text text-right flex justify-end items-center">
        {value}
      </div>
    </div>
  )
}

/* ── Payment Detail Modal ── */
function PaymentDetailModal({ paymentId, onClose }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true)
        const res = await adminGetPaymentDetail(paymentId)
        if (res.data) {
          setDetail(res.data)
        }
      } catch (err) {
        console.error("Error al cargar detalle del pago:", err)
        setError("No se pudieron cargar los detalles del pago")
      } finally {
        setLoading(false)
      }
    }
    fetchDetail()
  }, [paymentId])

  const MIcon = detail ? (METHOD_ICONS[detail.payment_method] || CreditCard) : CreditCard
  const modalityLabel = detail?.modality === 'delivery' ? 'Delivery / Domicilio' : detail?.modality === 'pickup' ? 'Pick-up / Para llevar' : 'Comedor / Mesa'

  return (
    <Modal title={`Detalle del Pago ${detail ? formatearFolioPago(detail.folio, detail.created_at) : ''}`} onClose={onClose}>
      {loading ? (
        <div className="py-6 space-y-3">
          <div className="animate-shimmer rounded-2xl h-16 w-full" />
          <div className="animate-shimmer rounded-2xl h-36 w-full" />
          <div className="animate-shimmer rounded-2xl h-28 w-full" />
        </div>
      ) : error ? (
        <div className="py-8 text-center space-y-2">
          <AlertCircle size={26} className="text-red-400 mx-auto" />
          <p className="text-xs text-theme-text-muted font-semibold">{error}</p>
        </div>
      ) : detail ? (
        <div className="space-y-4 pb-2">
          
          {/* Encabezado: folio + estado */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-theme-surface shadow-[0_10px_25px_-4px_rgba(0,0,0,0.12),0_4px_8px_-2px_rgba(0,0,0,0.06)] dark:shadow-[0_10px_25px_-4px_rgba(0,0,0,0.5)]">
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-theme-text-muted">
                Folio de Pago
              </p>
              <p className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-[1px]">
                {formatearFolioPago(detail.folio, detail.created_at)}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-theme-input px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 shadow-xs">
              <StatusBadge status={detail.payment_status} />
            </div>
          </div>

          {/* Datos del Cliente & Modalidad */}
          <div className="rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-theme-surface shadow-[0_10px_25px_-4px_rgba(0,0,0,0.12),0_4px_8px_-2px_rgba(0,0,0,0.06)] dark:shadow-[0_10px_25px_-4px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/60">
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-theme-text-muted">
                Información del Cliente
              </h4>
            </div>

            <DetailRow label="Cliente" value={detail.customer_name} icon={User} />
            {detail.customer_phone && <DetailRow label="Teléfono" value={detail.customer_phone} icon={Phone} />}
            {detail.customer_address && <DetailRow label="Dirección" value={detail.customer_address} icon={MapPin} />}
            <DetailRow label="Modalidad" value={modalityLabel} icon={Receipt} />
            <DetailRow label="Fecha de Registro" value={detail.created_at || 'N/A'} icon={Calendar} />
          </div>

          {/* Desglose de Platillos */}
          <div className="rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-theme-surface shadow-[0_10px_25px_-4px_rgba(0,0,0,0.12),0_4px_8px_-2px_rgba(0,0,0,0.06)] dark:shadow-[0_10px_25px_-4px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/60">
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-theme-text-muted">
                Desglose de Platillos ({detail.items?.length || 0})
              </h4>
            </div>

            <div className="divide-y divide-slate-200/80 dark:divide-slate-700/80 p-3 space-y-2">
              {detail.items && detail.items.length > 0 ? (
                detail.items.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 px-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-brand-600 dark:text-brand-400 font-mono bg-brand-500/10 px-2 py-0.5 rounded-md border border-brand-500/30 text-[11px]">
                        x{it.quantity}
                      </span>
                      <span className="text-theme-text font-semibold">{it.name || it.dish_name}</span>
                    </div>
                    <span className="font-bold text-theme-text font-mono">{fmt(it.subtotal || (it.price * it.quantity))}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-theme-text-muted text-center py-4 font-medium">Sin ítems detallados</p>
              )}
            </div>
          </div>

          {/* Totales y Método */}
          <div className="rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-theme-surface shadow-[0_10px_25px_-4px_rgba(0,0,0,0.12),0_4px_8px_-2px_rgba(0,0,0,0.06)] dark:shadow-[0_10px_25px_-4px_rgba(0,0,0,0.5)] p-4 space-y-3">
            <div className="flex justify-between text-xs text-theme-text-muted font-medium">
              <span>Subtotal:</span>
              <span className="font-bold text-theme-text font-mono">{fmt(detail.subtotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-theme-text-muted font-medium">
              <span>Descuentos:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">-{fmt(detail.descuentos)}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-black text-theme-text pt-3 border-t border-slate-200 dark:border-slate-700">
              <span>Total:</span>
              <span className="text-emerald-600 dark:text-emerald-400 text-xl font-mono font-black">{fmt(detail.total)}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-theme-text-muted pt-3 border-t border-slate-200 dark:border-slate-700">
              <span className="font-semibold">Método de Pago:</span>
              <span className="inline-flex items-center gap-1.5 text-theme-text font-bold capitalize bg-slate-100 dark:bg-theme-input px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 shadow-xs">
                <MIcon size={15} className="text-brand-600 dark:text-brand-400" />
                {METHOD_MAP_LABEL[detail.payment_method] || detail.payment_method}
              </span>
            </div>
          </div>

        </div>
      ) : null}
    </Modal>
  )
}

/* ── Skeleton Component ── */
function PaymentsSkeleton() {
  return (
    <div className="space-y-6">
      <MetricCardsLayout cols={4} gap="gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="animate-shimmer rounded-2xl h-32 w-full" />
        ))}
      </MetricCardsLayout>
      <div className="rounded-2xl p-6 border transition-colors duration-200" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border-subtle)' }}>
        <div className="space-y-2.5">
          <div className="animate-shimmer rounded-lg h-12 w-full" />
          <div className="animate-shimmer rounded-lg h-12 w-full" />
          <div className="animate-shimmer rounded-lg h-12 w-full" />
        </div>
      </div>
    </div>
  )
}

/* ── Main Component ── */
export default function Payments() {
  const { bgCard, bgSubcard, bgInput, bgTable, borderSubtle, cardShadow, colorPrimario, primaryBtnText } = useTheme()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filtroTiempo, setFiltroTiempo] = useState('hoy')
  const [filtroMetodo, setFiltroMetodo] = useState('todos')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [currentPage, setCurrentPage] = useState(1)
  const [detailPaymentId, setDetailPaymentId] = useState(null)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [toast, setToast] = useState(null)

  const [paymentsList, setPaymentsList] = useState([])
  const [metricas, setMetricas] = useState({ total_registros: 0, suma_total: 0 })
  const [resumen, setResumen] = useState({
    total_cobrado: 0,
    efectivo: 0,
    terminal: 0,
    transferencia: 0
  })

  // Debounce search input (400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  // Helper para rangos de fecha por filtro de tiempo
  const getFechaParams = (tiempo) => {
    const params = {}
    const now = new Date()
    if (tiempo === 'hoy') {
      const today = now.toISOString().slice(0, 10)
      params.fecha_inicio = today
      params.fecha_fin = today
    } else if (tiempo === '30dias') {
      const d = new Date()
      d.setDate(d.getDate() - 30)
      params.fecha_inicio = d.toISOString().slice(0, 10)
      params.fecha_fin = now.toISOString().slice(0, 10)
    } else if (tiempo === '60dias') {
      const d = new Date()
      d.setDate(d.getDate() - 60)
      params.fecha_inicio = d.toISOString().slice(0, 10)
      params.fecha_fin = now.toISOString().slice(0, 10)
    }
    return params
  }

  // Fetch payments list from API
  const fetchPaymentsData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true)
      else setRefreshing(true)

      const params = {}
      if (debouncedSearch && debouncedSearch.trim()) params.search = debouncedSearch.trim()

      if (filtroMetodo !== 'todos') {
        params.metodo = filtroMetodo
      }

      if (filtroEstado !== 'todos') {
        params.estado = filtroEstado
      }

      const dateParams = getFechaParams(filtroTiempo)
      if (dateParams.fecha_inicio) params.fecha_inicio = dateParams.fecha_inicio
      if (dateParams.fecha_fin) params.fecha_fin = dateParams.fecha_fin

      const res = await adminGetPayments(params)
      if (res.data) {
        const pagosArray = Array.isArray(res.data.pagos)
          ? res.data.pagos
          : (Array.isArray(res.data.pagos?.data) ? res.data.pagos.data : [])

        setPaymentsList(pagosArray)

        if (res.data.metricas) {
          setMetricas({
            total_registros: Number(res.data.metricas.total_registros ?? pagosArray.length),
            suma_total: Number(res.data.metricas.suma_total ?? 0)
          })
        } else if (res.data.resumen) {
          setMetricas({
            total_registros: Number(res.data.resumen.total_registros ?? pagosArray.length),
            suma_total: Number(res.data.resumen.suma_total ?? res.data.resumen.total_cobrado ?? 0)
          })
        }

        if (res.data.resumen) {
          setResumen(res.data.resumen)
        }
      }
    } catch (err) {
      console.error("Error al cargar lista de pagos:", err)
      setToast({ message: "No se pudieron sincronizar los pagos con el servidor", type: "error" })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchPaymentsData(false)
  }, [debouncedSearch, filtroTiempo, filtroMetodo, filtroEstado])

  // Auto refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPaymentsData(true)
    }, 60000)
    return () => clearInterval(interval)
  }, [debouncedSearch, filtroTiempo, filtroMetodo, filtroEstado])
  
  const hasData = paymentsList.length > 0

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, filtroTiempo, filtroMetodo, filtroEstado])

  // Pagination calculations
  const totalPages = Math.ceil(paymentsList.length / ITEMS_PER_PAGE) || 1
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE
  const indexOfFirstItem = (currentPage - 1) * ITEMS_PER_PAGE
  const currentPayments = (Array.isArray(paymentsList) ? paymentsList : []).slice(indexOfFirstItem, indexOfLastItem)
  const startItem = paymentsList.length === 0 ? 0 : indexOfFirstItem + 1
  const endItem = Math.min(indexOfLastItem, paymentsList.length)

  // Export File Generator (Excel, CSV, PDF)
  const handleExport = (type) => {
    if (!hasData) {
      setToast({ message: "No hay datos disponibles para exportar", type: "error" })
      return
    }

    const timestamp = new Date().toLocaleString('es-MX')

    if (type === 'CSV' || type === 'Excel') {
      let csv = `REPORTE DE PAGOS REGISTRADOS\n`
      csv += `Fecha de generación: ${timestamp}\n`
      csv += `Filtros: Tiempo [${filtroTiempo}], Método [${filtroMetodo}], Estado [${filtroEstado}], Búsqueda ["${debouncedSearch}"]\n\n`
      csv += `Folio,Cliente,Método,Monto ($),Estado,Fecha\n`

      paymentsList.forEach(p => {
        csv += `"${formatearFolioPago(p.folio, p.created_at)}","${p.customer_name}","${METHOD_MAP_LABEL[p.payment_method] || p.payment_method}",${p.total_amount},"${STATUS_MAP_LABEL[p.payment_status] || p.payment_status}","${p.created_at}"\n`
      })

      const filename = `Reporte_Pagos_${new Date().toISOString().slice(0, 10)}.${type === 'Excel' ? 'csv' : 'csv'}`
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setToast({ message: `Reporte de pagos exportado a ${type} correctamente`, type: 'success' })
    } else if (type === 'PDF') {
      window.print()
    }
  }

  return (
    <div className="space-y-6 pb-12 animate-fadeIn p-4 md:p-6 lg:p-8 font-sans">

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-theme-text">Pagos</h1>
          <p className="text-theme-text-muted text-sm mt-1">
            Historial de cobros y métodos de pago del restaurante
          </p>
        </div>
        {refreshing && (
          <span className="text-xs text-brand-300 font-semibold flex items-center gap-1.5 bg-brand-500/10 px-3 py-2 rounded-xl border border-brand-500/20">
            <RefreshCw size={13} className="animate-spin" /> Actualizando...
          </span>
        )}
      </div>

      {loading ? (
        <PaymentsSkeleton />
      ) : (
        <>
          {/* KPI Cards con Contenedor de Fondo Nivel 1 */}
          <div className="rounded-2xl p-6 max-md:p-3 transition-colors duration-200 overflow-hidden" style={{ backgroundColor: bgCard, border: `1px solid ${borderSubtle}`, boxShadow: cardShadow }}>
            <div className="flex xl:grid xl:grid-cols-4 gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory pb-4 w-full hide-scrollbar items-stretch">

              <div className="flex-1 min-w-[280px] max-md:min-w-[260px] md:min-w-[320px] xl:min-w-0 snap-center">
                <StatCard title="Total Cobrado" value={fmt(resumen.total_cobrado)} subtitle="Ingresos cobrados" icon={CreditCard} color="green" />
              </div>

              <div className="flex-1 min-w-[280px] max-md:min-w-[260px] md:min-w-[320px] xl:min-w-0 snap-center">
                <StatCard title="Efectivo" value={fmt(resumen.efectivo)} subtitle="Cobro en caja" icon={Banknote} color="blue" />
              </div>

              <div className="flex-1 min-w-[280px] max-md:min-w-[260px] md:min-w-[320px] xl:min-w-0 snap-center">
                <StatCard title="Terminal" value={fmt(resumen.terminal)} subtitle="Tarjeta de débito/crédito" icon={CreditCard} color="purple" />
              </div>

              <div className="flex-1 min-w-[280px] max-md:min-w-[260px] md:min-w-[320px] xl:min-w-0 snap-center">
                <StatCard title="Transferencia" value={fmt(resumen.transferencia)} subtitle="SPEI / Transferencia" icon={Wifi} color="orange" />
              </div>

            </div>
          </div>

          {/* Tabla de Pagos (Estructura Oficial de Tablas con Filtros) */}
          <div className="rounded-2xl p-6 max-md:p-3 transition-colors duration-200 animate-fadeInUp space-y-5" style={{ backgroundColor: bgCard, border: `1px solid ${borderSubtle}`, boxShadow: cardShadow }}>
            
            {/* Encabezado de Sección con Título, Subtítulo y Botones de Exportación */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-extrabold text-theme-text tracking-wide uppercase">REGISTRO DE PAGOS</h2>
                <p className="text-theme-text-muted text-[10px] mt-0.5 font-bold uppercase tracking-wider">HISTORIAL Y MONITOREO DE TRANSACCIONES Y MÉTODOS DE PAGO</p>
              </div>

              {/* Botones de Exportación */}
              <div className="flex flex-col items-end max-md:items-start gap-1 print:hidden">
                <div className="flex items-center gap-2 max-md:flex-wrap">
                  <button
                    onClick={() => handleExport('Excel')}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 max-md:px-3 py-2.5 max-md:py-1.5 rounded-2xl max-md:rounded-xl shadow-md transition-all duration-200 cursor-pointer flex justify-center items-center gap-1.5 text-xs opacity-100"
                  >
                    <Download size={14} /> <span className="max-md:hidden">Excel</span><span className="md:hidden">XLS</span>
                  </button>
                  <button
                    onClick={() => handleExport('CSV')}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 max-md:px-3 py-2.5 max-md:py-1.5 rounded-2xl max-md:rounded-xl shadow-md transition-all duration-200 cursor-pointer flex justify-center items-center gap-1.5 text-xs opacity-100"
                  >
                    <Download size={14} /> CSV
                  </button>
                  <button
                    onClick={() => handleExport('PDF')}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold px-4 max-md:px-3 py-2.5 max-md:py-1.5 rounded-2xl max-md:rounded-xl shadow-md transition-all duration-200 cursor-pointer flex justify-center items-center gap-1.5 text-xs opacity-100"
                  >
                    <FileText size={14} /> PDF
                  </button>
                </div>
                <span className="text-[9px] font-bold text-theme-text-muted uppercase tracking-wider mt-1">
                  EXPORTA LA LISTA FILTRADA A EXCEL, CSV O PDF
                </span>
              </div>
            </div>

            {/* FILA 1: Buscador a ancho completo */}
            <div className="flex items-center gap-3 w-full pt-1">
              <div className="flex-1 relative">
                <Search 
                  size={15} 
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none z-10" 
                />
                <input 
                  type="text" 
                  value={search}
                  placeholder="Buscar por cliente, folio..." 
                  style={{ 
                    backgroundColor: bgInput, 
                    borderColor: borderSubtle 
                  }}
                  className="w-full pl-10 pr-9 py-2.5 border rounded-xl text-xs text-theme-text placeholder:text-theme-text-muted/60 focus:outline-none focus:border-brand-500 hover:border-slate-400 dark:hover:border-slate-500 transition-all shadow-xs"
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer p-0.5"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* FILA 2: Dropdowns con scroll horizontal + contador */}
            <div className="flex items-center gap-2.5 w-full overflow-x-auto scrollbar-none pb-1">
              
              <Dropdown
                options={TIEMPO_OPTIONS}
                value={filtroTiempo}
                onChange={setFiltroTiempo}
                placeholder="Tiempo"
                className="shrink-0 w-44 text-xs"
              />

              <Dropdown
                options={METODO_OPTIONS}
                value={filtroMetodo}
                onChange={setFiltroMetodo}
                placeholder="Cualquier Método"
                className="shrink-0 w-44 text-xs"
              />

              <Dropdown
                options={ESTADO_OPTIONS}
                value={filtroEstado}
                onChange={setFiltroEstado}
                placeholder="Cualquier Estado"
                className="shrink-0 w-44 text-xs"
              />

              {/* Contador de registros en tiempo real */}
              <div className="text-xs font-mono shrink-0 flex items-center gap-1.5 ml-auto pl-3 border-l border-theme-border-subtle">
                <span className="text-theme-text font-bold">{metricas.total_registros ?? paymentsList.length} reg :</span>
                <span className="text-emerald-500 dark:text-emerald-400 font-extrabold text-sm tracking-tight">{fmt(metricas.suma_total ?? resumen.total_cobrado)}</span>
              </div>
              
            </div>

            <div className="space-y-4 mt-4">
              <div className="overflow-x-auto w-full">
                <Table className="min-w-[900px]" shadow="shadow-none" headers={['Folio', 'Cliente', 'Método', 'Monto', 'Fecha', 'Estado', 'Acciones']}>
                {currentPayments?.map((pay, index) => {
                  const normMethod = (pay.payment_method || 'cash').toLowerCase()
                  const MIcon = METHOD_ICONS[normMethod] || CreditCard
                  const delayClass = `delay-${Math.min(index + 1, 5)}`
                  return (
                    <tr 
                      key={pay.id} 
                      className={`h-16 border-b transition-colors duration-150 animate-fadeInUp text-xs ${delayClass}`}
                      style={{ backgroundColor: 'var(--theme-surface)', borderColor: borderSubtle }}
                    >
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-mono font-black text-sm tracking-[1px] text-slate-900 dark:text-white">
                          {formatearFolioPago(pay.folio, pay.created_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm text-theme-text font-medium">{pay.customer_name}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold tracking-wide ${METHOD_COLORS[normMethod] || 'text-theme-text'}`}>
                          <MIcon size={14} className="shrink-0 stroke-[2.5]" />
                          <span>{METHOD_MAP_LABEL[normMethod] || pay.payment_method}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-sm font-bold font-mono tracking-tight ${pay.payment_status === 'paid' ? 'text-emerald-500 dark:text-emerald-400' : pay.payment_status === 'cancelled' ? 'text-rose-500 dark:text-rose-400' : 'text-amber-500 dark:text-amber-400'}`}>
                          {fmt(pay.total_amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-theme-text-muted whitespace-nowrap">{pay.created_at || 'N/A'}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={pay.payment_status}/>
                      </td>
                      <td className="px-4 py-3.5 text-center print:hidden">
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => setDetailPaymentId(pay.id)}
                            className="inline-flex items-center gap-1.5 bg-theme-input hover:bg-theme-surface
                                       text-theme-text hover:text-brand-600 dark:hover:text-brand-400 border border-theme-border-subtle
                                       hover:border-theme-border rounded-xl px-3 py-1.5 text-xs font-semibold
                                       shadow-xs hover:shadow transition-all duration-200 cursor-pointer whitespace-nowrap"
                          >
                            <Eye size={13} />
                            Ver detalle
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {currentPayments.length > 0 && Array.from({ length: ITEMS_PER_PAGE - currentPayments.length }).map((_, i) => (
                  <tr key={`empty-${i}`} className="h-16 border-b border-transparent" style={{ backgroundColor: 'var(--theme-surface)' }}>
                    <td colSpan={7}></td>
                  </tr>
                ))}
                {(!Array.isArray(paymentsList) || paymentsList.length === 0) && (
                  <tr style={{ backgroundColor: 'var(--theme-surface)' }}>
                    <td colSpan={7} className="p-0 border-none" style={{ backgroundColor: 'var(--theme-surface)' }}>
                      <div className="h-[32rem] flex items-center justify-center" style={{ backgroundColor: 'var(--theme-surface)' }}>
                        <EmptyState
                          icon={CreditCard}
                          title="No se encontraron pagos"
                          description="No hay transacciones ni registros que coincidan con la búsqueda o los filtros aplicados."
                        />
                      </div>
                    </td>
                  </tr>
                )}
              </Table>
            </div>

              {/* Footer de Paginación */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t" style={{ borderColor: borderSubtle }}>
                {/* Lado izquierdo: Conteo */}
                <div className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                  {paymentsList.length === 0 ? (
                    <span>Mostrando <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>0</span> a <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>0</span> de <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>0</span> registros</span>
                  ) : (
                    <span>Mostrando <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>{startItem}</span> a <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>{endItem}</span> de <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>{paymentsList.length}</span> registros</span>
                  )}
                </div>

                {/* Lado derecho: Botones Anterior / Siguiente */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1 || paymentsList.length === 0}
                    className="px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5"
                    style={currentPage > 1 && paymentsList.length > 0 ? {
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
                    <span>Anterior</span>
                  </button>

                  <div className="px-3 py-1 text-xs font-bold font-mono rounded-xl" style={{ backgroundColor: 'var(--theme-input)', color: 'var(--theme-text)' }}>
                    {paymentsList.length === 0 ? 1 : currentPage} / {totalPages}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage >= totalPages || paymentsList.length === 0}
                    className="px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5"
                    style={currentPage < totalPages && paymentsList.length > 0 ? {
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
                    <span>Siguiente</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {detailPaymentId && (
        <PaymentDetailModal
          paymentId={detailPaymentId}
          onClose={() => setDetailPaymentId(null)}
        />
      )}
    </div>
  )
}
