import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { 
  UtensilsCrossed, 
  ShoppingBag, 
  CalendarDays, 
  TrendingUp, 
  Download,
  Calendar,
  RefreshCw
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts'

import StatCard from '../../components/ui/StatCard'
import MetricCardsLayout from '../../components/ui/MetricCardsLayout'
import Badge from '../../components/ui/Badge'
import Table from '../../components/ui/Table'
import PageHeader from '../../components/ui/PageHeader'
import { getDashboard } from '../../api/dashboard'
import { getDishes } from '../../api/dishes'
import Dropdown from '../../components/ui/Dropdown'
import { useTheme } from '../../context/ThemeContext'

const DONUT_COLORS = ['#7c3aed', '#06b6d4', '#f59e0b']
const ITEMS_PER_PAGE = 8
const DATE_RANGE_LABELS = {
  today: 'Hoy',
  week: 'Esta semana',
  month: 'Este mes',
  last7: 'Últimos 7 días',
  last30: 'Últimos 30 días'
}

export default function Dashboard() {
  const [dateRange, setDateRange] = useState('today')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { bgCard, bgBody, borderSubtle, textSubtle, colorPrimario, primaryBtnText, isLight } = useTheme()
  
  const [metrics, setMetrics] = useState({
    dishesCount: 0,
    recentOrdersCount: 0,
    upcomingReservationsCount: 0,
    todayEarnings: 0
  })
  const [salesData, setSalesData] = useState([])
  const [modalityData, setModalityData] = useState([])
  const [recentDishes, setRecentDishes] = useState([])
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    setCurrentPage(1)
  }, [dateRange])

  const startOfWeek = (date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const start = new Date(d.setDate(diff))
    return start.toISOString().split('T')[0]
  }

  const startOfMonth = (date) => {
    const d = new Date(date.getFullYear(), date.getMonth(), 1)
    return d.toISOString().split('T')[0]
  }

  const daysAgo = (days) => {
    const d = new Date()
    d.setDate(d.getDate() - days)
    return d.toISOString().split('T')[0]
  }

  const getDates = (range) => {
    const today = new Date()
    const to = today.toISOString().split('T')[0]
    switch (range) {
      case 'today':
        return { from: to, to }
      case 'week':
        return { from: startOfWeek(today), to }
      case 'month':
        return { from: startOfMonth(today), to }
      case 'last7':
        return { from: daysAgo(7), to }
      case 'last30':
        return { from: daysAgo(30), to }
      default:
        return { from: to, to }
    }
  }

  const fetchData = useCallback(async (range, isSilent = false) => {
    if (!isSilent) {
      setLoading(true)
    } else {
      setIsRefreshing(true)
    }
    setError(null)

    const { from, to } = getDates(range)
    try {
      const res = await getDashboard(from, to, range)
      const rootData = res?.data || {}
      // El backend devuelve los datos directamente en el root
      // sin anidamiento extra
      const d = rootData
      
      setMetrics({
        dishesCount: d.platillos_en_menu ?? d.dishes_count ?? d.dishesCount ?? d.total_dishes ?? 0,
        recentOrdersCount: d.pedidos_recientes ?? d.recent_orders_count ?? d.recentOrdersCount ?? d.total_orders ?? 0,
        upcomingReservationsCount: d.proximas_reservaciones ?? d.upcoming_reservations_count ?? d.upcomingReservationsCount ?? 0,
        todayEarnings: d.ingresos_del_dia ?? d.today_earnings ?? d.todayEarnings ?? d.earnings ?? 0
      })
      
      const rawSales = Array.isArray(d.ventas_semana) ? d.ventas_semana : []
      const formattedSales = Array.isArray(rawSales)
        ? rawSales.map(item => ({
            day: item.dia ?? item.day ?? 'Día',
            sales: item.total ?? item.sales ?? 0,
            total: item.total ?? item.sales ?? 0
          }))
        : []
      setSalesData(formattedSales)

      const rawModality = Array.isArray(d.pedidos_por_modalidad)
        ? d.pedidos_por_modalidad
        : (Array.isArray(d.modality_data) ? d.modality_data : (Array.isArray(d.modalidades) ? d.modalidades : []))
      const formattedModality = rawModality.map(item => ({
        name: item.modalidad ?? item.name ?? item.nombre ?? item.label ?? 'Mesa',
        value: Number(item.total ?? item.value ?? item.cantidad ?? item.count ?? 0)
      }))
      setModalityData(formattedModality)

      const dishes = Array.isArray(d.menu_actual) ? d.menu_actual : []
      setRecentDishes(dishes)
    } catch (err) {
      console.error("Dashboard error:", err)
      setError('Error al cargar datos del dashboard. Verifique la conexión.')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData(dateRange, false)

    const interval = setInterval(() => {
      fetchData(dateRange, true)
    }, 30000)

    return () => clearInterval(interval)
  }, [dateRange, fetchData])

  const handleExport = () => {
    const { from, to } = getDates(dateRange)
    const url = `${import.meta.env.VITE_API_URL}/dashboard/export?from=${from}&to=${to}`
    window.open(url, '_blank')
  }

  const totalModalityOrders = modalityData.reduce((sum, item) => sum + (item.value || 0), 0)
  const totalPages = Math.ceil(recentDishes.length / ITEMS_PER_PAGE) || 1
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE
  const indexOfFirstItem = (currentPage - 1) * ITEMS_PER_PAGE
  const currentDishes = recentDishes.slice(indexOfFirstItem, indexOfLastItem)
  const startItem = recentDishes.length === 0 ? 0 : indexOfFirstItem + 1
  const endItem = Math.min(indexOfLastItem, recentDishes.length)

  const headerAction = (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
      {isRefreshing && (
        <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border animate-pulse shrink-0" style={{ backgroundColor: `${colorPrimario}15`, borderColor: `${colorPrimario}30`, color: colorPrimario }}>
          <RefreshCw size={12} className="animate-spin" />
          <span>Actualizando...</span>
        </div>
      )}
      
      {/* Date Range Filter Pills con scroll horizontal en móviles */}
      <div className="flex items-center gap-2 pb-1 sm:pb-0 flex-wrap max-md:flex-nowrap max-md:overflow-x-auto max-md:pb-2 hide-scrollbar w-full sm:w-auto">
        {[
          { value: 'today', label: 'Hoy' },
          { value: 'week', label: 'Esta semana' },
          { value: 'month', label: 'Este mes' },
          { value: 'last7', label: '7 días' },
          { value: 'last30', label: '30 días' }
        ].map(tab => {
          const isActive = dateRange === tab.value
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setDateRange(tab.value)}
              style={
                isActive 
                  ? { backgroundColor: colorPrimario || '#dc2626', color: '#ffffff' }
                  : { backgroundColor: colorPrimario ? `${colorPrimario}18` : 'rgba(220, 38, 38, 0.12)', color: colorPrimario || '#b91c1c' }
              }
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shadow-xs hover:opacity-90 whitespace-nowrap shrink-0"
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      
      <button 
        onClick={handleExport}
        style={{ backgroundColor: colorPrimario, color: primaryBtnText }}
        className="shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md transition-all duration-200 rounded-xl px-4 py-1.5 max-md:py-2.5 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shrink-0"
      >
        <Download size={14} style={{ color: primaryBtnText }} />
        <span style={{ color: primaryBtnText }}>Exportar</span>
      </button>
    </div>
  )

  return (
    <div className="space-y-6 max-md:space-y-4 pb-12 animate-fadeIn p-4 max-md:p-3 md:p-6 lg:p-8 font-sans">
      <PageHeader 
        title="Dashboard" 
        description="Resumen de actividad en tiempo real (actualización automática cada 30s)."
        action={headerAction}
      />

      {error && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-300 text-xs px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button 
            onClick={() => fetchData(dateRange, false)}
            className="bg-amber-500/20 hover:bg-amber-500/30 px-3 py-1 rounded-lg text-xs transition-colors cursor-pointer font-bold"
            style={{ color: 'var(--theme-text)' }}
          >
            Reintentar
          </button>
        </div>
      )}

      <div className="rounded-2xl p-4 md:p-6 max-md:p-3 border transition-colors duration-200" style={{ backgroundColor: 'var(--theme-surface)', borderColor: borderSubtle, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <MetricCardsLayout cols={4} gap="gap-6 max-md:gap-4">
          {loading ? (
            <>
              <div className="animate-shimmer rounded-xl h-24 w-full" />
              <div className="animate-shimmer rounded-xl h-24 w-full" />
              <div className="animate-shimmer rounded-xl h-24 w-full" />
              <div className="animate-shimmer rounded-xl h-24 w-full" />
            </>
          ) : (
            <>
              <StatCard
                title="Platillos en Menú"
                value={metrics.dishesCount}
                subtitle="Disponibles para venta"
                icon={UtensilsCrossed}
                color="blue"
                delay="delay-1"
                className="h-full"
              />
              <StatCard
                title="Pedidos Recientes"
                value={metrics.recentOrdersCount}
                subtitle="Últimas 24 horas"
                icon={ShoppingBag}
                color="orange"
                delay="delay-2"
                className="h-full"
              />
              <StatCard
                title="Próximas Reservaciones"
                value={metrics.upcomingReservationsCount}
                subtitle="Para hoy en adelante"
                icon={CalendarDays}
                color="purple"
                delay="delay-3"
                className="h-full"
              />
              <StatCard
                title="Ingresos del día"
                value={`$${Number(metrics.todayEarnings || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                subtitle="Pedidos cobrados hoy"
                icon={TrendingUp}
                color="green"
                delay="delay-4"
                className="h-full"
              />
            </>
          )}
        </MetricCardsLayout>
      </div>

      <div className="rounded-2xl p-6 max-md:p-3 border transition-colors duration-200 min-w-0 w-full" style={{ backgroundColor: 'var(--theme-surface)', borderColor: borderSubtle, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-md:gap-4 min-w-0 w-full">
            <div className="animate-shimmer rounded-2xl h-80 min-h-[300px] w-full" />
            <div className="animate-shimmer rounded-2xl h-80 min-h-[300px] w-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-md:gap-4 min-w-0 w-full">
          {/* Contenedor 2 (En medio): Tono 2 */}
          <div className="rounded-2xl p-6 max-md:p-3 transition-colors duration-200 min-w-0 w-full" style={{ backgroundColor: 'var(--theme-subcard-bg)', border: `1px solid ${borderSubtle}`, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div className="flex items-center justify-between mb-6 max-md:mb-4">
              <h2 className="text-sm max-md:text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text)' }}>Ventas de la semana</h2>
              <span className="text-[10px] font-mono" style={{ color: textSubtle }}>{DATE_RANGE_LABELS[dateRange] || 'Últimos 7 días'}</span>
            </div>
            {/* Contenedor 3 (Interior): Tono 1 */}
            <div className="w-full rounded-2xl border transition-colors duration-200 p-4 max-md:p-2" style={{ backgroundColor: 'var(--theme-surface)', borderColor: borderSubtle }}>
              {salesData && salesData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300} minWidth={0}>
                  <AreaChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%"   stopColor={colorPrimario} stopOpacity="0.8"/>
                        <stop offset="50%"  stopColor="#06b6d4" stopOpacity="0.6"/>
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.8"/>
                      </linearGradient>
                      <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={colorPrimario} stopOpacity="0.3"/>
                        <stop offset="100%" stopColor={colorPrimario} stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#e2e8f0' : '#2d2a42'} strokeOpacity="0.6" />
                    <XAxis dataKey="day" stroke={isLight ? '#475569' : '#9ca3af'} strokeOpacity={0.7} fontSize={11} tickLine={false} />
                    <YAxis stroke={isLight ? '#475569' : '#9ca3af'} strokeOpacity={0.7} fontSize={11} tickLine={false} axisLine={false}
                      tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--theme-card)', borderColor: borderSubtle, borderRadius: '12px', color: 'var(--theme-text)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                      labelStyle={{ color: 'var(--theme-text)', fontWeight: 'bold' }}
                      formatter={(val) => [`$${Number(val).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 'Ventas']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="sales" 
                      stroke={colorPrimario} 
                      strokeWidth={2.5} 
                      fillOpacity={1} 
                      fill="url(#salesFill)"
                      activeDot={{ r: 6 }} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : loading ? (
                <div className="w-full h-full animate-pulse rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--theme-surface)' }}>
                  <span className="text-xs" style={{ color: textSubtle }}>Cargando gráfico...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3 py-10">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={colorPrimario} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                    <rect x="3" y="12" width="4" height="9" rx="1" fill={`${colorPrimario}20`} />
                    <rect x="10" y="7" width="4" height="14" rx="1" fill={`${colorPrimario}20`} />
                    <rect x="17" y="3" width="4" height="18" rx="1" fill={`${colorPrimario}20`} />
                  </svg>
                  <p className="text-sm font-medium" style={{ color: 'var(--theme-text-muted)' }}>No hay datos de ventas de la semana</p>
                  <p className="text-xs" style={{ color: textSubtle }}>Los datos aparecerán una vez se registren ventas.</p>
                </div>
              )}
            </div>
          </div>

          {/* Contenedor 2 (En medio): Tono 2 */}
          <div className="rounded-2xl p-6 max-md:p-3 transition-colors duration-200 flex flex-col justify-between min-w-0 w-full" style={{ backgroundColor: 'var(--theme-subcard-bg)', border: `1px solid ${borderSubtle}`, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div className="flex items-center justify-between mb-4 max-md:mb-3">
              <h2 className="text-sm max-md:text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text)' }}>Pedidos por modalidad</h2>
              <span className="text-[10px] font-mono" style={{ color: textSubtle }}>{DATE_RANGE_LABELS[dateRange] || 'Últimos 7 días'}</span>
            </div>
            
            {/* Contenedor 3 (Interior): Tono 1 */}
            <div className="relative w-full rounded-2xl border transition-colors duration-200 p-4 max-md:p-2 flex items-center justify-center" style={{ backgroundColor: 'var(--theme-surface)', borderColor: borderSubtle }}>
              {modalityData && modalityData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={300} minWidth={0}>
                    <PieChart>
                      <defs>
                        <filter id="donutShadow" x="-10%" y="-10%" width="120%" height="120%">
                          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.2"/>
                        </filter>
                      </defs>
                      <Pie
                        data={modalityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={85}
                        outerRadius={118}
                        paddingAngle={4}
                        dataKey="value"
                        nameKey="name"
                      >
                        {modalityData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={index === 0 ? colorPrimario : DONUT_COLORS[index % DONUT_COLORS.length]} 
                            filter="url(#donutShadow)"
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        wrapperStyle={{ zIndex: 50 }}
                        contentStyle={{ 
                          backgroundColor: 'var(--theme-card)', 
                          borderColor: borderSubtle, 
                          borderRadius: '12px', 
                          color: 'var(--theme-text)', 
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)' 
                        }}
                        itemStyle={{ color: 'var(--theme-text)' }}
                        formatter={(val) => [`${val} pedidos`, 'Cantidad']}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-5px]">
                    <span className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--theme-text)' }}>
                      {totalModalityOrders}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-widest mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
                      Pedidos
                    </span>
                  </div>
                </>
              ) : loading ? (
                <div className="w-full h-full animate-pulse rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--theme-surface)' }}>
                  <span className="text-xs" style={{ color: textSubtle }}>Cargando gráfico...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3 py-10">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={colorPrimario} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                    <circle cx="12" cy="12" r="10" fill={`${colorPrimario}10`} />
                    <path d="M12 2 A10 10 0 0 1 22 12 L12 12 Z" fill={`${colorPrimario}25`} />
                  </svg>
                  <p className="text-sm font-medium" style={{ color: 'var(--theme-text-muted)' }}>Aún no hay pedidos registrados</p>
                  <p className="text-xs" style={{ color: textSubtle }}>Los pedidos por modalidad aparecerán aquí.</p>
                </div>
              )}
            </div>

            {modalityData && modalityData.length > 0 && (
              <div className="flex flex-col gap-2 mt-4 pt-4 border-t" style={{ borderColor: borderSubtle }}>
                {modalityData.map((entry, i) => {
                  const pct = totalModalityOrders > 0 ? Math.round((entry.value / totalModalityOrders) * 100) : 0
                  const dotColor = i === 0 ? colorPrimario : DONUT_COLORS[i % DONUT_COLORS.length]
                  return (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: dotColor }} />
                        <span className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>{entry.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs" style={{ color: textSubtle }}>{entry.value} pedidos</span>
                        <span className="font-bold text-xs w-10 text-right" style={{ color: 'var(--theme-text)' }}>{pct}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>

      <div className="rounded-2xl p-6 max-md:p-3 border transition-colors duration-200" style={{ backgroundColor: 'var(--theme-surface)', borderColor: borderSubtle, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-sm max-md:text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text)' }}>Menú Actual</h2>
            <p className="text-xs max-md:text-[11px] mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>Últimos platillos registrados en la plataforma</p>
          </div>
          <Link 
            to="/admin/dishes" 
            className="text-sm max-md:text-xs font-bold transition-colors flex items-center gap-1 hover:opacity-80"
            style={{ color: colorPrimario }}
          >
            Ver todo →
          </Link>
        </div>

        <div className="mt-4 space-y-4">
          {loading ? (
            <div className="space-y-2.5">
              <div className="animate-shimmer rounded-lg h-12 w-full" />
              <div className="animate-shimmer rounded-lg h-12 w-full" />
              <div className="animate-shimmer rounded-lg h-12 w-full" />
            </div>
          ) : (
            <>
              <Table shadow="shadow-lg" headers={['Platillo', 'Categoría', 'Precio', 'Estado']}>
                {currentDishes.map((dish, idx) => {
                  const dishName = dish.name ?? dish.nombre ?? 'Platillo sin nombre'
                  const categoryName = typeof dish.category === 'object' 
                    ? (dish.category?.name ?? dish.category?.nombre) 
                    : (dish.category ?? dish.categoria ?? 'Sin categoría')
                  const price = dish.price ?? dish.precio ?? 0
                  const rawStatus = dish.status ?? dish.disponible ?? dish.is_available ?? dish.available ?? true
                  const isAvailable = rawStatus === true || rawStatus === 'disponible' || rawStatus === 'active' || rawStatus === 'activa' || rawStatus === 1 || rawStatus === '1'
                  const imageUrl = dish.image_url ?? dish.imagen_url ?? dish.image ?? dish.imagen

                  return (
                    <tr key={dish.id} className="h-16 border-b transition-colors duration-150" style={{ backgroundColor: 'var(--theme-surface)', borderColor: borderSubtle }}>
                      <td className="px-4 py-3 text-sm font-medium flex items-center gap-3" style={{ color: 'var(--theme-text)' }}>
                        {imageUrl ? (
                          <img 
                            src={imageUrl} 
                            alt={dishName} 
                            className="w-10 h-10 object-cover rounded-lg border shrink-0"
                            style={{ borderColor: borderSubtle, backgroundColor: 'var(--theme-card)' }}
                            onError={(e) => { e.target.style.display = 'none' }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg border flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--theme-input)', borderColor: borderSubtle, color: textSubtle }}>
                            <UtensilsCrossed size={16} />
                          </div>
                        )}
                        <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>{dishName}</span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                        {categoryName}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold" style={{ color: 'var(--theme-text)' }}>
                        ${Number(price || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge status={isAvailable ? 'disponible' : 'no_disponible'} />
                      </td>
                    </tr>
                  )
                })}
                {currentDishes.length > 0 && Array.from({ length: ITEMS_PER_PAGE - currentDishes.length }).map((_, i) => (
                  <tr key={`empty-${i}`} className="h-16 border-b border-transparent" style={{ backgroundColor: 'var(--theme-surface)' }}>
                    <td colSpan="4"></td>
                  </tr>
                ))}
                {currentDishes.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-12" style={{ backgroundColor: 'var(--theme-surface)' }}>
                      <div className="flex flex-col items-center gap-3">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={colorPrimario} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.45 }}>
                          <path d="M3 17h18M5 17c0-4 3-8 7-8s7 4 7 8" fill={`${colorPrimario}12`} />
                          <circle cx="12" cy="7" r="2" fill={`${colorPrimario}20`} />
                        </svg>
                        <p className="text-sm font-medium" style={{ color: 'var(--theme-text-muted)' }}>No hay platillos registrados en el menú.</p>
                        <p className="text-xs" style={{ color: textSubtle }}>Agrega platillos desde la sección de Platillos.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </Table>

              {/* Footer de Paginación */}
              {recentDishes.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t" style={{ borderColor: borderSubtle }}>
                  {/* Lado izquierdo: Conteo */}
                  <div className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                    Mostrando {startItem} a {endItem} de {recentDishes.length} platillos
                  </div>

                  {/* Lado derecho: Controles */}
                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      style={{
                        borderColor: borderSubtle,
                        color: currentPage === 1 ? textSubtle : 'var(--theme-text)',
                        backgroundColor: 'var(--theme-input)',
                        opacity: currentPage === 1 ? 0.5 : 1
                      }}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all duration-200 disabled:cursor-not-allowed cursor-pointer hover:opacity-80"
                    >
                      Anterior
                    </button>

                    <span className="text-xs font-mono font-bold px-2" style={{ color: 'var(--theme-text)' }}>
                      {currentPage} / {totalPages || 1}
                    </span>

                    <button 
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage >= totalPages}
                      style={{
                        backgroundColor: currentPage >= totalPages ? 'var(--theme-input)' : colorPrimario,
                        color: currentPage >= totalPages ? textSubtle : primaryBtnText,
                        borderColor: borderSubtle,
                        opacity: currentPage >= totalPages ? 0.5 : 1
                      }}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all duration-200 disabled:cursor-not-allowed cursor-pointer hover:opacity-90 shadow-xs"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
