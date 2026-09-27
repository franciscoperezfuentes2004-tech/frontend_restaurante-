/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { 
  Truck, 
  MapPin, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  ChevronDown, 
  X,
  Download,
  DollarSign, 
  Clock, 
  Users, 
  UserCheck,
  Eye,
  EyeOff,
  Lock,
  ShoppingBag,
  Phone,
  Map,
  CreditCard,
  Bike,
  CheckCircle,
  XCircle,
  User,
  Award
} from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { QRCodeSVG } from 'qrcode.react'

import PageHeader from '../../components/ui/PageHeader'
import Modal from '../../components/ui/Modal'
import Toast from '../../components/ui/Toast'
import Table from '../../components/ui/Table'
import DatePicker from '../../components/ui/DatePicker'
import EmptyState from '../../components/ui/EmptyState'
import StatCard from '../../components/ui/StatCard'
import MetricCardsLayout from '../../components/ui/MetricCardsLayout'
import CortesDelivery from '../../components/ui/CortesDelivery'
import { useTheme } from '../../context/ThemeContext'

import { 
  getDeliveryOrders,
  getDeliveryOrderDetail,
  updateDeliveryOrderStatus,
  getDeliveries,
  getDrivers,
  createDriver,
  updateDriver,
  deleteDriver,
  toggleDriver,
  getDeliveryPerformance
} from '../../api/delivery'

const ITEMS_PER_PAGE = 8

export default function Delivery() {
  const { isLight, bgCard, bgSubcard, bgInput, borderSubtle, cardShadow, colorPrimario, primaryBtnText, textSubtle, textColor, textMuted } = useTheme()
  const [activeTab, setActiveTab] = useState('deliveries')
  const [deliveries, setDeliveries] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [drivers, setDrivers] = useState([])
  const [resumen, setResumen] = useState({
    pendientes: 0,
    en_ruta: 0,
    entregadas: 0,
    canceladas: 0,
    ventas_delivery: 0,
    total_pedidos: 0,
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Debounce search query (400ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 400)
    return () => clearTimeout(handler)
  }, [searchQuery])

  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, debouncedSearchQuery, startDate, endDate])

  const totalPages = Math.ceil(deliveries.length / ITEMS_PER_PAGE) || 1
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE
  const indexOfFirstItem = (currentPage - 1) * ITEMS_PER_PAGE
  const currentDeliveries = (Array.isArray(deliveries) ? deliveries : []).slice(indexOfFirstItem, indexOfLastItem)
  const startItem = deliveries.length === 0 ? 0 : indexOfFirstItem + 1
  const endItem = Math.min(indexOfLastItem, deliveries.length)

  // Modals and detail states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [detailItem, setDetailItem] = useState(null)
  const [filtroGlobal, setFiltroGlobal] = useState('mes') // 'hoy' | 'semana' | 'mes' | '3meses'
  const [revenueTimeFilter, setRevenueTimeFilter] = useState('week') // 'week' | 'month' | '3months'
  const [revenuePage, setRevenuePage] = useState(1)

  // Driver CRUD form states
  const [driverSearch, setDriverSearch] = useState('')
  const [debouncedDriverSearch, setDebouncedDriverSearch] = useState('')
  const [driverStatus, setDriverStatus] = useState('all')
  const [driversLoading, setDriversLoading] = useState(false)
  const [driverPage, setDriverPage] = useState(1)
  const [showDriverModal, setShowDriverModal] = useState(false)
  const [editingDriver, setEditingDriver] = useState(null)
  const [driverForm, setDriverForm] = useState({
    name: '', phone: '', email: '', password: '',
    active: true
  })
  const [driverErrors, setDriverErrors] = useState({ name: '', phone: '', email: '' })
  const [showDriverPassword, setShowDriverPassword] = useState(false)

  const validarDriverCampo = (campo, valor) => {
    let error = ''
    switch (campo) {
      case 'name':
        if (!(valor || '').trim()) error = 'El nombre completo es obligatorio.'
        else if ((valor || '').trim().length < 3) error = 'Mínimo 3 caracteres.'
        else if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(valor)) error = 'Solo se permiten letras.'
        break
      case 'phone':
        if (!(valor || '').trim()) error = 'El teléfono es obligatorio.'
        else if ((valor || '').length !== 10) error = 'El teléfono debe tener exactamente 10 dígitos.'
        break
      case 'email':
        if (!(valor || '').trim()) error = 'El correo electrónico es obligatorio.'
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) error = 'Formato de correo inválido.'
        break
    }
    setDriverErrors(prev => ({ ...prev, [campo]: error }))
    return error
  }

  const [driverResumen, setDriverResumen] = useState({ total: 0, activos: 0, inactivos: 0 })

  useEffect(() => {
    setDriverPage(1)
  }, [driverStatus, debouncedDriverSearch])

  const totalDriverPages = Math.ceil(drivers.length / ITEMS_PER_PAGE) || 1
  const indexOfLastDriver = driverPage * ITEMS_PER_PAGE
  const indexOfFirstDriver = (driverPage - 1) * ITEMS_PER_PAGE
  const currentDrivers = (Array.isArray(drivers) ? drivers : []).slice(indexOfFirstDriver, indexOfLastDriver)
  const startDriverItem = drivers.length === 0 ? 0 : indexOfFirstDriver + 1
  const endDriverItem = Math.min(indexOfLastDriver, drivers.length)

  // Driver Password Security Rules (6 mandatory rules)
  const driverPasswordRules = useMemo(() => {
    const pass = driverForm.password || ''
    return [
      { id: 'lowercase', label: 'Al menos una letra minúscula', valid: /[a-z]/.test(pass) },
      { id: 'uppercase', label: 'Al menos una letra mayúscula', valid: /[A-Z]/.test(pass) },
      { id: 'number', label: 'Al menos un número', valid: /[0-9]/.test(pass) },
      { id: 'symbol', label: 'Al menos un símbolo', valid: /[^A-Za-z0-9]/.test(pass) },
      { id: 'noSpaces', label: 'Sin espacios', valid: pass.length > 0 && !/\s/.test(pass) },
      { id: 'minChar', label: 'Mínimo 8 caracteres', valid: pass.length >= 8 },
    ]
  }, [driverForm.password])

  const isDriverPasswordValid = useMemo(() => {
    return driverPasswordRules.every(r => r.valid)
  }, [driverPasswordRules])

  // Performance Metrics states for Metrics Tab
  const [performanceData, setPerformanceData] = useState({
    tiempos_puntualidad: {
      tiempo_promedio_minutos: 0,
      pedidos_a_tiempo_porcentaje: 0,
      meta_minutos: 40,
      meta_puntualidad: 90,
      cumplimiento_hoy_porcentaje: 0
    },
    incidencias: {
      entregas_completadas_porcentaje: 0,
      pedidos_con_demora: 0,
      total_con_problema: 0,
      estado_servicio: "Sin datos disponibles"
    },
    cumplimiento_semanal: [
      { dia: "Lun", porcentaje: 0 },
      { dia: "Mar", porcentaje: 0 },
      { dia: "Mié", porcentaje: 0 },
      { dia: "Jue", porcentaje: 0 },
      { dia: "Vie", porcentaje: 0 },
      { dia: "Sáb", porcentaje: 0 },
      { dia: "Dom", porcentaje: 0 }
    ],
    repartidores_destacados: []
  })
  const [performanceLoading, setPerformanceLoading] = useState(false)

  const fetchPerformanceData = useCallback(async () => {
    if (activeTab !== 'metrics') return
    setPerformanceLoading(true)
    try {
      const res = await getDeliveryPerformance(filtroGlobal)
      if (res?.data) {
        setPerformanceData(res.data)
      }
    } catch (err) {
      console.error("Error fetching performance metrics:", err)
      setToast({ message: 'Error al cargar las métricas de desempeño', type: 'error' })
    } finally {
      setPerformanceLoading(false)
    }
  }, [activeTab, filtroGlobal])

  useEffect(() => {
    fetchPerformanceData()
  }, [fetchPerformanceData])

  // Refresh performance metrics automatically every 60 seconds
  useEffect(() => {
    if (activeTab !== 'metrics') return
    const interval = setInterval(() => {
      fetchPerformanceData()
    }, 60000)
    return () => clearInterval(interval)
  }, [fetchPerformanceData, activeTab])

  // Debounce driver search input (400ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedDriverSearch(driverSearch)
    }, 400)
    return () => clearTimeout(handler)
  }, [driverSearch])

  // Fetch Drivers from backend GET /api/admin/drivers
  const fetchDriversData = useCallback(async () => {
    if (activeTab !== 'drivers') return
    setDriversLoading(true)
    try {
      const params = {}
      if (debouncedDriverSearch.trim()) params.search = debouncedDriverSearch.trim()
      if (driverStatus !== 'all') params.status = driverStatus

      const res = await getDrivers(params)
      const data = res?.data

      if (data && typeof data === 'object') {
        const list = Array.isArray(data.drivers) ? data.drivers : (Array.isArray(data) ? data : [])
        setDrivers(list)
        if (data.resumen) {
          setDriverResumen({
            total: data.resumen.total || 0,
            activos: data.resumen.activos || 0,
            inactivos: data.resumen.inactivos || 0,
          })
        } else {
          setDriverResumen({
            total: list.length,
            activos: list.filter(d => Boolean(d.active || d.is_active)).length,
            inactivos: list.filter(d => !d.active && !d.is_active).length,
          })
        }
      } else {
        setDrivers([])
        setDriverResumen({ total: 0, activos: 0, inactivos: 0 })
      }
    } catch (err) {
      console.error(err)
      setToast({ message: 'Error al cargar el directorio de repartidores', type: 'error' })
      setDrivers([])
    } finally {
      setDriversLoading(false)
    }
  }, [activeTab, debouncedDriverSearch, driverStatus])

  useEffect(() => {
    fetchDriversData()
  }, [fetchDriversData])

  // Toggle active status (PATCH /api/admin/drivers/{id}/toggle)
  const handleToggleDriver = async (driverId) => {
    try {
      const res = await toggleDriver(driverId)
      const updated = res?.data
      setDrivers(prev => prev.map(d => d.id === driverId ? { ...d, active: updated?.active ?? !d.active } : d))
      setToast({ message: 'Estado del repartidor cambiado correctamente', type: 'success' })
      fetchDriversData()
    } catch (err) {
      console.error(err)
      const msg = err.response?.data?.message || 'Error al cambiar el estado del repartidor'
      setToast({ message: msg, type: 'error' })
    }
  }

  // Save Driver (POST /api/admin/drivers or PUT /api/admin/drivers/{id})
  const handleSaveDriver = async () => {
    if (!driverForm.name.trim()) {
      setToast({ message: 'El nombre completo es obligatorio', type: 'error' })
      return
    }
    if (!driverForm.phone.trim()) {
      setToast({ message: 'El teléfono es obligatorio', type: 'error' })
      return
    }
    if (!driverForm.email.trim()) {
      setToast({ message: 'El correo electrónico es obligatorio', type: 'error' })
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(driverForm.email.trim())) {
      setToast({ message: 'Formato de correo electrónico no válido', type: 'error' })
      return
    }
    if (!editingDriver && (!driverForm.password || !isDriverPasswordValid)) {
      setToast({ message: 'La contraseña debe cumplir con todos los parámetros de seguridad obligatorios', type: 'error' })
      return
    }

    try {
      if (editingDriver) {
        const payload = {
          name: driverForm.name,
          phone: driverForm.phone,
          email: driverForm.email,
          active: Boolean(driverForm.active),
        }
        const res = await updateDriver(editingDriver.id, payload)
        const updated = res?.data
        if (updated) {
          setDrivers(prev => prev.map(d => d.id === editingDriver.id ? { ...d, ...updated } : d))
        }
        setToast({ message: 'Repartidor actualizado correctamente', type: 'success' })
      } else {
        const payload = {
          name: driverForm.name,
          phone: driverForm.phone,
          email: driverForm.email,
          password: driverForm.password,
          active: Boolean(driverForm.active),
        }
        const res = await createDriver(payload)
        const newDrv = res?.data
        if (newDrv) {
          setDrivers(prev => [newDrv, ...prev])
        }
        setToast({ message: 'Repartidor creado correctamente', type: 'success' })
      }
      setShowDriverModal(false)
      fetchDriversData()
    } catch (err) {
      console.error(err)
      const msg = err.response?.data?.message || 'Error al guardar el repartidor'
      setToast({ message: msg, type: 'error' })
    }
  }

  // Delete Driver (DELETE /api/admin/drivers/{id})
  const handleDeleteDriver = async (driverId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este repartidor?')) return
    try {
      await deleteDriver(driverId)
      setDrivers(prev => prev.filter(d => d.id !== driverId))
      setToast({ message: 'Repartidor eliminado correctamente', type: 'success' })
      fetchDriversData()
    } catch (err) {
      console.error(err)
      const msg = err.response?.data?.message || 'Error al eliminar el repartidor'
      setToast({ message: msg, type: 'error' })
    }
  }

  // Fetch Delivery Orders from backend
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (activeTab === 'deliveries' || activeTab === 'metrics') {
        const params = {}
        if (statusFilter !== 'all') params.status = statusFilter
        if (debouncedSearchQuery.trim()) params.search = debouncedSearchQuery.trim()
        if (startDate) params.fecha_inicio = startDate
        if (endDate) params.fecha_fin = endDate

        const res = await getDeliveryOrders(params)
        const data = res?.data

        if (data && typeof data === 'object') {
          const list = Array.isArray(data.entregas) ? data.entregas : (Array.isArray(data) ? data : [])
          setDeliveries(list)

          if (data.resumen) {
            setResumen({
              pendientes: data.resumen.pendientes || 0,
              en_ruta: data.resumen.en_ruta || 0,
              entregadas: data.resumen.entregadas || 0,
              canceladas: data.resumen.canceladas || 0,
              ventas_delivery: parseFloat(data.resumen.ventas_delivery) || 0,
              total_pedidos: data.resumen.total_pedidos || 0,
            })
          }
        } else {
          setDeliveries([])
        }
      }

      if (activeTab === 'drivers') {
        try {
          const drvRes = await getDrivers()
          const drvData = drvRes?.data
          const drvList = Array.isArray(drvData) ? drvData : (drvData?.drivers || drvData?.data || [])
          setDrivers(drvList)
        } catch (e) {
          console.error("Error fetching drivers:", e)
          setDrivers([])
        }
      }
    } catch (err) {
      console.error(err)
      setError('Error al cargar la información del módulo de delivery')
      setDeliveries([])
    } finally {
      setLoading(false)
    }
  }, [activeTab, statusFilter, debouncedSearchQuery, startDate, endDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Polling every 30 seconds for real-time delivery monitoring updates
  useEffect(() => {
    if (activeTab !== 'deliveries') return
    const interval = setInterval(() => {
      fetchData()
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchData, activeTab])

  // Open detail modal with complete details from GET /api/admin/delivery/orders/{id}
  const handleOpenDetail = async (id) => {
    try {
      const res = await getDeliveryOrderDetail(id)
      setDetailItem(res?.data || null)
    } catch (err) {
      console.error("Error loading delivery order detail:", err)
      const localItem = deliveries.find(d => d.id === id)
      setDetailItem(localItem || null)
    }
  }

  // Handle status updates directly
  const handleUpdateStatus = async (id, nextStatus) => {
    try {
      await updateDeliveryOrderStatus(id, nextStatus)
      fetchData()
      if (detailItem && detailItem.id === id) {
        handleOpenDetail(id)
      }
      setToast({ message: `Estado cambiado a '${nextStatus}' correctamente`, type: 'success' })
    } catch (err) {
      console.error(err)
      setToast({ message: 'Error al actualizar el estado', type: 'error' })
    }
  }

  // Status formatting helper
  const statusMapToDisplay = (st) => {
    if (st === 'pending' || st === 'pendiente') return 'pendiente'
    if (st === 'en_ruta' || st === 'in_transit') return 'en ruta'
    if (st === 'entregada' || st === 'delivered') return 'entregada'
    if (st === 'cancelada' || st === 'cancelled') return 'cancelada'
    return st
  }

  const getStatusColor = (st) => {
    const norm = statusMapToDisplay(st)
    if (norm === 'pendiente') return isLight ? 'bg-amber-500/15 text-amber-800 border-amber-500/40' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
    if (norm === 'en ruta') return isLight ? 'bg-blue-500/15 text-blue-800 border-blue-500/40' : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
    if (norm === 'entregada') return isLight ? 'bg-emerald-500/15 text-emerald-800 border-emerald-500/40' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
    if (norm === 'cancelada') return isLight ? 'bg-red-500/15 text-red-800 border-red-500/40' : 'bg-red-500/15 text-red-300 border-red-500/30'
    return isLight ? 'bg-gray-500/15 text-gray-800 border-gray-500/40' : 'bg-gray-500/15 text-gray-300 border-gray-500/30'
  }

  const getPaymentStatusColor = (st) => {
    if (st === 'paid' || st === 'pagado') return isLight ? 'bg-emerald-500/15 text-emerald-800 border-emerald-500/40' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    if (st === 'pending' || st === 'pendiente') return isLight ? 'bg-amber-500/15 text-amber-800 border-amber-500/40' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    return isLight ? 'bg-red-500/15 text-red-800 border-red-500/40' : 'bg-red-500/10 text-red-400 border-red-500/20'
  }

  // Parse Date and Time helpers
  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  const formatTime = (dateStr) => {
    if (!dateStr) return '—'
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    const hh = String(date.getHours()).padStart(2, '0')
    const mm = String(date.getMinutes()).padStart(2, '0')
    return `${hh}:${mm} hrs`
  }

  // Performance metrics calculation for Metrics Tab
  const counts = useMemo(() => {
    const res = { pending: 0, en_ruta: 0, delivered: 0, cancelled: 0 }
    deliveries.forEach(d => {
      const st = statusMapToDisplay(d.status)
      if (st === 'pendiente') res.pending++
      else if (st === 'en ruta') res.en_ruta++
      else if (st === 'entregada') res.delivered++
      else if (st === 'cancelada') res.cancelled++
    })
    return res
  }, [deliveries])

  const performanceMetrics = useMemo(() => {
    const finishedCount = counts.delivered + counts.cancelled
    const successRate = finishedCount > 0 ? Math.round((counts.delivered / finishedCount) * 100) : 0
    
    const deliveredList = deliveries.filter(d => statusMapToDisplay(d.status) === 'entregada' && d.created_at)
    
    const deliveryTimes = deliveredList.map(d => {
      const start = new Date(d.created_at)
      const end = new Date(d.updated_at || d.created_at)
      const diffMs = end - start
      return Math.max(Math.floor(diffMs / 60000), 0)
    })
    
    const avgTime = deliveryTimes.length > 0 
      ? Math.round(deliveryTimes.reduce((sum, t) => sum + t, 0) / deliveryTimes.length)
      : 0

    const onTimeCount = deliveryTimes.filter(t => t <= 40).length
    const onTimeRate = deliveredList.length > 0
      ? Math.round((onTimeCount / deliveredList.length) * 100)
      : 0

    const delayedCount = deliveryTimes.filter(t => t > 40).length
    const cancelledCount = counts.cancelled
    const totalIncidents = cancelledCount + delayedCount

    const driverCounts = {}
    deliveries.forEach(d => {
      if (statusMapToDisplay(d.status) === 'entregada' && (d.driver_name || d.driver?.name)) {
        const name = d.driver_name || d.driver?.name
        driverCounts[name] = (driverCounts[name] || 0) + 1
      }
    })
    const topDrivers = Object.entries(driverCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    const weekdayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    const weeklyDataMap = { 
      'Lun': { total: 0, onTime: 0 }, 
      'Mar': { total: 0, onTime: 0 }, 
      'Mié': { total: 0, onTime: 0 }, 
      'Jue': { total: 0, onTime: 0 }, 
      'Vie': { total: 0, onTime: 0 }, 
      'Sáb': { total: 0, onTime: 0 }, 
      'Dom': { total: 0, onTime: 0 } 
    }
    
    deliveries.forEach(d => {
      const date = new Date(d.created_at)
      if (!isNaN(date.getTime())) {
        const dayName = weekdayNames[date.getDay()]
        if (weeklyDataMap[dayName]) {
          weeklyDataMap[dayName].total++
          if (statusMapToDisplay(d.status) === 'entregada') {
            weeklyDataMap[dayName].onTime++
          }
        }
      }
    })
    
    const weeklyTrend = Object.entries(weeklyDataMap).map(([label, stats]) => {
      const slaPct = stats.total > 0 ? Math.round((stats.onTime / stats.total) * 100) : 0
      return { label, val: slaPct }
    })

    return {
      successRate,
      avgTime,
      onTimeRate,
      delayedCount,
      cancelledCount,
      totalIncidents,
      topDrivers,
      weeklyTrend
    }
  }, [deliveries, counts])

  const revenueByDay = useMemo(() => {
    if (!Array.isArray(deliveries) || deliveries.length === 0) return []
    const now = new Date()
    const startDateThreshold = new Date()
    if (revenueTimeFilter === 'week') {
      startDateThreshold.setDate(now.getDate() - 7)
    } else if (revenueTimeFilter === 'month') {
      startDateThreshold.setDate(now.getDate() - 30)
    } else if (revenueTimeFilter === '3months') {
      startDateThreshold.setDate(now.getDate() - 90)
    }

    const map = {}
    deliveries.forEach(d => {
      if (statusMapToDisplay(d.status) === 'entregada') {
        const rawDateStr = d.created_at || d.order?.created_at
        const itemDate = rawDateStr ? new Date(rawDateStr) : null
        if (!itemDate || isNaN(itemDate.getTime()) || itemDate >= startDateThreshold) {
          const dateStr = formatDate(rawDateStr)
          if (!map[dateStr]) {
            map[dateStr] = { date: dateStr, orders: 0, revenue: 0 }
          }
          map[dateStr].orders += 1
          map[dateStr].revenue += parseFloat(d.total_amount ?? d.order?.total_amount ?? 0)
        }
      }
    })
    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date))
  }, [deliveries, revenueTimeFilter])

  useEffect(() => {
    setRevenuePage(1)
  }, [revenueTimeFilter])

  const totalRevenuePages = Math.ceil(revenueByDay.length / ITEMS_PER_PAGE) || 1
  const indexOfLastRevenue = revenuePage * ITEMS_PER_PAGE
  const indexOfFirstRevenue = (revenuePage - 1) * ITEMS_PER_PAGE
  const currentRevenueByDay = revenueByDay.slice(indexOfFirstRevenue, indexOfLastRevenue)
  const startRevenueItem = revenueByDay.length === 0 ? 0 : indexOfFirstRevenue + 1
  const endRevenueItem = Math.min(indexOfLastRevenue, revenueByDay.length)

  const hasDeliveryData = Array.isArray(deliveries) && deliveries.length > 0

  // Exports
  const exportToExcel = () => {
    if (!hasDeliveryData) {
      setToast({ message: 'No hay datos disponibles para exportar', type: 'error' })
      return
    }

    const data = deliveries.map(d => {
      return {
        'Folio Pedido':   d.folio || `#${d.id}`,
        'Cliente':        d.customer_name || d.order?.customer_name || '—',
        'Fecha / Hora':   d.created_at || (d.order?.created_at ? new Date(d.order.created_at).toLocaleString('es-MX') : '—'),
        'Repartidor':     d.driver_name || d.driver?.name || 'Sin asignar',
        'Total Pedido':   `$${(parseFloat(d.total_amount ?? d.order?.total_amount ?? 0)).toFixed(2)}`,
        'Estado Envíos':  statusMapToDisplay(d.status).toUpperCase()
      }
    })

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Entregas')

    const fileName = `delivery_aurum_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  const exportToCSV = () => {
    if (!hasDeliveryData) {
      setToast({ message: 'No hay datos disponibles para exportar', type: 'error' })
      return
    }

    const headers = ['Folio Pedido', 'Cliente', 'Fecha / Hora', 'Repartidor', 'Total Pedido', 'Estado Envio']
    const rows = deliveries.map(d => [
      d.folio || `#${d.id}`,
      d.customer_name || d.order?.customer_name || '—',
      d.created_at || (d.order?.created_at ? new Date(d.order.created_at).toLocaleString('es-MX') : '—'),
      d.driver_name || d.driver?.name || 'Sin asignar',
      `$${(parseFloat(d.total_amount ?? d.order?.total_amount ?? 0)).toFixed(2)}`,
      statusMapToDisplay(d.status).toUpperCase()
    ])

    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.setAttribute("download", `delivery_aurum_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToPDF = () => {
    if (!hasDeliveryData) {
      setToast({ message: 'No hay datos disponibles para exportar', type: 'error' })
      return
    }

    try {
      const doc = new jsPDF()

      doc.setFontSize(16)
      doc.text('Monitoreo de Entregas Delivery - Aurum', 14, 15)

      doc.setFontSize(10)
      doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, 14, 22)

      const tableColumn = ['Folio', 'Cliente', 'Fecha / Hora', 'Total', 'Repartidor', 'Estado']
      const tableRows = deliveries.map(d => [
        d.folio || `#${d.id}`,
        d.customer_name || d.order?.customer_name || '—',
        d.created_at || '',
        `$${(parseFloat(d.total_amount ?? d.order?.total_amount ?? 0)).toFixed(2)}`,
        d.driver_name || d.driver?.name || 'Sin asignar',
        statusMapToDisplay(d.status).toUpperCase()
      ])

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 28,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [180, 83, 9] }
      })

      doc.save(`delivery_aurum_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (err) {
      console.error('Error generating PDF:', err)
      window.print()
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8 animate-fadeIn font-sans">
      <PageHeader 
        title="Delivery & Repartidores"
        subtitle="Gestión operativa de entregas, seguimiento en mapa y control de flota de repartidores"
        icon={Truck}
      />

      {error && (
        <div className="bg-red-500/5 border border-red-500/10 text-red-400 text-sm px-4 py-3 rounded-xl text-center font-medium animate-fadeIn">
          {error}
        </div>
      )}

      {/* Navigation tabs */}
      <div className="flex flex-wrap max-md:flex-nowrap max-md:overflow-x-auto hide-scrollbar gap-2 mb-6 pb-1">
        {[
          { id: 'deliveries', label: 'Monitoreo de Entregas' },
          { id: 'drivers', label: 'Flota de Repartidores' },
          { id: 'metrics', label: 'Rendimiento y Tiempos' }
        ].map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={
                isActive
                  ? { backgroundColor: colorPrimario, color: '#ffffff' }
                  : { backgroundColor: `${colorPrimario}15`, color: colorPrimario }
              }
              className="px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer whitespace-nowrap shadow-xs shrink-0"
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'deliveries' && (
        <>
          {/* Summary stats - 5 cards grid using system StatCard */}
          <div className="rounded-2xl p-6 transition-colors duration-200 overflow-hidden" style={{ backgroundColor: bgCard, border: `1px solid ${borderSubtle}`, boxShadow: cardShadow }}>
            <div className="flex xl:grid xl:grid-cols-5 gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory pb-4 w-full hide-scrollbar items-stretch scrollbar-none">
              {loading ? (
                <>
                  <div className="flex-1 min-w-[280px] md:min-w-[320px] xl:min-w-0 snap-center"><div className="animate-shimmer rounded-xl h-24 w-full" /></div>
                  <div className="flex-1 min-w-[280px] md:min-w-[320px] xl:min-w-0 snap-center"><div className="animate-shimmer rounded-xl h-24 w-full" /></div>
                  <div className="flex-1 min-w-[280px] md:min-w-[320px] xl:min-w-0 snap-center"><div className="animate-shimmer rounded-xl h-24 w-full" /></div>
                  <div className="flex-1 min-w-[280px] md:min-w-[320px] xl:min-w-0 snap-center"><div className="animate-shimmer rounded-xl h-24 w-full" /></div>
                  <div className="flex-1 min-w-[280px] md:min-w-[320px] xl:min-w-0 snap-center"><div className="animate-shimmer rounded-xl h-24 w-full" /></div>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-[280px] md:min-w-[320px] xl:min-w-0 snap-center">
                    <StatCard
                      title="Pendientes"
                      value={resumen.pendientes}
                      icon={Clock}
                      color="yellow"
                    />
                  </div>
                  <div className="flex-1 min-w-[280px] md:min-w-[320px] xl:min-w-0 snap-center">
                    <StatCard
                      title="En Ruta"
                      value={resumen.en_ruta}
                      icon={Truck}
                      color="blue"
                    />
                  </div>
                  <div className="flex-1 min-w-[280px] md:min-w-[320px] xl:min-w-0 snap-center">
                    <StatCard
                      title="Entregadas"
                      value={resumen.entregadas}
                      icon={CheckCircle}
                      color="green"
                    />
                  </div>
                  <div className="flex-1 min-w-[280px] md:min-w-[320px] xl:min-w-0 snap-center">
                    <StatCard
                      title="Canceladas"
                      value={resumen.canceladas}
                      icon={XCircle}
                      color="red"
                    />
                  </div>
                  <div className="flex-1 min-w-[280px] md:min-w-[320px] xl:min-w-0 snap-center">
                    <StatCard
                      title="Repartidores"
                      value={drivers.length}
                      icon={User}
                      color="purple"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Combined Controls Card: Search, Filters & Export */}
          <div className="rounded-2xl p-6 max-md:p-3 transition-colors duration-200" style={{ backgroundColor: bgCard, border: `1px solid ${borderSubtle}`, boxShadow: cardShadow }}>
            <div className="flex flex-col space-y-4 max-md:space-y-3">
              {/* Encabezado con Título y Botones de Exportación compactos a la altura del título */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-md:gap-3">
                <div>
                  <h2 className="text-sm font-extrabold text-theme-text tracking-wide uppercase">REGISTRO DE ENTREGAS</h2>
                  <p className="text-theme-text-muted text-[10px] mt-0.5 font-bold uppercase tracking-wider">DESPACHOS Y SEGUIMIENTO DE PEDIDOS</p>
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

              {/* Buscador de entregas */}
              <div className="relative w-full">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por folio, cliente o repartidor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-subcard pl-10 pr-4 py-2.5 border border-theme-border-subtle rounded-xl text-sm text-theme-text placeholder-slate-400 dark:placeholder-white/45 focus:outline-none focus:border-brand-500/50 w-full transition-all"
                  style={{ backgroundColor: bgInput }}
                />
              </div>

              {/* Contenedor de Filtros: flex-col en max-xl para separar estados de fechas */}
              <div className="flex justify-between items-center max-xl:flex-col max-xl:items-start gap-4 max-md:gap-3 mb-6 max-md:mb-3 w-full pt-1">
                  {/* Fila 1: Botones de estado */}
                  <div className="flex flex-wrap max-md:flex-nowrap max-md:overflow-x-auto max-md:pb-3 hide-scrollbar items-center gap-2 pb-2 w-full sm:w-auto">
                  {[
                    { key: 'all',       label: 'Todas',     count: resumen.total_pedidos },
                    { key: 'pending',   label: 'Pendiente', count: resumen.pendientes },
                    { key: 'en_ruta',   label: 'En ruta',   count: resumen.en_ruta },
                    { key: 'entregada', label: 'Entregada', count: resumen.entregadas },
                    { key: 'cancelada', label: 'Cancelada', count: resumen.canceladas },
                  ].map(filterOpt => {
                    const isActive = statusFilter === filterOpt.key
                    return (
                      <button
                        key={filterOpt.key}
                        type="button"
                        onClick={() => setStatusFilter(filterOpt.key)}
                        style={
                          isActive
                            ? { backgroundColor: colorPrimario || '#dc2626', color: '#ffffff' }
                            : { backgroundColor: colorPrimario ? `${colorPrimario}18` : 'rgba(220, 38, 38, 0.12)', color: colorPrimario || '#b91c1c' }
                        }
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shadow-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 hover:opacity-90"
                      >
                        <span>{filterOpt.label}</span>
                        <span 
                          style={
                            isActive
                              ? { backgroundColor: 'rgba(255, 255, 255, 0.25)', color: '#ffffff' }
                              : { backgroundColor: colorPrimario ? `${colorPrimario}25` : 'rgba(220, 38, 38, 0.2)', color: colorPrimario || '#b91c1c' }
                          }
                          className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center font-mono"
                        >
                          {filterOpt.count}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* Fila 2: Rango de Fechas (Inicio y Fin) */}
                <div className="flex max-md:flex-col gap-3 max-md:gap-2 max-md:w-full shrink-0">
                  <DatePicker
                    value={startDate}
                    onChange={setStartDate}
                    placeholder="Fecha Inicio"
                    customPrefix=""
                    clearable={true}
                    fullWidth
                  />
                  <DatePicker
                    value={endDate}
                    onChange={setEndDate}
                    placeholder="Fecha Fin"
                    customPrefix=""
                    clearable={true}
                    fullWidth
                  />
                  {(startDate || endDate) && (
                    <button
                      type="button"
                      onClick={() => { setStartDate(''); setEndDate(''); }}
                      className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-red-500 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all cursor-pointer whitespace-nowrap"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4 mt-6">
              {loading ? (
                <div className="space-y-2.5">
                  <div className="animate-shimmer rounded-lg h-12 w-full" />
                  <div className="animate-shimmer rounded-lg h-12 w-full" />
                  <div className="animate-shimmer rounded-lg h-12 w-full" />
                </div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <Table className="min-w-[1000px]" bg="transparent" shadow="shadow-lg" headers={['Folio', 'Cliente', 'Fecha / Hora', 'Total', 'Repartidor', 'Estado', 'Acciones']}>
                  {currentDeliveries.map((del, index) => {
                    const delayClass = `delay-${Math.min(index + 1, 5)}`
                    const clientName = del.customer_name || del.order?.customer_name || '—'
                    const totalAmount = parseFloat(del.total_amount ?? del.order?.total_amount ?? 0)
                    const driverName = del.driver_name || del.driver?.name || null
                    
                    return (
                      <tr 
                        key={del.id} 
                        className={`h-16 border-b transition-colors duration-150 animate-fadeInUp bg-transparent ${delayClass}`}
                        style={{ backgroundColor: 'var(--theme-surface)', borderColor: borderSubtle }}
                      >
                        <td className="px-4 py-3 text-sm font-mono font-bold tracking-[1px]" style={{ color: colorPrimario || 'var(--theme-primary)' }}>
                          {del.folio || `#${del.id}`}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="font-semibold" style={{ color: 'var(--theme-text)' }}>{clientName}</div>
                          {del.customer_phone && (
                            <div className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>{del.customer_phone}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                          <div>{del.created_at || formatDate(del.order?.created_at)}</div>
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-amber-300">
                          ${totalAmount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {driverName ? (
                            <div className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--theme-text)' }}>
                              <UserCheck size={13} style={{ color: colorPrimario || 'var(--theme-primary)' }} className="shrink-0" />
                              <span>{driverName}</span>
                            </div>
                          ) : (
                            <div className="text-xs italic px-2 py-1 rounded w-max" style={{ backgroundColor: 'var(--theme-input)', color: 'var(--theme-text-muted)' }}>Sin asignar</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${getStatusColor(del.status)}`}>
                            {statusMapToDisplay(del.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center justify-center">
                            <button
                              onClick={() => handleOpenDetail(del.id)}
                              className="border rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 hover:opacity-80 shadow-xs"
                              style={{ backgroundColor: bgInput, borderColor: borderSubtle, color: textColor }}
                              title="Ver Detalle Completo"
                            >
                              <Eye size={13} />
                              <span>Detalle</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {currentDeliveries.length > 0 && Array.from({ length: ITEMS_PER_PAGE - currentDeliveries.length }).map((_, i) => (
                    <tr key={`empty-${i}`} className="h-16 border-b border-transparent bg-transparent" style={{ backgroundColor: 'var(--theme-surface)' }}>
                      <td colSpan="7"></td>
                    </tr>
                  ))}
                  {(!Array.isArray(deliveries) || deliveries.length === 0) && (
                    <tr style={{ backgroundColor: 'var(--theme-surface)' }}>
                      <td colSpan="7" className="p-0 border-none" style={{ backgroundColor: 'var(--theme-surface)' }}>
                        <div className="h-[32rem] flex items-center justify-center" style={{ backgroundColor: 'var(--theme-surface)' }}>
                          <EmptyState
                            title="Sin entregas registradas"
                            description="No hay despachos de comida registrados para el período o los filtros seleccionados."
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
              {!driversLoading && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t" style={{ borderColor: borderSubtle }}>
                  {/* Lado izquierdo: Conteo */}
                  <div className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                    Mostrando {startItem} a {endItem} de {deliveries.length} entregas
                  </div>

                  {/* Lado derecho: Controles */}
                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1 || deliveries.length === 0}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5"
                      style={currentPage > 1 && deliveries.length > 0 ? {
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
                      {deliveries.length === 0 ? 1 : currentPage} / {totalPages}
                    </div>

                    <button 
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage >= totalPages || deliveries.length === 0}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5"
                      style={currentPage < totalPages && deliveries.length > 0 ? {
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
        </>
      )}

      {/* Tab 2: Directorio de Repartidores */}
      {activeTab === 'drivers' && (
        <div className="rounded-2xl p-6 transition-colors duration-200" style={{ backgroundColor: bgCard, border: `1px solid ${borderSubtle}`, boxShadow: cardShadow }}>
          <div className="flex flex-col space-y-4">
            {/* Encabezado de Sección */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-theme-text tracking-wide uppercase">Plantilla de Repartidores</h2>
                <p className="text-theme-text-muted text-[10px] mt-0.5 font-bold uppercase tracking-wider">
                  {driverResumen.total} REGISTRADOS • {driverResumen.activos} ACTIVOS • {driverResumen.inactivos} INACTIVOS
                </p>
              </div>
              <button
                type="button"
                onClick={() => { 
                  setEditingDriver(null); 
                  setDriverForm({ name: '', phone: '', email: '', password: '', active: true }); 
                  setDriverErrors({ name: '', phone: '', email: '' });
                  setShowDriverModal(true); 
                }}
                className="flex items-center gap-2 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg transition-all duration-200 cursor-pointer"
                style={{ backgroundColor: colorPrimario }}
              >
                <Plus size={15}/> <span>Nuevo repartidor</span>
              </button>
            </div>

            {/* Buscador + Filtros de Estado a la derecha */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Buscador */}
              <div className="relative flex-1 min-w-[200px]">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
                <input
                  type="text"
                  value={driverSearch}
                  onChange={e => setDriverSearch(e.target.value)}
                  placeholder="Buscar por nombre o teléfono..."
                  className="pl-10 pr-10 py-2.5 border border-theme-border-subtle rounded-xl text-sm text-theme-text placeholder-white/45 focus:outline-none focus:border-brand-500/50 w-full transition-all"
                  style={{ backgroundColor: bgInput }}
                />
                {driverSearch && (
                  <button onClick={() => setDriverSearch('')} className="absolute right-3 top-3 text-theme-text-muted hover:text-white/50 transition-colors cursor-pointer">
                    <X size={14}/>
                  </button>
                )}
              </div>

              {/* Status Filter Badges a la derecha */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {[
                  { key: 'all',      label: 'TODOS',     count: driverResumen.total },
                  { key: 'active',   label: 'ACTIVOS',   count: driverResumen.activos },
                  { key: 'inactive', label: 'INACTIVOS', count: driverResumen.inactivos },
                ].map(opt => {
                  const isActive = driverStatus === opt.key
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setDriverStatus(opt.key)}
                      className="h-10 px-4 flex items-center justify-center gap-2 rounded-xl text-[11px] font-bold tracking-wide transition-all cursor-pointer whitespace-nowrap shrink-0 border border-transparent"
                      style={isActive
                        ? { backgroundColor: colorPrimario, color: '#ffffff' }
                        : { backgroundColor: `${colorPrimario}15`, color: colorPrimario }}
                    >
                      <span>{opt.label}</span>
                      <span 
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-bold transition-colors"
                        style={isActive
                          ? { backgroundColor: 'rgba(255,255,255,0.25)', color: '#ffffff' }
                          : { backgroundColor: `${colorPrimario}25`, color: colorPrimario }}
                      >
                        {opt.count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="space-y-4 mt-6">
            {driversLoading ? (
              <div className="space-y-2.5">
                <div className="animate-shimmer rounded-lg h-12 w-full" />
                <div className="animate-shimmer rounded-lg h-12 w-full" />
                <div className="animate-shimmer rounded-lg h-12 w-full" />
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <Table className="min-w-[800px]" bg="transparent" shadow="shadow-lg" headers={['Nombre', 'Email', 'Teléfono', 'Estado', 'Acciones']}>
                {currentDrivers.map((driver, i) => (
                  <tr 
                    key={driver.id ?? i} 
                    className="h-16 border-b transition-colors duration-150 bg-white dark:bg-[var(--theme-surface)] hover:bg-gray-50 dark:hover:bg-gray-800/50 border-gray-100 dark:border-gray-800/60 animate-fadeInUp"
                    style={{ backgroundColor: 'var(--theme-surface)', borderColor: borderSubtle }}
                  >
                    <td className="px-4 py-3 text-sm font-semibold text-theme-text">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-xs shrink-0"
                          style={{ backgroundColor: `${colorPrimario}18`, borderColor: `${colorPrimario}30`, color: colorPrimario }}
                        >
                          {driver.name?.[0]?.toUpperCase() ?? 'R'}
                        </div>
                        <span className="font-semibold truncate" style={{ color: 'var(--theme-text)' }}>{driver.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                      {driver.email || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                      {driver.phone || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${
                        driver.active 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20' 
                          : 'bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/20'
                      }`}>
                        {driver.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleDriver(driver.id)}
                          className={`px-2 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                            driver.active
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20 hover:bg-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20'
                          }`}
                          title={driver.active ? 'Desactivar repartidor' : 'Activar repartidor'}
                        >
                          {driver.active ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDriver(driver)
                            setDriverForm({
                              name: driver.name || '',
                              phone: driver.phone || '',
                              email: driver.email || '',
                              password: '',
                              active: driver.active ?? true
                            })
                            setDriverErrors({ name: '', phone: '', email: '' })
                            setShowDriverModal(true)
                          }}
                          className="p-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-100/80 dark:bg-white/5 text-gray-900 dark:text-white transition-all cursor-pointer hover:bg-gray-200 dark:hover:bg-white/10 shadow-xs"
                          title="Editar"
                        >
                          <Edit2 size={14} className="text-gray-900 dark:text-white" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDriver(driver.id)}
                          className="p-1.5 rounded-lg border transition-all cursor-pointer hover:bg-red-500/20 shadow-xs"
                          style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            borderColor: 'rgba(239, 68, 68, 0.25)',
                            color: '#ef4444'
                          }}
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {currentDrivers.length > 0 && Array.from({ length: ITEMS_PER_PAGE - currentDrivers.length }).map((_, i) => (
                  <tr key={`empty-drv-${i}`} className="h-16 border-b border-transparent bg-white dark:bg-[var(--theme-surface)]" style={{ backgroundColor: 'var(--theme-surface)' }}>
                    <td colSpan="5"></td>
                  </tr>
                ))}
                {currentDrivers.length === 0 && (
                  <tr className="bg-white dark:bg-[var(--theme-surface)]" style={{ backgroundColor: 'var(--theme-surface)' }}>
                    <td colSpan="5" className="p-0 border-none text-center py-12">
                      <EmptyState
                        title="Sin repartidores registrados"
                        description={driverSearch || driverStatus !== 'all' ? 'No se encontraron repartidores con esos filtros' : 'Aún no tienes repartidores registrados en la plantilla.'}
                        iconType="drivers"
                      />
                    </td>
                  </tr>
                )}
              </Table>
            </div>
            )}

            {/* Footer de Paginación Fijo (Siempre Visible) */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t" style={{ borderColor: borderSubtle }}>
              <div className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                Mostrando {startDriverItem} a {endDriverItem} de {drivers.length} repartidores
              </div>

              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => setDriverPage(prev => Math.max(prev - 1, 1))}
                  disabled={driverPage === 1 || drivers.length === 0}
                  style={driverPage > 1 && drivers.length > 0 ? {
                    backgroundColor: 'var(--theme-surface)',
                    borderColor: borderSubtle,
                    color: 'var(--theme-text)',
                    cursor: 'pointer'
                  } : {
                    backgroundColor: 'var(--theme-surface)',
                    borderColor: borderSubtle,
                    color: 'var(--theme-text)',
                    opacity: 0.4,
                    cursor: 'not-allowed'
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5"
                >
                  Anterior
                </button>

                <span className="text-xs font-mono font-bold px-2" style={{ color: 'var(--theme-text)' }}>
                  {drivers.length === 0 ? 1 : driverPage} / {totalDriverPages}
                </span>

                <button 
                  type="button"
                  onClick={() => setDriverPage(prev => Math.min(prev + 1, totalDriverPages))}
                  disabled={driverPage >= totalDriverPages || drivers.length === 0}
                  style={driverPage < totalDriverPages && drivers.length > 0 ? {
                    backgroundColor: colorPrimario || 'var(--theme-primary)',
                    borderColor: colorPrimario || 'var(--theme-primary)',
                    color: primaryBtnText || '#fff',
                    cursor: 'pointer'
                  } : {
                    backgroundColor: 'var(--theme-surface)',
                    borderColor: borderSubtle,
                    color: 'var(--theme-text)',
                    opacity: 0.4,
                    cursor: 'not-allowed'
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shadow-xs"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Métricas de Desempeño */}
      {activeTab === 'metrics' && (
        <div className="rounded-2xl p-6 transition-colors duration-200 space-y-6" style={{ backgroundColor: bgCard, border: `1px solid ${borderSubtle}`, boxShadow: cardShadow }}>
          {/* Header Global de Métricas con Filtro Elevado */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: borderSubtle }}>
            <div>
              <h2 className="text-sm font-bold text-theme-text uppercase tracking-wider">Dashboard de Rendimiento & Finanzas</h2>
              <p className="text-xs text-theme-text-muted mt-0.5">Monitoreo de puntualidad, incidencias y cortes de repartidores</p>
            </div>
            
            {/* BOTONERA GLOBAL */}
            <div 
              className="flex items-center gap-1.5 p-1 rounded-xl border shrink-0 overflow-x-auto scrollbar-none"
              style={{ backgroundColor: bgSubcard, borderColor: borderSubtle }}
            >
              {[
                { id: 'hoy', label: 'Hoy' },
                { id: 'semana', label: 'Esta semana' },
                { id: 'mes', label: 'Este mes' },
                { id: '3meses', label: 'Últimos 3 meses' }
              ].map(f => {
                const isSelected = filtroGlobal === f.id
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFiltroGlobal(f.id)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap shadow-xs"
                    style={{
                      backgroundColor: isSelected
                        ? (colorPrimario || 'var(--theme-primary, #3b82f6)')
                        : 'transparent',
                      color: isSelected
                        ? 'var(--theme-primary-contrast, #ffffff)'
                        : textMuted,
                    }}
                  >
                    {f.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Fila 1: KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4" style={{ backgroundColor: bgSubcard, border: `1px solid ${borderSubtle}` }}>
              <div>
                <div className="flex items-center justify-between pb-1">
                  <h3 className="text-sm font-bold text-theme-text tracking-wider uppercase">Tiempos y Puntualidad de Entregas</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-3">
                  <div className="space-y-1">
                    <span className="text-[10px] text-theme-text-muted uppercase font-bold tracking-wider">Tiempo Promedio por Pedido</span>
                    <p className="text-3xl font-black text-theme-text">
                      {performanceData.tiempo_promedio_min ?? performanceData.tiempos_puntualidad?.tiempo_promedio_minutos ?? 0} <span className="text-xs font-semibold text-theme-text-muted">min</span>
                    </p>
                    <span className="text-[9px] font-bold block" style={{ color: '#1D4ED8' }}>
                      Meta del local: menos de {performanceData.meta_minutos ?? performanceData.tiempos_puntualidad?.meta_minutos ?? 40} min
                    </span>
                  </div>
                  <div className="space-y-1 pl-2">
                    <span className="text-[10px] text-theme-text-muted uppercase font-bold tracking-wider">Pedidos Entregados a Tiempo</span>
                    <p className="text-3xl font-black text-theme-text">
                      {performanceData.porcentaje_a_tiempo ?? performanceData.tiempos_puntualidad?.pedidos_a_tiempo_porcentaje ?? 0}%
                    </p>
                    <span className="text-[9px] font-bold block" style={{ color: '#15803D' }}>
                      Meta del local: {performanceData.meta_puntualidad ?? performanceData.tiempos_puntualidad?.meta_puntualidad ?? 90}% o más
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center text-[10px] text-theme-text-muted">
                  <span>Cumplimiento de la meta de puntualidad hoy</span>
                  <span>{performanceData.cumplimiento_hoy_porcentaje ?? performanceData.tiempos_puntualidad?.cumplimiento_hoy_porcentaje ?? performanceData.porcentaje_a_tiempo ?? 0}% de la meta ({performanceData.meta_puntualidad ?? performanceData.tiempos_puntualidad?.meta_puntualidad ?? 90}%)</span>
                </div>
                <div 
                  className="w-full h-3 rounded-full bg-white dark:bg-[var(--theme-surface)] border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors"
                  style={{ backgroundColor: 'var(--theme-surface)' }}
                >
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${Math.min(100, performanceData.cumplimiento_hoy_porcentaje ?? performanceData.tiempos_puntualidad?.cumplimiento_hoy_porcentaje ?? performanceData.porcentaje_a_tiempo ?? 0)}%`,
                      backgroundColor: colorPrimario || 'var(--theme-primary)'
                    }} 
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4" style={{ backgroundColor: bgSubcard, border: `1px solid ${borderSubtle}` }}>
              <div>
                <div className="flex items-center justify-between pb-1">
                  <h3 className="text-sm font-bold text-theme-text tracking-wider uppercase">Problemas e Incidencias en Ruta</h3>
                </div>
                
                <div className="grid grid-cols-3 gap-2 pt-3">
                  <div className="space-y-1">
                    <span className="text-[9px] text-theme-text-muted uppercase font-bold tracking-wider">Entregas Completadas</span>
                    <p className="text-2xl font-black text-theme-text">{performanceData.porcentaje_completadas ?? performanceData.incidencias?.entregas_completadas_porcentaje ?? 0}%</p>
                    <span className="text-[9px] text-theme-text-muted block">Pedidos sin cancelar</span>
                  </div>
                  <div className="space-y-1 pl-1">
                    <span className="text-[9px] text-theme-text-muted uppercase font-bold tracking-wider">Pedidos con Demora</span>
                    <p className="text-2xl font-black" style={{ color: '#B45309' }}>{performanceData.pedidos_con_demora ?? performanceData.incidencias?.pedidos_con_demora ?? 0}</p>
                    <span className="text-[9px] font-medium block" style={{ color: '#B45309' }}>Tardaron más de 40 min</span>
                  </div>
                  <div className="space-y-1 pl-1">
                    <span className="text-[9px] text-theme-text-muted uppercase font-bold tracking-wider">Total Pedidos con Problema</span>
                    <p className="text-2xl font-black" style={{ color: '#DC2626' }}>{performanceData.total_problemas ?? performanceData.incidencias?.total_con_problema ?? 0}</p>
                    <span className="text-[9px] font-medium block" style={{ color: '#DC2626' }}>Demoras + Cancelados</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5 text-theme-text-muted">
                  <span className={`w-2 h-2 rounded-full ${
                    performanceData.incidencias?.estado_servicio === 'Óptimo' 
                      ? 'bg-emerald-500' 
                      : performanceData.incidencias?.estado_servicio === 'Regular'
                        ? 'bg-amber-500' 
                        : performanceData.incidencias?.estado_servicio === 'Crítico'
                          ? 'bg-red-500'
                          : 'bg-gray-400'
                  }`} />
                  <span>Estado del servicio hoy: <strong style={{
                    color: performanceData.incidencias?.estado_servicio === 'Óptimo' ? '#15803D' :
                           performanceData.incidencias?.estado_servicio === 'Regular' ? '#B45309' :
                           performanceData.incidencias?.estado_servicio === 'Crítico' ? '#DC2626' : undefined
                  }} className={!performanceData.incidencias?.estado_servicio ? 'text-theme-text-muted' : ''}>{performanceData.incidencias?.estado_servicio || 'Sin datos disponibles'}</strong></span>
                </div>
                <span className="text-theme-text-muted italic">Datos en tiempo real</span>
              </div>
            </div>
          </div>

          {/* Tabla de Cortes e Ingresos de Delivery (Flujo Reactivo con Filtro Elevado) */}
          <div className="mt-8 pt-6 border-t" style={{ borderColor: borderSubtle }}>
            <CortesDelivery filtro={filtroGlobal} onFiltroChange={setFiltroGlobal} />
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailItem && (
        <Modal
          title={`Detalle de Entrega — ${detailItem.folio || `#${detailItem.id}`}`}
          onClose={() => setDetailItem(null)}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tarjeta 1: Datos del Cliente */}
              <div 
                className="input-subcard border rounded-xl p-5 space-y-3.5 shadow-xs transition-colors"
                style={{ 
                  backgroundColor: bgSubcard,
                  borderColor: isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)'
                }}
              >
                <h4 
                  className="text-xs font-bold tracking-wider uppercase border-b pb-2"
                  style={{ 
                    color: textMuted,
                    borderColor: isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'
                  }}
                >
                  Datos del Cliente
                </h4>
                
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-lg border flex items-center justify-center text-brand-600 dark:text-brand-400 shadow-xs shrink-0"
                      style={{ 
                        backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.08)',
                        borderColor: isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)'
                      }}
                    >
                      <User size={15} />
                    </div>
                    <div className="text-sm font-bold" style={{ color: textColor }}>
                      {detailItem.customer_name || detailItem.order?.customer_name || 'Cliente General'}
                    </div>
                  </div>

                  {(detailItem.customer_phone || detailItem.order?.customer_phone) && (
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-lg border flex items-center justify-center text-brand-600 dark:text-brand-400 shadow-xs shrink-0"
                        style={{ 
                          backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.08)',
                          borderColor: isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)'
                        }}
                      >
                        <Phone size={15} />
                      </div>
                      <div className="text-sm font-semibold" style={{ color: textColor }}>
                        {detailItem.customer_phone || detailItem.order?.customer_phone}
                      </div>
                    </div>
                  )}

                  <div 
                    className="flex items-start gap-3 border-t pt-3.5 mt-2"
                    style={{ borderColor: isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)' }}
                  >
                    <div 
                      className="w-8 h-8 rounded-lg border flex items-center justify-center text-brand-600 dark:text-brand-400 shadow-xs shrink-0 mt-0.5"
                      style={{ 
                        backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.08)',
                        borderColor: isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)'
                      }}
                    >
                      <MapPin size={15} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: textMuted }}>
                        Dirección de Entrega
                      </span>
                      <span className="text-sm leading-relaxed font-semibold mt-1 block" style={{ color: textColor }}>
                        {detailItem.customer_address || detailItem.order?.customer_address || 'Sin dirección ingresada'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tarjeta 2: Repartidor Asignado */}
              <div 
                className="input-subcard border rounded-xl p-5 space-y-3.5 flex flex-col justify-between shadow-xs transition-colors"
                style={{ 
                  backgroundColor: bgSubcard,
                  borderColor: isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)'
                }}
              >
                <div className="space-y-3.5">
                  <h4 
                    className="text-xs font-bold tracking-wider uppercase border-b pb-2"
                    style={{ 
                      color: textMuted,
                      borderColor: isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    Repartidor Asignado
                  </h4>
                  
                  {detailItem.driver_name || detailItem.driver?.name ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/25 flex items-center justify-center text-brand-600 dark:text-brand-400 shrink-0">
                          <UserCheck size={16} />
                        </div>
                        <div>
                          <div className="text-sm font-bold" style={{ color: textColor }}>
                            {detailItem.driver_name || detailItem.driver?.name}
                          </div>
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider block mt-0.5">
                            Asignado Exitosamente
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center space-y-2">
                      <div className="text-xs font-semibold italic" style={{ color: textMuted }}>
                        Sin repartidor asignado
                      </div>
                      <div className="inline-block bg-amber-500/20 border border-amber-500/40 text-amber-800 dark:text-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Pendiente de Escaneo QR
                      </div>
                    </div>
                  )}
                </div>

                {/* Recuadro del Código QR Funcional */}
                {(() => {
                  const dispatchToken = detailItem.dispatch_token || detailItem.order?.dispatch_token || detailItem.folio || `AURUM-DEL-${detailItem.id}`
                  return (
                    <div 
                      className="rounded-xl p-3 border shadow-sm flex items-center gap-3 mt-4"
                      style={{ 
                        backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.08)',
                        borderColor: isLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.15)'
                      }}
                    >
                      <div 
                        className="p-1.5 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0 shadow-2xs"
                      >
                        <QRCodeSVG 
                          value={dispatchToken} 
                          size={44}
                          bgColor="#FFFFFF"
                          fgColor="#000000"
                          level="M"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: textMuted }}>
                          ID Despacho QR
                        </span>
                        <span className="text-sm font-mono font-bold block" style={{ color: textColor }}>
                          {dispatchToken}
                        </span>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* Tarjeta 3: Productos Solicitados */}
            <div 
              className="input-subcard border rounded-xl p-5 space-y-4 shadow-xs transition-colors"
              style={{ 
                backgroundColor: bgSubcard,
                borderColor: isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)'
              }}
            >
              <h4 
                className="text-xs font-bold tracking-wider uppercase border-b pb-2"
                style={{ 
                  color: textMuted,
                  borderColor: isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'
                }}
              >
                Productos Solicitados
              </h4>
              
              <div className="space-y-3">
                {detailItem.items && detailItem.items.length > 0 ? (
                  detailItem.items.map((item, idx) => {
                    const dishName = item.dish_name || item.dish?.name || 'Platillo'
                    const unitPrice = parseFloat(item.price || 0)
                    const qty = item.quantity || 1
                    const subtotal = unitPrice * qty
                    
                    return (
                      <div 
                        key={idx} 
                        className="flex justify-between items-start text-sm border-b pb-3 last:border-b-0 last:pb-0"
                        style={{ borderColor: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)' }}
                      >
                        <div className="space-y-1">
                          <div className="font-bold" style={{ color: textColor }}>
                            <span className="text-brand-600 dark:text-brand-400 font-black mr-2">{qty}x</span>
                            {dishName}
                          </div>
                          {item.extras && item.extras.length > 0 && (
                            <div className="pl-6 space-y-0.5 mt-1">
                              {item.extras.map((ex, eIdx) => (
                                <span key={eIdx} className="text-[11px] font-medium block" style={{ color: textMuted }}>
                                  + {ex.name || ex.extra?.name || 'Extra'} (+${parseFloat(ex.price || 0).toFixed(2)})
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="font-black" style={{ color: textColor }}>
                          ${subtotal.toFixed(2)}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-center py-4 text-xs font-semibold" style={{ color: textMuted }}>
                    No se encontraron artículos en esta orden.
                  </p>
                )}
              </div>

              <div 
                className="border-t pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                style={{ borderColor: isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)' }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-lg border flex items-center justify-center text-brand-600 dark:text-brand-400 shadow-xs shrink-0"
                    style={{ 
                      backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.08)',
                      borderColor: isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)'
                    }}
                  >
                    <CreditCard size={15} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: textMuted }}>
                      Método y Estado de Pago
                    </span>
                    <span className="text-xs font-bold block mt-0.5" style={{ color: textColor }}>
                      {(detailItem.payment_method || detailItem.order?.payment_method || 'Efectivo').toUpperCase()} — 
                      <span className={`ml-1.5 px-2 py-0.5 rounded text-[10px] border uppercase font-bold ${getPaymentStatusColor(detailItem.payment_status || detailItem.order?.payment_status || 'pending')}`}>
                        {(detailItem.payment_status || detailItem.order?.payment_status) === 'paid' ? 'Pagado' : 'Pendiente'}
                      </span>
                    </span>
                  </div>
                </div>
                <div 
                  className="text-right w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0"
                  style={{ borderColor: isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)' }}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: textMuted }}>
                    Total Cobrado
                  </span>
                  <span className="text-xl font-black text-brand-600 dark:text-brand-400 block mt-1">
                    ${parseFloat(detailItem.total_amount ?? detailItem.order?.total_amount ?? 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div 
              className="flex justify-end gap-3 pt-4 border-t"
              style={{ borderColor: isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)' }}
            >
              <button 
                type="button" 
                onClick={() => setDetailItem(null)}
                className="input-subcard hover:opacity-85 border rounded-xl px-5 py-2.5 text-sm font-bold transition-all cursor-pointer shadow-xs"
                style={{ 
                  backgroundColor: bgSubcard,
                  color: textColor,
                  borderColor: isLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.15)'
                }}
              >
                Cerrar Detalles
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Crear / Editar Repartidor */}
      {showDriverModal && (
        <Modal
          title={editingDriver ? 'Editar repartidor' : 'Nuevo repartidor'}
          onClose={() => {
            setShowDriverModal(false)
            setDriverErrors({ name: '', phone: '', email: '' })
          }}
        >
          <div className="space-y-4 pt-2">
            {/* NOMBRE COMPLETO */}
            <div>
              <label className="text-xs font-semibold text-theme-text-muted uppercase tracking-wider mb-1.5 block">
                Nombre completo *
              </label>
              <input
                type="text"
                maxLength={50}
                value={driverForm.name}
                onChange={e => {
                  setDriverForm(p => ({ ...p, name: e.target.value }))
                  if (driverErrors.name) setDriverErrors(prev => ({ ...prev, name: '' }))
                }}
                onBlur={e => validarDriverCampo('name', e.target.value)}
                placeholder="Ej. Juan García"
                className={`input-subcard border rounded-xl px-4 py-2.5 text-theme-text text-sm w-full focus:outline-none placeholder-slate-400 dark:placeholder-white/20 transition-all ${
                  driverErrors.name 
                    ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/20' 
                    : 'border-theme-border-subtle hover:border-white/20 focus:border-brand-500/40'
                }`}
                style={{ backgroundColor: bgInput }}
              />
              {driverErrors.name && (
                <p className="text-[11px] text-red-500 mt-1 font-medium">{driverErrors.name}</p>
              )}
            </div>

            {/* TELÉFONO */}
            <div>
              <label className="text-xs font-semibold text-theme-text-muted uppercase tracking-wider mb-1.5 block">
                Teléfono *
              </label>
              <input
                type="tel"
                maxLength={10}
                value={driverForm.phone}
                onChange={e => {
                  const soloNumeros = e.target.value.replace(/\D/g, '')
                  setDriverForm(p => ({ ...p, phone: soloNumeros }))
                  if (driverErrors.phone) setDriverErrors(prev => ({ ...prev, phone: '' }))
                }}
                onBlur={e => validarDriverCampo('phone', e.target.value)}
                placeholder="10 dígitos (ej. 7441234567)"
                className={`input-subcard border rounded-xl px-4 py-2.5 text-theme-text text-sm w-full focus:outline-none placeholder-slate-400 dark:placeholder-white/20 transition-all ${
                  driverErrors.phone 
                    ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/20' 
                    : 'border-theme-border-subtle hover:border-white/20 focus:border-brand-500/40'
                }`}
                style={{ backgroundColor: bgInput }}
              />
              {driverErrors.phone && (
                <p className="text-[11px] text-red-500 mt-1 font-medium">{driverErrors.phone}</p>
              )}
            </div>

            {/* EMAIL */}
            <div>
              <label className="text-xs font-semibold text-theme-text-muted uppercase tracking-wider mb-1.5 block">
                Email *
              </label>
              <input
                type="email"
                maxLength={100}
                value={driverForm.email}
                onChange={e => {
                  setDriverForm(p => ({ ...p, email: e.target.value }))
                  if (driverErrors.email) setDriverErrors(prev => ({ ...prev, email: '' }))
                }}
                onBlur={e => validarDriverCampo('email', e.target.value)}
                placeholder="repartidor@ejemplo.com"
                className={`input-subcard border rounded-xl px-4 py-2.5 text-theme-text text-sm w-full focus:outline-none placeholder-slate-400 dark:placeholder-white/20 transition-all ${
                  driverErrors.email 
                    ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/20' 
                    : 'border-theme-border-subtle hover:border-white/20 focus:border-brand-500/40'
                }`}
                style={{ backgroundColor: bgInput }}
              />
              {driverErrors.email && (
                <p className="text-[11px] text-red-500 mt-1 font-medium">{driverErrors.email}</p>
              )}
            </div>

            {/* CONTRASEÑA */}
            {!editingDriver ? (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-theme-text-muted uppercase tracking-wider mb-1.5 block">
                  Contraseña *
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
                  <input
                    type={showDriverPassword ? "text" : "password"}
                    value={driverForm.password}
                    onChange={e => setDriverForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="Mínimo 8 caracteres"
                    className="input-subcard border border-theme-border-subtle hover:border-white/20 focus:border-brand-500/40 rounded-xl pl-10 pr-10 py-2.5 text-theme-text text-sm w-full focus:outline-none placeholder-slate-400 dark:placeholder-white/20 transition-all"
                    style={{ backgroundColor: bgInput }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowDriverPassword(!showDriverPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-theme-text-muted hover:text-white/70 transition-colors cursor-pointer"
                    title={showDriverPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showDriverPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                {/* Parámetros de Seguridad Obligatorios */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] font-medium pt-2">
                  {driverPasswordRules.map((rule) => {
                    const isValid = rule.valid
                    return (
                      <div key={rule.id} className="flex items-center gap-1.5 transition-colors duration-150">
                        {isValid ? (
                          <Check size={13} className="text-emerald-400 shrink-0 stroke-[2.5]" />
                        ) : (
                          <X size={13} className="text-red-400 shrink-0 stroke-[2.5]" />
                        )}
                        <span className={isValid ? "text-emerald-400 font-semibold" : "text-red-400/90 font-medium"}>
                          {rule.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="input-subcard border border-theme-border-subtle rounded-xl p-3 flex items-center gap-2" style={{ backgroundColor: bgInput }}>
                <Lock size={14} className="text-slate-600 dark:text-slate-400 shrink-0" />
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium italic">
                  Para cambiar la contraseña usa la sección de Usuarios
                </p>
              </div>
            )}

            {/* ESTADO */}
            <div className="flex items-center justify-between py-2 border-t border-theme-border-subtle mt-4">
              <div>
                <p className="text-sm text-theme-text font-medium">Estado</p>
                <p className="text-xs text-theme-text-muted">El repartidor puede recibir entregas</p>
              </div>
              <button
                type="button"
                onClick={() => setDriverForm(p => ({ ...p, active: !p.active }))}
                className={`relative w-10 h-5 rounded-full transition-all duration-300 cursor-pointer ${driverForm.active ? 'bg-brand-600' : 'bg-white/10'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${driverForm.active ? 'translate-x-5' : 'translate-x-0'}`}/>
              </button>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-theme-border-subtle">
              <button
                type="button"
                onClick={() => {
                  setShowDriverModal(false)
                  setDriverErrors({ name: '', phone: '', email: '' })
                }}
                className="bg-theme-input hover:bg-white/10 border border-theme-border-subtle text-theme-text-muted hover:text-theme-text rounded-xl px-4 py-2 text-sm transition-all duration-200 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  !driverForm.name.trim() ||
                  !driverForm.phone.trim() ||
                  !driverForm.email.trim() ||
                  driverForm.phone.length !== 10 ||
                  driverForm.name.trim().length < 3 ||
                  !/^[a-zA-ZÀ-ÿ\s]+$/.test(driverForm.name.trim()) ||
                  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(driverForm.email.trim()) ||
                  Boolean(driverErrors.name || driverErrors.phone || driverErrors.email) ||
                  (!editingDriver && !isDriverPasswordValid)
                }
                onClick={handleSaveDriver}
                className="bg-brand-600 hover:bg-brand-500 text-theme-text text-sm font-medium px-5 py-2 rounded-xl shadow-lg shadow-brand-600/30 transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {editingDriver ? 'Guardar cambios' : 'Agregar repartidor'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  )
}
