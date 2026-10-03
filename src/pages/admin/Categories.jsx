import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Clock, Tag, Copy, Power, Flame, TrendingDown, AlertTriangle, Sparkles, CheckCircle2, AlertCircle, ChevronDown, Search } from 'lucide-react'

import PageHeader from '../../components/ui/PageHeader'
import Modal from '../../components/ui/Modal'
import Toast from '../../components/ui/Toast'
import EmptyState from '../../components/ui/EmptyState'
import ScrollHint from '../../components/ui/ScrollHint'
import Table from '../../components/ui/Table'
import StatCard from '../../components/ui/StatCard'
import MetricCardsLayout from '../../components/ui/MetricCardsLayout'
import Dropdown from '../../components/ui/Dropdown'
import TimeWheelPicker from '../../components/ui/TimeWheelPicker'
import ImageUploader from '../../components/ui/ImageUploader'
import { 
  getCategories, 
  getCategoryIndicators,
  createCategory, 
  updateCategory, 
  deleteCategory,
  toggleCategory
} from '../../api/categories'
import { useTheme } from '../../context/ThemeContext'

const TIME_OPTIONS = [
  { value: '06:00', label: '06:00 a. m.' },
  { value: '06:30', label: '06:30 a. m.' },
  { value: '07:00', label: '07:00 a. m.' },
  { value: '07:30', label: '07:30 a. m.' },
  { value: '08:00', label: '08:00 a. m.' },
  { value: '08:30', label: '08:30 a. m.' },
  { value: '09:00', label: '09:00 a. m.' },
  { value: '09:30', label: '09:30 a. m.' },
  { value: '10:00', label: '10:00 a. m.' },
  { value: '10:30', label: '10:30 a. m.' },
  { value: '11:00', label: '11:00 a. m.' },
  { value: '11:30', label: '11:30 a. m.' },
  { value: '12:00', label: '12:00 p. m.' },
  { value: '12:30', label: '12:30 p. m.' },
  { value: '13:00', label: '01:00 p. m.' },
  { value: '13:30', label: '01:30 p. m.' },
  { value: '14:00', label: '02:00 p. m.' },
  { value: '14:30', label: '02:30 p. m.' },
  { value: '15:00', label: '03:00 p. m.' },
  { value: '15:30', label: '03:30 p. m.' },
  { value: '16:00', label: '04:00 p. m.' },
  { value: '16:30', label: '04:30 p. m.' },
  { value: '17:00', label: '05:00 p. m.' },
  { value: '17:30', label: '05:30 p. m.' },
  { value: '18:00', label: '06:00 p. m.' },
  { value: '18:30', label: '06:30 p. m.' },
  { value: '19:00', label: '07:00 p. m.' },
  { value: '19:30', label: '07:30 p. m.' },
  { value: '20:00', label: '08:00 p. m.' },
  { value: '20:30', label: '08:30 p. m.' },
  { value: '21:00', label: '09:00 p. m.' },
  { value: '21:30', label: '09:30 p. m.' },
  { value: '22:00', label: '10:00 p. m.' },
  { value: '22:30', label: '10:30 p. m.' },
  { value: '23:00', label: '11:00 p. m.' },
  { value: '23:30', label: '11:30 p. m.' },
  { value: '23:59', label: '11:59 p. m.' },
  { value: '00:00', label: '12:00 a. m.' },
  { value: '01:00', label: '01:00 a. m.' },
  { value: '02:00', label: '02:00 a. m.' },
  { value: '03:00', label: '03:00 a. m.' },
  { value: '04:00', label: '04:00 a. m.' },
  { value: '05:00', label: '05:00 a. m.' },
]

const ITEMS_PER_PAGE = 8

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [indicators, setIndicators] = useState({
    mas_vendida: { name: null, pedidos: 0 },
    poco_movimiento: { name: null, pedidos: 0 },
    sin_ventas: { name: null, pedidos: 0 }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isOpen, setIsOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  const { bgCard, bgSubcard, bgInput, borderSubtle, cardShadow, textColor, textMuted, textSubtle, colorPrimario, primaryBtnText, isLight } = useTheme()

  // Filter states
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Micro-interactions states
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [toast, setToast] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Form states
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState(null)
  const [imageUrl, setImageUrl] = useState('')
  const [days, setDays] = useState(['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'])
  const [limitarDias, setLimitarDias] = useState(false)
  const [timeStart, setTimeStart] = useState('12:00')
  const [timeEnd, setTimeEnd] = useState('23:00')
  const [hasSchedule, setHasSchedule] = useState(false)
  const [active, setActive] = useState(true)
  const [modalCategoriesToShow, setModalCategoriesToShow] = useState(null)
  const [catsScrolled, setCatsScrolled] = useState(false)

  // Validación de nombre de categoría
  const validateCategoryName = (val) => {
    const trimmed = (val || '').trim()
    if (!trimmed) {
      return 'El nombre de la categoría es obligatorio.'
    }
    if (trimmed.length < 3 || trimmed.length > 50) {
      return 'El nombre debe tener entre 3 y 50 caracteres.'
    }
    // Letras (incluyendo acentos y la 'ñ'), números y espacios
    const validRegex = /^[a-zA-Z0-9áéíóúÁÉÍÓÚüÜñÑ\s]+$/
    if (!validRegex.test(trimmed)) {
      return 'Solo se permiten letras, números y espacios.'
    }
    return null
  }

  const handleNameChange = (e) => {
    const rawVal = e.target.value
    // Bloqueo tajante de inyección de código
    const hasForbiddenChars = /[<>/\\{}]/.test(rawVal)
    const sanitized = rawVal.replace(/[<>/\\{}]/g, '')
    setName(sanitized)

    if (hasForbiddenChars) {
      setNameError('No se permiten caracteres como < > / \\ { }.')
      return
    }

    if (nameError) {
      setNameError(validateCategoryName(sanitized))
    }
  }

  const handleNameBlur = () => {
    const trimmed = name.trim()
    setName(trimmed)
    setNameError(validateCategoryName(trimmed))
  }

  const filteredCategories = categories.filter(cat => {
    const matchesSearch = !searchQuery.trim() || (cat.name && cat.name.toLowerCase().includes(searchQuery.toLowerCase()))
    if (!matchesSearch) return false
    if (statusFilter === 'active') return cat.active
    if (statusFilter === 'inactive') return !cat.active
    return true
  })

  const totalPages = Math.ceil(filteredCategories.length / ITEMS_PER_PAGE) || 1
  const currentCategories = filteredCategories.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, searchQuery])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [catRes, indRes] = await Promise.all([
        getCategories(),
        getCategoryIndicators()
      ])

      const catData = catRes.data?.categories || catRes.data || []
      setCategories(Array.isArray(catData) ? catData : [])

      const indData = indRes.data || {}
      setIndicators({
        mas_vendida: indData.mas_vendida || { name: null, pedidos: 0 },
        poco_movimiento: indData.poco_movimiento || { name: null, pedidos: 0 },
        sin_ventas: indData.sin_ventas || { name: null, pedidos: 0 }
      })
    } catch (err) {
      console.error("Error loading categories or indicators:", err)
      setError('No se pudieron obtener las categorías o indicadores del servidor.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleOpenCreate = () => {
    setEditingItem(null)
    setName('')
    setNameError(null)
    setImageUrl('')
    setDays(['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'])
    setLimitarDias(false)
    setTimeStart('12:00')
    setTimeEnd('23:00')
    setHasSchedule(false)
    setActive(true)
    setIsOpen(true)
  }

  const handleOpenEdit = (item) => {
    setEditingItem(item)
    setName(item.name || '')
    setNameError(null)
    setImageUrl(item.image_url || '')
    
    if (item.days) {
      let parsedDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
      if (typeof item.days === 'string') {
        try {
          parsedDays = JSON.parse(item.days)
        } catch {
          parsedDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
        }
      } else if (Array.isArray(item.days)) {
        parsedDays = item.days
      }
      setDays(parsedDays)
      setLimitarDias(Array.isArray(parsedDays) && parsedDays.length > 0 && parsedDays.length < 7)
    } else {
      setDays(['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'])
      setLimitarDias(false)
    }

    if (item.time_start && item.time_end) {
      setHasSchedule(true)
      setTimeStart(item.time_start)
      setTimeEnd(item.time_end)
    } else {
      setHasSchedule(false)
      setTimeStart('12:00')
      setTimeEnd('23:00')
    }
    setActive(item.active ? true : false)
    setIsOpen(true)
  }

  const handleToggleActive = async (item) => {
    const newActiveState = !item.active
    setCategories(prev => prev.map(c => c.id === item.id ? { ...c, active: newActiveState } : c))

    try {
      await toggleCategory(item.id)
      setToast({ message: `Categoría ${newActiveState ? 'activada' : 'desactivada'}`, type: 'success' })
    } catch (err) {
      console.error("Toggle category active error:", err)
      setCategories(prev => prev.map(c => c.id === item.id ? { ...c, active: item.active } : c))
      setToast({ message: 'No se pudo cambiar el estado de la categoría', type: 'error' })
    }
  }

  const handleDelete = async (id) => {
    const targetCat = categories.find(c => c.id === id)
    const count = Number(targetCat?.platillos_count ?? targetCat?.dishes_count ?? targetCat?.dishesCount ?? 0)
    if (count > 0) {
      setToast({ 
        message: `No se puede eliminar la categoría porque tiene ${count} platillo${count === 1 ? '' : 's'} asignado${count === 1 ? '' : 's'}.`, 
        type: 'error' 
      })
      setConfirmDelete(null)
      return
    }

    try {
      await deleteCategory(id)
      setCategories(prev => prev.filter(c => c.id !== id))
      setToast({ message: 'Categoría eliminada correctamente', type: 'success' })
      setConfirmDelete(null)
    } catch (err) {
      console.error("Delete category error:", err)
      const msg = err.response?.data?.message || err.response?.data?.error || "Ocurrió un error al eliminar la categoría"
      setToast({ message: msg, type: 'error' })
      setConfirmDelete(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const trimmedName = name.trim()
    setName(trimmedName)

    const error = validateCategoryName(trimmedName)
    if (error) {
      setNameError(error)
      setToast({ message: error, type: 'error' })
      return
    }

    setSubmitting(true)

    const allDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    const payload = {
      name: trimmedName,
      image_url: imageUrl.trim() || null,
      days: limitarDias ? (days.length > 0 ? days : allDays) : allDays,
      time_start: hasSchedule ? timeStart : null,
      time_end: hasSchedule ? timeEnd : null,
      active: active ? true : false,
    }

    try {
      if (editingItem) {
        const res = await updateCategory(editingItem.id, payload)
        const updatedCat = res.data
        setCategories(prev => prev.map(c => c.id === editingItem.id ? updatedCat : c))
        setToast({ message: 'Categoría actualizada correctamente', type: 'success' })
      } else {
        const res = await createCategory(payload)
        const newCat = res.data
        setCategories(prev => [newCat, ...prev])
        setToast({ message: 'Categoría creada correctamente', type: 'success' })
      }
      setIsOpen(false)
    } catch (err) {
      console.error("Submit category error:", err)
      const msg = err.response?.data?.message || 'Ocurrió un error al guardar la categoría'
      setToast({ message: msg, type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const formatTime = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return ''
    const parts = timeStr.split(':')
    if (parts.length < 2) return timeStr
    let h = parseInt(parts[0], 10)
    const m = parts[1]
    const ampm = h >= 12 ? 'PM' : 'AM'
    h = h % 12 || 12
    return `${h}:${m} ${ampm}`
  }

  const formatDays = (daysArray) => {
    if (!daysArray) return 'Todos'
    
    let arr = daysArray
    if (typeof daysArray === 'string') {
      try {
        arr = JSON.parse(daysArray)
      } catch {
        return daysArray
      }
    }
    
    if (!Array.isArray(arr) || arr.length === 0) {
      return 'Todos'
    }
    
    const allDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    if (arr.length === allDays.length) {
      return 'Todos'
    }
    return arr.join(', ')
  }

  const toggleAllDays = () => {
    const allDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    if (days.length === allDays.length) {
      setDays([])
    } else {
      setDays(allDays)
    }
  }

  const actionButton = (
    <button 
      onClick={handleOpenCreate}
      style={{ backgroundColor: colorPrimario, color: primaryBtnText }}
      className="shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md transition-all duration-200 rounded-xl px-5 py-2.5 text-sm font-bold flex items-center gap-2 cursor-pointer"
    >
      <Plus size={16} style={{ color: primaryBtnText }} />
      <span style={{ color: primaryBtnText }}>Nueva Categoría</span>
    </button>
  )

  if (loading) {
    return (
      <div className="space-y-6 animate-fadeIn p-4 md:p-6 lg:p-8">
        <div className="flex justify-between items-center mb-6">
          <div className="h-10 w-64 animate-pulse rounded-xl" style={{ backgroundColor: bgInput }} />
          <div className="h-10 w-48 animate-pulse rounded-xl" style={{ backgroundColor: bgInput }} />
        </div>
        <div className="rounded-2xl p-6 border transition-colors duration-200" style={{ backgroundColor: bgCard, borderColor: borderSubtle, boxShadow: cardShadow }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="animate-pulse rounded-2xl h-32 w-full" style={{ backgroundColor: bgSubcard }} />
            <div className="animate-pulse rounded-2xl h-32 w-full" style={{ backgroundColor: bgSubcard }} />
            <div className="animate-pulse rounded-2xl h-32 w-full" style={{ backgroundColor: bgSubcard }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-md:space-y-4 animate-fadeIn p-4 max-md:p-3 md:p-6 lg:p-8 font-sans">
      <PageHeader 
        title="Categorías" 
        description="Gestiona las categorías de platillos del menú y sus horarios de disponibilidad."
        action={actionButton}
      />

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm px-4 py-3 rounded-xl text-center font-medium animate-fadeIn">
          {error}
        </div>
      )}

      {/* Indicadores de Ventas */}
      <div className="rounded-2xl p-6 max-md:p-3 max-md:space-y-3 border transition-colors duration-200 space-y-4 overflow-hidden" style={{ backgroundColor: bgCard, borderColor: borderSubtle, boxShadow: cardShadow }}>
        <h2 className="text-sm font-bold tracking-wider uppercase px-1" style={{ color: textMuted }}>
          Indicadores de Ventas (Últimos 30 días)
        </h2>
        <MetricCardsLayout cols={3}>
          {loading ? (
            <>
              <div className="animate-shimmer rounded-xl h-24 w-full" />
              <div className="animate-shimmer rounded-xl h-24 w-full" />
              <div className="animate-shimmer rounded-xl h-24 w-full" />
            </>
          ) : (
            <>
              {/* Tarjeta Más Vendida */}
              <StatCard
                title={
                  <span className="flex items-center gap-1.5">
                    <span>MÁS VENDIDA</span>
                    <Flame size={13} className="text-orange-600 dark:text-orange-400" />
                  </span>
                }
                value={
                  indicators.mas_vendida?.name ? (
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-base font-extrabold truncate" style={{ color: textColor }}>
                        {indicators.mas_vendida.name}
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-black bg-orange-500/20 px-2.5 py-0.5 rounded-full border border-orange-500/45 shrink-0 shadow-xs" style={{ color: '#000000' }}>
                        {indicators.mas_vendida.pedidos} pedidos
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-xs font-semibold italic flex items-center gap-1.5" style={{ color: textSubtle }}>
                        <Sparkles size={13} className="text-orange-600 shrink-0" />
                        <span>Sin registro de ventas en 30 días</span>
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-black bg-orange-500/20 px-2 py-0.5 rounded-full border border-orange-500/45 shrink-0 shadow-xs" style={{ color: '#000000' }}>
                        Popular
                      </span>
                    </div>
                  )
                }
                subtitle="Categoría con mayor rotación registrada en los últimos 30 días."
                icon={Flame}
                color="orange"
                delay="delay-1"
              />

              {/* Tarjeta Poco Movimiento */}
              <StatCard
                title={
                  <span className="flex items-center gap-1.5">
                    <span>POCO MOVIMIENTO</span>
                    <TrendingDown size={13} className="text-amber-600 dark:text-amber-400" />
                  </span>
                }
                value={
                  indicators.poco_movimiento?.name ? (
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-base font-extrabold truncate" style={{ color: textColor }}>
                        {indicators.poco_movimiento.name}
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-black bg-yellow-500/20 px-2.5 py-0.5 rounded-full border border-yellow-500/45 shrink-0 shadow-xs" style={{ color: '#000000' }}>
                        {indicators.poco_movimiento.pedidos} pedidos
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-xs font-semibold italic flex items-center gap-1.5" style={{ color: textSubtle }}>
                        <CheckCircle2 size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>Categorías con rotación óptima</span>
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-black bg-yellow-500/20 px-2 py-0.5 rounded-full border border-yellow-500/45 shrink-0 shadow-xs" style={{ color: '#000000' }}>
                        Al día
                      </span>
                    </div>
                  )
                }
                subtitle="Categorías con entre 1 y 5 pedidos en los últimos 30 días."
                icon={TrendingDown}
                color="yellow"
                delay="delay-2"
              />

              {/* Tarjeta Sin Ventas */}
              <StatCard
                title={
                  <span className="flex items-center gap-1.5">
                    <span>SIN VENTAS</span>
                    <AlertTriangle size={13} className="text-rose-500" />
                  </span>
                }
                value={
                  indicators.sin_ventas?.name ? (
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-base font-extrabold truncate" style={{ color: textColor }}>
                        {indicators.sin_ventas.name}
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-black bg-rose-500/20 px-2.5 py-0.5 rounded-full border border-rose-500/45 shrink-0 shadow-xs" style={{ color: '#000000' }}>
                        0 pedidos
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-xs font-semibold italic flex items-center gap-1.5" style={{ color: textSubtle }}>
                        <AlertCircle size={13} className="text-rose-500/70 shrink-0" />
                        <span>Sin categorías inactivas sin ventas</span>
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-black bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/45 shrink-0 shadow-xs" style={{ color: '#000000' }}>
                        Al día
                      </span>
                    </div>
                  )
                }
                subtitle="Categorías sin pedidos registrados en los últimos 30 días."
                icon={AlertTriangle}
                color="red"
                delay="delay-3"
              />
            </>
          )}
        </MetricCardsLayout>
      </div>

      {/* Table Layout of Categories */}
      <div className="rounded-2xl p-6 max-md:p-3 border transition-colors duration-200" style={{ backgroundColor: 'var(--theme-surface)', borderColor: borderSubtle, boxShadow: cardShadow }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm max-md:text-xs font-bold uppercase tracking-wider" style={{ color: textColor }}>Categorías Actuales</h3>
            <p className="text-xs max-md:text-[11px] mt-0.5" style={{ color: textMuted }}>Lista de categorías registradas en la plataforma</p>
          </div>
        </div>

        <div className="mt-4 max-md:mt-3 space-y-4 max-md:space-y-3">
          <div className="flex flex-wrap items-center gap-4 max-md:gap-3 w-full pb-2">
            {/* Filter Pills / Tabs */}
            <div className="flex items-center gap-2 flex-wrap max-md:flex-nowrap max-md:overflow-x-auto max-md:pb-2 hide-scrollbar w-full sm:w-auto">
              {[
                { value: 'all', label: 'Todas', count: categories.length },
                { value: 'active', label: 'Activas', count: categories.filter(c => c.active).length },
                { value: 'inactive', label: 'Inactivas', count: categories.filter(c => !c.active).length }
              ].map(tab => {
                const isActive = statusFilter === tab.value
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setStatusFilter(tab.value)}
                    style={{
                      backgroundColor: isActive ? (colorPrimario || '#dc2626') : (colorPrimario ? `${colorPrimario}18` : 'rgba(220, 38, 38, 0.12)'),
                      color: isActive ? '#ffffff' : (colorPrimario || '#b91c1c'),
                    }}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shadow-xs flex items-center gap-1.5 hover:opacity-90"
                  >
                    <span>{tab.label}</span>
                    <span 
                      className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center font-mono"
                      style={{
                        backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : (colorPrimario ? `${colorPrimario}25` : 'rgba(220, 38, 38, 0.2)'),
                        color: isActive ? '#ffffff' : (colorPrimario || '#b91c1c')
                      }}
                    >
                      {tab.count}
                    </span>
                  </button>
                )
              })}
            </div>

            <div 
              className="relative flex-1 min-w-[250px] flex items-center border rounded-xl transition-all shadow-xs"
              style={{ 
                backgroundColor: 'var(--theme-surface)', 
                borderColor: isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.16)' 
              }}
            >
              <Search 
                size={15} 
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none shrink-0" 
              />
              <input 
                type="text" 
                placeholder="Buscar categoría..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ color: textColor }}
                className="bg-transparent border-none pl-10 pr-4 py-2 text-xs focus:outline-none w-full"
              />
            </div>
          </div>

          {loading ? (
            <div className="space-y-2.5">
              <div className="animate-shimmer rounded-lg h-12 w-full" />
              <div className="animate-shimmer rounded-lg h-12 w-full" />
              <div className="animate-shimmer rounded-lg h-12 w-full" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto w-full">
                <Table shadow="none" className="min-w-[700px]" headers={['Categoría', 'Días', 'Horario', 'Platillos', 'Estado', 'Acciones']}>
                {currentCategories.map((category) => (
                  <tr key={category.id} className="h-16 border-b transition-colors duration-150" style={{ backgroundColor: 'var(--theme-surface)', borderColor: borderSubtle }}>
                    {/* Categoría: imagen en miniatura + nombre */}
                    <td className="px-4 py-3 text-sm font-medium flex items-center gap-3 text-left" style={{ color: textColor }}>
                      {category.image_url ? (
                        <img 
                          src={category.image_url} 
                          alt={category.name} 
                          className="w-10 h-10 object-cover rounded-xl border shrink-0"
                          style={{ borderColor: borderSubtle, backgroundColor: 'var(--theme-card)' }}
                          onError={(e) => { e.target.style.display = 'none' }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0" style={{ backgroundColor: `${colorPrimario}15`, borderColor: `${colorPrimario}30`, color: colorPrimario }}>
                          <Tag size={18} style={{ color: colorPrimario }} />
                        </div>
                      )}
                      <span className="font-bold text-sm" style={{ color: textColor }}>{category.name}</span>
                    </td>

                    {/* Días */}
                    <td className="px-4 py-3 text-xs font-medium text-left" style={{ color: textMuted }}>
                      {formatDays(category.days)}
                    </td>

                    {/* Horario */}
                    <td className="px-4 py-3 text-xs font-medium text-left" style={{ color: textMuted }}>
                      {category.time_start ? (
                        <span className="flex items-center gap-1 font-mono" style={{ color: textColor }}>
                          <Clock size={12} style={{ color: colorPrimario }} />
                          {`${formatTime(category.time_start)} — ${formatTime(category.time_end)}`}
                        </span>
                      ) : (
                        <span style={{ color: textSubtle }}>Cualquier hora</span>
                      )}
                    </td>

                    {/* Platillos */}
                    <td className="px-4 py-3 text-xs font-semibold text-left">
                      <span className="border px-2.5 py-1 rounded-full font-mono" style={{ backgroundColor: bgInput, borderColor: borderSubtle, color: textColor }}>
                        {category.platillos_count ?? category.dishes_count ?? 0} platillos
                      </span>
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-3 text-xs font-bold text-left" style={{ color: textColor }}>
                      {category.active ? 'Activa' : 'Inactiva'}
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3 text-xs text-left">
                      {(() => {
                        const dishCount = Number(category.platillos_count ?? category.dishes_count ?? category.dishesCount ?? 0)
                        const hasDishes = dishCount > 0

                        return (
                          <div className="flex items-center justify-start gap-2">
                            <button 
                              onClick={() => handleOpenEdit(category)}
                              className="p-1.5 rounded-lg border transition-colors cursor-pointer"
                              style={{ backgroundColor: bgInput, borderColor: borderSubtle, color: textMuted }}
                              title="Editar"
                            >
                              <Edit2 size={14} />
                            </button>

                            {confirmDelete === category.id ? (
                              <button 
                                onClick={() => handleDelete(category.id)}
                                className="animate-scaleIn text-[10px] bg-red-500/20 text-red-500 border border-red-500/30 rounded-lg px-2.5 py-1 hover:bg-red-500/30 transition-all font-bold cursor-pointer"
                              >
                                ¿Confirmar? ✓
                              </button>
                            ) : (
                              <button 
                                disabled={hasDishes}
                                onClick={() => {
                                  if (hasDishes) return
                                  setConfirmDelete(category.id)
                                  setTimeout(() => {
                                    setConfirmDelete(prev => prev === category.id ? null : prev)
                                  }, 3000)
                                }}
                                className={`p-1.5 rounded-lg border transition-colors ${
                                  hasDishes
                                    ? 'bg-red-500/5 border-red-500/10 text-red-500/40 opacity-50 cursor-not-allowed'
                                    : 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20 cursor-pointer'
                                }`}
                                title={hasDishes ? `No se puede eliminar: tiene ${dishCount} platillo${dishCount === 1 ? '' : 's'} asignado${dishCount === 1 ? '' : 's'}` : "Eliminar"}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        )
                      })()}
                    </td>
                  </tr>
                ))}
                {currentCategories.length > 0 && Array.from({ length: ITEMS_PER_PAGE - currentCategories.length }).map((_, i) => (
                  <tr key={`empty-${i}`} className="h-16 border-b border-transparent" style={{ backgroundColor: 'var(--theme-surface)' }}>
                    <td colSpan="6"></td>
                  </tr>
                ))}
                {filteredCategories.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-0 border-none" style={{ backgroundColor: 'var(--theme-card)' }}>
                      <EmptyState
                        title={searchQuery || statusFilter !== 'all' ? "No se encontraron categorías" : "Aún no tienes categorías"}
                        description={searchQuery || statusFilter !== 'all' ? "Intenta ajustar tus filtros de búsqueda." : "Agrega la primera categoría para organizar tus platillos."}
                        iconType="categories"
                        actionLabel={searchQuery || statusFilter !== 'all' ? undefined : "Agregar Categoría"}
                        onAction={searchQuery || statusFilter !== 'all' ? undefined : handleOpenCreate}
                      />
                    </td>
                  </tr>
                )}
              </Table>
            </div>

              {/* Controles de Paginación */}
              {filteredCategories.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t" style={{ borderColor: borderSubtle }}>
                  <span className="text-xs font-medium" style={{ color: textMuted }}>
                    Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, filteredCategories.length)} de {filteredCategories.length} categorías
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      style={{
                        borderColor: borderSubtle,
                        color: currentPage === 1 ? textSubtle : textColor,
                        backgroundColor: bgInput,
                        opacity: currentPage === 1 ? 0.5 : 1
                      }}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all duration-200 disabled:cursor-not-allowed cursor-pointer hover:opacity-80"
                    >
                      Anterior
                    </button>
                    <span className="text-xs font-mono font-bold px-2" style={{ color: textColor }}>
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      style={{
                        backgroundColor: currentPage === totalPages ? bgInput : colorPrimario,
                        color: currentPage === totalPages ? textSubtle : primaryBtnText,
                        borderColor: borderSubtle,
                        opacity: currentPage === totalPages ? 0.5 : 1
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

      {isOpen && (
        <Modal 
          title={editingItem ? 'Editar Categoría' : 'Nueva Categoría'} 
          onClose={() => setIsOpen(false)}
          footer={
            <>
              <button 
                type="button" 
                onClick={() => setIsOpen(false)}
                style={{ backgroundColor: bgSubcard, borderColor: borderSubtle, color: textColor }}
                className="border rounded-xl px-5 py-2.5 text-sm font-semibold transition-all cursor-pointer h-11 flex items-center justify-center hover:opacity-80"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                form="categoryForm"
                disabled={submitting || !!nameError || !name.trim()}
                style={{ backgroundColor: colorPrimario, color: primaryBtnText }}
                className="rounded-xl px-5 py-2.5 text-sm font-bold transition-all shadow-md cursor-pointer h-11 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              >
                {submitting ? 'Guardando...' : 'Guardar'}
              </button>
            </>
          }
        >
          <form id="categoryForm" onSubmit={handleSubmit} className="space-y-4 text-left pb-2">
            <div>
              <label className="block text-xs font-semibold tracking-wider mb-1.5 uppercase" style={{ color: textMuted }}>
                Nombre de la categoría *
              </label>
              <input 
                type="text" 
                required
                maxLength={50}
                placeholder="Ej. Entradas, Bebidas, Postres"
                value={name} 
                onChange={handleNameChange}
                onBlur={handleNameBlur}
                style={{ 
                  backgroundColor: bgSubcard, 
                  borderColor: nameError ? '#EF4444' : borderSubtle, 
                  color: textColor 
                }}
                className={`input-subcard border rounded-xl px-4 py-3 text-sm focus:outline-none transition-all duration-200 w-full ${
                  nameError ? 'ring-2 ring-red-500/20' : ''
                }`}
              />
              {nameError && (
                <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1 font-medium animate-fadeIn">
                  <AlertCircle size={13} className="shrink-0" />
                  <span>{nameError}</span>
                </p>
              )}
            </div>

            <div>
              <ImageUploader
                value={imageUrl}
                onChange={(url) => setImageUrl(url || '')}
                folder="categories"
                label="Imagen de la categoría"
                aspectRatio="aspect-video"
              />
            </div>

            {/* CONTENEDOR DE DÍAS DE DISPONIBILIDAD (TONO 2) */}
            <div className="border rounded-2xl p-4 space-y-4 transition-all" style={{ backgroundColor: bgSubcard, borderColor: borderSubtle }}>
              {/* Cabecera con Interruptor Maestro */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-semibold" style={{ color: textColor }}>Limitar días de disponibilidad</label>
                  <p className="text-xs leading-normal" style={{ color: textMuted }}>
                    {limitarDias 
                      ? "Selecciona en qué días se ofrece esta categoría." 
                      : "Disponible todos los días por defecto."}
                  </p>
                </div>
                
                {/* Toggle Switch Visual */}
                <button 
                  type="button"
                  onClick={() => setLimitarDias(!limitarDias)} 
                  style={{ backgroundColor: limitarDias ? colorPrimario : 'rgba(100, 116, 139, 0.25)' }}
                  className="relative w-10 h-5 rounded-full transition-all duration-300 shrink-0 cursor-pointer"
                  aria-label="Limitar días de disponibilidad"
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${limitarDias ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Grid de Checkboxes (Renderizado Condicional) */}
              {limitarDias && (
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 pt-3 border-t animate-fadeIn" style={{ borderColor: borderSubtle }}>
                  {[
                    { key: 'Lun', label: 'LUN' },
                    { key: 'Mar', label: 'MAR' },
                    { key: 'Mié', label: 'MIÉ' },
                    { key: 'Jue', label: 'JUE' },
                    { key: 'Vie', label: 'VIE' },
                    { key: 'Sáb', label: 'SÁB' },
                    { key: 'Dom', label: 'DOM' },
                  ].map(({ key, label }) => {
                    const isChecked = days.includes(key)
                    return (
                      <label key={key} className="flex items-center gap-3 cursor-pointer select-none group" style={{ color: textColor }}>
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setDays(days.filter(d => d !== key))
                            } else {
                              setDays([...days, key])
                            }
                          }}
                          style={{ accentColor: colorPrimario }}
                          className="w-4 h-4 rounded transition-all cursor-pointer" 
                        />
                        <span className="text-sm font-bold group-hover:translate-x-0.5 transition-transform">
                          {label}
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Horario de disponibilidad */}
            <div className="border rounded-2xl p-4 space-y-4" style={{ backgroundColor: bgSubcard, borderColor: borderSubtle }}>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-semibold" style={{ color: textColor }}>Limitar horario de disponibilidad</label>
                  <p className="text-xs leading-normal" style={{ color: textMuted }}>
                    Define un rango de horas específico.
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={() => setHasSchedule(!hasSchedule)} 
                  style={{ backgroundColor: hasSchedule ? colorPrimario : 'rgba(100, 116, 139, 0.25)' }}
                  className="relative w-10 h-5 rounded-full transition-all duration-300 shrink-0 cursor-pointer"
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${hasSchedule ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {hasSchedule && (
                <div className="grid grid-cols-2 gap-4 pt-3 border-t animate-fadeIn" style={{ borderColor: borderSubtle }}>
                  <div>
                    <label className="block text-xs font-semibold tracking-wider mb-1.5 uppercase" style={{ color: textMuted }}>Hora inicio</label>
                    <TimeWheelPicker 
                      value={timeStart}
                      onChange={setTimeStart}
                      options={TIME_OPTIONS}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold tracking-wider mb-1.5 uppercase" style={{ color: textMuted }}>Hora fin</label>
                    <TimeWheelPicker 
                      value={timeEnd}
                      onChange={setTimeEnd}
                      options={TIME_OPTIONS}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between py-2 border-t mt-4" style={{ borderColor: borderSubtle }}>
              <span className="text-sm font-medium" style={{ color: textColor }}>Estado de la categoría</span>
              
              <button 
                type="button"
                onClick={() => setActive(!active)} 
                style={{ backgroundColor: active ? colorPrimario : 'rgba(100, 116, 139, 0.25)' }}
                className="relative w-10 h-5 rounded-full transition-all duration-300 shrink-0 cursor-pointer"
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${active ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modalCategoriesToShow && (
        <Modal 
          title={modalCategoriesToShow.title} 
          onClose={() => setModalCategoriesToShow(null)}
        >
          <div className="space-y-4 text-left">
            <p className="text-xs mb-1" style={{ color: textMuted }}>
              Categorías asignadas a este grupo:
            </p>
            <div className="relative">
              <div
                onScroll={e => setCatsScrolled(e.currentTarget.scrollTop > 8)}
                className="space-y-2 max-h-[280px] overflow-y-auto pr-1"
              >
                {modalCategoriesToShow.list.map(cat => (
                  <div key={cat.id} className="border rounded-xl p-3 flex items-center justify-between" style={{ backgroundColor: bgSubcard, borderColor: borderSubtle }}>
                    <span className="font-bold text-sm" style={{ color: textColor }}>{cat.name}</span>
                    <span 
                      className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border"
                      style={{
                        backgroundColor: cat.active ? `${colorPrimario}15` : 'rgba(239, 68, 68, 0.15)',
                        color: cat.active ? colorPrimario : '#EF4444',
                        borderColor: cat.active ? `${colorPrimario}30` : 'rgba(239, 68, 68, 0.3)'
                      }}
                    >
                      {cat.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                ))}
              </div>
              <ScrollHint visible={!catsScrolled} bgFrom={isLight ? "#ffffff" : "#1b1928"} />
            </div>
            <div className="flex justify-start pt-4 border-t mt-4" style={{ borderColor: borderSubtle }}>
              <button 
                type="button"
                onClick={() => setModalCategoriesToShow(null)}
                style={{ backgroundColor: bgSubcard, borderColor: borderSubtle, color: textColor }}
                className="border rounded-xl px-5 py-2.5 text-sm font-semibold transition-all cursor-pointer h-11 flex items-center justify-center hover:opacity-80"
              >
                Cerrar
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
