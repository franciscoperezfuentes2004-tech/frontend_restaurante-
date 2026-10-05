import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertTriangle, Search, Download, Plus, Check, X,
  FileText, DollarSign, Clock, History, User,
  Boxes, Trash2, Package, RefreshCw, Activity
} from 'lucide-react'
import * as XLSX from 'xlsx'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'

import PageHeader from '../../components/ui/PageHeader'
import Toast from '../../components/ui/Toast'
import Dropdown from '../../components/ui/Dropdown'
import EmptyState from '../../components/ui/EmptyState'
import StatCard from '../../components/ui/StatCard'
import MetricCardsLayout from '../../components/ui/MetricCardsLayout'
import DatePicker from '../../components/ui/DatePicker'
import Table from '../../components/ui/Table'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

const ITEMS_PER_PAGE = 8

import {
  adminGetStock,
  adminPostStockEntry,
  adminPostStockAdjustment,
  adminGetStockMovements,
  adminGetStockMetrics
} from '../../api/stock'

import {
  adminGetIngredients,
  adminGetSuppliers,
  adminGetIngredientCategories
} from '../../api/ingredients'

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Todos los Estados" },
  { value: "disponible", label: "Disponible" },
  { value: "stock_bajo", label: "Stock bajo" },
  { value: "agotado", label: "Agotado" },
  { value: "proximo_vencer", label: "Próximo a vencer" }
]

const MOVEMENT_TYPE_OPTIONS = [
  { value: "all", label: "Todos los Tipos" },
  { value: "entrada", label: "Entrada" },
  { value: "salida", label: "Salida" },
  { value: "ajuste", label: "Ajuste" },
  { value: "merma", label: "Merma" }
]

const getTodayString = () => {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function Stock() {
  const { user } = useAuth()
  const { bgBody, bgCard, bgSubcard, bgTable, bgInput, colorPrimario, borderSubtle, cardShadow, textColor, textMuted, isLight } = useTheme()
  const esGerente = user?.role === 'gerente'

  // Navigation tab state
  const [activeTab, setActiveTab] = useState('existencias') // 'existencias', 'movements', 'metrics'

  // Data states from backend
  const [stockList, setStockList] = useState([])
  const [resumen, setResumen] = useState({
    total_ingredientes: 0,
    stock_bajo: 0,
    agotados: 0,
    proximos_vencer: 0,
    capital_almacen: 0,
    salud_porcentaje: 100,
    alertas_criticas: [],
    acciones_recomendadas: []
  })
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  // External selectors list
  const [allIngredients, setAllIngredients] = useState([])
  const [allSuppliers, setAllSuppliers] = useState([])
  const [activeSuppliers, setActiveSuppliers] = useState([])
  const [allCategories, setAllCategories] = useState([])

  // Search & Filter states (Existencias)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [supplierFilter, setSupplierFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Movements Tab states
  const [movementsList, setMovementsList] = useState([])
  const [movementsLoading, setMovementsLoading] = useState(false)
  const [movementIngredientFilter, setMovementIngredientFilter] = useState('all')
  const [movementTypeFilter, setMovementTypeFilter] = useState('all')
  const [movementDateStart, setMovementDateStart] = useState('')
  const [movementDateEnd, setMovementDateEnd] = useState('')
  const [movementPage, setMovementPage] = useState(1)

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, categoryFilter, statusFilter, supplierFilter, dateFilter])

  useEffect(() => {
    setMovementPage(1)
  }, [movementIngredientFilter, movementTypeFilter, movementDateStart, movementDateEnd])

  // Metrics Tab states
  const [metricsData, setMetricsData] = useState({
    impacto_financiero: [],
    distribucion_perdidas: [],
    top_gasto: [],
    top_mermas: []
  })
  const [metricsLoading, setMetricsLoading] = useState(false)

  // Entry Modal State ("Registrar Entrada")
  const [entryModalOpen, setEntryModalOpen] = useState(false)
  const [entryForm, setEntryForm] = useState({
    ingredient_id: '',
    quantity: '',
    cost_total: '',
    supplier_id: '',
    hasExpiryDate: false,
    expiry_date: '',
    notes: ''
  })
  const [entrySubmitting, setEntrySubmitting] = useState(false)

  // Selected supplier ingredients for Entry Modal
  const [entrySupplierIngredients, setEntrySupplierIngredients] = useState([])
  const [loadingSupplierIngredients, setLoadingSupplierIngredients] = useState(false)

  // Fetch ingredients filtered by selected supplier for Entry Modal
  useEffect(() => {
    if (!entryForm.supplier_id) {
      setEntrySupplierIngredients([])
      return
    }
    const fetchSupplierIngredients = async () => {
      try {
        setLoadingSupplierIngredients(true)
        const res = await adminGetIngredients({ supplier_id: entryForm.supplier_id })
        if (res.data?.ingredients) {
          setEntrySupplierIngredients(res.data.ingredients)
        } else {
          setEntrySupplierIngredients([])
        }
      } catch (err) {
        console.error("Error cargando ingredientes del proveedor:", err)
        setEntrySupplierIngredients([])
      } finally {
        setLoadingSupplierIngredients(false)
      }
    }
    fetchSupplierIngredients()
  }, [entryForm.supplier_id])

  // Selected ingredient object & real-time computed unit cost
  const selectedEntryIngredient = useMemo(() => {
    return entrySupplierIngredients.find(i => String(i.id) === String(entryForm.ingredient_id)) ||
           allIngredients.find(i => String(i.id) === String(entryForm.ingredient_id))
  }, [entrySupplierIngredients, allIngredients, entryForm.ingredient_id])

  const computedUnitCost = useMemo(() => {
    const qty = parseFloat(entryForm.quantity)
    const total = parseFloat(entryForm.cost_total)
    if (!qty || qty <= 0 || !total || total <= 0 || isNaN(qty) || isNaN(total)) return '0.00'
    const res = total / qty
    return isFinite(res) ? res.toFixed(2) : '0.00'
  }, [entryForm.quantity, entryForm.cost_total])

  // Merma Modal State ("Registrar Merma")
  const [adjustModalOpen, setAdjustModalOpen] = useState(false)
  const [adjustItem, setAdjustItem] = useState(null)
  const [adjustForm, setAdjustForm] = useState({
    type: 'merma',
    quantity: '',
    hasExpiryDate: false,
    expiry_date: '',
    notes: ''
  })
  const [adjustSubmitting, setAdjustSubmitting] = useState(false)

  // 1. Debounce search input (400ms) con .trim() y mínimo 3 caracteres
  useEffect(() => {
    const handler = setTimeout(() => {
      const trimmed = (search || '').trim()
      if (trimmed.length === 0) {
        setDebouncedSearch('')
      } else if (trimmed.length >= 3) {
        setDebouncedSearch(trimmed)
      } else {
        // Menos de 3 caracteres: no disparar consulta para cadenas incompletas
        setDebouncedSearch('')
      }
    }, 400)
    return () => clearTimeout(handler)
  }, [search])

  // 2. Fetch main Stock list from backend
  const fetchStockData = async () => {
    try {
      setLoading(true)
      const params = {}
      const trimmedSearch = (debouncedSearch || '').trim()
      if (trimmedSearch.length >= 3) {
        params.search = trimmedSearch
      }
      if (categoryFilter !== 'all') params.category = categoryFilter
      if (statusFilter !== 'all') params.estado = statusFilter
      if (supplierFilter !== 'all') params.supplier_id = supplierFilter
      if (dateFilter) params.fecha = dateFilter

      const res = await adminGetStock(params)
      if (res.data) {
        const rawStock = res.data.stock || (Array.isArray(res.data) ? res.data : [])
        setStockList(Array.isArray(rawStock) ? rawStock : [])
        if (res.data.resumen) {
          setResumen(res.data.resumen)
        }
      } else {
        setStockList([])
      }
    } catch (err) {
      console.error("Error al cargar existencias de inventario:", err)
      setStockList([])
      setToast({ message: "Error al sincronizar inventario con el servidor", type: "error" })
    } finally {
      setLoading(false)
    }
  }

  // Effect to load stock list on filter changes
  useEffect(() => {
    fetchStockData()
  }, [debouncedSearch, categoryFilter, statusFilter, supplierFilter, dateFilter])

  // Auto-refresh stock every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStockData()
    }, 60000)
    return () => clearInterval(interval)
  }, [debouncedSearch, categoryFilter, statusFilter, supplierFilter, dateFilter])

  // 3. Load catalog references (ingredients, suppliers, categories)
  const fetchReferences = async () => {
    try {
      const [resIng, resAllSup, resActiveSup, resCat] = await Promise.all([
        adminGetIngredients().catch(() => ({ data: [] })),
        adminGetSuppliers().catch(() => ({ data: [] })),
        adminGetSuppliers({ estado: 'activo' }).catch(() => ({ data: [] })),
        adminGetIngredientCategories().catch(() => ({ data: [] }))
      ])

      const rawIng = resIng.data?.ingredients || resIng.data || []
      setAllIngredients(Array.isArray(rawIng) ? rawIng : [])

      const rawAllSup = resAllSup.data?.suppliers || resAllSup.data || []
      setAllSuppliers(Array.isArray(rawAllSup) ? rawAllSup : [])

      const rawActSup = resActiveSup.data?.suppliers || resActiveSup.data || []
      setActiveSuppliers(Array.isArray(rawActSup) ? rawActSup : [])

      const rawCat = resCat.data?.categories || resCat.data || []
      setAllCategories(Array.isArray(rawCat) ? rawCat : [])
    } catch (err) {
      console.error("Error al cargar referencias de inventario:", err)
    }
  }

  useEffect(() => {
    fetchReferences()
  }, [])

  // 4. Fetch movements when activeTab === 'movements'
  const fetchMovementsData = async () => {
    try {
      setMovementsLoading(true)
      const params = {}
      if (movementIngredientFilter !== 'all') params.ingredient_id = movementIngredientFilter
      if (movementTypeFilter !== 'all') params.type = movementTypeFilter
      if (movementDateStart) params.fecha_inicio = movementDateStart
      if (movementDateEnd) params.fecha_fin = movementDateEnd

      const res = await adminGetStockMovements(params)
      if (res.data?.movements) {
        setMovementsList(res.data.movements)
      }
    } catch (err) {
      console.error("Error al cargar historial de movimientos:", err)
    } finally {
      setMovementsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'movements') {
      fetchMovementsData()
    }
  }, [activeTab, movementIngredientFilter, movementTypeFilter, movementDateStart, movementDateEnd])

  // 5. Fetch metrics when activeTab === 'metrics'
  const fetchMetricsData = async () => {
    try {
      setMetricsLoading(true)
      const res = await adminGetStockMetrics()
      if (res.data) {
        setMetricsData({
          impacto_financiero: res.data.impacto_financiero || [],
          distribucion_perdidas: res.data.distribucion_perdidas || [],
          top_gasto: res.data.top_gasto || [],
          top_mermas: res.data.top_mermas || []
        })
      }
    } catch (err) {
      console.error("Error al cargar métricas de stock:", err)
      setMetricsData({
        impacto_financiero: [],
        distribucion_perdidas: [],
        top_gasto: [],
        top_mermas: []
      })
    } finally {
      setMetricsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'metrics') {
      fetchMetricsData()
    }
  }, [activeTab])

  // Open Registrar Entrada Modal
  const handleOpenEntryModal = () => {
    setEntryForm({
      supplier_id: '',
      ingredient_id: '',
      quantity: '',
      cost_total: '',
      hasExpiryDate: false,
      expiry_date: '',
      notes: ''
    })
    setEntrySupplierIngredients([])
    setEntryModalOpen(true)
    fetchReferences()
  }

  // Submit Entry Form
  const handleSubmitEntry = async (e) => {
    if (e) e.preventDefault()

    if (!entryForm.supplier_id) {
      setToast({ message: "Debes seleccionar un proveedor", type: "error" })
      return
    }

    if (!entryForm.ingredient_id) {
      setToast({ message: "Debes seleccionar un ingrediente", type: "error" })
      return
    }

    const qtyNumber = parseFloat(entryForm.quantity)
    if (isNaN(qtyNumber) || qtyNumber <= 0) {
      setToast({ message: "La cantidad recibida debe ser un número positivo mayor a 0", type: "error" })
      return
    }

    const costTotalNumber = parseFloat(entryForm.cost_total)
    if (isNaN(costTotalNumber) || costTotalNumber <= 0) {
      setToast({ message: "El costo total debe ser un número positivo mayor a 0", type: "error" })
      return
    }

    if (entryForm.hasExpiryDate && entryForm.expiry_date) {
      const today = getTodayString()
      if (entryForm.expiry_date < today) {
        setToast({ message: "La fecha de caducidad no puede ser una fecha pasada", type: "error" })
        return
      }
    }

    const trimmedNotes = (entryForm.notes || '').trim()

    const payload = {
      ingredient_id: Number(entryForm.ingredient_id),
      quantity: qtyNumber,
      cost_total: costTotalNumber,
      cost_per_unit: parseFloat(computedUnitCost) || 0,
      supplier_id: Number(entryForm.supplier_id),
      expiry_date: entryForm.hasExpiryDate && entryForm.expiry_date ? entryForm.expiry_date : null,
      notes: trimmedNotes ? trimmedNotes.slice(0, 250) : null
    }

    try {
      setEntrySubmitting(true)
      await adminPostStockEntry(payload)
      setToast({ message: "Entrada de mercancía registrada correctamente", type: "success" })
      setEntryModalOpen(false)
      fetchStockData()
    } catch (err) {
      console.error("Error registrando entrada de mercancía:", err)
      const msg = err.response?.data?.message || "No se pudo registrar la entrada de mercancía"
      setToast({ message: msg, type: "error" })
    } finally {
      setEntrySubmitting(false)
    }
  }

  // Open Merma Modal
  const handleOpenAdjustModal = (item) => {
    const today = getTodayString()
    const itemExpiry = item.expiry_date || ''
    setAdjustItem(item)
    setAdjustForm({
      type: 'merma',
      quantity: '',
      hasExpiryDate: Boolean(itemExpiry && itemExpiry >= today),
      expiry_date: (itemExpiry && itemExpiry >= today) ? itemExpiry : '',
      notes: ''
    })
    setAdjustModalOpen(true)
    fetchReferences()
  }

  // Submit Merma Form
  const handleSubmitAdjustment = async (e) => {
    if (e) e.preventDefault()

    if (!adjustItem || !adjustForm.quantity) {
      setToast({ message: "La cantidad de merma es obligatoria", type: "error" })
      return
    }

    const qtyNumber = parseFloat(adjustForm.quantity)
    if (isNaN(qtyNumber) || qtyNumber <= 0) {
      setToast({ message: "La cantidad de merma debe ser un número positivo mayor a 0", type: "error" })
      return
    }

    const currentQty = parseFloat(adjustItem.quantity ?? 0)
    if (qtyNumber > currentQty) {
      setToast({ message: `La merma no puede superar la existencia actual (${currentQty} ${adjustItem.unit})`, type: "error" })
      return
    }

    const trimmedNotes = (adjustForm.notes || '').trim()
    if (!trimmedNotes) {
      setToast({ message: "El motivo u observaciones son obligatorios al registrar una merma", type: "error" })
      return
    }

    if (adjustForm.hasExpiryDate && adjustForm.expiry_date) {
      const today = getTodayString()
      if (adjustForm.expiry_date < today) {
        setToast({ message: "La fecha de caducidad no puede ser una fecha pasada", type: "error" })
        return
      }
    }

    const payload = {
      ingredient_id: adjustItem.ingredient_id,
      quantity: qtyNumber,
      type: 'merma',
      notes: trimmedNotes.slice(0, 250),
      expiry_date: adjustForm.hasExpiryDate && adjustForm.expiry_date ? adjustForm.expiry_date : null
    }

    try {
      setAdjustSubmitting(true)
      await adminPostStockAdjustment(payload)
      setToast({ message: "Merma registrada correctamente", type: "success" })
      setAdjustModalOpen(false)
      setAdjustItem(null)
      fetchStockData()
    } catch (err) {
      console.error("Error al registrar merma:", err)
      const msg = err.response?.data?.message || (err.response?.data?.errors?.quantity?.[0]) || "Error al registrar la merma de inventario"
      setToast({ message: msg, type: "error" })
    } finally {
      setAdjustSubmitting(false)
    }
  }

  const hasStockData = stockList.length > 0

  // Export functions (Excel, CSV, PDF)
  const handleExportExcel = () => {
    if (!hasStockData) {
      setToast({ message: "No hay datos disponibles para exportar", type: "error" })
      return
    }

    const data = stockList.map(item => ({
      'Ingrediente': item.ingredient_name,
      'Categoría': item.category,
      'Unidad': item.unit,
      'Existencia': item.quantity,
      'Stock Mínimo': item.min_quantity,
      'Estado': item.status,
      'Proveedor': item.supplier_name || 'Sin proveedor',
      'Última Actualización': item.last_updated || 'Sin registros'
    }))

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Existencias")
    XLSX.writeFile(workbook, `existencias_${new Date().toISOString().split('T')[0]}.xlsx`)
    setToast({ message: "Lista de existencias exportada a Excel correctamente", type: "success" })
  }

  const handleExportCSV = () => {
    if (!hasStockData) {
      setToast({ message: "No hay datos disponibles para exportar", type: "error" })
      return
    }

    const headers = ["Ingrediente", "Categoría", "Unidad", "Existencia", "Stock Mínimo", "Estado", "Proveedor", "Última Actualización"]
    const rows = stockList.map(item => [
      item.ingredient_name,
      item.category,
      item.unit,
      item.quantity,
      item.min_quantity,
      item.status,
      item.supplier_name || 'Sin proveedor',
      item.last_updated || 'Sin registros'
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => {
        const text = String(val ?? '').replace(/"/g, '""')
        return text.includes(',') || text.includes('\n') || text.includes('"') ? `"${text}"` : text
      }).join(","))
    ].join("\n")

    const blob = new Blob(["\uFEFF" + csvContent], { type: "csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `existencias_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setToast({ message: "Lista de existencias exportada a CSV correctamente", type: "success" })
  }

  const handlePrintPDF = () => {
    if (!hasStockData) {
      setToast({ message: "No hay datos disponibles para exportar", type: "error" })
      return
    }
    window.print()
  }

  // Stock Pagination calculations
  const totalPages = Math.ceil(stockList.length / ITEMS_PER_PAGE) || 1
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE
  const indexOfFirstItem = (currentPage - 1) * ITEMS_PER_PAGE
  const currentStock = (Array.isArray(stockList) ? stockList : []).slice(indexOfFirstItem, indexOfLastItem)
  const startItem = stockList.length === 0 ? 0 : indexOfFirstItem + 1
  const endItem = Math.min(indexOfLastItem, stockList.length)

  // Movements Pagination calculations
  const totalMovementPages = Math.ceil(movementsList.length / ITEMS_PER_PAGE) || 1
  const currentMovements = (Array.isArray(movementsList) ? movementsList : []).slice((movementPage - 1) * ITEMS_PER_PAGE, movementPage * ITEMS_PER_PAGE)
  const startMovementItem = movementsList.length === 0 ? 0 : (movementPage - 1) * ITEMS_PER_PAGE + 1
  const endMovementItem = Math.min(movementPage * ITEMS_PER_PAGE, movementsList.length)

  // Health label formatting
  const healthLabel = useMemo(() => {
    const p = resumen.salud_porcentaje ?? 100
    if (resumen.total_ingredientes === 0) {
      return { text: "Neutro", color: "text-theme-text-muted border-theme-border-subtle bg-theme-input", barColor: "bg-theme-border-subtle" }
    }
    if (p >= 90) return { text: "Excelente", color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10", barColor: "bg-emerald-500" }
    if (p >= 75) return { text: "Bueno", color: "text-blue-400 border-blue-500/20 bg-blue-500/10", barColor: "bg-blue-500" }
    if (p >= 50) return { text: "Atención", color: "text-yellow-400 border-yellow-500/20 bg-yellow-500/10", barColor: "bg-yellow-500" }
    return { text: "Crítico", color: "text-red-400 border-red-500/20 bg-red-500/10", barColor: "bg-red-500" }
  }, [resumen])

  return (
    <div className="space-y-6 pb-12 animate-fadeIn p-4 md:p-6 lg:p-8 font-sans text-left print:bg-white print:p-0">

      {/* Header con botón Registrar Entrada en la esquina superior derecha */}
      <div className="print:hidden space-y-4">
        <PageHeader
          title="Control de Stock"
          description="Gestión en tiempo real de existencias, mermas y auditoría de movimientos del inventario."
          action={
            activeTab === 'existencias' ? (
              <button
                onClick={handleOpenEntryModal}
                className="flex items-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400
                           text-theme-text text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-brand-600/30 cursor-pointer"
              >
                <Plus size={15} /> <span>Registrar Entrada</span>
              </button>
            ) : null
          }
        />

        {/* Pestañas de Navegación (Ubicadas en la parte superior) */}
        <div className="flex flex-wrap max-md:flex-nowrap items-center gap-2 max-md:gap-1.5 pb-1 max-md:pb-3 max-md:overflow-x-auto hide-scrollbar">
          {[
            { id: 'existencias', label: 'Existencias de Inventario' },
            { id: 'movements', label: 'Historial de Movimientos' },
            { id: 'metrics', label: 'Métricas Operativas' }
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
      </div>

      {/* 1. Pestaña: Existencias de Inventario (KPIs + Tabla + Panel Lateral) */}
      {activeTab === 'existencias' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Tarjetas KPI alimentadas desde el resumen */}
          <div className="rounded-2xl p-6 border transition-colors duration-200 print:hidden overflow-hidden" style={{ backgroundColor: bgCard, border: `1px solid ${borderSubtle}`, boxShadow: cardShadow }}>
            <div className="flex xl:grid xl:grid-cols-3 gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory pb-4 w-full hide-scrollbar items-stretch">
              {loading ? (
                <>
                  <div className="flex-1 min-w-[280px] xl:min-w-0 snap-center"><div className="animate-shimmer rounded-xl h-24 w-full" /></div>
                  <div className="flex-1 min-w-[280px] xl:min-w-0 snap-center"><div className="animate-shimmer rounded-xl h-24 w-full" /></div>
                  <div className="flex-1 min-w-[280px] xl:min-w-0 snap-center"><div className="animate-shimmer rounded-xl h-24 w-full" /></div>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-[280px] xl:min-w-0 snap-center">
                    <StatCard
                      title="Stock Bajo"
                      value={resumen.stock_bajo ?? 0}
                      subtitle="Ingredientes con pocas existencias"
                      icon={AlertTriangle}
                      color="yellow"
                    />
                  </div>
                  <div className="flex-1 min-w-[280px] xl:min-w-0 snap-center">
                    <StatCard
                      title="Agotados"
                      value={resumen.agotados ?? 0}
                      subtitle="Sin existencias disponibles"
                      icon={Trash2}
                      color="red"
                    />
                  </div>
                  <div className="flex-1 min-w-[280px] xl:min-w-0 snap-center">
                    <StatCard
                      title="Capital en Almacén"
                      value={`$${(resumen.capital_almacen ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      subtitle="Valor total estimado del inventario"
                      icon={DollarSign}
                      color="green"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Layout Principal: Tablas (Izquierda en PC, Abajo en Tablet) + Panel Lateral (Derecha en PC, Arriba en Tablet) */}
          <div className="flex items-start gap-6 max-md:gap-4 max-xl:flex-col w-full">
            
            {/* Columna Principal */}
            <div className="flex-1 w-full min-w-0 max-xl:order-2 space-y-6 max-md:space-y-4">
              
              {/* 1. Pestaña Existencias de Inventario */}
              {/* 1. Pestaña Existencias de Inventario (Estructura Oficial de Tablas con Filtros) */}
              <div className="rounded-2xl p-6 max-md:p-3 transition-colors duration-200 animate-fadeInUp space-y-4 max-md:space-y-3" style={{ backgroundColor: bgCard, border: `1px solid ${borderSubtle}`, boxShadow: cardShadow }}>
                
                {/* Encabezado de Sección */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-md:gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-theme-text tracking-wide uppercase">Control de Existencias de Stock</h2>
                    <p className="text-theme-text-muted text-[10px] mt-0.5 font-bold uppercase tracking-wider">Monitoreo en tiempo real de insumos, niveles de alertas y mermas</p>
                  </div>
                </div>

                {/* Row 1: Leyendas de Estado + Buscador & Exportación */}
                <div className="flex flex-col space-y-4 max-md:space-y-3 print:hidden">
                  <div className="flex items-center justify-between flex-wrap gap-4 pt-2 max-md:pt-0">
                    <div className="flex items-center gap-4 max-md:gap-2.5 flex-wrap">
                      <div className="flex items-center gap-2 max-md:gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/40 shrink-0 animate-pulse" />
                        <span className="text-[11px] max-md:text-[10px] font-semibold text-theme-text-muted">Disponible</span>
                      </div>
                      <div className="flex items-center gap-2 max-md:gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-amber-500 shadow-md shadow-amber-500/40 shrink-0" />
                        <span className="text-[11px] max-md:text-[10px] font-semibold text-theme-text-muted">Stock bajo</span>
                      </div>
                      <div className="flex items-center gap-2 max-md:gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-red-500 shadow-md shadow-red-500/40 shrink-0" />
                        <span className="text-[11px] max-md:text-[10px] font-semibold text-theme-text-muted">Agotado</span>
                      </div>
                      <div className="flex items-center gap-2 max-md:gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-yellow-400 shadow-md shadow-yellow-400/40 shrink-0" />
                        <span className="text-[11px] max-md:text-[10px] font-semibold text-theme-text-muted">Próximo a vencer</span>
                      </div>
                    </div>
                  </div>

                  {/* Fila 1: Buscador y Botones de Exportación */}
                  <div className="flex justify-between items-start max-xl:flex-col max-md:gap-3 gap-4 w-full">
                    <div className="relative w-full">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none shrink-0" />
                      <input
                        type="text"
                        maxLength={100}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por ingrediente o proveedor..."
                        className="input-subcard bg-slate-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-brand-500/50 focus:border-brand-500/50 rounded-xl pl-10 pr-9 py-2.5 text-xs text-theme-text placeholder-theme-text-muted/60 transition-all outline-none w-full font-medium"
                      />
                      {search && (
                        <button 
                          type="button"
                          onClick={() => {
                            setSearch('')
                            setDebouncedSearch('')
                          }}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-theme-text transition-colors cursor-pointer z-10"
                          title="Limpiar búsqueda"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 max-md:gap-1.5 shrink-0 max-md:w-full">
                      <button
                        onClick={handleExportExcel}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md opacity-100 max-md:flex-1"
                      >
                        <Download size={14} /> Excel
                      </button>
                      <button
                        onClick={handleExportCSV}
                        className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold px-4 py-2.5 rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md opacity-100 max-md:flex-1"
                      >
                        <Download size={14} /> CSV
                      </button>
                      <button
                        onClick={handlePrintPDF}
                        className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-4 py-2.5 rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md opacity-100 max-md:flex-1"
                      >
                        <FileText size={14} /> PDF
                      </button>
                    </div>
                  </div>

                  {/* Fila 2: Dropdowns de Filtro */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-md:gap-2 pt-1 max-md:pt-0">
                    <Dropdown
                      options={[
                        { value: "all", label: "Todas las Categorías" },
                        ...(allCategories || []).map(c => ({ value: c, label: c }))
                      ]}
                      value={categoryFilter}
                      onChange={val => setCategoryFilter(val)}
                      className="w-full text-xs"
                    />

                    <Dropdown
                      options={STATUS_FILTER_OPTIONS}
                      value={statusFilter}
                      onChange={val => setStatusFilter(val)}
                      className="w-full text-xs"
                    />

                    <Dropdown
                      options={[
                        { value: "all", label: "Todos los Proveedores" },
                        ...(allSuppliers || []).map(s => ({ value: String(s.id), label: s.company_name || s.name }))
                      ]}
                      value={supplierFilter}
                      onChange={val => setSupplierFilter(val)}
                      className="w-full text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-4 mt-6">
                  {loading ? (
                    <div className="space-y-3 py-6">
                      <div className="animate-shimmer rounded-xl h-12 w-full" />
                      <div className="animate-shimmer rounded-xl h-12 w-full" />
                      <div className="animate-shimmer rounded-xl h-12 w-full" />
                    </div>
                  ) : (
                    <div className="overflow-x-auto w-full">
                      <Table className="min-w-[900px]" shadow="shadow-none" headers={['Ingrediente', 'Categoría', 'Unidad', 'Existencia', 'Stock Mínimo', 'Estado', 'Proveedor', 'Última Actualización', 'Acciones']}>
                      {currentStock.map((item, index) => {
                        const isLow = item.status === 'stock_bajo'
                        const isOut = item.status === 'agotado'
                        const isExpiring = item.status === 'proximo_vencer'
                        const delayClass = `delay-${Math.min(index + 1, 5)}`

                        return (
                          <tr 
                            key={item.id} 
                            className={`h-16 border-b transition-colors duration-150 animate-fadeInUp text-xs ${delayClass}`}
                            style={{ backgroundColor: 'var(--theme-surface)', borderColor: borderSubtle }}
                          >
                            {/* Ingrediente */}
                            <td className="px-4 py-3.5 font-bold text-theme-text">
                              {item.ingredient_name}
                            </td>

                            {/* Categoría */}
                            <td className="px-4 py-3.5">
                              <span className="bg-brand-500/10 border border-brand-500/20 text-brand-400 font-bold px-2 py-0.5 rounded-md text-[11px]">
                                {item.category}
                              </span>
                            </td>

                            {/* Unidad */}
                            <td className="px-4 py-3.5 text-theme-text font-semibold font-mono text-[11px]">
                              {item.unit}
                            </td>

                            {/* Existencia con alerta visual */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-1 text-xs font-bold font-mono rounded-lg border ${
                                  Number(item.quantity ?? item.stock_actual ?? 0) <= 0
                                    ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 border-red-300 dark:border-red-500/30'
                                    : Number(item.quantity ?? item.stock_actual ?? 0) <= Number(item.min_quantity ?? item.stock_minimo ?? 0)
                                      ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/30'
                                      : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30'
                                }`}>
                                  {item.quantity ?? item.stock_actual ?? 0} {item.unit ?? item.unidad_medida}
                                </span>

                                {Number(item.quantity ?? item.stock_actual ?? 0) <= Number(item.min_quantity ?? item.stock_minimo ?? 0) && (
                                  <svg 
                                    className={`w-4 h-4 shrink-0 animate-pulse ${
                                      Number(item.quantity ?? item.stock_actual ?? 0) <= 0 ? 'text-red-500' : 'text-amber-500'
                                    }`} 
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                )}
                              </div>
                            </td>

                            {/* Stock Mínimo */}
                            <td className="px-4 py-3.5 text-theme-text-muted font-mono">
                              {item.min_quantity} {item.unit}
                            </td>

                            {/* Estado */}
                            <td className="px-4 py-3.5">
                              {isOut && (
                                <span className="bg-red-500/15 border border-red-500/30 text-red-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                                  Agotado
                                </span>
                              )}
                              {isLow && (
                                <span className="bg-amber-500/15 border border-amber-500/30 text-amber-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                                  Stock bajo
                                </span>
                              )}
                              {isExpiring && (
                                <span className="bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                                  Próximo a vencer
                                </span>
                              )}
                              {!isOut && !isLow && !isExpiring && (
                                <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                                  Disponible
                                </span>
                              )}
                            </td>

                            {/* Proveedor */}
                            <td className="px-4 py-3.5 text-theme-text-muted">
                              {item.supplier_name || <span className="italic text-theme-text-muted">Sin proveedor</span>}
                            </td>

                            {/* Última Actualización */}
                            <td className="px-4 py-3.5 text-theme-text-muted text-[11px]">
                              {item.last_updated || '--:--'}
                            </td>

                            {/* Acciones */}
                            <td className="px-4 py-3.5 text-right print:hidden">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Botón Registrar Merma */}
                                <button
                                  onClick={() => handleOpenAdjustModal(item)}
                                  className="bg-theme-input hover:bg-theme-surface text-theme-text hover:text-rose-600 dark:hover:text-rose-400 border border-theme-border-subtle text-[11px] font-semibold px-3 py-1 rounded-lg shadow-xs hover:shadow transition-all cursor-pointer"
                                  title="Registrar merma o desperdicio"
                                >
                                  Merma
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                      {currentStock.length > 0 && Array.from({ length: ITEMS_PER_PAGE - currentStock.length }).map((_, i) => (
                        <tr key={`empty-${i}`} className="h-16 border-b border-transparent" style={{ backgroundColor: 'var(--theme-surface)' }}>
                          <td colSpan={9}></td>
                        </tr>
                      ))}
                      {(!Array.isArray(stockList) || stockList.length === 0) && (
                        <tr style={{ backgroundColor: 'var(--theme-surface)' }}>
                          <td colSpan={9} className="p-0 border-none" style={{ backgroundColor: 'var(--theme-surface)' }}>
                            <div className="h-[32rem] flex items-center justify-center" style={{ backgroundColor: 'var(--theme-surface)' }}>
                              <EmptyState
                                title={search || categoryFilter !== 'all' || statusFilter !== 'all' || supplierFilter !== 'all' || dateFilter ? "No se encontraron ingredientes" : "No hay ingredientes registrados"}
                                description={search || categoryFilter !== 'all' || statusFilter !== 'all' || supplierFilter !== 'all' || dateFilter ? "Prueba ajustando los filtros de búsqueda." : "Agrega tu primer ingrediente en el catálogo para comenzar."}
                                iconType="default"
                              />
                            </div>
                          </td>
                        </tr>
                      )}
                    </Table>
                  </div>
                  )}

                  {/* Footer de Paginación */}
                  {!loading && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t" style={{ borderColor: borderSubtle }}>
                      {/* Lado izquierdo: Conteo */}
                      <div className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                        {stockList.length === 0 ? (
                          <span>Mostrando <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>0</span> a <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>0</span> de <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>0</span> registros</span>
                        ) : (
                          <span>Mostrando <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>{startItem}</span> a <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>{endItem}</span> de <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>{stockList.length}</span> registros</span>
                        )}
                      </div>

                      {/* Lado derecho: Botones Anterior / Siguiente */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1 || stockList.length === 0}
                          className="px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5"
                          style={currentPage > 1 && stockList.length > 0 ? {
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
                          {stockList.length === 0 ? 1 : currentPage} / {totalPages}
                        </div>

                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage >= totalPages || stockList.length === 0}
                          className="px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5"
                          style={currentPage < totalPages && stockList.length > 0 ? {
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
                  )}
                </div>
              </div>
            </div>

            {/* Panel Lateral: En PC es columna fija a la derecha; en Tablet sube (order-1) y se convierte en cuadrícula de 3 columnas exactas; en Celular es carrusel */}
            <div className="w-80 xl:w-96 flex-shrink-0 xl:flex xl:flex-col xl:gap-6 print:hidden 
                            max-xl:w-full max-xl:order-1 max-xl:grid max-xl:grid-cols-3 max-xl:gap-4
                            max-md:flex max-md:flex-row max-md:overflow-x-auto max-md:snap-x max-md:snap-mandatory max-md:pb-4 max-md:-mx-4 max-md:px-4 scrollbar-none">
              {/* Tarjeta 1: Salud del Inventario */}
              <div className="min-w-0 max-md:w-[85%] max-md:flex-none max-md:snap-center">
                <div className="border border-theme-border-subtle rounded-2xl p-5 shadow-xs space-y-4 h-full w-full flex flex-col justify-between" style={{ backgroundColor: bgCard, boxShadow: cardShadow }}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Salud del Inventario</h3>
                    <span className={`text-[10px] font-bold border border-theme-border-subtle px-2 py-0.5 rounded-md ${healthLabel.color}`}>
                      {healthLabel.text}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="text-theme-text-muted">Índice Global</span>
                      <span className="text-theme-text font-extrabold font-mono text-base">{resumen.salud_porcentaje}%</span>
                    </div>
                    <div className="w-full h-2 bg-theme-input rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${healthLabel.barColor}`} 
                        style={{ width: `${resumen.salud_porcentaje}%` }} 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Tarjeta 2: Alertas Críticas */}
              <div className="min-w-0 max-md:w-[85%] max-md:flex-none max-md:snap-center">
                <div className="border border-theme-border-subtle rounded-2xl p-5 shadow-xs space-y-3 h-full w-full flex flex-col justify-between" style={{ backgroundColor: bgCard, boxShadow: cardShadow }}>
                  <div className="flex items-center justify-between border-b border-transparent pb-2.5">
                    <h3 className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Alertas Críticas</h3>
                    <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {resumen.alertas_criticas?.length ?? 0}
                    </span>
                  </div>

                  {(!resumen.alertas_criticas || resumen.alertas_criticas.length === 0) ? (
                    <p className="text-theme-text-muted text-xs italic py-2">Sin alertas críticas pendientes</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                      {resumen.alertas_criticas.map(al => (
                        <div key={al.id} className="bg-theme-input/40 border border-theme-border-subtle rounded-xl p-2.5 flex items-center justify-between text-xs">
                          <div>
                            <p className="text-theme-text font-semibold">{al.ingredient_name}</p>
                            <p className="text-theme-text-muted text-[10px] capitalize">{al.status.replace('_', ' ')}</p>
                          </div>
                          <span className="font-mono text-red-400 font-bold">{al.quantity} {al.unit}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Tarjeta 3: Acciones Recomendadas */}
              <div className="min-w-0 max-md:w-[85%] max-md:flex-none max-md:snap-center">
                <div className="border border-theme-border-subtle rounded-2xl p-5 shadow-xs space-y-3 h-full w-full flex flex-col justify-between" style={{ backgroundColor: bgCard, boxShadow: cardShadow }}>
                  <h3 className="text-xs font-bold text-theme-text-muted uppercase tracking-wider pb-2.5">
                    Acciones Recomendadas
                  </h3>
                  <ul className="space-y-2">
                    {resumen.acciones_recomendadas?.map((action, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-theme-text">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 shrink-0" />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 2. Pestaña Historial de Movimientos (Estructura Oficial de Tablas con Filtros) */}
      {activeTab === 'movements' && (
        <div className="rounded-2xl p-6 max-md:p-3 transition-colors duration-200 animate-fadeInUp space-y-4 max-md:space-y-3" style={{ backgroundColor: bgCard, border: `1px solid ${borderSubtle}`, boxShadow: cardShadow }}>
          
          {/* Encabezado de Sección */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-md:gap-3">
            <div>
              <h2 className="text-sm font-bold text-theme-text tracking-wide uppercase">Historial de Movimientos de Stock</h2>
              <p className="text-theme-text-muted text-[10px] mt-0.5 font-bold uppercase tracking-wider">Auditoría y registro detallado de entradas, salidas y mermas del inventario</p>
            </div>
          </div>

          {/* Filtros de Historial (Ingrediente, Tipo, Rango de Fechas) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-md:gap-2 print:hidden pt-2">
            <Dropdown
              options={[
                { value: "all", label: "Todos los Ingredientes" },
                ...(allIngredients || []).map(i => ({ value: String(i.id), label: i.name }))
              ]}
              value={movementIngredientFilter}
              onChange={val => setMovementIngredientFilter(val)}
              className="w-full text-xs"
            />

            <Dropdown
              options={[
                { value: "all", label: "Todos los Tipos" },
                { value: "entrada", label: "Entrada" },
                { value: "salida", label: "Salida" },
                { value: "ajuste", label: "Ajuste" },
                { value: "merma", label: "Merma" }
              ]}
              value={movementTypeFilter}
              onChange={val => setMovementTypeFilter(val)}
              className="w-full text-xs"
            />

            <div className="flex max-md:flex-col items-center gap-2 max-md:gap-2 w-full">
              <DatePicker
                value={movementDateStart}
                onChange={val => setMovementDateStart(val)}
                placeholder="Fecha Inicio"
                customPrefix=""
                fullWidth
              />
              <span className="text-theme-text-muted text-xs max-md:hidden">a</span>
              <DatePicker
                value={movementDateEnd}
                onChange={val => setMovementDateEnd(val)}
                placeholder="Fecha Fin"
                customPrefix=""
                fullWidth
              />
            </div>
          </div>

          <div className="space-y-4 mt-6">
            {movementsLoading ? (
              <div className="space-y-3 py-6">
                <div className="animate-shimmer rounded-xl h-12 w-full" />
                <div className="animate-shimmer rounded-xl h-12 w-full" />
                <div className="animate-shimmer rounded-xl h-12 w-full" />
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <Table className="min-w-[900px]" shadow="shadow-none" headers={['Ingrediente', 'Tipo', 'Cantidad', 'Costo / Unidad', 'Proveedor', 'Notas', 'Registrado por', 'Fecha']}>
                {currentMovements.map((m, index) => {
                  const isEntrada = m.type === 'entrada'
                  const isSalida = m.type === 'salida'
                  const isAjuste = m.type === 'ajuste'
                  const isMerma = m.type === 'merma'
                  const delayClass = `delay-${Math.min(index + 1, 5)}`

                  return (
                    <tr 
                      key={m.id} 
                      className={`h-16 border-b transition-colors duration-150 animate-fadeInUp text-xs ${delayClass}`}
                      style={{ backgroundColor: 'var(--theme-surface)', borderColor: borderSubtle }}
                    >
                      <td className="px-4 py-3.5 font-semibold text-theme-text">
                        {m.ingredient_name}
                      </td>

                      {/* Badge de color por tipo */}
                      <td className="px-4 py-3.5">
                        {isEntrada && (
                          <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                            Entrada
                          </span>
                        )}
                        {isSalida && (
                          <span className="bg-blue-500/15 border border-blue-500/30 text-blue-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                            Salida
                          </span>
                        )}
                        {isAjuste && (
                          <span className="bg-amber-500/15 border border-amber-500/30 text-amber-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                            Ajuste
                          </span>
                        )}
                        {isMerma && (
                          <span className="bg-red-500/15 border border-red-500/30 text-red-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                            Merma
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 font-mono font-bold">
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </td>

                      <td className="px-4 py-3.5 font-mono text-theme-text-muted">
                        {m.cost_per_unit !== null ? `$${m.cost_per_unit.toFixed(2)}` : '--'}
                      </td>

                      <td className="px-4 py-3.5 text-theme-text-muted">
                        {m.supplier_name || <span className="italic text-theme-text-muted">N/A</span>}
                      </td>

                      <td className="px-4 py-3.5 text-theme-text-muted italic max-w-xs truncate">
                        {m.notes || '--'}
                      </td>

                      <td className="px-4 py-3.5 text-theme-text-muted">
                        {m.created_by_name}
                      </td>

                      <td className="px-4 py-3.5 text-theme-text-muted font-mono text-[11px]">
                        {m.created_at}
                      </td>
                    </tr>
                  )
                })}
                {currentMovements.length > 0 && Array.from({ length: ITEMS_PER_PAGE - currentMovements.length }).map((_, i) => (
                  <tr key={`empty-${i}`} className="h-16 border-b border-transparent" style={{ backgroundColor: 'var(--theme-surface)' }}>
                    <td colSpan={8}></td>
                  </tr>
                ))}
                {(!Array.isArray(movementsList) || movementsList.length === 0) && (
                  <tr style={{ backgroundColor: 'var(--theme-surface)' }}>
                    <td colSpan={8} className="p-0 border-none" style={{ backgroundColor: 'var(--theme-surface)' }}>
                      <div className="h-[32rem] flex items-center justify-center" style={{ backgroundColor: 'var(--theme-surface)' }}>
                        <EmptyState
                          title="Sin movimientos registrados"
                          description="No se han registrado transacciones o movimientos en el historial para los filtros seleccionados."
                          iconType="default"
                        />
                      </div>
                    </td>
                  </tr>
                )}
              </Table>
            </div>
            )}

            {/* Footer de Paginación */}
            {!movementsLoading && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t" style={{ borderColor: borderSubtle }}>
                {/* Lado izquierdo: Conteo */}
                <div className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                  {movementsList.length === 0 ? (
                    <span>Mostrando <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>0</span> a <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>0</span> de <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>0</span> registros</span>
                  ) : (
                    <span>Mostrando <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>{startMovementItem}</span> a <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>{endMovementItem}</span> de <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>{movementsList.length}</span> registros</span>
                  )}
                </div>

                {/* Lado derecho: Botones Anterior / Siguiente */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMovementPage(prev => Math.max(prev - 1, 1))}
                    disabled={movementPage === 1 || movementsList.length === 0}
                    className="px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5"
                    style={movementPage > 1 && movementsList.length > 0 ? {
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
                    {movementsList.length === 0 ? 1 : movementPage} / {totalMovementPages}
                  </div>

                  <button
                    onClick={() => setMovementPage(prev => Math.min(prev + 1, totalMovementPages))}
                    disabled={movementPage >= totalMovementPages || movementsList.length === 0}
                    className="px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5"
                    style={movementPage < totalMovementPages && movementsList.length > 0 ? {
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
            )}
          </div>
        </div>
      )}

      {/* 3. Pestaña Métricas Operativas */}
      {activeTab === 'metrics' && (
        <div className="rounded-2xl p-6 max-md:p-3 border transition-colors duration-200" style={{ backgroundColor: bgCard, border: `1px solid ${borderSubtle}`, boxShadow: cardShadow }}>
          <div className="space-y-6 max-md:space-y-4">
            {metricsLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-md:gap-4 py-2">
                <div className="animate-shimmer rounded-xl h-64 w-full" />
                <div className="animate-shimmer rounded-xl h-64 w-full" />
                <div className="animate-shimmer rounded-xl h-64 w-full" />
                <div className="animate-shimmer rounded-xl h-64 w-full" />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-md:gap-4">
                
                {/* Sección 1 — Impacto Financiero: Consumo vs Pérdidas */}
                <div className="border border-theme-border-subtle rounded-xl p-5 min-h-[300px] flex flex-col justify-between" style={{ backgroundColor: bgSubcard }}>
                  <div className="shrink-0 mb-4">
                    <h4 className="text-sm font-bold text-theme-text">Impacto Financiero: Consumo vs Pérdidas</h4>
                    <p className="text-[10px] text-theme-text-muted uppercase font-semibold mt-0.5">Últimos 7 días por día de la semana</p>
                  </div>

                  {(!metricsData.impacto_financiero || !metricsData.impacto_financiero.some(d => d.consumo > 0 || d.perdidas > 0)) ? (
                    <div className="flex-1 flex items-center justify-center py-6 rounded-xl border transition-colors duration-200" style={{ backgroundColor: bgCard, borderColor: borderSubtle }}>
                      <EmptyState
                        title="Sin datos disponibles"
                        description="No se han registrado consumos o mermas en los últimos 7 días para mostrar la gráfica de impacto financiero."
                        iconType="default"
                      />
                    </div>
                  ) : (
                    <div className="w-full rounded-xl border transition-colors duration-200 p-2" style={{ backgroundColor: bgCard, borderColor: borderSubtle }}>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={metricsData.impacto_financiero} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#cbd5e1' : 'rgba(255,255,255,0.06)'} vertical={false} />
                          <XAxis dataKey="dia" stroke={isLight ? '#64748b' : '#94a3b8'} fontSize={11} tickLine={false} />
                          <YAxis stroke={isLight ? '#64748b' : '#94a3b8'} fontSize={11} tickLine={false} tickFormatter={val => `$${val}`} />
                          <Tooltip
                            contentStyle={{ backgroundColor: bgSubcard, borderColor: borderSubtle, borderRadius: '12px' }}
                            labelStyle={{ color: textColor, fontSize: '11px', fontWeight: 'bold' }}
                            itemStyle={{ fontSize: '11px' }}
                            formatter={val => [`$${val.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, '']}
                          />
                          <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: '11px', color: textColor }} />
                          <Bar name="Consumo ($)" dataKey="consumo" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={16} />
                          <Bar name="Pérdidas ($)" dataKey="perdidas" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={16} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Sección 2 — Distribución de Pérdidas por Categoría */}
                <div className="border border-theme-border-subtle rounded-xl p-5 min-h-[300px] flex flex-col justify-between" style={{ backgroundColor: bgSubcard }}>
                  <div className="shrink-0 mb-4">
                    <h4 className="text-sm font-bold text-theme-text">Distribución de Pérdidas por Categoría</h4>
                    <p className="text-[10px] text-theme-text-muted uppercase font-semibold mt-0.5">Mermas de los últimos 30 días</p>
                  </div>

                  {(!metricsData.distribucion_perdidas || metricsData.distribucion_perdidas.length === 0) ? (
                    <div className="flex-1 flex items-center justify-center py-6 rounded-xl border transition-colors duration-200" style={{ backgroundColor: bgCard, borderColor: borderSubtle }}>
                      <EmptyState
                        title="Sin datos disponibles"
                        description="No se han registrado mermas en los últimos 30 días para mostrar la distribución por categoría."
                        iconType="default"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center justify-around gap-4 min-h-[220px] rounded-xl border transition-colors duration-200 p-3" style={{ backgroundColor: bgCard, borderColor: borderSubtle }}>
                      <div className="w-full shrink-0">
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={metricsData.distribucion_perdidas}
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={65}
                              paddingAngle={3}
                              dataKey="monto"
                              nameKey="categoria"
                            >
                              {metricsData.distribucion_perdidas.map((entry, index) => {
                                const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#06b6d4']
                                return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              })}
                            </Pie>
                            <Tooltip
                              contentStyle={{ backgroundColor: bgSubcard, borderColor: borderSubtle, borderRadius: '12px' }}
                              itemStyle={{ fontSize: '11px', color: textColor }}
                              formatter={(val) => [`$${val.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 'Pérdida Total']}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="space-y-2 max-h-56 overflow-y-auto w-full max-w-[220px] scrollbar-thin">
                        {metricsData.distribucion_perdidas.map((cat, idx) => {
                          const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#06b6d4']
                          const color = COLORS[idx % COLORS.length]
                          return (
                            <div key={cat.categoria} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2 truncate pr-2">
                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                <span className="text-theme-text font-medium truncate text-[11px]">{cat.categoria}</span>
                              </div>
                              <span className="text-theme-text-muted font-mono text-[10px] shrink-0">
                                ${cat.monto.toLocaleString('es-MX', { minimumFractionDigits: 0 })} ({cat.porcentaje}%)
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sección 3 — Top 5: Mayor Gasto en Insumos */}
                <div className="border border-theme-border-subtle rounded-xl p-5 min-h-[300px] flex flex-col justify-between" style={{ backgroundColor: bgSubcard }}>
                  <div className="shrink-0 mb-4">
                    <h4 className="text-sm font-bold text-theme-text">Top 5: Mayor Gasto en Insumos</h4>
                    <p className="text-[10px] text-theme-text-muted uppercase font-semibold mt-0.5">Ingredientes con mayor gasto en entradas (últimos 30 días)</p>
                  </div>

                  {(!metricsData.top_gasto || metricsData.top_gasto.length === 0) ? (
                    <div className="flex-1 flex items-center justify-center py-6 rounded-xl border transition-colors duration-200" style={{ backgroundColor: bgCard, borderColor: borderSubtle }}>
                      <EmptyState
                        title="Sin datos disponibles"
                        description="No hay registros de compras o entradas de insumos en los últimos 30 días."
                        iconType="default"
                      />
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-theme-border-subtle" style={{ backgroundColor: bgCard }}>
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-theme-border-subtle bg-theme-surface/40">
                            <th className="px-3.5 py-2.5 font-bold text-theme-text-muted uppercase text-[10px]">Ingrediente</th>
                            <th className="px-3.5 py-2.5 font-bold text-theme-text-muted uppercase text-[10px]">Unidad</th>
                            <th className="px-3.5 py-2.5 font-bold text-theme-text-muted uppercase text-[10px] text-right">Gasto Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-theme-border-subtle">
                          {metricsData.top_gasto.map((item, idx) => (
                            <tr key={idx} className="hover:bg-theme-surface/50 transition-colors">
                              <td className="px-3.5 py-2.5 text-theme-text font-medium">{item.ingredient_name}</td>
                              <td className="px-3.5 py-2.5 text-theme-text-muted font-mono text-[11px]">{item.unidad}</td>
                              <td className="px-3.5 py-2.5 text-brand-300 font-mono font-bold text-right">
                                ${item.gasto_total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Sección 4 — Top 5: Ingredientes con Mayor Fuga (Merma) */}
                <div className="border border-theme-border-subtle rounded-xl p-5 min-h-[300px] flex flex-col justify-between" style={{ backgroundColor: bgSubcard }}>
                  <div className="shrink-0 mb-4">
                    <h4 className="text-sm font-bold text-theme-text">Top 5: Ingredientes con Mayor Fuga (Merma)</h4>
                    <p className="text-[10px] text-theme-text-muted uppercase font-semibold mt-0.5">Ingredientes con mayor pérdida económica por desperdicio (últimos 30 días)</p>
                  </div>

                  {(!metricsData.top_mermas || metricsData.top_mermas.length === 0) ? (
                    <div className="flex-1 flex items-center justify-center py-6 rounded-xl border transition-colors duration-200" style={{ backgroundColor: bgCard, borderColor: borderSubtle }}>
                      <EmptyState
                        title="Sin datos disponibles"
                        description="No hay mermas registradas en los últimos 30 días."
                        iconType="default"
                      />
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-theme-border-subtle" style={{ backgroundColor: bgCard }}>
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-theme-border-subtle bg-theme-surface/40">
                            <th className="px-3.5 py-2.5 font-bold text-theme-text-muted uppercase text-[10px]">Ingrediente</th>
                            <th className="px-3.5 py-2.5 font-bold text-theme-text-muted uppercase text-[10px]">Unidad</th>
                            <th className="px-3.5 py-2.5 font-bold text-theme-text-muted uppercase text-[10px] text-right">Pérdida Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-theme-border-subtle">
                          {metricsData.top_mermas.map((item, idx) => (
                            <tr key={idx} className="hover:bg-theme-surface/50 transition-colors">
                              <td className="px-3.5 py-2.5 text-theme-text font-medium">{item.ingredient_name}</td>
                              <td className="px-3.5 py-2.5 text-theme-text-muted font-mono text-[11px]">{item.unidad}</td>
                              <td className="px-3.5 py-2.5 text-red-400 font-mono font-bold text-right">
                                ${item.merma_total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal 1: Registrar Entrada */}
      {entryModalOpen && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/75 backdrop-blur-sm animate-fadeIn"
          onClick={() => setEntryModalOpen(false)}
        >
          <div 
            className="rounded-2xl shadow-2xl w-full max-w-md animate-scaleIn flex flex-col max-h-[90vh] overflow-hidden text-left"
            style={{ backgroundColor: bgCard }}
            onClick={e => e.stopPropagation()}
          >
            <div 
              className="flex items-center justify-between px-6 py-4 shrink-0 transition-colors border-t border-x border-b"
              style={{ 
                backgroundColor: colorPrimario || 'var(--theme-primary)', 
                borderColor: colorPrimario || 'var(--theme-primary)',
                color: 'var(--theme-primary-contrast, #ffffff)' 
              }}
            >
              <h3 className="font-bold text-base" style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}>Registrar Entrada de Mercancía</h3>
              <button 
                type="button"
                onClick={() => setEntryModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer"
                style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}
              >
                <X size={16}/>
              </button>
            </div>

            <form 
              onSubmit={handleSubmitEntry} 
              className="flex flex-col flex-1 min-h-0 overflow-hidden border-x border-b border-theme-border-subtle rounded-b-2xl"
              style={{ borderColor: borderSubtle }}
            >
              <div className="px-6 py-5 max-md:px-4 max-md:py-4 space-y-4 overflow-y-auto flex-1 scrollbar-thin">
              
              {/* 1. Proveedor (Requerido) */}
              <div>
                <label className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider mb-1.5 block">
                  Proveedor <span className="text-red-400">*</span>
                </label>
                <Dropdown
                  options={[
                    { value: '', label: 'Seleccionar proveedor...' },
                    ...activeSuppliers.map(s => ({ value: String(s.id), label: s.company_name || s.name }))
                  ]}
                  value={entryForm.supplier_id}
                  onChange={val => {
                    setEntryForm(p => ({ ...p, supplier_id: val, ingredient_id: '' }))
                  }}
                  placeholder="Seleccionar proveedor..."
                  className="w-full text-xs"
                  buttonClassName="input-subcard border border-theme-border-subtle"
                />
              </div>

              {/* 2. Ingrediente (Filtrado por proveedor) */}
              <div>
                <label className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider mb-1.5 block">
                  Ingrediente <span className="text-red-400">*</span>
                </label>
                <Dropdown
                  options={entrySupplierIngredients.map(i => ({ value: String(i.id), label: `${i.name} (${i.unit})` }))}
                  value={entryForm.ingredient_id}
                  onChange={val => setEntryForm(p => ({ ...p, ingredient_id: val }))}
                  placeholder={
                    !entryForm.supplier_id
                      ? "Selecciona un proveedor primero..."
                      : loadingSupplierIngredients
                      ? "Cargando ingredientes..."
                      : entrySupplierIngredients.length === 0
                      ? "Este proveedor no tiene ingredientes registrados"
                      : "Seleccionar ingrediente..."
                  }
                  disabled={!entryForm.supplier_id || loadingSupplierIngredients || entrySupplierIngredients.length === 0}
                  className="w-full text-xs"
                  buttonClassName="input-subcard border border-theme-border-subtle"
                />
              </div>

              {/* 3. Cantidad recibida */}
              <div>
                <label className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider mb-1.5 block">
                  Cantidad Recibida <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={entryForm.quantity}
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'Minus') {
                      e.preventDefault()
                    }
                  }}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val.includes('-')) {
                      setEntryForm(p => ({ ...p, quantity: val.replace(/-/g, '') }))
                    } else {
                      setEntryForm(p => ({ ...p, quantity: val }))
                    }
                  }}
                  placeholder="Ej. 10.5"
                  className="input-subcard border border-theme-border-subtle hover:border-brand-500/50 focus:border-brand-500/50 rounded-xl px-4 py-2.5 text-theme-text text-xs w-full focus:outline-none transition-all font-medium"
                />
              </div>

              {/* 4. Costo total de la compra */}
              <div>
                <label className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider mb-1.5 block">
                  Costo Total de la Compra ($) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={entryForm.cost_total}
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'Minus') {
                      e.preventDefault()
                    }
                  }}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val.includes('-')) {
                      setEntryForm(p => ({ ...p, cost_total: val.replace(/-/g, '') }))
                    } else {
                      setEntryForm(p => ({ ...p, cost_total: val }))
                    }
                  }}
                  placeholder="Ej. 1500.00"
                  className="input-subcard border border-theme-border-subtle hover:border-brand-500/50 focus:border-brand-500/50 rounded-xl px-4 py-2.5 text-theme-text text-xs w-full focus:outline-none transition-all font-medium"
                />
              </div>

              {/* 5. Costo por unidad (calculado automáticamente en tiempo real) */}
              <div className="input-subcard border border-theme-border-subtle rounded-xl p-3 select-none">
                <label className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider block mb-1">
                  Costo por Unidad <span className="text-theme-text-muted font-normal lowercase">(calculado automáticamente)</span>
                </label>
                <p className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  ${computedUnitCost} por {selectedEntryIngredient?.unit || 'unidad'}
                </p>
              </div>

              {/* 6. Fecha de caducidad con toggle */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider block">
                    Fecha de Caducidad (Opcional)
                  </label>
                  <button
                    type="button"
                    onClick={() => setEntryForm(p => ({ ...p, hasExpiryDate: !p.hasExpiryDate, expiry_date: p.hasExpiryDate ? '' : p.expiry_date }))}
                    className="text-xs font-semibold text-brand-400 hover:text-brand-300 cursor-pointer"
                  >
                    {entryForm.hasExpiryDate ? 'Desactivar fecha' : '+ Agregar fecha'}
                  </button>
                </div>
                {entryForm.hasExpiryDate && (
                  <DatePicker
                    value={entryForm.expiry_date}
                    onChange={val => setEntryForm(p => ({ ...p, expiry_date: val }))}
                    placeholder="Seleccionar fecha de caducidad..."
                    minDate={getTodayString()}
                    fullWidth={true}
                    customPrefix=""
                    className="w-full"
                    inputBg={bgSubcard}
                  />
                )}
              </div>

              {/* 7. Notas */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider block">
                    Notas (Opcional)
                  </label>
                  <span className={`text-[10px] font-mono transition-colors ${
                    (entryForm.notes || '').length >= 250 ? 'text-amber-500 font-bold' : 'text-theme-text-muted'
                  }`}>
                    {(entryForm.notes || '').length}/250
                  </span>
                </div>
                <textarea
                  rows={2}
                  maxLength={250}
                  value={entryForm.notes}
                  onBlur={() => setEntryForm(p => ({ ...p, notes: (p.notes || '').trim() }))}
                  onChange={e => setEntryForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Ej. Factura F-4819, producto fresco..."
                  className="input-subcard border border-theme-border-subtle hover:border-brand-500/50 focus:border-brand-500/50 rounded-xl px-4 py-2 text-theme-text text-xs w-full focus:outline-none resize-none transition-all font-medium"
                />
              </div>

              </div>
              
              {/* Botones */}
              <div className="flex gap-3 justify-end p-4 max-md:p-3 shrink-0 border-t border-theme-border-subtle" style={{ backgroundColor: bgCard }}>
                <button
                  type="button"
                  onClick={() => setEntryModalOpen(false)}
                  style={{ backgroundColor: bgSubcard, borderColor: borderSubtle, color: textColor }}
                  className="border rounded-xl px-4 py-2 text-xs font-semibold cursor-pointer transition-all hover:opacity-80 max-md:flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    entrySubmitting || 
                    !entryForm.supplier_id || 
                    !entryForm.ingredient_id || 
                    !entryForm.quantity || 
                    parseFloat(entryForm.quantity) <= 0 || 
                    !entryForm.cost_total || 
                    parseFloat(entryForm.cost_total) <= 0
                  }
                  className="bg-brand-600 hover:bg-brand-500 text-theme-text text-xs font-bold px-5 py-2 rounded-xl transition-all disabled:opacity-40 cursor-pointer max-md:flex-1"
                >
                  {entrySubmitting ? "Guardando..." : "Registrar Entrada"}
                </button>
              </div>

            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal 2: Ajustar / Merma Stock */}
      {adjustModalOpen && adjustItem && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/75 backdrop-blur-sm animate-fadeIn"
          onClick={() => setAdjustModalOpen(false)}
        >
          <div 
            className="rounded-2xl shadow-2xl w-full max-w-md animate-scaleIn flex flex-col max-h-[90vh] overflow-hidden text-left"
            style={{ backgroundColor: bgCard }}
            onClick={e => e.stopPropagation()}
          >
            <div 
              className="flex items-center justify-between px-6 py-4 shrink-0 transition-colors border-t border-x border-b"
              style={{ 
                backgroundColor: colorPrimario || 'var(--theme-primary)', 
                borderColor: colorPrimario || 'var(--theme-primary)',
                color: 'var(--theme-primary-contrast, #ffffff)' 
              }}
            >
              <h3 className="font-bold text-base" style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}>Registrar Merma: {adjustItem.ingredient_name}</h3>
              <button 
                type="button"
                onClick={() => setAdjustModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer"
                style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}
              >
                <X size={16}/>
              </button>
            </div>

            <form 
              onSubmit={handleSubmitAdjustment} 
              className="flex flex-col flex-1 min-h-0 overflow-hidden border-x border-b border-theme-border-subtle rounded-b-2xl"
              style={{ borderColor: borderSubtle }}
            >
              <div className="px-6 py-5 max-md:px-4 max-md:py-4 space-y-4 overflow-y-auto flex-1 scrollbar-thin">
              
              {/* Info Cantidad Actual */}
              <div className="input-subcard border border-theme-border-subtle rounded-xl p-3 flex justify-between items-center text-xs">
                <span className="text-theme-text-muted">Existencia Actual en Almacén:</span>
                <span className="text-theme-text font-mono font-bold text-sm">{adjustItem.quantity} {adjustItem.unit}</span>
              </div>

              {/* Cantidad de merma */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider block">
                    Cantidad de Merma / Desperdicio <span className="text-red-400">*</span>
                  </label>
                  <span className="text-[10px] font-semibold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20 font-mono">
                    Se descontará ({adjustItem.unit})
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0.0001"
                    max={adjustItem.quantity}
                    step="any"
                    required
                    value={adjustForm.quantity}
                    onKeyDown={(e) => {
                      if (e.key === '-' || e.key === 'Minus' || e.key === 'e' || e.key === 'E') {
                        e.preventDefault()
                      }
                    }}
                    onChange={(e) => {
                      const val = e.target.value.replace(/-/g, '')
                      setAdjustForm(p => ({ ...p, quantity: val }))
                    }}
                    placeholder="Ej. 1.5"
                    className="input-subcard border border-theme-border-subtle hover:border-brand-500/50 focus:border-brand-500/50 rounded-xl pl-4 pr-16 py-2.5 text-theme-text text-xs w-full focus:outline-none transition-all font-medium font-mono"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-xs font-semibold text-theme-text-muted font-mono">
                    {adjustItem.unit}
                  </div>
                </div>
                {parseFloat(adjustForm.quantity || 0) > adjustItem.quantity && (
                  <p className="text-rose-500 text-[11px] mt-1 flex items-center gap-1 animate-fadeIn">
                    La cantidad no puede superar la existencia disponible ({adjustItem.quantity} {adjustItem.unit})
                  </p>
                )}
              </div>

              {/* Caducidad Opcional */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider block">
                    Fecha de Caducidad (Opcional)
                  </label>
                  <button
                    type="button"
                    onClick={() => setAdjustForm(p => ({ ...p, hasExpiryDate: !p.hasExpiryDate, expiry_date: p.hasExpiryDate ? '' : p.expiry_date }))}
                    className="text-xs font-semibold text-brand-400 hover:text-brand-300 cursor-pointer"
                  >
                    {adjustForm.hasExpiryDate ? 'Desactivar fecha' : '+ Cambiar fecha'}
                  </button>
                </div>
                {adjustForm.hasExpiryDate && (
                  <DatePicker
                    value={adjustForm.expiry_date}
                    onChange={val => setAdjustForm(p => ({ ...p, expiry_date: val }))}
                    placeholder="Seleccionar fecha de caducidad..."
                    minDate={getTodayString()}
                    fullWidth={true}
                    customPrefix=""
                    className="w-full"
                    inputBg={bgSubcard}
                  />
                )}
              </div>

              {/* Motivo / Observaciones (Requerido para merma) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider block">
                    Motivo / Observaciones de la Merma <span className="text-red-400">* (Requerido)</span>
                  </label>
                  <span className={`text-[10px] font-mono transition-colors ${
                    (adjustForm.notes || '').length >= 250 ? 'text-amber-500 font-bold' : 'text-theme-text-muted'
                  }`}>
                    {(adjustForm.notes || '').length}/250
                  </span>
                </div>
                <textarea
                  rows={2}
                  maxLength={250}
                  required
                  value={adjustForm.notes}
                  onBlur={() => setAdjustForm(p => ({ ...p, notes: (p.notes || '').trim() }))}
                  onChange={e => setAdjustForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Ej. Producto caducado, empaque dañado, descomposición, caída en cocina..."
                  className="input-subcard border border-theme-border-subtle hover:border-brand-500/50 focus:border-brand-500/50 rounded-xl px-4 py-2 text-theme-text text-xs w-full focus:outline-none resize-none transition-all font-medium"
                />
              </div>

              </div>
              
              {/* Botones */}
              <div className="flex gap-3 justify-end p-4 max-md:p-3 shrink-0 border-t border-theme-border-subtle" style={{ backgroundColor: bgCard }}>
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  style={{ backgroundColor: bgSubcard, borderColor: borderSubtle, color: textColor }}
                  className="border rounded-xl px-4 py-2 text-xs font-semibold cursor-pointer transition-all hover:opacity-80 max-md:flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    adjustSubmitting || 
                    !adjustForm.quantity || 
                    parseFloat(adjustForm.quantity) <= 0 || 
                    parseFloat(adjustForm.quantity) > adjustItem.quantity ||
                    !adjustForm.notes.trim()
                  }
                  className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-5 py-2 rounded-xl transition-all disabled:opacity-40 cursor-pointer max-md:flex-1"
                >
                  {adjustSubmitting ? "Registrando..." : "Registrar Merma"}
                </button>
              </div>

            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Feedback Toast */}
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
