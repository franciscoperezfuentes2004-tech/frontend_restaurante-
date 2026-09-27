import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { 
  Plus, 
  Pencil, 
  Trash2, 
  X,
  DollarSign, 
  Flame, 
  Award,
  Power,
  Tag,
  Check,
  Clock,
  ChevronDown
} from 'lucide-react'

import PageHeader from '../../components/ui/PageHeader'
import Toast from '../../components/ui/Toast'
import EmptyState from '../../components/ui/EmptyState'
import StatCard from '../../components/ui/StatCard'
import MetricCardsLayout from '../../components/ui/MetricCardsLayout'
import Dropdown from '../../components/ui/Dropdown'
import TimePicker from '../../components/ui/TimePicker'
import ReservationTimeScrollPicker from '../../components/ui/ReservationTimeScrollPicker'
import DatePicker from '../../components/ui/DatePicker'
import Modal from '../../components/ui/Modal'
import Table from '../../components/ui/Table'
import { EsqueletoBloqueSolido } from '../../components/ui/Skeletons'
import { getDishes } from '../../api/dishes'
import { getPromotions, createPromotion, updatePromotion, deletePromotion, togglePromotion } from '../../api/promotions'
import DishesMultiSelect from '../../components/ui/DishesMultiSelect'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { validatePromotionForm, PROMO_SCHEMA_OPTIONS } from '../../validators/promotionValidator'

// ── Scroll picker slots 8:00–23:30 ──
const PROMO_TIME_SLOTS = (() => {
  const s = []
  for (let m = 8 * 60; m <= 23 * 60 + 30; m += 30) {
    const h = Math.floor(m / 60)
    const mi = m % 60
    s.push(`${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`)
  }
  return s
})()

function fmtTime(slot) {
  if (!slot) return ''
  const [hStr, mStr] = slot.split(':')
  const h24 = parseInt(hStr, 10)
  const m = mStr || '00'
  const p = h24 >= 12 ? 'p. m.' : 'a. m.'
  let h12 = h24 % 12
  if (h12 === 0) h12 = 12
  return `${h12}:${m} ${p}`
}

const P_ITEM_H = 40
const P_CONTAINER_H = 160
const P_EDGE = (P_CONTAINER_H - P_ITEM_H) / 2

function PromotionTimePicker({ label, value, onChange, isOpen, onToggle, onClose, hasError = false }) {
  const rootRef = useRef(null)
  const listRef = useRef(null)
  const scrollTimer = useRef(null)
  const itemRefs = useRef({})
  const { bgSubcard, bgCard, borderSubtle, textColor, textMuted, isLight, colorPrimario } = useTheme()

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen, onClose])

  // Scroll to selected on open ONCE (instantaneous positioning without smooth scroll freeze)
  useEffect(() => {
    if (!isOpen) return
    const idx = value ? PROMO_TIME_SLOTS.indexOf(value) : 0
    const targetIdx = idx >= 0 ? idx : 0
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollTop = targetIdx * P_ITEM_H
      }
    })
  }, [isOpen])

  const handleScroll = useCallback(() => {
    if (!listRef.current) return
    if (scrollTimer.current) clearTimeout(scrollTimer.current)
    scrollTimer.current = setTimeout(() => {
      const container = listRef.current
      if (!container) return
      const itemHeight = P_ITEM_H
      const scrollTop = container.scrollTop
      const index = Math.round(scrollTop / itemHeight)
      const clampedIndex = Math.max(0, Math.min(index, PROMO_TIME_SLOTS.length - 1))
      container.scrollTo({ top: clampedIndex * itemHeight, behavior: 'smooth' })
      const slot = PROMO_TIME_SLOTS[clampedIndex]
      if (slot && slot !== value) onChange(slot)
    }, 150)
  }, [value, onChange])

  const handleItemClick = useCallback((idx) => {
    const slot = PROMO_TIME_SLOTS[idx]
    if (listRef.current) {
      listRef.current.scrollTo({ top: idx * P_ITEM_H, behavior: 'smooth' })
    }
    onChange(slot)
    setTimeout(() => onClose(), 120)
  }, [onChange, onClose])

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <label className="text-[10px] font-semibold text-theme-text-muted uppercase tracking-wider mb-1 block">
        {label}
      </label>
      {/* Trigger button */}
      <button
        type="button"
        onClick={onToggle}
        className={`input-subcard bg-slate-100 dark:bg-white/5 border flex items-center gap-2 w-full rounded-xl px-4 py-2.5 transition-all duration-200 justify-between select-none hover:opacity-90 cursor-pointer h-11 font-medium ${
          hasError ? '!border-rose-500 ring-1 ring-rose-500/20' : 'border-gray-200 dark:border-white/10'
        }`}
        style={{
          backgroundColor: bgSubcard,
          color: textColor,
          borderColor: hasError ? '#ef4444' : undefined,
        }}
      >
        <div className="flex items-center gap-2">
          <Clock size={15} style={{ color: colorPrimario }} className="shrink-0" />
          <span className="text-xs font-semibold" style={{ color: value ? textColor : textMuted }}>
            {value ? fmtTime(value) : 'Selecciona hora'}
          </span>
        </div>
        <ChevronDown
          size={14}
          style={{ color: textMuted }}
          className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Floating scroll picker — position:absolute so it doesn't push modal content */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '100%',
            marginTop: 8,
            zIndex: 50,
            height: P_CONTAINER_H,
            backgroundColor: bgCard,
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: borderSubtle,
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: `0 8px 24px rgba(0,0,0,${isLight ? '0.12' : '0.45'})`,
            transition: 'all 0.2s ease',
          }}
        >
          {/* Top gradient fade */}
          <div
            className="absolute top-0 left-0 right-0 h-14 pointer-events-none"
            style={{ zIndex: 10, background: `linear-gradient(to bottom, ${bgCard} 0%, transparent 100%)` }}
          />
          {/* Bottom gradient fade */}
          <div
            className="absolute bottom-0 left-0 right-0 h-14 pointer-events-none"
            style={{ zIndex: 10, background: `linear-gradient(to top, ${bgCard} 0%, transparent 100%)` }}
          />

          <div
            ref={listRef}
            onScroll={handleScroll}
            style={{
              height: '100%',
              width: '100%',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              paddingTop: P_EDGE,
              paddingBottom: P_EDGE,
            }}
          >
            {PROMO_TIME_SLOTS.map((slot, idx) => {
              const selected = slot === value
              return (
                <button
                  key={slot}
                  ref={el => { itemRefs.current[idx] = el }}
                  type="button"
                  onClick={() => handleItemClick(idx)}
                  className={`flex items-center justify-center text-sm transition-all duration-150 ${
                    selected ? 'font-bold rounded-xl' : 'text-theme-text-muted font-medium'
                  } cursor-pointer`}
                  style={{
                    height: P_ITEM_H,
                    width: selected ? 'calc(100% - 16px)' : '100%',
                    marginLeft: selected ? 8 : 0,
                    marginRight: selected ? 8 : 0,
                    ...(selected
                      ? { backgroundColor: colorPrimario, color: '#ffffff' }
                      : {}),
                  }}
                >
                  {fmtTime(slot)}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

const ITEMS_PER_PAGE = 8

export default function Promotions() {
  const { user } = useAuth()
  const { colorPrimario, primaryBtnText, textSubtle, textColor, textMuted, bgCard, bgSubcard, bgInput, borderSubtle, cardShadow, isLight } = useTheme()
  const esGerente = user?.role === 'gerente'

  const [promotions, setPromotions] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Resumen from backend
  const [resumen, setResumen] = useState({ activas: 0, mas_popular: null, ventas_total: 0 })

  // UI feedback states
  const [toast, setToast] = useState(null)
  const [dishes, setDishes] = useState([])

  const totalPages = Math.ceil(promotions.length / ITEMS_PER_PAGE) || 1
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE
  const indexOfFirstItem = (currentPage - 1) * ITEMS_PER_PAGE
  const currentPromotions = (Array.isArray(promotions) ? promotions : []).slice(indexOfFirstItem, indexOfLastItem)
  const startItem = promotions.length === 0 ? 0 : indexOfFirstItem + 1
  const endItem = Math.min(indexOfLastItem, promotions.length)

  const defaultForm = {
    id: null,
    name: '',
    type: '2x1',
    value: '2x1',
    detail: 'en Alitas (Búfalo o BBQ)',
    selectedDishes: [],
    isCustom: false,
    days: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    startDate: '',
    endDate: '',
    timeStart: '12:00',
    timeEnd: '23:00',
    active: true,
    hasDaysFilter: true,
    hasDateFilter: false,
    hasTimeFilter: false,

    // New Fields
    aplicaEn: 'pedidos',
    tipoDescuento: 'porcentaje',
    descuento: 0,
    esFechaEspecial: false,
    fechaInicio: '',
    fechaFin: '',
    mensajeBanner: '',
    mostrarEnLanding: true
  }

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [openTimePicker, setOpenTimePicker] = useState(null)
  const [touched, setTouched] = useState({})
  const [hasSubmitted, setHasSubmitted] = useState(false)

  // Validación en tiempo real (Zod)
  const validation = useMemo(() => validatePromotionForm(form), [form])
  const errors = validation.errors

  // Mapeo dinámico de opciones de Esquema según el Tipo seleccionado
  const currentSchemaOptions = useMemo(() => {
    return PROMO_SCHEMA_OPTIONS[form?.type || '2x1'] || PROMO_SCHEMA_OPTIONS['2x1']
  }, [form?.type])

  const isCustomSchema = useMemo(() => {
    return !currentSchemaOptions.some(opt => opt.value !== 'custom' && opt.value === form?.value)
  }, [currentSchemaOptions, form?.value])

  const selectedSchemaOption = isCustomSchema ? 'custom' : (form?.value || currentSchemaOptions[0]?.value || 'custom')

  const handleOpenNewPromotion = () => {
    setForm(defaultForm)
    setTouched({})
    setHasSubmitted(false)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setTouched({})
    setHasSubmitted(false)
  }

  const handleTypeChange = (newType) => {
    setTouched(p => ({ ...p, type: true, schema: true }))
    const nextOptions = PROMO_SCHEMA_OPTIONS[newType] || PROMO_SCHEMA_OPTIONS['2x1']
    const nextValue = nextOptions[0]?.value || '2x1'
    let nextDetail = ''
    if (newType === '2x1') {
      nextDetail = 'en Alitas (Búfalo o BBQ)'
    } else if (newType === 'fixed') {
      nextDetail = 'de descuento directo'
    } else if (newType === 'combo') {
      nextDetail = 'Combo especial'
    }
    setForm(prev => ({
      ...prev,
      type: newType,
      value: nextValue,
      detail: nextDetail,
    }))
  }

  const handleSchemaChange = (newVal) => {
    setTouched(p => ({ ...p, schema: true }))
    if (newVal === 'custom') {
      const isPreset = currentSchemaOptions.some(opt => opt.value !== 'custom' && opt.value === form?.value)
      setForm(prev => ({ ...prev, value: isPreset ? '' : prev?.value || '' }))
    } else {
      setForm(prev => ({ ...prev, value: newVal }))
    }
  }

  // Fetch promotions from API
  const loadPromotions = async () => {
    try {
      setLoading(true)
      const res = await getPromotions()
      const data = res.data
      setPromotions(data.promotions || [])
      setResumen(data.resumen || { activas: 0, mas_popular: null, ventas_total: 0 })
    } catch (err) {
      console.error("Error loading promotions:", err)
      setToast({ message: 'Error al cargar promociones', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // Fetch dishes list
  useEffect(() => {
    const loadDishes = async () => {
      try {
        const res = await getDishes()
        const platillos = res.data?.dishes || res.data || []
        setDishes(Array.isArray(platillos) ? platillos : [])
      } catch (err) {
        console.error("Error loading dishes:", err)
        setDishes([])
      }
    }
    loadDishes()
    loadPromotions()
  }, [])

  // Calculate dynamic KPIs from backend resumen
  const activeCount = resumen.activas
  const topPromoName = resumen.mas_popular || 'Sin datos'
  const salesDriven = resumen.ventas_total || 0

  // Handlers
  const toggleDay = (day) => {
    setForm(prev => {
      const currentDays = Array.isArray(prev?.days) ? prev.days : []
      const days = currentDays.includes(day)
        ? currentDays.filter(d => d !== day)
        : [...currentDays, day]
      return { ...prev, days }
    })
  }

  const handleStartEdit = (promo) => {
    if (!promo) return
    const benefitText = (promo.benefit || '').trim()
    
    let parsedType = promo.type || 'fixed'
    let parsedValue = promo.scheme || ''
    let parsedDetail = benefitText

    if (!parsedValue) {
      if (/^[0-9]+x[0-9]+/i.test(benefitText)) {
        const match = benefitText.match(/^([0-9]+x[0-9]+)\s*(.*)/i)
        parsedType = '2x1'
        parsedValue = match ? match[1] : '2x1'
        parsedDetail = match ? match[2] : ''
      } else if (/\spor\s+([$]?[0-9]+)/i.test(benefitText)) {
        const match = benefitText.match(/(.*)\s+por\s+([$]?[0-9]+)/i)
        parsedType = 'combo'
        parsedValue = match ? match[2] : ''
        parsedDetail = match ? match[1] : benefitText
      } else if (/^([$]?[0-9]+%?)/i.test(benefitText)) {
        const match = benefitText.match(/^([$]?[0-9]+%?)\s*(.*)/i)
        parsedType = 'fixed'
        parsedValue = match ? match[1] : ''
        parsedDetail = match ? match[2] : ''
      }
    }

    // Map product IDs from backend
    const productIds = (promo.products || []).map(id => Number(id))

    setTouched({})
    setHasSubmitted(false)
    setForm({
      id: promo.id,
      name: promo.name,
      type: parsedType,
      value: parsedValue,
      detail: parsedDetail,
      selectedDishes: productIds,
      isCustom: false,
      days: (promo.days && promo.days.length > 0) ? promo.days : ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
      startDate: promo.date_start || '',
      endDate: promo.date_end || '',
      timeStart: promo.time_start || '12:00',
      timeEnd: promo.time_end || '23:00',
      active: promo.active,
      hasDaysFilter: true,
      hasDateFilter: !!(promo.date_start && promo.date_end),
      hasTimeFilter: !!(promo.time_start && promo.time_end),

      // New fields
      aplicaEn: promo.aplica_en || 'pedidos',
      tipoDescuento: 'porcentaje',
      descuento: 0,
      esFechaEspecial: !!(promo.fecha_inicio || promo.fecha_fin),
      fechaInicio: promo.fecha_inicio || '',
      fechaFin: promo.fecha_fin || '',
      mensajeBanner: promo.mensaje_banner || '',
      mostrarEnLanding: true
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    try {
      await deletePromotion(id)
      setPromotions(prev => prev.filter(p => p.id !== id))
      setToast({ message: 'Promoción eliminada correctamente', type: 'success' })
      loadPromotions()
    } catch (err) {
      console.error("Error deleting promotion:", err)
      setToast({ message: err.response?.data?.message || 'Error al eliminar la promoción', type: 'error' })
    }
  }

  const handleTogglePause = async (id) => {
    try {
      const res = await togglePromotion(id)
      const updated = res.data
      setPromotions(prev => prev.map(p => p.id === id ? updated : p))
      const statusMsg = updated.active ? 'activada' : 'desactivada'
      setToast({ message: `Promoción ${statusMsg} correctamente`, type: 'success' })
      loadPromotions()
    } catch (err) {
      console.error("Error toggling promotion:", err)
      setToast({ message: 'Error al cambiar estado de la promoción', type: 'error' })
    }
  }

  const handleSave = async (e) => {
    if (e) e.preventDefault()
    setHasSubmitted(true)

    const trimmedName = (form?.name || '').trim()
    const currentForm = {
      ...form,
      name: trimmedName
    }
    setForm(currentForm)

    const valResult = validatePromotionForm(currentForm)
    if (!valResult.isValid) {
      const firstError = Object.values(valResult.errors)[0]
      setToast({ message: firstError || 'Por favor corrige los errores en el formulario', type: 'error' })
      return
    }

    let computedBenefit = ''
    const val = (currentForm?.value || '').trim()
    const detail = (currentForm?.detail || '').trim()
    
    let valFormatted = val
    if (currentForm?.type === 'fixed' || currentForm?.type === 'combo') {
      if (/^[0-9]+$/.test(valFormatted)) {
        valFormatted = `$${valFormatted}`
      }
    }
    
    if (currentForm?.type === '2x1') {
      computedBenefit = `${valFormatted} ${detail}`.trim()
    } else if (currentForm?.type === 'combo') {
      computedBenefit = detail ? `${detail} por ${valFormatted}` : `Combo por ${valFormatted}`
    } else {
      computedBenefit = detail ? `${valFormatted} ${detail}` : `${valFormatted} de descuento`
    }

    const days = (currentForm?.days && currentForm.days.length > 0) ? currentForm.days : ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    const dateStart = currentForm?.hasDateFilter ? currentForm.startDate : null
    const dateEnd = currentForm?.hasDateFilter ? currentForm.endDate : null
    const timeStart = currentForm?.hasTimeFilter ? currentForm.timeStart : null
    const timeEnd = currentForm?.hasTimeFilter ? currentForm.timeEnd : null

    const payload = {
      name: trimmedName,
      type: currentForm.type,
      scheme: currentForm.value,
      benefit: computedBenefit,
      products: currentForm.selectedDishes || [],
      days: days,
      date_start: dateStart,
      date_end: dateEnd,
      time_start: timeStart,
      time_end: timeEnd,
      active: currentForm.active,
      aplica_en: currentForm.aplicaEn || 'pedidos',
      mensaje_banner: currentForm.mensajeBanner || null,
      fecha_inicio: currentForm.fechaInicio || null,
      fecha_fin: currentForm.fechaFin || null,
    }

    try {
      setSaving(true)
      if (currentForm?.id) {
        await updatePromotion(currentForm.id, payload)
        setToast({ message: 'Promoción actualizada correctamente', type: 'success' })
      } else {
        await createPromotion(payload)
        setToast({ message: 'Promoción creada correctamente', type: 'success' })
      }
      setShowModal(false)
      setTouched({})
      setHasSubmitted(false)
      loadPromotions()
    } catch (err) {
      console.error("Error saving promotion:", err)
      const msg = err.response?.data?.message || 'Error al guardar la promoción'
      setToast({ message: msg, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const getVigenciaText = (promo) => {
    if ((promo.fecha_inicio || promo.fecha_fin) && (!promo.days || promo.days.length === 0)) {
      return 'Fecha especial'
    }
    const allDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    if (!promo.days || promo.days.length === 0) return 'Sin días'
    if (promo.days.length === allDays.length) {
      return 'Todos los días'
    }
    if (promo.days.length === 2 && promo.days.includes('Sáb') && promo.days.includes('Dom')) {
      return 'Fines de semana'
    }
    if (promo.days.length === 5 && !promo.days.includes('Sáb') && !promo.days.includes('Dom')) {
      return 'Lunes a Viernes'
    }
    return promo.days.join(', ')
  }


  return (
    <div className="space-y-6 pb-12 animate-fadeIn p-4 md:p-6 lg:p-8 font-sans relative">
      <PageHeader 
        title="Promociones" 
        description="Gestiona combos, días especiales y descuentos automáticos del restaurante."
        action={
          <button
            onClick={handleOpenNewPromotion}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500
                       text-theme-text text-sm font-medium px-4 py-2.5 rounded-xl
                       shadow-lg shadow-brand-600/30 transition-all duration-200 cursor-pointer"
          >
            <Plus size={15}/> Nueva promoción
          </button>
        }
      />

      {/* KPI Cards Grid */}
      <div className="rounded-2xl p-6 max-md:p-3 border transition-colors duration-200 overflow-hidden" style={{ backgroundColor: bgCard, borderColor: borderSubtle, boxShadow: cardShadow }}>
        <MetricCardsLayout cols={3} gap="gap-6">
          {loading ? (
            <>
              <div className="animate-shimmer rounded-xl h-24 w-full" />
              <div className="animate-shimmer rounded-xl h-24 w-full" />
              <div className="animate-shimmer rounded-xl h-24 w-full" />
            </>
          ) : (
            <>
              <StatCard
                title="Total Promociones"
                value={promotions.length || 0}
                subtitle="Registradas en catálogo"
                icon={Tag}
                color="blue"
              />
              <StatCard
                title="Promociones Activas"
                value={activeCount || 0}
                subtitle="Ofertas vigentes actualmente"
                icon={Check}
                color="green"
              />
              <StatCard
                title="Promociones Inactivas"
                value={Math.max(0, (promotions.length || 0) - (activeCount || 0))}
                subtitle="Pausadas o vencidas"
                icon={X}
                color="red"
              />
            </>
          )}
        </MetricCardsLayout>
      </div>

      {/* Main Promotions Table Outer Container */}
      <div className="rounded-2xl p-6 max-md:p-3 transition-colors duration-200 space-y-6 max-md:space-y-4" style={{ backgroundColor: bgCard, border: `1px solid ${borderSubtle}`, boxShadow: cardShadow }}>
        <div className="space-y-4 max-md:space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
            <div>
              <h3 className="text-sm font-bold text-theme-text tracking-wider uppercase">Catálogo de Promociones</h3>
              <p className="text-xs text-theme-text-muted mt-0.5">Gestión y control de ofertas y descuentos del restaurante</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-2.5">
              <div className="animate-shimmer rounded-lg h-12 w-full" />
              <div className="animate-shimmer rounded-lg h-12 w-full" />
              <div className="animate-shimmer rounded-lg h-12 w-full" />
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <Table className="min-w-[800px]" shadow="shadow-lg" headers={['Nombre', 'Beneficio', 'Aplica en', 'Días', 'Horario', 'Estado', 'Acciones']}>
                {currentPromotions.map((promo, index) => {
                  const delayClass = `delay-${Math.min(index + 1, 5)}`
                    return (
                      <tr 
                        key={promo.id}
                        className={`h-16 border-b transition-colors duration-150 animate-fadeInUp ${delayClass}`}
                        style={{ backgroundColor: 'var(--theme-surface)', borderColor: borderSubtle }}
                      >
                        <td className="px-5 py-3">
                          <span className="text-theme-text font-bold text-sm">{promo.name}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span 
                            className="inline-block border text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-xs"
                            style={{ 
                              backgroundColor: isLight ? '#ECE9FE' : `${colorPrimario}25`, 
                              color: isLight ? '#3730A3' : colorPrimario, 
                              borderColor: isLight ? '#A5B4FC' : `${colorPrimario}50` 
                            }}
                          >
                            {promo.benefit || '-'}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {(promo.aplica_en || 'pedidos') === 'reservaciones' ? (
                            <span 
                              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold border shadow-xs"
                              style={{
                                backgroundColor: isLight ? '#DBEAFE' : 'rgba(59,130,246,0.2)',
                                color: isLight ? '#1E3A8A' : '#93C5FD',
                                borderColor: isLight ? '#93C5FD' : 'rgba(59,130,246,0.4)'
                              }}
                            >
                              Reservaciones
                            </span>
                          ) : (promo.aplica_en || 'pedidos') === 'ambos' ? (
                            <span 
                              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold border shadow-xs"
                              style={{
                                backgroundColor: isLight ? '#D1FAE5' : 'rgba(16,185,129,0.2)',
                                color: isLight ? '#065F46' : '#6EE7B7',
                                borderColor: isLight ? '#6EE7B7' : 'rgba(16,185,129,0.4)'
                              }}
                            >
                              Ambos
                            </span>
                          ) : (
                            <span 
                              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold border shadow-xs"
                              style={{
                                backgroundColor: isLight ? '#F3E8FF' : 'rgba(168,85,247,0.2)',
                                color: isLight ? '#581C87' : '#E9D5FF',
                                borderColor: isLight ? '#C084FC' : 'rgba(168,85,247,0.4)'
                              }}
                            >
                              Pedidos
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div className="space-y-0.5">
                            <span className="text-theme-text font-semibold text-xs block">{getVigenciaText(promo)}</span>
                            {((promo.date_start && promo.date_end) || (promo.fecha_inicio && promo.fecha_fin)) && (
                              <span className="text-theme-text-muted text-[10px] block mt-0.5 font-medium">
                                Fechas: {promo.date_start || promo.fecha_inicio} a {promo.date_end || promo.fecha_fin}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-theme-text font-semibold text-xs">
                            {promo.time_start && promo.time_end ? `${promo.time_start} - ${promo.time_end}` : 'Todo el día'}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span 
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border shadow-xs whitespace-nowrap"
                            style={{
                              backgroundColor: promo.active 
                                ? (isLight ? '#D1FAE5' : 'rgba(16,185,129,0.2)') 
                                : (isLight ? '#FEE2E2' : 'rgba(239,68,68,0.2)'),
                              color: promo.active 
                                ? (isLight ? '#065F46' : '#6EE7B7') 
                                : (isLight ? '#991B1B' : '#FCA5A5'),
                              borderColor: promo.active 
                                ? (isLight ? '#6EE7B7' : 'rgba(16,185,129,0.4)') 
                                : (isLight ? '#FCA5A5' : 'rgba(239,68,68,0.4)')
                            }}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${promo.active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            {promo.active ? 'Activa' : 'Inactiva'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleTogglePause(promo.id)}
                              className="p-1.5 rounded-lg border transition-all cursor-pointer hover:opacity-80"
                              style={{
                                backgroundColor: 'var(--theme-input)',
                                borderColor: borderSubtle,
                                color: promo.active ? '#10b981' : textMuted
                              }}
                              title={promo.active ? 'Pausar promoción' : 'Activar promoción'}
                            >
                              <Power size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(promo)}
                              className="p-1.5 rounded-lg border transition-all cursor-pointer hover:opacity-80"
                              style={{
                                backgroundColor: 'var(--theme-input)',
                                borderColor: borderSubtle,
                                color: colorPrimario || 'var(--theme-primary)'
                              }}
                              title="Editar promoción"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(promo.id)}
                              className="p-1.5 rounded-lg border border-red-500/20 text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-all cursor-pointer"
                              title="Eliminar promoción"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {currentPromotions.length > 0 && Array.from({ length: ITEMS_PER_PAGE - currentPromotions.length }).map((_, i) => (
                    <tr key={`empty-${i}`} className="h-16 border-b border-transparent" style={{ backgroundColor: 'var(--theme-surface)' }}>
                      <td colSpan={7}></td>
                    </tr>
                  ))}
                  {promotions.length === 0 && (
                    <tr style={{ backgroundColor: 'var(--theme-surface)' }}>
                      <td colSpan={7} className="p-0 border-none" style={{ backgroundColor: 'var(--theme-surface)' }}>
                        <div className="h-[32rem] flex items-center justify-center" style={{ backgroundColor: 'var(--theme-surface)' }}>
                          <EmptyState
                            title="No hay promociones registradas"
                            description="Crea una nueva promoción para verla reflejada aquí."
                            iconType="default"
                          />
                        </div>
                      </td>
                    </tr>
                  )}
              </Table>
            </div>
            )}

            {/* Pagination */}
              {!loading && promotions.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t" style={{ borderColor: borderSubtle }}>
                  <div className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                    Mostrando {startItem} a {endItem} de {promotions.length} promociones
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5"
                      style={currentPage > 1 ? {
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
                    >
                      Anterior
                    </button>

                    <div 
                      className="px-3 py-1 text-xs font-bold font-mono rounded-xl" 
                      style={{ backgroundColor: 'var(--theme-input)', color: 'var(--theme-text)' }}
                    >
                      {currentPage} / {totalPages}
                    </div>

                    <button 
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage >= totalPages}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5"
                      style={currentPage < totalPages ? {
                        backgroundColor: colorPrimario || 'var(--theme-primary)',
                        borderColor: colorPrimario || 'var(--theme-primary)',
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

      {/* Modal de crear/editar */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/70 backdrop-blur-sm animate-fadeIn"
             onClick={handleCloseModal}>
          <div className="rounded-2xl shadow-2xl w-full max-w-xl max-h-[70vh] md:max-h-[90vh] flex flex-col animate-fadeInUp overflow-hidden"
               style={{ backgroundColor: bgCard, boxShadow: cardShadow }}
               onClick={e => e.stopPropagation()}>
            <div 
              className="flex items-center justify-between px-6 max-md:px-4 py-4 shrink-0 transition-colors border-t border-x border-b"
              style={{ 
                backgroundColor: colorPrimario || 'var(--theme-primary)', 
                borderColor: colorPrimario || 'var(--theme-primary)',
                color: 'var(--theme-primary-contrast, #ffffff)' 
              }}
            >
              <h3 className="font-bold text-base" style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}>
                {form?.id ? 'Editar promoción' : 'Nueva promoción'}
              </h3>
              <button 
                type="button"
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer"
                style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}
              >
                <X size={16}/>
              </button>
            </div>

            <div className="px-6 max-md:px-4 py-5 space-y-4 max-md:space-y-3 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent border-x border-b border-theme-border-subtle rounded-b-2xl"
                 style={{
                   borderColor: borderSubtle,
                   paddingBottom: openTimePicker ? '220px' : '24px',
                   transition: 'padding-bottom 0.2s ease'
                 }}>
              {/* Nombre */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-medium text-theme-text-muted uppercase tracking-wider block">
                    Nombre de la promoción <span className="text-rose-500">*</span>
                  </label>
                  <span className={`text-[11px] font-medium ${(form?.name || '').length > 90 ? 'text-amber-500' : 'text-theme-text-muted'}`}>
                    {(form?.name || '').length}/100
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={100}
                  value={form?.name || ''}
                  onBlur={() => {
                    setTouched(p => ({ ...p, name: true }))
                    setForm(p => ({ ...p, name: (p?.name || '').trim() }))
                  }}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ej. Martes de Alitas"
                  style={{ backgroundColor: bgSubcard, color: textColor }}
                  className={`input-subcard bg-slate-100 dark:bg-white/5 border rounded-xl px-4 py-3 text-sm w-full focus:outline-none transition-all font-sans font-medium ${
                    (hasSubmitted || touched.name) && errors.name
                      ? '!border-rose-500 ring-1 ring-rose-500/20'
                      : 'border-gray-200 dark:border-white/10 hover:border-white/20 focus:border-brand-500/40'
                  }`}
                />
                {(hasSubmitted || touched.name) && errors.name && (
                  <p className="text-rose-500 text-xs mt-1.5 flex items-center gap-1 animate-fadeIn">
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Tipo y Esquema en grid con lógica de dependencia dinámica */}
              <div className="grid grid-cols-2 max-md:grid-cols-1 gap-3">
                <div>
                  <label className="text-xs font-medium text-theme-text-muted uppercase tracking-wider mb-1.5 block">
                    Tipo <span className="text-rose-500">*</span>
                  </label>
                  <Dropdown
                    buttonBg={bgSubcard}
                    buttonClassName="input-subcard bg-slate-100 dark:bg-white/5 border border-gray-200 dark:border-white/10"
                    options={[
                      { value: '2x1', label: '2x1 / Esquema' },
                      { value: 'fixed', label: 'Descuento ($ / %)' },
                      { value: 'combo', label: 'Combo' }
                    ]}
                    value={form?.type || '2x1'}
                    onChange={handleTypeChange}
                    className="w-full font-sans text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-theme-text-muted uppercase tracking-wider mb-1.5 block">
                    Esquema <span className="text-rose-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <Dropdown
                      buttonBg={bgSubcard}
                      buttonClassName="input-subcard bg-slate-100 dark:bg-white/5 border border-gray-200 dark:border-white/10"
                      hasError={(hasSubmitted || touched.schema) && !!errors.schema}
                      options={currentSchemaOptions}
                      value={selectedSchemaOption}
                      onChange={handleSchemaChange}
                      className="w-full font-sans text-sm"
                    />
                    {selectedSchemaOption === 'custom' && (
                      <input
                        type="text"
                        value={form?.value || ''}
                        onBlur={() => {
                          setTouched(p => ({ ...p, schema: true }))
                          setForm(p => ({ ...p, value: (p?.value || '').trim() }))
                        }}
                        onChange={e => setForm(p => ({ ...p, value: e.target.value }))}
                        placeholder={
                          form?.type === '2x1'
                            ? "Escribe el esquema (ej. 4x3)"
                            : form?.type === 'fixed'
                              ? "Escribe el monto (ej. $80 o 25%)"
                              : "Escribe el precio (ej. $350)"
                        }
                        style={{ backgroundColor: bgSubcard, color: textColor }}
                        className={`input-subcard bg-slate-100 dark:bg-white/5 border rounded-xl px-4 py-3 text-sm w-full focus:outline-none transition-all font-sans font-medium ${
                          (hasSubmitted || touched.schema) && errors.schema
                            ? '!border-rose-500 ring-1 ring-rose-500/20'
                            : 'border-gray-200 dark:border-white/10 hover:border-white/20 focus:border-brand-500/40'
                        }`}
                      />
                    )}
                  </div>
                  {(hasSubmitted || touched.schema) && errors.schema && (
                    <p className="text-rose-500 text-xs mt-1.5 animate-fadeIn">
                      {errors.schema}
                    </p>
                  )}
                </div>
              </div>

              {/* Productos aplicables */}
              <div>
                <label className="text-xs font-medium text-theme-text-muted uppercase tracking-wider mb-1.5 block">
                  Productos aplicables <span className="text-rose-500">*</span>
                </label>
                <DishesMultiSelect
                  buttonBg={bgSubcard}
                  dishes={dishes || []}
                  selected={form?.selectedDishes || []}
                  hasError={(hasSubmitted || touched.applicable_products) && !!errors.applicable_products}
                  onChange={(newSelected) => {
                    setTouched(p => ({ ...p, applicable_products: true }))
                    setForm(p => {
                      const selectedNames = (newSelected || []).map(id => {
                        const d = (dishes || []).find(dish => dish && String(dish.id) === String(id))
                        return d ? d.name : id
                      })
                      return {
                        ...p,
                        selectedDishes: newSelected || [],
                        detail: selectedNames.length > 0 ? `en ${selectedNames.join(', ')}` : (p?.detail || '')
                      }
                    })
                  }}
                />
                {(hasSubmitted || touched.applicable_products) && errors.applicable_products && (
                  <p className="text-rose-500 text-xs mt-1.5 animate-fadeIn">
                    {errors.applicable_products}
                  </p>
                )}
              </div>

              {/* Días de vigencia */}
              <div>
                <label className="text-xs font-medium text-theme-text-muted uppercase tracking-wider mb-2 block">
                  Días de vigencia <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => {
                    const isSelected = (form?.days || []).includes(day)
                    return (
                      <button key={day} type="button"
                              onClick={() => {
                                setTouched(p => ({ ...p, valid_days: true }))
                                toggleDay(day)
                              }}
                              className="px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all duration-200 border"
                              style={isSelected ? {
                                backgroundColor: colorPrimario,
                                color: '#ffffff',
                                borderColor: colorPrimario,
                                boxShadow: `0 4px 14px ${colorPrimario}66, 0 2px 6px ${colorPrimario}44`
                              } : {
                                backgroundColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.05)',
                                color: isLight ? '#475569' : 'rgba(241,245,249,0.7)',
                                borderColor: isLight ? '#CBD5E1' : 'rgba(255,255,255,0.1)',
                                boxShadow: 'none'
                              }}>
                        {day}
                      </button>
                    )
                  })}
                </div>
                {(hasSubmitted || touched.valid_days || (form?.days || []).length === 0) && errors.valid_days && (
                  <p className="text-rose-500 text-xs mt-1.5 animate-fadeIn">
                    {errors.valid_days}
                  </p>
                )}
              </div>

              {/* Rango de fechas */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-medium text-theme-text-muted uppercase tracking-wider block">
                    Rango de fechas {form?.hasDateFilter && <span className="text-rose-500">*</span>}
                  </label>
                  <button type="button"
                          onClick={() => {
                            setTouched(p => ({ ...p, start_date: true, end_date: true }))
                            setForm(p => ({ ...p, hasDateFilter: !p?.hasDateFilter }))
                          }}
                          className="relative w-11 h-6 rounded-full transition-all duration-300 cursor-pointer border shrink-0"
                          style={{ 
                            backgroundColor: form?.hasDateFilter ? colorPrimario : (isLight ? '#F1F5F9' : 'rgba(255,255,255,0.1)'),
                            borderColor: form?.hasDateFilter ? colorPrimario : (isLight ? '#E2E8F0' : 'rgba(255,255,255,0.15)'),
                            boxShadow: form?.hasDateFilter ? `0 4px 12px ${colorPrimario}66` : 'none'
                          }}>
                    <span className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full transition-transform duration-300 ${form?.hasDateFilter ? 'translate-x-5' : 'translate-x-0'}`}
                          style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.15)' }}/>
                  </button>
                </div>
                <div className={`grid grid-cols-2 gap-3 transition-all duration-200 ${form?.hasDateFilter ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                  <div>
                    <label className="text-[10px] font-semibold text-theme-text-muted uppercase tracking-wider mb-1 block">
                      Fecha inicio {form?.hasDateFilter && <span className="text-rose-500">*</span>}
                    </label>
                    <DatePicker
                      inputBg={bgSubcard}
                      value={form?.startDate || ''}
                      hasError={form?.hasDateFilter && (hasSubmitted || touched.start_date) && !!errors.start_date}
                      onChange={v => {
                        setTouched(p => ({ ...p, start_date: true }))
                        setForm(p => ({ ...p, startDate: v }))
                      }}
                      placeholder="Seleccionar fecha..."
                      fullWidth={true}
                      customPrefix=""
                    />
                    {form?.hasDateFilter && (hasSubmitted || touched.start_date) && errors.start_date && (
                      <p className="text-rose-500 text-xs mt-1 animate-fadeIn">
                        {errors.start_date}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-theme-text-muted uppercase tracking-wider mb-1 block">
                      Fecha fin {form?.hasDateFilter && <span className="text-rose-500">*</span>}
                    </label>
                    <DatePicker
                      inputBg={bgSubcard}
                      value={form?.endDate || ''}
                      hasError={form?.hasDateFilter && (hasSubmitted || touched.end_date) && !!errors.end_date}
                      onChange={v => {
                        setTouched(p => ({ ...p, end_date: true }))
                        setForm(p => ({ ...p, endDate: v }))
                      }}
                      placeholder="Seleccionar fecha..."
                      fullWidth={true}
                      customPrefix=""
                    />
                    {form?.hasDateFilter && (hasSubmitted || touched.end_date) && errors.end_date && (
                      <p className="text-rose-500 text-xs mt-1 animate-fadeIn">
                        {errors.end_date}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Oferta Especial para la Sección de Reservaciones */}
              {(form?.aplicaEn === 'reservaciones' || form?.aplicaEn === 'ambos') && (
                <div className="space-y-3.5 p-4 rounded-xl border border-theme-border-subtle animate-fadeIn" style={{ backgroundColor: bgSubcard }}>
                  <div>
                    <h4 className="text-xs font-bold text-[#C9A84C] uppercase tracking-wider block">
                      Oferta Especial para la Sección de Reservaciones
                    </h4>
                    <p className="text-[10px] text-theme-text-muted mt-1 leading-relaxed">
                      Esta sección es la encargada de crear y activar las ofertas destacadas en el módulo de reservas. Define las fechas y el mensaje de la oferta activa que verán los clientes.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-[10px] font-semibold text-theme-text-muted uppercase tracking-wider mb-1 block">
                        Fecha de inicio de la oferta
                      </label>
                      <DatePicker
                        inputBg={bgSubcard}
                        value={form?.fechaInicio || ''}
                        onChange={v => setForm(p => ({ ...p, fechaInicio: v }))}
                        placeholder="Seleccionar fecha..."
                        fullWidth={true}
                        customPrefix=""
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-theme-text-muted uppercase tracking-wider mb-1 block">
                        Fecha de fin de la oferta
                      </label>
                      <DatePicker
                        inputBg={bgSubcard}
                        value={form?.fechaFin || ''}
                        onChange={v => setForm(p => ({ ...p, fechaFin: v }))}
                        placeholder="Seleccionar fecha..."
                        fullWidth={true}
                        customPrefix=""
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-theme-text-muted uppercase tracking-wider mb-1.5 block">
                      Texto de la oferta que verá el cliente
                    </label>
                    <input
                      type="text"
                      value={form?.mensajeBanner || ''}
                      onChange={e => setForm(p => ({ ...p, mensajeBanner: e.target.value }))}
                      placeholder="Ej. San Valentín — ¡10% de descuento automático al reservar tu mesa hoy!"
                      style={{ backgroundColor: bgSubcard, color: textColor }}
                      className="input-subcard bg-slate-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-white/20 focus:border-brand-500/40 rounded-xl px-4 py-3 text-sm w-full focus:outline-none transition-all font-sans font-medium"
                    />
                  </div>
                </div>
              )}

              {/* Horario con TimePicker */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-medium text-theme-text-muted uppercase tracking-wider block">
                    Horario de aplicación {form?.hasTimeFilter && <span className="text-rose-500">*</span>}
                  </label>
                  <button type="button"
                          onClick={() => {
                            setTouched(p => ({ ...p, start_time: true, end_time: true }))
                            setForm(p => ({ ...p, hasTimeFilter: !p?.hasTimeFilter }))
                          }}
                          className="relative w-11 h-6 rounded-full transition-all duration-300 cursor-pointer border shrink-0"
                          style={{ 
                            backgroundColor: form?.hasTimeFilter ? colorPrimario : (isLight ? '#F1F5F9' : 'rgba(255,255,255,0.1)'),
                            borderColor: form?.hasTimeFilter ? colorPrimario : (isLight ? '#E2E8F0' : 'rgba(255,255,255,0.15)'),
                            boxShadow: form?.hasTimeFilter ? `0 4px 12px ${colorPrimario}66` : 'none'
                          }}>
                    <span className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full transition-transform duration-300 ${form?.hasTimeFilter ? 'translate-x-5' : 'translate-x-0'}`}
                          style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.15)' }}/>
                  </button>
                </div>
                <div className={`grid grid-cols-2 gap-3 transition-all duration-200 ${form?.hasTimeFilter ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                  <div>
                    <PromotionTimePicker
                      label={`Hora inicio ${form?.hasTimeFilter ? '*' : ''}`}
                      value={form?.timeStart || '12:00'}
                      hasError={form?.hasTimeFilter && (hasSubmitted || touched.start_time) && !!errors.start_time}
                      onChange={v => {
                        setTouched(p => ({ ...p, start_time: true }))
                        setForm(p => ({ ...p, timeStart: v }))
                      }}
                      isOpen={openTimePicker === 'start'}
                      onToggle={() => setOpenTimePicker(prev => prev === 'start' ? null : 'start')}
                      onClose={() => setOpenTimePicker(null)}
                    />
                    {form?.hasTimeFilter && (hasSubmitted || touched.start_time) && errors.start_time && (
                      <p className="text-rose-500 text-xs mt-1 animate-fadeIn">
                        {errors.start_time}
                      </p>
                    )}
                  </div>
                  <div>
                    <PromotionTimePicker
                      label={`Hora fin ${form?.hasTimeFilter ? '*' : ''}`}
                      value={form?.timeEnd || '23:00'}
                      hasError={form?.hasTimeFilter && (hasSubmitted || touched.end_time) && !!errors.end_time}
                      onChange={v => {
                        setTouched(p => ({ ...p, end_time: true }))
                        setForm(p => ({ ...p, timeEnd: v }))
                      }}
                      isOpen={openTimePicker === 'end'}
                      onToggle={() => setOpenTimePicker(prev => prev === 'end' ? null : 'end')}
                      onClose={() => setOpenTimePicker(null)}
                    />
                    {form?.hasTimeFilter && (hasSubmitted || touched.end_time) && errors.end_time && (
                      <p className="text-rose-500 text-xs mt-1 animate-fadeIn">
                        {errors.end_time}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Estado toggle */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm text-theme-text font-medium">Estado</p>
                  <p className="text-xs text-theme-text-muted mt-0.5 font-sans font-semibold uppercase tracking-wider">La promoción está activa y visible</p>
                </div>
                <button type="button"
                        onClick={() => setForm(p => ({ ...p, active: !p?.active }))}
                        className="relative w-11 h-6 rounded-full transition-all duration-300 cursor-pointer border shrink-0"
                        style={{ 
                          backgroundColor: form?.active ? colorPrimario : (isLight ? '#F1F5F9' : 'rgba(255,255,255,0.1)'),
                          borderColor: form?.active ? colorPrimario : (isLight ? '#E2E8F0' : 'rgba(255,255,255,0.15)'),
                          boxShadow: form?.active ? `0 4px 12px ${colorPrimario}66` : 'none'
                        }}>
                  <span className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full transition-transform duration-300 ${form?.active ? 'translate-x-5' : 'translate-x-0'}`}
                        style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.15)' }}/>
                </button>
              </div>
            </div>
            
            {/* Botones de acción (Sticky Footer) */}
            <div className="flex gap-3 justify-end p-4 shrink-0 border-t" style={{ borderColor: borderSubtle, backgroundColor: 'var(--theme-surface)' }}>
              <button type="button"
                      onClick={handleCloseModal}
                      style={{ backgroundColor: bgSubcard, color: textColor }}
                      className="input-subcard bg-slate-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:opacity-90 rounded-xl px-4 py-2 text-sm transition-all cursor-pointer font-medium max-md:flex-1">
                Cancelar
              </button>
              <button type="button"
                      onClick={handleSave}
                      disabled={saving || !validation.isValid}
                      style={{ backgroundColor: colorPrimario }}
                      className="text-white text-sm font-medium px-5 py-2 rounded-xl shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer max-md:flex-1">
                {saving ? 'Guardando...' : (form?.id ? 'Guardar' : 'Crear promoción')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Toast Feedback */}
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
