import { useState, useMemo, useRef, useEffect } from 'react'
import {
  TrendingUp, TrendingDown, ShoppingBag, Users, Star, Download,
  Zap, BarChart3, FileText, RefreshCw
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import ScrollHint from '../../../components/ui/ScrollHint'
import EmptyState from '../../../components/ui/EmptyState'
import Toast from '../../../components/ui/Toast'
import { adminGetSales } from '../../../api/sales'
import { useTheme } from '../../../context/ThemeContext'

/* ── Helpers ── */
const fmt = (n) =>
  `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const PERIODS = [
  { id: 'hoy',    label: 'Hoy'    },
  { id: 'semana', label: 'Semana' },
  { id: 'mes',    label: 'Mes'    },
  { id: 'anio',   label: 'Año'    },
]

/* ── Tooltip personalizado del AreaChart ── */
function SalesTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-theme-card border border-theme-border-subtle rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-theme-text-muted text-xs mb-1">{label}</p>
      <p className="text-theme-text font-bold text-base">{fmt(payload[0].value)}</p>
      <p className="text-theme-text-muted text-xs mt-0.5">en ventas</p>
    </div>
  )
}

/* ── KPI Card ── */
function KpiCard({ label, value, icon: Icon, color, trend }) {
  const { bgSubcard, borderSubtle, cardShadow, textColor, textMuted, colorPrimario } = useTheme()
  const cardStyles = {
    brand: {
      iconBgStyle: { backgroundColor: `${colorPrimario}18`, borderColor: `${colorPrimario}35`, color: colorPrimario },
      topBorderColor: colorPrimario,
      activeColor: colorPrimario
    },
    emerald: {
      iconBgStyle: { backgroundColor: 'rgba(16, 185, 129, 0.18)', borderColor: 'rgba(16, 185, 129, 0.35)', color: '#10B981' },
      topBorderColor: '#10B981',
      activeColor: '#10B981'
    },
    blue: {
      iconBgStyle: { backgroundColor: 'rgba(59, 130, 246, 0.18)', borderColor: 'rgba(59, 130, 246, 0.35)', color: '#3B82F6' },
      topBorderColor: '#3B82F6',
      activeColor: '#3B82F6'
    },
    amber: {
      iconBgStyle: { backgroundColor: 'rgba(217, 119, 6, 0.18)', borderColor: 'rgba(217, 119, 6, 0.4)', color: '#D97706' },
      topBorderColor: '#D97706',
      activeColor: '#D97706'
    }
  }

  const s = cardStyles[color] || cardStyles.brand
  const trendVal = typeof trend === 'number' ? trend : parseFloat(trend) || 0
  const isPositive = trendVal >= 0
  const trendStr = isPositive ? `+${trendVal.toFixed(1)}%` : `${trendVal.toFixed(1)}%`
  const trendColor = isPositive ? 'text-emerald-500' : 'text-red-500'
  const TrendIcon  = isPositive ? TrendingUp : TrendingDown

  return (
    <div 
      style={{ 
        backgroundColor: bgSubcard, 
        borderTop: `2px solid ${s.topBorderColor}`,
        borderRight: `1px solid ${borderSubtle}`,
        borderBottom: `1px solid ${borderSubtle}`,
        borderLeft: `1px solid ${borderSubtle}`,
        boxShadow: cardShadow,
        color: textColor
      }}
      className="card-primary-hover rounded-2xl px-4.5 py-3.5 sm:px-5 sm:py-3.5 flex flex-col justify-between min-h-[125px] sm:min-h-[128px] gap-2 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300"
    >
      
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none opacity-40" />

      <div className="flex items-start justify-between relative z-10">
        <p className="text-[10.5px] sm:text-[11px] font-bold uppercase tracking-wider" style={{ color: textMuted }}>{label}</p>
        {Icon && (
          <div 
            className="w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 shadow-xs"
            style={s.iconBgStyle}
          >
            <Icon size={14} />
          </div>
        )}
      </div>
      
      <div className="relative z-10 my-0.5">
        <p className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: textColor }}>{value}</p>
      </div>

      <div 
        className={`flex items-center gap-1.5 ${trendColor} text-[10px] sm:text-[11px] font-bold relative z-10 border-t pt-2 mt-0.5`}
        style={{ borderColor: borderSubtle }}
      >
        <TrendIcon size={13} className="stroke-[2.5]" />
        <span className="truncate">{trendStr} <span className="font-semibold ml-0.5" style={{ color: textMuted }}>vs período anterior</span></span>
      </div>

      {/* Watermark icon */}
      {Icon && (
        <div 
          className="absolute bottom-2 right-2 opacity-[0.20] group-hover:opacity-[0.35] pointer-events-none z-0 group-hover:scale-110 transition-all duration-500 ease-out" 
          style={{ 
            color: s.activeColor,
            filter: `drop-shadow(0 0 8px ${s.activeColor}80)`
          }}
        >
          <Icon size={38} />
        </div>
      )}
    </div>
  )
}

/* ── Intensity Config — Horarios Pico ── */
const INTENSITY_CONFIG = {
  pico: {
    bar: 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500',
    text: 'text-amber-600 dark:text-amber-400 font-black',
    badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    label: 'Pico',
    tag: 'Máxima demanda'
  },
  alto: {
    bar: 'bg-gradient-to-r from-violet-600 to-purple-500',
    text: 'text-violet-600 dark:text-violet-400 font-bold',
    badge: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
    label: 'Alto',
    tag: 'Alta afluencia'
  },
  medio: {
    bar: 'bg-gradient-to-r from-blue-600 to-cyan-500',
    text: 'text-blue-600 dark:text-blue-400 font-semibold',
    badge: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
    label: 'Medio',
    tag: 'Afluencia moderada'
  },
  bajo: {
    bar: 'bg-slate-200 dark:bg-slate-700/60',
    text: 'text-slate-600 dark:text-slate-400 font-medium',
    badge: 'bg-theme-input text-theme-text-muted border-theme-border-subtle',
    label: 'Bajo',
    tag: 'Baja afluencia'
  },
}

const EMOJI_INTENSITY = { pico: '🔥', alto: '⚡', medio: '📊', bajo: '💤' }

/* ── Skeleton Component ── */
function SalesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex xl:grid xl:grid-cols-4 gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory pb-4 w-full hide-scrollbar items-stretch">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex-1 min-w-[280px] md:min-w-[320px] xl:min-w-0 snap-center">
            <div className="animate-shimmer rounded-2xl h-36 w-full" />
          </div>
        ))}
      </div>
      <div className="animate-shimmer rounded-2xl h-40 w-full" />
      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-5">
        <div className="animate-shimmer rounded-2xl h-80 w-full" />
        <div className="animate-shimmer rounded-2xl h-80 w-full" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        <div className="animate-shimmer rounded-2xl h-96 w-full" />
        <div className="animate-shimmer rounded-2xl h-96 w-full" />
      </div>
    </div>
  )
}

/* ── Main Component ── */
export default function Sales() {
  const { isLight, bgBody, bgSurface, bgCard, bgSubcard, borderSubtle, cardShadow, colorPrimario, primaryBtnText } = useTheme()
  const [period, setPeriod] = useState('hoy')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [toast, setToast] = useState(null)
  
  const [dishesScrolled, setDishesScrolled] = useState(false)
  const [peakScrolled, setPeakScrolled] = useState(false)
  const [peakFilter, setPeakFilter] = useState('activos') // 'activos' | 'top' | 'todos'
  const dishesScrollRef = useRef(null)

  const [salesData, setSalesData] = useState({
    resumen: {
      ventas_periodo: 0,
      total_pedidos: 0,
      ticket_promedio: 0,
      clientes_atendidos: 0,
      variacion_ventas: 0,
      variacion_pedidos: 0,
      variacion_ticket: 0,
      variacion_clientes: 0
    },
    resumen_inteligente: {
      crecimiento_comercial: '',
      demanda_horarios: '',
      rendimiento_menu: ''
    },
    tendencia_ventas: [],
    horarios_pico: [],
    top_platillos: [],
    categorias: []
  })

  // Fetch sales analytics data from API
  const fetchSalesData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true)
      else setRefreshing(true)

      const res = await adminGetSales({ periodo: period })
      if (res.data) {
        setSalesData({
          resumen: res.data.resumen || {
            ventas_periodo: 0,
            total_pedidos: 0,
            ticket_promedio: 0,
            clientes_atendidos: 0,
            variacion_ventas: 0,
            variacion_pedidos: 0,
            variacion_ticket: 0,
            variacion_clientes: 0
          },
          resumen_inteligente: res.data.resumen_inteligente || {
            crecimiento_comercial: 'Sin datos disponibles',
            demanda_horarios: 'Sin datos disponibles',
            rendimiento_menu: 'Sin datos disponibles'
          },
          tendencia_ventas: res.data.tendencia_ventas || [],
          horarios_pico: res.data.horarios_pico || [],
          top_platillos: res.data.top_platillos || [],
          categorias: res.data.categorias || []
        })
      }
    } catch (err) {
      console.error("Error al cargar análisis de ventas:", err)
      setToast({ message: "No se pudieron actualizar las ventas con el servidor", type: "error" })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Load data on period change
  useEffect(() => {
    fetchSalesData(false)
  }, [period])

  // Auto refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSalesData(true)
    }, 60000)
    return () => clearInterval(interval)
  }, [period])

  const resumen = salesData.resumen
  const resumenInteligente = salesData.resumen_inteligente
  const tendenciaList = salesData.tendencia_ventas
  const horariosPicoList = salesData.horarios_pico
  const topPlatillosList = salesData.top_platillos
  const categoriasList = salesData.categorias

  // Calculate average sales line for chart
  const avgSales = useMemo(() => {
    if (!tendenciaList || tendenciaList.length === 0) return 0
    const sum = tendenciaList.reduce((acc, item) => acc + (Number(item.total) || 0), 0)
    return sum / tendenciaList.length
  }, [tendenciaList])

  // Peak hour highlight item (only if it has real orders)
  const peakHourItem = useMemo(() => {
    if (!horariosPicoList || horariosPicoList.length === 0) return null
    const valid = horariosPicoList.filter(h => (h.pedidos || 0) > 0)
    if (valid.length === 0) return null
    return valid.reduce((prev, curr) => ((curr.pedidos || 0) > (prev.pedidos || 0) ? curr : prev), valid[0])
  }, [horariosPicoList])

  // Processed peak list based on current filter / sorting mode
  const displayPeakList = useMemo(() => {
    if (!horariosPicoList || horariosPicoList.length === 0) return []
    if (peakFilter === 'top') {
      return [...horariosPicoList].sort((a, b) => ((b.pedidos || 0) - (a.pedidos || 0)) || ((b.ventas || 0) - (a.ventas || 0)))
    }
    if (peakFilter === 'activos') {
      const activeOnly = horariosPicoList.filter(h => (h.pedidos || 0) > 0)
      return activeOnly.length > 0 ? activeOnly : horariosPicoList
    }
    return horariosPicoList
  }, [horariosPicoList, peakFilter])

  // Max peak count for relative progress bars
  const maxPeakCount = useMemo(() => {
    if (!horariosPicoList || horariosPicoList.length === 0) return 1
    const max = Math.max(...horariosPicoList.map(h => h.pedidos || 0))
    return max > 0 ? max : 1
  }, [horariosPicoList])

  const hasData = useMemo(() => {
    return (tendenciaList && tendenciaList.length > 0) || (resumen && Number(resumen.ventas_periodo) > 0) || (topPlatillosList && topPlatillosList.length > 0)
  }, [tendenciaList, resumen, topPlatillosList])

  // Export File Generator (Excel, CSV, PDF)
  const handleExport = (type) => {
    if (!hasData) {
      setToast({ message: "No hay datos disponibles para exportar", type: "error" })
      return
    }

    const periodLabel = PERIODS.find(p => p.id === period)?.label || 'Hoy'
    const timestamp = new Date().toLocaleString('es-MX')

    if (type === 'CSV' || type === 'Excel') {
      let csv = `REPORTE DE ANÁLISIS DE VENTAS\n`
      csv += `Fecha de generación: ${timestamp}\n`
      csv += `Período seleccionado: ${periodLabel.toUpperCase()}\n\n`

      csv += `RESUMEN GENERAL\n`
      csv += `Ventas del Período,Total Pedidos,Ticket Promedio,Clientes Atendidos\n`
      csv += `"${fmt(resumen.ventas_periodo)}",${resumen.total_pedidos},"${fmt(resumen.ticket_promedio)}",${resumen.clientes_atendidos}\n\n`

      csv += `RESUMEN INTELIGENTE\n`
      csv += `Crecimiento Comercial,"${(resumenInteligente.crecimiento_comercial || '').replace(/"/g, '""')}"\n`
      csv += `Demanda y Horarios,"${(resumenInteligente.demanda_horarios || '').replace(/"/g, '""')}"\n`
      csv += `Rendimiento de Menú,"${(resumenInteligente.rendimiento_menu || '').replace(/"/g, '""')}"\n\n`

      csv += `TENDENCIA DE VENTAS\n`
      csv += `Fecha / Hora,Total Ventas ($)\n`
      tendenciaList.forEach(item => {
        csv += `"${item.fecha}",${item.total}\n`
      })
      csv += `\n`

      csv += `HORARIOS PICO\n`
      csv += `Hora,Rango Horario,Pedidos Registrados,Ventas Generadas ($),Ticket Promedio ($),Porcentaje Demanda (%),Nivel de Demanda\n`
      horariosPicoList.forEach(item => {
        csv += `"${item.hora}","${item.rango || item.hora}",${item.pedidos || 0},${item.ventas || 0},${item.ticket_promedio || 0},${item.porcentaje || 0}%,"${item.nivel}"\n`
      })
      csv += `\n`

      csv += `TOP PLATILLOS\n`
      csv += `Platillo,Categoría,Ingresos ($),Cantidad Vendida\n`
      topPlatillosList.forEach(item => {
        csv += `"${item.name}","${item.categoria}",${item.ingresos},${item.cantidad}\n`
      })
      csv += `\n`

      csv += `CATEGORÍAS\n`
      csv += `Categoría,Ingresos ($),Participación (%)\n`
      categoriasList.forEach(item => {
        csv += `"${item.name}",${item.ingresos},${item.participacion}%\n`
      })

      const filename = `Analisis_Ventas_${period}_${new Date().toISOString().slice(0, 10)}.${type === 'Excel' ? 'csv' : 'csv'}`
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setToast({ message: `Reporte ${type} exportado correctamente`, type: 'success' })
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
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-theme-text tracking-wide">Análisis de Ventas</h1>
          <p className="text-theme-text-muted text-sm mt-1.5 font-medium max-w-xl leading-relaxed">
            Comportamiento comercial y rendimiento económico del restaurante durante el período seleccionado.
          </p>
        </div>
        <div className="flex items-center gap-2 max-md:flex-wrap">
          <button
            onClick={() => handleExport('Excel')}
            className="flex justify-center items-center gap-1.5 text-xs bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 max-md:px-3 py-2.5 max-md:py-1.5 rounded-2xl max-md:rounded-xl transition-all duration-200 cursor-pointer shadow-md opacity-100"
          >
            <Download size={14} /> <span className="max-md:hidden">Excel</span><span className="md:hidden">XLS</span>
          </button>
          <button
            onClick={() => handleExport('CSV')}
            className="flex justify-center items-center gap-1.5 text-xs bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 max-md:px-3 py-2.5 max-md:py-1.5 rounded-2xl max-md:rounded-xl transition-all duration-200 cursor-pointer shadow-md opacity-100"
          >
            <Download size={14} /> CSV
          </button>
          <button
            onClick={() => handleExport('PDF')}
            className="flex justify-center items-center gap-1.5 text-xs bg-red-500 hover:bg-red-600 text-white font-bold px-4 max-md:px-3 py-2.5 max-md:py-1.5 rounded-2xl max-md:rounded-xl transition-all duration-200 cursor-pointer shadow-md opacity-100"
          >
            <FileText size={14} /> PDF
          </button>
        </div>
      </div>

      {/* Filtro de período con contenedor de fondo */}
      <div className="inline-flex max-md:flex items-center justify-between gap-1.5 p-1.5 rounded-2xl border shadow-xs max-md:w-full" style={{ backgroundColor: bgCard, borderColor: borderSubtle }}>
        {PERIODS.map(p => {
          const isActive = period === p.id
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              style={
                isActive
                  ? { backgroundColor: colorPrimario || '#dc2626', color: '#ffffff' }
                  : { backgroundColor: colorPrimario ? `${colorPrimario}18` : 'rgba(220, 38, 38, 0.12)', color: colorPrimario || '#b91c1c' }
              }
              className="px-3.5 py-1.5 max-md:flex-1 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shadow-xs hover:opacity-90 text-center"
            >
              {p.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <SalesSkeleton />
      ) : (
        <>
          {/* 4 KPI Cards con Contenedor de Fondo Nivel 1 */}
          <div className="rounded-2xl p-6 max-md:p-3 transition-colors duration-200" style={{ backgroundColor: bgCard, border: `1px solid ${borderSubtle}`, boxShadow: cardShadow }}>
            <div className="flex xl:grid xl:grid-cols-4 gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory pb-4 w-full hide-scrollbar items-stretch">
              
              {/* Tarjeta 1: Ventas del Período */}
              <div className="flex-1 min-w-[280px] max-md:min-w-[260px] md:min-w-[320px] xl:min-w-0 snap-center">
                <KpiCard
                  label="Ventas del período"
                  value={fmt(resumen.ventas_periodo)}
                  icon={TrendingUp}
                  color="brand"
                  trend={resumen.variacion_ventas}
                />
              </div>

              {/* Tarjeta 2: Total Pedidos */}
              <div className="flex-1 min-w-[280px] max-md:min-w-[260px] md:min-w-[320px] xl:min-w-0 snap-center">
                <KpiCard
                  label="Total pedidos"
                  value={Number(resumen.total_pedidos || 0).toLocaleString()}
                  icon={ShoppingBag}
                  color="blue"
                  trend={resumen.variacion_pedidos}
                />
              </div>

              {/* Tarjeta 3: Ticket Promedio */}
              <div className="flex-1 min-w-[280px] max-md:min-w-[260px] md:min-w-[320px] xl:min-w-0 snap-center">
                <KpiCard
                  label="Ticket promedio"
                  value={fmt(resumen.ticket_promedio)}
                  icon={Star}
                  color="amber"
                  trend={resumen.variacion_ticket}
                />
              </div>

              {/* Tarjeta 4: Clientes Atendidos */}
              <div className="flex-1 min-w-[280px] max-md:min-w-[260px] md:min-w-[320px] xl:min-w-0 snap-center">
                <KpiCard
                  label="Clientes atendidos"
                  value={Number(resumen.clientes_atendidos || 0).toLocaleString()}
                  icon={Users}
                  color="emerald"
                  trend={resumen.variacion_clientes}
                />
              </div>

            </div>
          </div>

          {/* Resumen Inteligente */}
          <div className="resumen-inteligente-bg border border-brand-500/20 rounded-2xl p-6 max-md:p-4 shadow-2xl shadow-brand-900/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 blur-[80px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-10 w-40 h-40 bg-blue-500/10 blur-[60px] rounded-full pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start md:items-center">
              <div className="w-14 h-14 rounded-2xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center shrink-0 animate-pulse">
                <Zap size={26} className="text-brand-400" />
              </div>

              <div className="space-y-4 flex-1 min-w-0 w-full">
                <h2 className="text-lg font-black text-theme-text tracking-wide">Resumen Inteligente</h2>
                <div className="flex max-md:overflow-x-auto max-md:snap-x max-md:snap-mandatory hide-scrollbar md:grid md:grid-cols-3 gap-5 max-md:pb-2 w-full">
                  <div className="flex-1 min-w-[280px] max-md:min-w-[260px] md:min-w-0 snap-center">
                    <p className="text-sm text-theme-text-muted leading-relaxed">
                      <strong className="text-theme-text block mb-1">Crecimiento Comercial</strong>
                      {resumenInteligente.crecimiento_comercial || 'Sin datos de crecimiento disponibles.'}
                    </p>
                  </div>
                  <div className="flex-1 min-w-[280px] max-md:min-w-[260px] md:min-w-0 snap-center">
                    <p className="text-sm text-theme-text-muted leading-relaxed">
                      <strong className="text-theme-text block mb-1">Demanda y Horarios</strong>
                      {resumenInteligente.demanda_horarios || 'Sin datos de horarios disponibles.'}
                    </p>
                  </div>
                  <div className="flex-1 min-w-[280px] max-md:min-w-[260px] md:min-w-0 snap-center">
                    <p className="text-sm text-theme-text-muted leading-relaxed">
                      <strong className="text-theme-text block mb-1">Rendimiento de Menú</strong>
                      {resumenInteligente.rendimiento_menu || 'Sin datos de platillos o categorías disponibles.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AreaChart + Horarios Pico */}
          <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-5">

            {/* AreaChart Tendencia de Ventas */}
            <div className="rounded-2xl p-6 max-md:p-3 transition-colors duration-200 animate-fadeInUp flex flex-col justify-between" style={{ backgroundColor: bgCard, border: `1px solid ${borderSubtle}`, boxShadow: cardShadow }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-theme-text font-bold text-lg tracking-wide flex items-center gap-2">
                    📈 Tendencia de Ventas
                  </p>
                  <p className="text-theme-text-muted text-xs mt-1 font-medium">Comportamiento de ingresos durante el período ({period})</p>
                </div>
                <div className="p-2.5 rounded-xl border max-md:hidden" style={{ backgroundColor: `${colorPrimario}18`, borderColor: `${colorPrimario}30` }}>
                  <BarChart3 size={20} style={{ color: colorPrimario }} />
                </div>
              </div>

              {/* Sub-Card Container Nivel 2 */}
              <div className="rounded-2xl p-4 max-md:p-2 mt-4 flex-1 flex flex-col justify-between" style={{ backgroundColor: bgSubcard, border: `1px solid ${borderSubtle}` }}>
                {/* Contenedor Nivel 3 (Inner Box Central — Vinculado a bgCard / Modo Claro / Oscuro) */}
                <div className="rounded-2xl border transition-colors duration-200 overflow-hidden w-full flex-1 flex flex-col justify-center p-4 max-md:p-2 min-h-[300px] max-md:min-h-[200px]" style={{ backgroundColor: bgCard, borderColor: borderSubtle }}>
                  {tendenciaList.length === 0 || tendenciaList.every(t => t.total === 0) ? (
                    <div className="py-8">
                      <EmptyState
                        title="Sin datos disponibles"
                        description="La tendencia de ventas aparecerá cuando haya registros de pedidos en este período."
                        iconType="salesTrend"
                      />
                    </div>
                  ) : (
                    <div className="w-full flex-1 min-h-[280px] max-md:min-h-[200px] flex flex-col justify-center">
                      <ResponsiveContainer height={window.innerWidth < 768 ? 200 : 300} width="100%">
                        <AreaChart data={tendenciaList} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%"   stopColor={colorPrimario} />
                              <stop offset="100%" stopColor={colorPrimario} />
                            </linearGradient>
                            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%"   stopColor={colorPrimario} stopOpacity="0.35" />
                              <stop offset="60%"  stopColor={colorPrimario} stopOpacity="0.08" />
                              <stop offset="100%" stopColor={colorPrimario} stopOpacity="0" />
                            </linearGradient>
                            <filter id="lineGlow">
                              <feGaussianBlur stdDeviation="3" result="blur" />
                              <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                              </feMerge>
                            </filter>
                          </defs>

                          <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.06)"} vertical={false} />
                          <XAxis dataKey="fecha" tick={{ fill: isLight ? '#475569' : 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} dy={8} />
                          <YAxis tick={{ fill: isLight ? '#475569' : 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} width={window.innerWidth < 768 ? 40 : 60}
                            tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                          <Tooltip content={<SalesTooltip />} cursor={{ stroke: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)', strokeWidth: 1 }} />
                          <ReferenceLine y={avgSales} stroke={isLight ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)"} strokeDasharray="4 4"
                            label={{ value: 'Prom', position: 'insideTopRight', fill: isLight ? '#64748b' : 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                          <Area type="monotone" dataKey="total"
                            stroke={colorPrimario} strokeWidth={2.5}
                            fill="url(#areaGrad)" dot={false}
                            activeDot={{ r: 5, fill: colorPrimario, stroke: isLight ? '#020617' : '#ffffff', strokeWidth: 2, filter: 'url(#lineGlow)' }}
                            filter="url(#lineGlow)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Horarios Pico */}
            <div className="rounded-2xl p-6 max-md:p-3 transition-colors duration-200 animate-fadeInUp flex flex-col justify-between" style={{ backgroundColor: bgCard, border: `1px solid ${borderSubtle}`, boxShadow: cardShadow }}>
              <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-theme-text font-bold text-lg flex items-center gap-2">
                    ⏰ Horarios Pico
                  </h3>
                  <p className="text-theme-text-muted text-xs mt-0.5 font-medium">Distribución de demanda e ingresos por hora</p>
                </div>
                {peakHourItem && peakHourItem.pedidos > 0 ? (
                  <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-1.5 shadow-xs max-md:w-full max-md:justify-center">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-amber-600 dark:text-amber-400 text-xs font-black text-center">
                      Pico: {peakHourItem.hora} ({peakHourItem.pedidos} ped • {fmt(peakHourItem.ventas)})
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 bg-theme-input border border-theme-border-subtle rounded-xl px-2.5 py-1 text-theme-text-muted text-xs font-semibold max-md:w-full max-md:justify-center">
                    <span>Sin pico registrado</span>
                  </div>
                )}
              </div>

              {/* Sub-Card Container Nivel 2 */}
              <div className="rounded-2xl p-4 max-md:p-2 mt-4 flex-1 flex flex-col justify-between" style={{ backgroundColor: bgSubcard, border: `1px solid ${borderSubtle}` }}>
                {/* Contenedor Nivel 3 (Inner Box Central — Vinculado a bgCard / Modo Claro / Oscuro) */}
                <div className="rounded-2xl border transition-colors duration-200 overflow-hidden w-full flex-1 flex flex-col justify-center p-4 max-md:p-2" style={{ backgroundColor: bgCard, borderColor: borderSubtle }}>
                  {horariosPicoList.length === 0 || horariosPicoList.every(h => (h.pedidos || 0) === 0) ? (
                    <div className="py-6">
                      <EmptyState
                        title="Sin datos disponibles"
                        description="Los horarios pico aparecerán cuando haya pedidos registrados en el período seleccionado."
                        iconType="peakHours"
                      />
                    </div>
                  ) : (
                    <>
                      {/* Filter / View Tabs */}
                      <div className="flex items-center justify-between gap-2 pb-3 mb-2 border-b border-theme-border-subtle/80 flex-wrap">
                        <span className="text-[11px] font-bold text-theme-text-muted uppercase tracking-wider">
                          {displayPeakList.length} {displayPeakList.length === 1 ? 'Horario' : 'Horarios'} {peakFilter === 'activos' ? '(con pedidos)' : ''}
                        </span>
                        <div className="inline-flex rounded-lg p-0.5 bg-theme-input border border-theme-border-subtle">
                          <button
                            type="button"
                            onClick={() => setPeakFilter('activos')}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                              peakFilter === 'activos'
                                ? 'bg-theme-card text-brand-600 dark:text-brand-400 shadow-xs'
                                : 'text-theme-text-muted hover:text-theme-text'
                            }`}
                          >
                            Activos
                          </button>
                          <button
                            type="button"
                            onClick={() => setPeakFilter('top')}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                              peakFilter === 'top'
                                ? 'bg-theme-card text-brand-600 dark:text-brand-400 shadow-xs'
                                : 'text-theme-text-muted hover:text-theme-text'
                            }`}
                          >
                            🔥 Top Pico
                          </button>
                          <button
                            type="button"
                            onClick={() => setPeakFilter('todos')}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                              peakFilter === 'todos'
                                ? 'bg-theme-card text-brand-600 dark:text-brand-400 shadow-xs'
                                : 'text-theme-text-muted hover:text-theme-text'
                            }`}
                          >
                            Todos (24h)
                          </button>
                        </div>
                      </div>

                      <div className="relative">
                        <div
                          onScroll={e => setPeakScrolled(e.currentTarget.scrollTop > 8)}
                          className="space-y-2.5 max-h-[19.5rem] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-theme-border-subtle scrollbar-track-transparent"
                        >
                          {displayPeakList.map(h => {
                            const cfg = INTENSITY_CONFIG[h.nivel] || INTENSITY_CONFIG.bajo
                            const pctBar = maxPeakCount > 0 ? Math.round(((h.pedidos || 0) / maxPeakCount) * 100) : 0
                            const isPeak = h.nivel === 'pico' && h.pedidos > 0

                            return (
                              <div
                                key={h.hora}
                                className={`group rounded-xl p-3 border transition-all duration-300 ${
                                  isPeak
                                    ? 'bg-amber-500/[0.08] border-amber-500/40 shadow-xs ring-1 ring-amber-500/20'
                                    : 'bg-theme-input/40 hover:bg-theme-input border-theme-border-subtle'
                                }`}
                              >
                                <div className="flex items-center gap-3.5">
                                  {/* Columna Hora */}
                                  <div className="w-16 shrink-0 flex flex-col justify-center">
                                    <span className="text-[9px] text-theme-text-muted uppercase font-extrabold tracking-wider">Hora</span>
                                    <span className={`text-sm font-mono font-black ${cfg.text}`}>{h.hora}</span>
                                    <span className="text-[10px] text-theme-text-muted font-medium leading-none mt-0.5">{h.rango || `${h.hora}`}</span>
                                  </div>
                                  
                                  {/* Barra de progreso y métricas reales */}
                                  <div className="flex-1 min-w-0 space-y-1.5">
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                      <div className="flex items-baseline gap-1.5">
                                        <span className="text-xs font-bold text-theme-text">
                                          {h.pedidos} {h.pedidos === 1 ? 'pedido' : 'pedidos'}
                                        </span>
                                        {h.pedidos > 0 && (
                                          <span className="text-[10px] text-theme-text-muted font-semibold">
                                            ({h.porcentaje}% demanda)
                                          </span>
                                        )}
                                      </div>
                                      
                                      <div className="flex items-center gap-2">
                                        {h.ventas > 0 ? (
                                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                            {fmt(h.ventas)}
                                          </span>
                                        ) : (
                                          <span className="text-[11px] text-theme-text-muted">
                                            $0.00
                                          </span>
                                        )}
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border tracking-wider transition-all inline-flex items-center gap-1 ${cfg.badge}`}>
                                          <span>{EMOJI_INTENSITY[h.nivel]}</span>
                                          <span>{cfg.label}</span>
                                        </span>
                                      </div>
                                    </div>
                                    
                                    {/* Barra de progreso */}
                                    <div className="h-2 bg-theme-input rounded-full overflow-hidden border border-theme-border-subtle relative">
                                      <div
                                        className={`h-full ${cfg.bar} rounded-full transition-all duration-700 ease-out`}
                                        style={{ width: `${Math.max(pctBar, h.pedidos > 0 ? 5 : 0)}%` }}
                                      />
                                    </div>

                                    {/* Sub-info: Ticket promedio */}
                                    {h.pedidos > 0 && (
                                      <div className="flex items-center justify-between text-[10px] text-theme-text-muted pt-0.5 font-medium">
                                        <span>Ticket prom: <b className="text-theme-text font-semibold">{fmt(h.ticket_promedio)}</b></span>
                                        <span className="text-[9px] opacity-80">{cfg.tag}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Leyenda y resumen inferior */}
                      <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-theme-border-subtle flex-wrap">
                        <div className="flex items-center gap-3 flex-wrap">
                          {Object.entries(INTENSITY_CONFIG).map(([key, cfg]) => (
                            <div key={key} className="flex items-center gap-1.5">
                              <div className={`w-2.5 h-2.5 rounded-full ${cfg.bar}`} />
                              <span className="text-[10px] font-semibold text-theme-text-muted">{cfg.label}</span>
                            </div>
                          ))}
                        </div>
                        {peakHourItem && peakHourItem.pedidos > 0 && (
                          <span className="text-[10px] text-theme-text-muted font-medium">
                            Mayor venta: <b className="text-emerald-600 dark:text-emerald-400 font-bold">{fmt(peakHourItem.ventas)}</b> a las {peakHourItem.hora}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Top Platillos + Categorías */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-md:gap-4 w-full">

            {/* Top Platillos */}
            <div className="rounded-2xl p-6 max-md:p-3 transition-colors duration-200 animate-fadeInUp flex flex-col justify-between" style={{ backgroundColor: bgCard, border: `1px solid ${borderSubtle}`, boxShadow: cardShadow }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-theme-text font-bold text-lg flex items-center gap-2">
                    🏆 Top Platillos
                    <span className="bg-brand-500/20 text-brand-300 text-[9px] px-2 py-0.5 rounded uppercase tracking-widest font-black max-md:hidden">Rentabilidad</span>
                  </p>
                  <p className="text-theme-text-muted text-xs mt-1 font-medium">¿Qué productos generan más dinero?</p>
                </div>
                <span className="text-[10px] text-theme-text-muted font-semibold uppercase tracking-wider mt-1">{topPlatillosList.length} platillos</span>
              </div>

              {/* Sub-Card Container Nivel 2 */}
              <div className="rounded-2xl p-4 max-md:p-2 mt-4 flex-1 flex flex-col justify-between" style={{ backgroundColor: bgSubcard, border: `1px solid ${borderSubtle}` }}>
                {/* Contenedor Nivel 3 (Inner Box Central — Vinculado a bgCard / Modo Claro / Oscuro) */}
                <div className="rounded-2xl border transition-colors duration-200 overflow-hidden w-full flex-1 flex flex-col justify-center" style={{ backgroundColor: bgCard, borderColor: borderSubtle }}>
                  {topPlatillosList.length > 0 ? (
                    <div className="relative">
                      <div
                        ref={dishesScrollRef}
                        onScroll={(e) => setDishesScrolled(e.currentTarget.scrollTop > 8)}
                        className="overflow-y-auto space-y-1"
                        style={{ height: '320px' }}
                      >
                        {topPlatillosList.map((d, index) => (
                          <div key={d.name || index} className="flex items-center gap-4 px-5 py-3.5 max-md:px-3 max-md:py-2.5 hover:bg-theme-input/40 transition-colors duration-200 group">
                            <span className={`text-sm font-black w-6 h-6 flex items-center justify-center rounded-lg shrink-0
                                             ${index === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                               : index === 1 ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                                               : index === 2 ? 'bg-orange-800/20 text-orange-400 border border-orange-800/30'
                                               : 'text-theme-text-muted'}`}>
                              {index + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-theme-text font-bold truncate group-hover:text-brand-400 transition-colors">{d.name}</p>
                              <p className="text-[11px] text-theme-text-muted font-medium mt-0.5"><span className="text-theme-text-muted">{d.categoria || 'Categoría'}</span> · {(d.cantidad || 0).toLocaleString()} porciones vendidas</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-[15px] font-black text-emerald-400">{fmt(d.ingresos || 0)}</p>
                              <p className="text-[10px] text-theme-text-muted uppercase tracking-wider font-bold mt-0.5 max-md:hidden">Ingreso Neto</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <ScrollHint visible={!dishesScrolled && topPlatillosList.length > 0} bgFrom={isLight ? "#FFFFFF" : "#191726"} text="Desplaza para ver todos los platillos" />
                    </div>
                  ) : (
                    <div className="p-8 flex-1 flex flex-col justify-center">
                      <EmptyState
                        title="Sin datos disponibles"
                        description="Los productos más vendidos y su rentabilidad aparecerán cuando haya registros de ventas."
                        iconType="dishes"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Categorías */}
            <div className="rounded-2xl p-6 max-md:p-3 transition-colors duration-200 animate-fadeInUp flex flex-col justify-between" style={{ backgroundColor: bgCard, border: `1px solid ${borderSubtle}`, boxShadow: cardShadow }}>
              <div>
                <p className="text-theme-text font-bold text-lg flex items-center gap-2">
                  📊 Categorías
                  <span className="bg-blue-500/20 text-blue-300 text-[9px] px-2 py-0.5 rounded uppercase tracking-widest font-black max-md:hidden">Participación</span>
                </p>
                <p className="text-theme-text-muted text-xs mt-1 font-medium">¿Qué secciones sostienen el negocio?</p>
              </div>

              {/* Sub-Card Container Nivel 2 */}
              <div className="rounded-2xl p-4 max-md:p-2 mt-4 flex-1 flex flex-col justify-between" style={{ backgroundColor: bgSubcard, border: `1px solid ${borderSubtle}` }}>
                {/* Contenedor Nivel 3 (Inner Box Central — Vinculado a bgCard / Modo Claro / Oscuro) */}
                <div className="rounded-2xl border transition-colors duration-200 overflow-hidden w-full flex-1 flex flex-col justify-center p-6 max-md:p-3" style={{ backgroundColor: bgCard, borderColor: borderSubtle }}>
                  {categoriasList.length > 0 ? (
                    <div className="space-y-6 w-full">
                      {categoriasList.map((cat, idx) => {
                        const colors = [
                          'bg-brand-500 text-brand-300',
                          'bg-emerald-500 text-emerald-300',
                          'bg-blue-500 text-blue-300',
                          'bg-purple-500 text-purple-300',
                          'bg-amber-500 text-amber-300'
                        ]
                        const catColor = colors[idx % colors.length]
                        return (
                          <div key={cat.name} className="space-y-2 group">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className={`w-3 h-3 rounded ${catColor.split(' ')[0]}`} />
                                <div>
                                  <p className="text-sm text-theme-text font-bold group-hover:text-brand-400 transition-colors">{cat.name}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-[15px] font-black text-theme-text block">{fmt(cat.ingresos || 0)}</span>
                                <span className="text-[11px] text-theme-text-muted font-bold">{cat.participacion || 0}% de ventas</span>
                              </div>
                            </div>
                            <div className="h-2 bg-theme-input rounded-full overflow-hidden">
                              <div
                                className={`h-full ${catColor.split(' ')[0]} rounded-full transition-all duration-1000 ease-out`}
                                style={{ width: `${cat.participacion || 0}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <EmptyState
                      title="Sin datos disponibles"
                      description="La distribución de ingresos por categoría aparecerá cuando haya registros de ventas."
                      iconType="categories"
                    />
                  )}
                </div>
              </div>
            </div>

          </div>
        </>
      )}

    </div>
  )
}
