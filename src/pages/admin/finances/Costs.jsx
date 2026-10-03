import { useState, useMemo, useEffect } from 'react'
import { useTheme } from '../../../context/ThemeContext'
import {
  PiggyBank, Leaf, Trash2, TrendingDown, Percent,
  BarChart3, Download, ArrowUpRight, ArrowDownRight,
  DollarSign, Package, FileText, PieChart, UtensilsCrossed, RefreshCw
} from 'lucide-react'
import {
  AreaChart, Area, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import StatCard from '../../../components/ui/StatCard'
import MetricCardsLayout from '../../../components/ui/MetricCardsLayout'
import EmptyState from '../../../components/ui/EmptyState'
import Toast from '../../../components/ui/Toast'
import { adminGetCosts } from '../../../api/costs'

/* ── Helpers ── */
const fmt = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const fmtDecimal = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const categoryColors = {
  'Carnes': 'bg-brand-500',
  'Mariscos': 'bg-blue-500',
  'Verduras': 'bg-emerald-500',
  'Lácteos': 'bg-amber-500',
  'Cereales': 'bg-cyan-500',
  'Salsas/Cond.': 'bg-rose-500'
}

/* ── Tooltip personalizado de Tendencia ── */
function CostsTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const data = payload[0].payload
  const label = data.semana || data.mes || data.label || 'Semana'
  return (
    <div 
      className="rounded-xl px-4 py-3 shadow-xl space-y-2 border transition-colors backdrop-blur-md"
      style={{
        backgroundColor: 'var(--theme-surface)',
        borderColor: 'var(--theme-border-subtle)',
        color: 'var(--theme-text)'
      }}
    >
      <p className="text-xs font-bold" style={{ color: 'var(--theme-text-muted)' }}>{label}</p>
      <div className="space-y-1.5">
        <div className="flex items-center gap-6 justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>Ingresos:</span>
          </div>
          <span className="text-emerald-500 font-extrabold text-xs">{fmt(data.ingresos)}</span>
        </div>
        <div className="flex items-center gap-6 justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>Costos:</span>
          </div>
          <span className="text-rose-500 font-extrabold text-xs">{fmt(data.costos)}</span>
        </div>
      </div>
    </div>
  )
}

/* ── Badge de Categoría para Mermas ── */
function CategoryBadge({ categoryName }) {
  const colorClass = categoryColors[categoryName] || 'bg-theme-card'
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-theme-card border border-[var(--theme-card)] text-theme-text">
      <span className={`w-1.5 h-1.5 rounded-full ${colorClass}`} />
      {categoryName}
    </span>
  )
}

/* ── Skeleton Component ── */
function CostsSkeleton() {
  return (
    <div className="space-y-6">
      <MetricCardsLayout cols={5} gap="gap-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="animate-shimmer rounded-2xl h-32 w-full" />
        ))}
      </MetricCardsLayout>
      <div className="animate-shimmer rounded-2xl h-44 w-full" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        <div className="animate-shimmer rounded-2xl h-72 w-full" />
        <div className="animate-shimmer rounded-2xl h-72 w-full" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        <div className="animate-shimmer rounded-2xl h-80 w-full" />
        <div className="animate-shimmer rounded-2xl h-80 w-full" />
      </div>
    </div>
  )
}

/* ── Main Component ── */
export default function Costs() {
  const { isLight, bgBody, bgCard, bgSubcard, bgTable, borderSubtle, cardShadow, colorPrimario } = useTheme()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [toast, setToast] = useState(null)

  const [resumen, setResumen] = useState({
    costos_totales: 0,
    variacion_costos: 0,
    ingredientes: 0,
    porcentaje_ingredientes: 0,
    mermas: 0,
    porcentaje_mermas: 0,
    ganancia_bruta: 0,
    variacion_ganancia: 0,
    margen_neto: 0,
  })

  const [resumenFinanciero, setResumenFinanciero] = useState({
    ingresos_totales: 0,
    costos_totales: 0,
    ganancia_bruta: 0,
    porcentaje_ingresos: 0,
    porcentaje_costos: 0,
    porcentaje_ganancia: 0,
  })

  const [costosCategorias, setCostosCategorias] = useState([])
  const [tendenciaCostos, setTendenciaCostos] = useState([])
  const [mermasIngrediente, setMermasIngrediente] = useState([])
  const [costoPlatillo, setCostoPlatillo] = useState([])

  // Paginación Universal (8 registros por página)
  const ITEMS_PER_PAGE = 8
  const [wastePage, setWastePage] = useState(1)
  const [dishCostPage, setDishCostPage] = useState(1)

  const currentMermas = useMemo(() => {
    return mermasIngrediente.slice((wastePage - 1) * ITEMS_PER_PAGE, wastePage * ITEMS_PER_PAGE)
  }, [mermasIngrediente, wastePage])
  const totalWastePages = Math.max(1, Math.ceil(mermasIngrediente.length / ITEMS_PER_PAGE))
  const wasteStartItem = mermasIngrediente.length === 0 ? 0 : (wastePage - 1) * ITEMS_PER_PAGE + 1
  const wasteEndItem = Math.min(wastePage * ITEMS_PER_PAGE, mermasIngrediente.length)

  const currentDishCosts = useMemo(() => {
    return costoPlatillo.slice((dishCostPage - 1) * ITEMS_PER_PAGE, dishCostPage * ITEMS_PER_PAGE)
  }, [costoPlatillo, dishCostPage])
  const totalDishCostPages = Math.max(1, Math.ceil(costoPlatillo.length / ITEMS_PER_PAGE))
  const dishCostStartItem = costoPlatillo.length === 0 ? 0 : (dishCostPage - 1) * ITEMS_PER_PAGE + 1
  const dishCostEndItem = Math.min(dishCostPage * ITEMS_PER_PAGE, costoPlatillo.length)

  // Fetch Costs Data from API
  const fetchCostsData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true)
      else setRefreshing(true)

      const res = await adminGetCosts()
      if (res?.data) {
        if (res.data.resumen) setResumen(res.data.resumen)
        if (res.data.resumen_financiero) setResumenFinanciero(res.data.resumen_financiero)
        setCostosCategorias(Array.isArray(res.data.costos_por_categoria) ? res.data.costos_por_categoria : [])
        setTendenciaCostos(Array.isArray(res.data.tendencia_costos) ? res.data.tendencia_costos : [])
        setMermasIngrediente(Array.isArray(res.data.mermas_por_ingrediente) ? res.data.mermas_por_ingrediente : [])
        setCostoPlatillo(Array.isArray(res.data.costo_por_platillo) ? res.data.costo_por_platillo : [])
      } else {
        setCostosCategorias([])
        setTendenciaCostos([])
        setMermasIngrediente([])
        setCostoPlatillo([])
      }
    } catch (err) {
      console.error("Error al cargar datos de costos:", err)
      setToast({ message: "No se pudieron sincronizar los datos de costos con el servidor", type: "error" })
      setCostosCategorias([])
      setTendenciaCostos([])
      setMermasIngrediente([])
      setCostoPlatillo([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchCostsData(false)
  }, [])

  // Auto refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCostsData(true)
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  const maxCategoryCost = useMemo(() => {
    return Array.isArray(costosCategorias) && costosCategorias.length > 0
      ? Math.max(...costosCategorias.map(c => Number(c?.costo || 0)))
      : 0
  }, [costosCategorias])

  // Etiqueta dinámica del mes actual (ej. "Agosto 2026")
  const currentMonthLabel = useMemo(() => {
    const now = new Date()
    const monthName = now.toLocaleDateString('es-MX', { month: 'long' })
    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1)
    const year = now.getFullYear()
    return `${capitalizedMonth} ${year}`
  }, [])

  // Procesamiento y agrupación de tendencia de costos por semanas
  const tendenciaSemanas = useMemo(() => {
    if (!Array.isArray(tendenciaCostos) || tendenciaCostos.length === 0) {
      return [
        { semana: 'Semana 1', ingresos: 0, costos: 0 },
        { semana: 'Semana 2', ingresos: 0, costos: 0 },
        { semana: 'Semana 3', ingresos: 0, costos: 0 },
        { semana: 'Semana 4', ingresos: 0, costos: 0 },
      ]
    }

    // 1. Si ya viene con formato explícito de semanas
    const alreadyWeeks = tendenciaCostos.some(item => 
      (typeof item.semana === 'string' && item.semana.toLowerCase().includes('semana')) ||
      (typeof item.mes === 'string' && item.mes.toLowerCase().includes('semana')) ||
      (typeof item.label === 'string' && item.label.toLowerCase().includes('semana'))
    )
    if (alreadyWeeks) {
      return tendenciaCostos.map((item, idx) => ({
        ...item,
        semana: item.semana || item.mes || item.label || `Semana ${idx + 1}`,
        ingresos: Number(item.ingresos || item.total_ingresos || item.ventas || 0),
        costos: Number(item.costos || item.total_costos || 0)
      }))
    }

    // 2. Si contiene fechas (ISO, YYYY-MM-DD, etc.)
    const hasDates = tendenciaCostos.some(item => item.fecha || item.date || item.created_at || (item.dia && item.dia.includes('-')))
    if (hasDates) {
      const weeksMap = {
        'Semana 1': { semana: 'Semana 1', ingresos: 0, costos: 0 },
        'Semana 2': { semana: 'Semana 2', ingresos: 0, costos: 0 },
        'Semana 3': { semana: 'Semana 3', ingresos: 0, costos: 0 },
        'Semana 4': { semana: 'Semana 4', ingresos: 0, costos: 0 },
        'Semana 5': { semana: 'Semana 5', ingresos: 0, costos: 0 },
      }

      let hasWeek5 = false

      tendenciaCostos.forEach(item => {
        const rawDate = item.fecha || item.date || item.created_at || item.dia
        const d = new Date(rawDate)
        const day = !isNaN(d.getDate()) ? d.getDate() : 1
        const ing = Number(item.ingresos || item.total_ingresos || item.ventas || 0)
        const cos = Number(item.costos || item.total_costos || 0)

        if (day <= 7) {
          weeksMap['Semana 1'].ingresos += ing
          weeksMap['Semana 1'].costos += cos
        } else if (day <= 14) {
          weeksMap['Semana 2'].ingresos += ing
          weeksMap['Semana 2'].costos += cos
        } else if (day <= 21) {
          weeksMap['Semana 3'].ingresos += ing
          weeksMap['Semana 3'].costos += cos
        } else if (day <= 28) {
          weeksMap['Semana 4'].ingresos += ing
          weeksMap['Semana 4'].costos += cos
        } else {
          hasWeek5 = true
          weeksMap['Semana 5'].ingresos += ing
          weeksMap['Semana 5'].costos += cos
        }
      })

      return hasWeek5 ? Object.values(weeksMap) : Object.values(weeksMap).slice(0, 4)
    }

    // 3. Si son registros diarios o puntos secuenciales, agrupar en 4-5 semanas
    const numWeeks = tendenciaCostos.length > 28 ? 5 : 4
    const chunkSize = Math.max(1, Math.ceil(tendenciaCostos.length / numWeeks))
    const weeks = []

    for (let i = 0; i < numWeeks; i++) {
      const chunk = tendenciaCostos.slice(i * chunkSize, (i + 1) * chunkSize)
      const ingresos = chunk.reduce((sum, it) => sum + Number(it.ingresos || it.ventas || 0), 0)
      const costos = chunk.reduce((sum, it) => sum + Number(it.costos || 0), 0)
      weeks.push({
        semana: `Semana ${i + 1}`,
        ingresos,
        costos
      })
    }

    return weeks
  }, [tendenciaCostos])

  const hasData = useMemo(() => {
    return costosCategorias.length > 0 || mermasIngrediente.length > 0 || costoPlatillo.length > 0 || Number(resumen.costos_totales) > 0
  }, [costosCategorias, mermasIngrediente, costoPlatillo, resumen])

  const handleExport = (type) => {
    if (!hasData) {
      setToast({ message: "No hay datos disponibles para exportar", type: "error" })
      return
    }

    const timestamp = new Date().toLocaleString('es-MX')

    if (type === 'CSV' || type === 'Excel') {
      let csv = `REPORTE DE ANÁLISIS DE COSTOS Y RENTABILIDAD\n`
      csv += `Fecha de generación: ${timestamp}\n\n`
      csv += `RESUMEN GENERAL\n`
      csv += `Costos Totales,Ingredientes,Mermas,Ganancia Bruta,Margen Neto (%)\n`
      csv += `${resumen.costos_totales},${resumen.ingredientes},${resumen.mermas},${resumen.ganancia_bruta},${resumen.margen_neto}%\n\n`

      csv += `COSTO POR PLATILLO\n`
      csv += `Platillo,Costo Ingredientes ($),Precio Venta ($),Margen ($),Margen (%),Unidades Vendidas\n`
      costoPlatillo.forEach(p => {
        csv += `"${p.platillo}",${p.costo_ingredientes},${p.precio_venta},${p.margen},${p.margen_porcentaje}%,${p.unidades_vendidas}\n`
      })

      const filename = `Reporte_Costos_${new Date().toISOString().slice(0, 10)}.csv`
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setToast({ message: `Datos de costos exportados a ${type} correctamente`, type: 'success' })
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
          <h1 className="text-3xl font-bold text-theme-text">Costos</h1>
          <p className="text-theme-text-muted text-sm mt-1">
            Análisis de costos operativos y rentabilidad por producto
          </p>
        </div>
        <div className="flex items-center gap-2 max-md:flex-wrap">
          {refreshing && (
            <span className="text-xs text-brand-300 font-semibold flex items-center gap-1.5 bg-brand-500/10 px-3 py-2 rounded-xl border border-brand-500/20 mr-2 max-md:w-full max-md:justify-center">
              <RefreshCw size={13} className="animate-spin" /> Actualizando...
            </span>
          )}
          {[
            { id: 'Excel', label: 'Excel', shortLabel: 'XLS', icon: Download, className: 'bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 max-md:px-3 py-2.5 max-md:py-1.5 rounded-2xl max-md:rounded-xl shadow-md transition-all duration-200 cursor-pointer opacity-100 max-md:justify-center' },
            { id: 'CSV',   label: 'CSV',   shortLabel: 'CSV', icon: Download, className: 'bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 max-md:px-3 py-2.5 max-md:py-1.5 rounded-2xl max-md:rounded-xl shadow-md transition-all duration-200 cursor-pointer opacity-100 max-md:justify-center' },
            { id: 'PDF',   label: 'PDF',   shortLabel: 'PDF', icon: FileText, className: 'bg-red-500 hover:bg-red-600 text-white font-bold px-4 max-md:px-3 py-2.5 max-md:py-1.5 rounded-2xl max-md:rounded-xl shadow-md transition-all duration-200 cursor-pointer opacity-100 max-md:justify-center' }
          ].map(btn => (
            <button key={btn.id} onClick={() => handleExport(btn.id)}
              className={`flex items-center gap-1.5 text-xs ${btn.className}`}>
              <btn.icon size={14}/> <span className="max-md:hidden">{btn.label}</span><span className="md:hidden">{btn.shortLabel}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <CostsSkeleton />
      ) : (
        <>
          {/* KPI Cards con Contenedor Nivel 1 (Idéntico a Pagos) */}
          <div className="rounded-2xl p-6 max-md:p-3 transition-colors duration-200 overflow-hidden" style={{ backgroundColor: bgCard, border: `1px solid ${borderSubtle}`, boxShadow: cardShadow }}>
            <div className="flex xl:grid xl:grid-cols-5 gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory pb-4 w-full hide-scrollbar items-stretch">

              <div className="flex-1 min-w-[280px] max-md:min-w-[260px] md:min-w-[320px] xl:min-w-0 snap-center h-full">
                <StatCard
                  title="Costos totales"
                  value={fmt(resumen.costos_totales)}
                  subtitle={
                    <div className="flex items-center gap-1">
                      {resumen.variacion_costos !== 0 && (
                        <span className={`font-bold mr-1 ${resumen.variacion_costos <= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {resumen.variacion_costos > 0 ? '+' : ''}{resumen.variacion_costos}%
                        </span>
                      )}
                      <span>Vs mes anterior</span>
                    </div>
                  }
                  icon={TrendingDown}
                  color="red"
                  className="h-full"
                />
              </div>

              <div className="flex-1 min-w-[280px] max-md:min-w-[260px] md:min-w-[320px] xl:min-w-0 snap-center h-full">
                <StatCard
                  title="Ingredientes"
                  value={fmt(resumen.ingredientes)}
                  subtitle={`${resumen.porcentaje_ingredientes || 0}% del total de gastos`}
                  icon={Leaf}
                  color="orange"
                  className="h-full"
                />
              </div>

              <div className="flex-1 min-w-[280px] max-md:min-w-[260px] md:min-w-[320px] xl:min-w-0 snap-center h-full">
                <StatCard
                  title="Mermas"
                  value={fmt(resumen.mermas)}
                  subtitle={`${resumen.porcentaje_mermas || 0}% del total de gastos`}
                  icon={Trash2}
                  color="purple"
                  className="h-full"
                />
              </div>

              <div className="flex-1 min-w-[280px] max-md:min-w-[260px] md:min-w-[320px] xl:min-w-0 snap-center h-full">
                <StatCard
                  title="Ganancia bruta"
                  value={fmt(resumen.ganancia_bruta)}
                  subtitle={
                    <div className="flex items-center gap-1">
                      {resumen.variacion_ganancia !== 0 && (
                        <span className={`font-bold mr-1 ${resumen.variacion_ganancia >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {resumen.variacion_ganancia > 0 ? '+' : ''}{resumen.variacion_ganancia}%
                        </span>
                      )}
                      <span>Ingresos − costos del mes</span>
                    </div>
                  }
                  icon={PiggyBank}
                  color="green"
                  className="h-full"
                />
              </div>

              <div className="flex-1 min-w-[280px] max-md:min-w-[260px] md:min-w-[320px] xl:min-w-0 snap-center h-full">
                <StatCard
                  title="Margen neto"
                  value={`${resumen.margen_neto || 0}%`}
                  subtitle="Calculado sobre ventas del mes"
                  icon={Percent}
                  color="blue"
                  className="h-full"
                />
              </div>

            </div>
          </div>

          {/* Costos por categoría + Tendencia (Contenedor Nivel 1 idéntico a la imagen de referencia) */}
          <div className="rounded-2xl p-6 max-md:p-3 transition-colors duration-200" style={{ backgroundColor: bgCard, border: `1px solid ${borderSubtle}`, boxShadow: cardShadow }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-md:gap-4 w-full">

              {/* Costos por categoría (Sub-Card Nivel 2) */}
              <div className="rounded-2xl p-6 max-md:p-3 transition-colors duration-200 min-w-0 w-full flex flex-col justify-between" style={{ backgroundColor: bgSubcard, border: `1px solid ${borderSubtle}`, boxShadow: cardShadow }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-theme-text">COSTOS POR CATEGORÍA</h2>
                  <span className="text-[10px] font-mono text-theme-text-muted">Últimos 30 días</span>
                </div>
                <div className="rounded-2xl border transition-colors duration-200 p-4 flex-1 flex flex-col justify-center min-h-[260px]" style={{ backgroundColor: bgCard, borderColor: borderSubtle }}>
                  {costosCategorias.length === 0 ? (
                    <div className="py-6">
                      <EmptyState
                        title="Sin datos disponibles"
                        description="El desglose de costos por categoría aparecerá cuando haya compras o inventario registrado."
                        icon={PieChart}
                      />
                    </div>
                  ) : (
                    <div className="space-y-4 py-2">
                      {costosCategorias.map(cat => {
                        const pct = maxCategoryCost > 0 ? (Number(cat.costo) / maxCategoryCost) * 100 : 0
                        const colorClass = categoryColors[cat.categoria] || 'bg-brand-500'
                        return (
                          <div key={cat.categoria} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${colorClass}`}/>
                                <p className="text-sm text-theme-text font-medium">{cat.categoria}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <p className="text-sm font-semibold text-theme-text">{fmt(cat.costo)}</p>
                                <span className="text-[11px] font-bold text-theme-text-muted font-mono">
                                  {cat.porcentaje}%
                                </span>
                              </div>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: bgSubcard }}>
                              <div className={`h-full ${colorClass} rounded-full transition-all duration-500`}
                                   style={{ width: `${pct}%`, opacity: 0.85 }}/>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Tendencia de costos (Sub-Card Nivel 2) */}
              <div className="rounded-2xl p-6 max-md:p-3 transition-colors duration-200 min-w-0 w-full flex flex-col justify-between" style={{ backgroundColor: bgSubcard, border: `1px solid ${borderSubtle}`, boxShadow: cardShadow }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-theme-text">TENDENCIA DE COSTOS</h2>
                  <span className="text-[10px] font-mono text-theme-text-muted">{currentMonthLabel}</span>
                </div>
                <div className="rounded-2xl border transition-colors duration-200 p-4 flex-1 flex flex-col justify-center min-h-[260px]" style={{ backgroundColor: bgCard, borderColor: borderSubtle }}>
                  {tendenciaCostos.length === 0 ? (
                    <div className="py-6">
                      <EmptyState
                        title="Sin datos disponibles"
                        description="La tendencia de costos e ingresos aparecerá cuando haya movimientos registrados en este período."
                        icon={BarChart3}
                      />
                    </div>
                  ) : (
                    <>
                      <div className="w-full rounded-xl p-2 pb-4 mt-2 transition-colors duration-200">
                        <ResponsiveContainer width="100%" height={320}>
                          <AreaChart
                            data={tendenciaSemanas}
                            margin={{ top: 10, right: 10, left: -10, bottom: 10 }}
                          >
                            <defs>
                              <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="colorCostos" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.35} />
                                <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)'} vertical={false} />
                            <XAxis 
                              dataKey="semana" 
                              tick={{ fill: isLight ? '#475569' : 'rgba(255,255,255,0.5)', fontSize: 11 }} 
                              tickLine={false} 
                              axisLine={false}
                              dy={6}
                            />
                            <YAxis 
                              tick={{ fill: isLight ? '#475569' : 'rgba(255,255,255,0.5)', fontSize: 11 }} 
                              tickLine={false} 
                              axisLine={false}
                              tickFormatter={(val) => `$${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
                              width={window.innerWidth < 768 ? 40 : 55}
                            />
                            <Tooltip content={<CostsTooltip />} />
                            <Area 
                              type="monotone" 
                              dataKey="costos" 
                              stroke="#EF4444" 
                              strokeWidth={2.5}
                              fillOpacity={1}
                              fill="url(#colorCostos)"
                              dot={false}
                              activeDot={{ r: 5, strokeWidth: 2, stroke: isLight ? '#ffffff' : '#1C1917', fill: '#EF4444' }}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="ingresos" 
                              stroke="#10B981" 
                              strokeWidth={2.5}
                              fillOpacity={1}
                              fill="url(#colorIngresos)"
                              dot={false}
                              activeDot={{ r: 5, strokeWidth: 2, stroke: isLight ? '#ffffff' : '#1C1917', fill: '#10B981' }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      {/* Custom legend */}
                      <div className="flex justify-center gap-6 text-[11px] font-bold mt-3">
                        <div className="flex items-center gap-1.5 text-theme-text-muted">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          <span>Costos</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-theme-text-muted">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span>Ingresos</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Desglose de mermas por ingrediente (Estructura Oficial de Tablas con Nivel 1, 2 y 3) */}
          <div className="rounded-2xl p-6 max-md:p-3 transition-colors duration-200 animate-fadeInUp space-y-5" style={{ backgroundColor: bgCard, border: `1px solid ${borderSubtle}`, boxShadow: cardShadow }}>
            
            {/* Encabezado Nivel 1 */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-extrabold text-theme-text tracking-wide uppercase">MERMAS POR INGREDIENTE</h2>
                <p className="text-theme-text-muted text-[10px] mt-0.5 font-bold uppercase tracking-wider">TOP INGREDIENTES CON MAYOR PÉRDIDA ESTE MES</p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border-[1.5px] transition-all duration-200 overflow-hidden w-full shadow-lg" style={{ borderColor: borderSubtle }}>
                <div className="relative">
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                      <thead className="sticky top-0 z-10" style={{ backgroundColor: bgSubcard, borderBottom: `1.5px solid ${borderSubtle}` }}>
                        <tr className="text-theme-text text-[10px] font-extrabold uppercase tracking-wider" style={{ backgroundColor: bgSubcard }}>
                          <th className="pb-3.5 pt-3.5 px-4">Ingrediente</th>
                          <th className="pb-3.5 pt-3.5 px-4">Categoría</th>
                          <th className="pb-3.5 pt-3.5 px-4">Cantidad perdida</th>
                          <th className="pb-3.5 pt-3.5 px-4">Costo de la merma</th>
                          <th className="pb-3.5 pt-3.5 px-4">% del total de mermas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-theme-border-subtle text-xs" style={{ backgroundColor: 'var(--theme-surface)' }}>
                        {currentMermas.map((item, idx) => (
                          <tr 
                            key={idx} 
                            className="h-16 border-b transition-colors duration-150 hover:bg-theme-input/40 group" 
                            style={{ backgroundColor: 'var(--theme-surface)', borderColor: borderSubtle }}
                          >
                            <td className="px-4 py-3.5 text-xs text-theme-text font-semibold">{item.ingrediente}</td>
                            <td className="px-4 py-3.5 text-xs">
                              <CategoryBadge categoryName={item.categoria} />
                            </td>
                            <td className="px-4 py-3.5 text-xs text-theme-text-muted font-medium">
                              {item.cantidad_perdida} {item.unidad}
                            </td>
                            <td className="px-4 py-3.5 text-xs text-rose-400 font-semibold">{fmtDecimal(item.costo_merma)}</td>
                            <td className="px-4 py-3.5 text-xs text-theme-text-muted font-mono">{item.porcentaje_total}%</td>
                          </tr>
                        ))}
                        {currentMermas.length > 0 && Array.from({ length: ITEMS_PER_PAGE - currentMermas.length }).map((_, i) => (
                          <tr key={`empty-${i}`} className="h-16 border-b border-transparent" style={{ backgroundColor: 'var(--theme-surface)' }}>
                            <td colSpan={5}></td>
                          </tr>
                        ))}
                        {mermasIngrediente.length === 0 && (
                          <tr style={{ backgroundColor: 'var(--theme-surface)' }}>
                            <td colSpan={5} className="p-0 border-none" style={{ backgroundColor: 'var(--theme-surface)' }}>
                              <div className="h-[32rem] flex items-center justify-center" style={{ backgroundColor: 'var(--theme-surface)' }}>
                                <EmptyState
                                  icon={Trash2}
                                  title="Sin mermas registradas"
                                  description="Las mermas del mes aparecerán cuando se registren en Stock"
                                />
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Footer de Paginación Obligatorio */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t" style={{ borderColor: borderSubtle }}>
                <div className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                  {mermasIngrediente.length === 0 ? (
                    <span>Mostrando <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>0</span> a <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>0</span> de <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>0</span> registros</span>
                  ) : (
                    <span>Mostrando <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>{wasteStartItem}</span> a <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>{wasteEndItem}</span> de <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>{mermasIngrediente.length}</span> registros</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setWastePage(prev => Math.max(prev - 1, 1))}
                    disabled={wastePage === 1 || mermasIngrediente.length === 0}
                    className="px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5"
                    style={wastePage > 1 && mermasIngrediente.length > 0 ? {
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
                    {mermasIngrediente.length === 0 ? 1 : wastePage} / {totalWastePages}
                  </div>

                  <button
                    onClick={() => setWastePage(prev => Math.min(prev + 1, totalWastePages))}
                    disabled={wastePage >= totalWastePages || mermasIngrediente.length === 0}
                    className="px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5"
                    style={wastePage < totalWastePages && mermasIngrediente.length > 0 ? {
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

            {/* Resumen Total al Pie */}
            <div className="flex justify-end items-center pt-2">
              <span className="text-xs text-theme-text-muted font-semibold mr-2">Resumen total:</span>
              <p className="text-sm font-bold text-theme-text">
                Total mermas del mes: <span className="text-red-400 font-extrabold text-base">{fmtDecimal(mermasIngrediente.reduce((sum, item) => sum + (Number(item?.costo_merma || item?.costo || 0) || 0), 0) || resumen?.mermas || 0)}</span>
              </p>
            </div>
          </div>

          {/* Costo por platillo (Estructura Oficial de Tablas con Nivel 1, 2 y 3) */}
          <div className="rounded-2xl p-6 max-md:p-3 transition-colors duration-200 animate-fadeInUp space-y-5" style={{ backgroundColor: bgCard, border: `1px solid ${borderSubtle}`, boxShadow: cardShadow }}>
            
            {/* Encabezado Nivel 1 */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-extrabold text-theme-text tracking-wide uppercase">COSTO POR PLATILLO</h2>
                <p className="text-theme-text-muted text-[10px] mt-0.5 font-bold uppercase tracking-wider">MARGEN REAL POR PRODUCTO VENDIDO ESTE MES</p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border-[1.5px] transition-all duration-200 overflow-hidden w-full shadow-lg" style={{ borderColor: borderSubtle }}>
                <div className="relative">
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                      <thead className="sticky top-0 z-10" style={{ backgroundColor: bgSubcard, borderBottom: `1.5px solid ${borderSubtle}` }}>
                        <tr className="text-theme-text text-[10px] font-extrabold uppercase tracking-wider" style={{ backgroundColor: bgSubcard }}>
                          <th className="pb-3.5 pt-3.5 px-4">Platillo</th>
                          <th className="pb-3.5 pt-3.5 px-4">Costo ingredientes</th>
                          <th className="pb-3.5 pt-3.5 px-4">Precio venta</th>
                          <th className="pb-3.5 pt-3.5 px-4">Margen $</th>
                          <th className="pb-3.5 pt-3.5 px-4">Margen %</th>
                          <th className="pb-3.5 pt-3.5 px-4">Unidades vendidas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-theme-border-subtle text-xs" style={{ backgroundColor: 'var(--theme-surface)' }}>
                        {currentDishCosts.map((item, idx) => {
                          const marginPct = item.margen_porcentaje || 0
                          
                          let marginColorClass = ''
                          if (marginPct >= 60) {
                            marginColorClass = 'text-emerald-600 dark:text-emerald-400'
                          } else if (marginPct >= 40) {
                            marginColorClass = 'text-yellow-600 dark:text-yellow-400'
                          } else {
                            marginColorClass = 'text-rose-600 dark:text-rose-400'
                          }

                          return (
                            <tr 
                              key={idx} 
                              className="h-16 border-b transition-colors duration-150 hover:bg-theme-input/40 group" 
                              style={{ backgroundColor: 'var(--theme-surface)', borderColor: borderSubtle }}
                            >
                              <td className="px-4 py-3.5 text-base text-theme-text font-bold">{item.platillo}</td>
                              <td className="px-4 py-3.5 text-base text-rose-500 dark:text-rose-400 font-mono font-medium">{fmtDecimal(item.costo_ingredientes)}</td>
                              <td className="px-4 py-3.5 text-base text-theme-text-muted font-mono font-medium">{fmtDecimal(item.precio_venta)}</td>
                              <td className="px-4 py-3.5 text-base text-emerald-600 dark:text-emerald-400 font-bold font-mono">{fmtDecimal(item.margen)}</td>
                              <td className="px-4 py-3.5">
                                <span className={`font-bold font-mono text-base ${marginColorClass}`}>
                                  {marginPct}%
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-base text-theme-text font-medium">{item.unidades_vendidas} uds</td>
                            </tr>
                          )
                        })}
                        {currentDishCosts.length > 0 && Array.from({ length: ITEMS_PER_PAGE - currentDishCosts.length }).map((_, i) => (
                          <tr key={`empty-${i}`} className="h-16 border-b border-transparent" style={{ backgroundColor: 'var(--theme-surface)' }}>
                            <td colSpan={6}></td>
                          </tr>
                        ))}
                        {costoPlatillo.length === 0 && (
                          <tr style={{ backgroundColor: 'var(--theme-surface)' }}>
                            <td colSpan={6} className="p-0 border-none" style={{ backgroundColor: 'var(--theme-surface)' }}>
                              <div className="h-[32rem] flex items-center justify-center" style={{ backgroundColor: 'var(--theme-surface)' }}>
                                <EmptyState
                                  icon={UtensilsCrossed}
                                  title="Sin datos de platillos"
                                  description="El margen por platillo aparecerá cuando haya ventas registradas"
                                />
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Footer de Paginación Obligatorio */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t" style={{ borderColor: borderSubtle }}>
                <div className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                  {costoPlatillo.length === 0 ? (
                    <span>Mostrando <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>0</span> a <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>0</span> de <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>0</span> registros</span>
                  ) : (
                    <span>Mostrando <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>{dishCostStartItem}</span> a <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>{dishCostEndItem}</span> de <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>{costoPlatillo.length}</span> registros</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDishCostPage(prev => Math.max(prev - 1, 1))}
                    disabled={dishCostPage === 1 || costoPlatillo.length === 0}
                    className="px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5"
                    style={dishCostPage > 1 && costoPlatillo.length > 0 ? {
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
                    {costoPlatillo.length === 0 ? 1 : dishCostPage} / {totalDishCostPages}
                  </div>

                  <button
                    onClick={() => setDishCostPage(prev => Math.min(prev + 1, totalDishCostPages))}
                    disabled={dishCostPage >= totalDishCostPages || costoPlatillo.length === 0}
                    className="px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5"
                    style={dishCostPage < totalDishCostPages && costoPlatillo.length > 0 ? {
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
    </div>
  )
}
