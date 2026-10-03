import { useState, useEffect, useCallback, useMemo } from 'react'
import { CalendarDays, Users, Check, X, Trash2, Edit2, Plus, Search, Calendar, Clock, Download, ChevronDown, Phone, Mail, Copy } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import PageHeader from '../../components/ui/PageHeader'
import Badge from '../../components/ui/Badge'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import Toast from '../../components/ui/Toast'
import DatePicker from '../../components/ui/DatePicker'
import TimePicker from '../../components/ui/TimePicker'
import Dropdown from '../../components/ui/Dropdown'
import EmptyState from '../../components/ui/EmptyState'
import StatCard from '../../components/ui/StatCard'
import MetricCardsLayout from '../../components/ui/MetricCardsLayout'
import { getReservations, createReservation, updateReservationStatus, updateReservation, deleteReservation } from '../../api/reservations'
import { getAreas } from '../../api/areas'
import { getConfiguracion } from '../../api/settings'
import { useTheme } from '../../context/ThemeContext'
import echo from '../../echo'

const FILTER_OPTS = ['todas', 'pendiente', 'confirmada', 'rechazada', 'cancelada', 'completada', 'no_asistio']

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30'
]

const EMAIL_REGEX = /^\S+@\S+\.\S+$/
const OPERATING_HOURS_START = '12:00'
const OPERATING_HOURS_END = '23:00'

const formatTimeLabel = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return ''
  const [hStr, mStr] = timeStr.split(':')
  const h = parseInt(hStr, 10)
  const m = mStr || '00'
  const ampm = h >= 12 ? 'p. m.' : 'a. m.'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${m} ${ampm}`
}

const to24Hour = (t) => {
  if (!t || typeof t !== 'string') return null
  const trimmed = t.trim()
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) return trimmed.padStart(5, '0')
  const m = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i)
  if (m) {
    let h = parseInt(m[1], 10)
    const min = m[2] || '00'
    const p = m[3].toUpperCase()
    if (p === 'PM' && h < 12) h += 12
    if (p === 'AM' && h === 12) h = 0
    return `${String(h).padStart(2, '0')}:${min}`
  }
  return trimmed
}

const getEstablishedHours = (dateStr, config) => {
  if (!config) {
    return { start: OPERATING_HOURS_START, end: OPERATING_HOURS_END, closed: false }
  }

  let dateObj = null
  if (dateStr) {
    const parts = String(dateStr).split('T')[0].split('-').map(Number)
    if (parts.length === 3) {
      dateObj = new Date(parts[0], parts[1] - 1, parts[2])
    }
  }

  const dayOfWeek = dateObj ? dateObj.getDay() : null // 0=Dom, 6=Sáb
  const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
  const targetDay = dayOfWeek !== null ? dayNames[dayOfWeek] : null

  // 1. Prioridad principal: horario del día guardado en Ajustes (schedule)
  let scheduleDay = null
  if (Array.isArray(config.schedule) && targetDay) {
    scheduleDay = config.schedule.find(s => {
      const name = (s?.day || s?.dia || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      return name === targetDay.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    })
  }

  const isScheduleInactive = scheduleDay && (
    scheduleDay.active === 0 || scheduleDay.active === false || scheduleDay.is_active === 0
  )

  const cleanSchedStart = to24Hour(scheduleDay?.open)
  const cleanSchedEnd = to24Hour(scheduleDay?.close)

  // Si el schedule encontró el día y está activo, usarlo directamente
  if (scheduleDay && !isScheduleInactive && cleanSchedStart && cleanSchedEnd) {
    return { start: cleanSchedStart, end: cleanSchedEnd, closed: false }
  }

  // Si el schedule lo marca como inactivo, el local está cerrado ese día
  if (isScheduleInactive) {
    return { start: null, end: null, closed: true }
  }

  // 2. Fallback: horario de la sección de reservaciones
  const resSec = typeof config.reservaciones_seccion === 'string'
    ? (() => { try { return JSON.parse(config.reservaciones_seccion) } catch (e) { return {} } })()
    : (config.reservaciones_seccion || {})

  const resHorarios = resSec.horarios || {}
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

  const resStart = isWeekend
    ? (resHorarios.weekend_start || resHorarios.sabadoDomingoInicio || resSec.weekend_start)
    : (resHorarios.weekday_start || resHorarios.lunesViernesInicio || resSec.weekday_start)

  const resEnd = isWeekend
    ? (resHorarios.weekend_end || resHorarios.sabadoDomingoFin || resSec.weekend_end)
    : (resHorarios.weekday_end || resHorarios.lunesViernesFin || resSec.weekday_end)

  const cleanResStart = to24Hour(resStart)
  const cleanResEnd = to24Hour(resEnd)

  if (cleanResStart && cleanResEnd) {
    return { start: cleanResStart, end: cleanResEnd, closed: false }
  }

  // 3. Último fallback: horario mínimo de operación
  return { start: OPERATING_HOURS_START, end: OPERATING_HOURS_END, closed: false }
}

const generateSlots = (startStr, endStr) => {
  if (!startStr || !endStr || typeof startStr !== 'string' || typeof endStr !== 'string') return []
  const [sH, sM] = startStr.split(':').map(Number)
  let [eH, eM] = endStr.split(':').map(Number)
  if (eH < sH) eH += 24
  const slots = []
  let curr = sH * 60 + (sM || 0)
  const end = eH * 60 + (eM || 0)
  while (curr <= end) {
    const h = Math.floor(curr / 60) % 24
    const m = curr % 60
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    curr += 30
  }
  return slots
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'rejected', label: 'Rechazada' },
  { value: 'cancelled', label: 'Cancelada' },
  { value: 'completed', label: 'Completada' },
  { value: 'no_show', label: 'No asistió' },
]

const areaColors = {
  'Terraza':  'bg-sky-500/15 text-sky-400 border border-sky-500/25',
  'Interior': 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30',
  'General':  'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30',
  'Barra':    'bg-orange-500/15 text-orange-400 border border-orange-500/25',
}

const getAreaColor = (areaName) => {
  const key = Object.keys(areaColors).find(k => areaName?.toLowerCase().includes(k.toLowerCase()))
  return key ? areaColors[key] : 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30'
}

const ITEMS_PER_PAGE = 8

export default function Reservations() {
  const { bgCard, bgSubcard, bgInput, borderSubtle, cardShadow, colorPrimario, primaryBtnText, textSubtle, textColor, textMuted, isLight } = useTheme()
  const [reservations, setReservations] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [areas, setAreas] = useState([])
  const [resumen, setResumen] = useState({
    reservas_hoy: 0,
    personas_hoy: 0,
    pendientes_hoy: 0
  })
  const [statusCounts, setStatusCounts] = useState({
    todas: 0,
    pending: 0,
    confirmed: 0,
    rejected: 0,
    cancelled: 0,
    completed: 0,
    no_show: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [selectedFilter, setSelectedFilter] = useState('todas')

  // Filters
  const [search, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Debounce search input (400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedFilter, debouncedSearch, dateFrom, dateTo])

  const totalPages = Math.ceil(reservations.length / ITEMS_PER_PAGE) || 1
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE
  const indexOfFirstItem = (currentPage - 1) * ITEMS_PER_PAGE
  const currentReservations = (Array.isArray(reservations) ? reservations : []).slice(indexOfFirstItem, indexOfLastItem)
  const startItem = reservations.length === 0 ? 0 : indexOfFirstItem + 1
  const endItem = Math.min(indexOfLastItem, reservations.length)

  // Reprogram modal states
  const [reprogramItem, setReprogramItem] = useState(null)
  const [reprogramFecha, setReprogramFecha] = useState('')
  const [reprogramHora, setReprogramHora] = useState('')

  // Mesa assignment modal states (intercepts "Aceptar" button)
  const [asignarMesaItem, setAsignarMesaItem] = useState(null)
  const [asignarMesaSeleccionada, setAsignarMesaSeleccionada] = useState('')
  const [asignarMesaSubmitting, setAsignarMesaSubmitting] = useState(false)

  // Edit / Create modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formCliente, setFormCliente] = useState('')
  const [formTelefono, setFormTelefono] = useState('')
  const [formCorreo, setFormCorreo] = useState('')
  const [formFecha, setFormFecha] = useState('')
  const [formHora, setFormHora] = useState('')
  const [formPersonas, setFormPersonas] = useState('')
  const [formArea, setFormArea] = useState('')
  const [formMesa, setFormMesa] = useState('')
  const [formNotas, setFormNotas] = useState('')
  const [formEstado, setFormEstado] = useState('pending')
  const [formErrors, setFormErrors] = useState({})
  const [submittingForm, setSubmittingForm] = useState(false)

  // Micro-interactions states
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [toast, setToast] = useState(null)
  const [copiedEmail, setCopiedEmail] = useState(null)

  const mapFilterToApi = (opt) => {
    if (opt === 'todas') return null
    if (opt === 'pendiente') return 'pending'
    if (opt === 'confirmada') return 'confirmed'
    if (opt === 'rechazada') return 'rejected'
    if (opt === 'cancelada') return 'cancelled'
    if (opt === 'completada') return 'completed'
    if (opt === 'no_asistio') return 'no_show'
    return opt
  }

  // Fetch reservations from server
  const fetchReservationsData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {}
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim()
      const apiStatus = mapFilterToApi(selectedFilter)
      if (apiStatus) params.estado = apiStatus
      if (dateFrom) {
        params.fecha_inicio = dateFrom
        params.fecha_desde = dateFrom
        params.date_from = dateFrom
        params.fecha = dateFrom
      }
      if (dateTo) {
        params.fecha_fin = dateTo
        params.fecha_hasta = dateTo
        params.date_to = dateTo
      }

      const res = await getReservations(params)
      const data = res?.data

      if (data && typeof data === 'object') {
        const list = Array.isArray(data.reservaciones) ? data.reservaciones : (Array.isArray(data) ? data : [])
        setReservations(list)

        if (data.resumen) {
          setResumen({
            reservas_hoy: data.resumen.reservas_hoy || 0,
            personas_hoy: data.resumen.personas_hoy || 0,
            pendientes_hoy: data.resumen.pendientes_hoy || 0,
          })
        }

        if (data.conteos_por_estado) {
          setStatusCounts({
            todas: data.conteos_por_estado.todas || 0,
            pending: data.conteos_por_estado.pending || 0,
            confirmed: data.conteos_por_estado.confirmed || 0,
            rejected: data.conteos_por_estado.rejected || 0,
            cancelled: data.conteos_por_estado.cancelled || 0,
            completed: data.conteos_por_estado.completed || 0,
            no_show: data.conteos_por_estado.no_show || 0,
          })
        }
      } else {
        setReservations([])
      }
    } catch (err) {
      console.error(err)
      setError('Error al cargar las reservaciones')
      setReservations([])
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, selectedFilter, dateFrom, dateTo])

  const fetchAreasData = async () => {
    try {
      const res = await getAreas()
      const rawAreas = res?.data
      const areaList = Array.isArray(rawAreas) ? rawAreas : (rawAreas?.areas || rawAreas?.data || [])
      setAreas(Array.isArray(areaList) ? areaList : [])
    } catch (err) {
      console.error('Error fetching areas:', err)
      setAreas([])
    }
  }

  const [restaurantSettings, setRestaurantSettings] = useState(null)

  useEffect(() => {
    getConfiguracion()
      .then(res => setRestaurantSettings(res?.data || null))
      .catch(err => console.error('Error fetching settings:', err))
  }, [])

  const reprogramEstablished = useMemo(() => {
    return getEstablishedHours(reprogramFecha, restaurantSettings)
  }, [reprogramFecha, restaurantSettings])

  const reprogramTimeSlots = useMemo(() => {
    if (reprogramEstablished.closed) return []
    return generateSlots(reprogramEstablished.start, reprogramEstablished.end)
  }, [reprogramEstablished])

  const createEstablished = useMemo(() => {
    return getEstablishedHours(formFecha, restaurantSettings)
  }, [formFecha, restaurantSettings])

  const createTimeSlots = useMemo(() => {
    if (createEstablished.closed) return []
    return generateSlots(createEstablished.start, createEstablished.end)
  }, [createEstablished])

  useEffect(() => {
    fetchReservationsData()
    fetchAreasData()
  }, [fetchReservationsData])

  // Suscripción WebSocket en tiempo real a nuevas reservaciones
  useEffect(() => {
    let channel = null
    try {
      if (echo && typeof echo.channel === 'function') {
        channel = echo.channel('reservations')
        const handleNewReservation = () => {
          fetchReservationsData()
        }
        channel.listen('new_reservation_received', handleNewReservation)
        channel.listen('.new_reservation_received', handleNewReservation)
        channel.listen('NewReservationReceived', handleNewReservation)
        channel.listen('.NewReservationReceived', handleNewReservation)
      }
    } catch (e) {
      console.warn('Echo/WebSockets no disponible en Reservaciones:', e)
    }

    return () => {
      try {
        if (channel && typeof echo.leaveChannel === 'function') {
          echo.leaveChannel('reservations')
        }
      } catch (e) {}
    }
  }, [fetchReservationsData])

  // Helper functions for dynamic assigned table list
  const getOccupiedTables = (areaId, date, currentReservationId = null) => {
    if (!areaId || !date) return []
    return (Array.isArray(reservations) ? reservations : [])
      .filter(r => 
        (currentReservationId ? r.id !== currentReservationId : true) &&
        r.area_id === parseInt(areaId) && 
        (r.reservation_date ?? r.date) === date && 
        ['pending', 'confirmed'].includes(r.status) &&
        r.table_number
      )
      .map(r => r.table_number)
  }

  const getAvailableTables = (areaId, date, currentReservationId = null) => {
    if (!areaId) return []
    const selectedArea = (Array.isArray(areas) ? areas : []).find(a => a.id === parseInt(areaId))
    if (!selectedArea) return []
    
    let allTables = []
    if (Array.isArray(selectedArea.tables) && selectedArea.tables.length > 0) {
      allTables = selectedArea.tables.map(t => {
        if (typeof t === 'object') {
          return t.numero_mesa ? `Mesa ${t.numero_mesa}` : t.number ? `Mesa ${t.number}` : `Mesa ${t.id}`
        }
        return String(t).startsWith('Mesa') ? String(t) : `Mesa ${t}`
      })
    } else {
      const tablesCount = selectedArea.tables_count ?? selectedArea.numero_mesas ?? selectedArea.mesas_count ?? 4
      allTables = Array.from({ length: Math.max(1, tablesCount) }, (_, i) => `Mesa ${i + 1}`)
    }
    
    const occupied = getOccupiedTables(areaId, date, currentReservationId)
    return allTables.filter(t => !occupied.includes(t))
  }

  // Same as getAvailableTables but returns objects { value, label, capacity } for rich selects
  const getAvailableTablesWithMeta = (areaId, date, currentReservationId = null) => {
    if (!areaId) return []
    const selectedArea = (Array.isArray(areas) ? areas : []).find(a => a.id === parseInt(areaId))
    if (!selectedArea) return []

    let allTables = []
    if (Array.isArray(selectedArea.tables) && selectedArea.tables.length > 0) {
      allTables = selectedArea.tables.map(t => {
        if (typeof t === 'object') {
          const name = t.numero_mesa ? `Mesa ${t.numero_mesa}` : t.number ? `Mesa ${t.number}` : `Mesa ${t.id}`
          const cap = t.capacidad ?? t.capacity ?? t.cap ?? null
          return { value: name, capacity: cap }
        }
        const name = String(t).startsWith('Mesa') ? String(t) : `Mesa ${t}`
        return { value: name, capacity: null }
      })
    } else {
      const tablesCount = selectedArea.tables_count ?? selectedArea.numero_mesas ?? selectedArea.mesas_count ?? 4
      allTables = Array.from({ length: Math.max(1, tablesCount) }, (_, i) => ({
        value: `Mesa ${i + 1}`,
        capacity: null,
      }))
    }

    const occupied = getOccupiedTables(areaId, date, currentReservationId)
    return allTables.filter(t => !occupied.includes(t.value))
  }

  // Clear assigned table selection if it becomes unavailable due to area/date change
  useEffect(() => {
    if (formArea && formFecha) {
      const available = getAvailableTables(formArea, formFecha, editingItem?.id)
      if (formMesa && !available.includes(formMesa)) {
        setFormMesa('')
      }
    } else if (!formArea) {
      setFormMesa('')
    }
  }, [formArea, formFecha, formMesa, editingItem])

  const areaDropdownOptions = useMemo(() => {
    const list = Array.isArray(areas) ? areas : []
    return list.map(a => ({
      value: a.id.toString(),
      label: `${a.name || a.nombre} (Capacidad: ${a.capacity || a.capacidad_personas})`
    }))
  }, [areas])

  const availableTables = useMemo(() => {
    return formArea ? getAvailableTables(formArea, formFecha, editingItem?.id) : []
  }, [formArea, formFecha, editingItem, areas, reservations])

  const tableDropdownOptions = useMemo(() => {
    return availableTables.map(t => ({
      value: t,
      label: t
    }))
  }, [availableTables])

  const validateField = (field, value) => {
    const today = new Date().toISOString().split('T')[0]
    switch (field) {
      case 'cliente': {
        const trimmed = (value || '').trim()
        if (!trimmed) return 'El nombre del cliente es obligatorio'
        if (trimmed.length < 3) return 'El nombre debe tener al menos 3 caracteres'
        return null
      }
      case 'telefono': {
        const clean = (value || '').replace(/\D/g, '')
        if (!clean) return 'El teléfono es obligatorio'
        if (clean.length !== 10) return 'El teléfono debe tener exactamente 10 dígitos'
        return null
      }
      case 'correo': {
        const trimmed = (value || '').trim()
        if (trimmed && !EMAIL_REGEX.test(trimmed)) {
          return 'Ingresa un correo electrónico válido'
        }
        return null
      }
      case 'personas': {
        const num = parseInt(value, 10)
        if (!value || isNaN(num) || num < 1) {
          return 'El número de personas debe ser al menos 1'
        }
        return null
      }
      case 'fecha': {
        if (!value) return 'La fecha es obligatoria'
        if (value < today) return 'La fecha no puede ser anterior a hoy'
        return null
      }
      case 'hora': {
        if (!value) return 'La hora es obligatoria'
        if (createEstablished.closed) return 'El restaurante se encuentra cerrado en esta fecha'
        if (createTimeSlots.length > 0 && !createTimeSlots.includes(value)) {
          return `La hora debe estar dentro del horario establecido (${formatTimeLabel(createEstablished.start)} – ${formatTimeLabel(createEstablished.end)})`
        }
        return null
      }
      case 'area': {
        if (!value) return 'Debes seleccionar un área'
        return null
      }
      case 'mesa': {
        if (!value) return 'Debes asignar una mesa'
        return null
      }
      case 'estado': {
        if (!value) return 'El estado es obligatorio'
        return null
      }
      default:
        return null
    }
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const isSubmitDisabled = (
    !formCliente.trim() ||
    formCliente.trim().length < 3 ||
    formTelefono.replace(/\D/g, '').length !== 10 ||
    !formFecha ||
    formFecha < todayStr ||
    !formHora ||
    createEstablished.closed ||
    (createTimeSlots.length > 0 && !createTimeSlots.includes(formHora)) ||
    !formArea ||
    !formMesa ||
    !formEstado ||
    (formCorreo.trim() && !EMAIL_REGEX.test(formCorreo.trim()))
  )

  const getCountForFilter = (opt) => {
    const apiStatus = mapFilterToApi(opt)
    if (!apiStatus) return statusCounts.todas || 0
    return statusCounts[apiStatus] || 0
  }

  const handleUpdateStatus = async (id, nextStatus) => {
    try {
      const res = await updateReservationStatus(id, nextStatus)
      const updated = res?.data
      if (updated && updated.id) {
        setReservations(prev => (Array.isArray(prev) ? prev : []).map(r => r.id === id ? updated : r))
      }
      fetchReservationsData()
      setToast({ message: 'Estado de reservación actualizado', type: 'success' })
    } catch (err) {
      console.error(err)
      const msg = err.response?.data?.message || 'Error al actualizar estado'
      setToast({ message: msg, type: 'error' })
    }
  }

  // Confirms a reservation while assigning a table in one step
  const handleConfirmarConMesa = async () => {
    if (!asignarMesaItem) return
    setAsignarMesaSubmitting(true)
    try {
      // First update status to confirmed
      const statusRes = await updateReservationStatus(asignarMesaItem.id, 'confirmed')
      const updated = statusRes?.data

      // Then patch table assignment if a mesa was selected
      if (asignarMesaSeleccionada) {
        await updateReservation(asignarMesaItem.id, {
          table_number: asignarMesaSeleccionada,
          mesa: asignarMesaSeleccionada,
        })
      }

      fetchReservationsData()
      setToast({ message: `Reservación confirmada${asignarMesaSeleccionada ? ` — ${asignarMesaSeleccionada} asignada` : ''}`, type: 'success' })
      setAsignarMesaItem(null)
      setAsignarMesaSeleccionada('')
    } catch (err) {
      console.error(err)
      const msg = err.response?.data?.message || 'Error al confirmar la reservación'
      setToast({ message: msg, type: 'error' })
    } finally {
      setAsignarMesaSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteReservation(id)
      setConfirmDelete(null)
      setReservations(prev => (Array.isArray(prev) ? prev.filter(r => r.id !== id) : []))
      fetchReservationsData()
      setToast({ message: 'Reservación eliminada correctamente', type: 'success' })
    } catch (err) {
      console.error(err)
      const msg = err.response?.data?.message || 'Error al eliminar la reservación'
      setToast({ message: msg, type: 'error' })
    }
  }

  const handleOpenReprogram = (item) => {
    setReprogramItem(item)
    const resDate = String(item.reservation_date ?? item.date ?? '')
    const resDateOnly = resDate.includes('T') ? resDate.split('T')[0] : resDate
    setReprogramFecha(resDateOnly)
    const resTime = String(item.reservation_time ?? item.time ?? '')
    setReprogramHora(resTime.slice(0, 5))
  }

  const handleReprogramSubmit = async (e) => {
    e.preventDefault()
    if (!reprogramFecha || !reprogramHora) {
      setToast({ message: 'Por favor, selecciona fecha y hora', type: 'error' })
      return
    }

    if (reprogramEstablished.closed) {
      setToast({ message: 'El restaurante se encuentra cerrado en la fecha seleccionada', type: 'error' })
      return
    }

    if (reprogramTimeSlots.length > 0 && !reprogramTimeSlots.includes(reprogramHora)) {
      setToast({
        message: `La hora debe estar dentro del horario establecido (${formatTimeLabel(reprogramEstablished.start)} – ${formatTimeLabel(reprogramEstablished.end)})`,
        type: 'error'
      })
      return
    }

    try {
      const res = await updateReservation(reprogramItem.id, {
        reservation_date: reprogramFecha,
        reservation_time: reprogramHora,
      })
      const updated = res?.data
      if (updated && updated.id) {
        setReservations(prev => (Array.isArray(prev) ? prev : []).map(r => r.id === reprogramItem.id ? updated : r))
      }
      setReprogramItem(null)
      fetchReservationsData()
      setToast({ message: 'Reservación reprogramada exitosamente', type: 'success' })
    } catch (err) {
      console.error(err)
      const msg = err.response?.data?.message || 'Error al reprogramar la reservación'
      setToast({ message: msg, type: 'error' })
    }
  }

  const handleOpenCreate = () => {
    const today = new Date().toISOString().split('T')[0]
    setEditingItem(null)
    setFormCliente('')
    setFormTelefono('')
    setFormCorreo('')
    setFormFecha(today)
    setFormHora('13:00')
    setFormPersonas('2')
    setFormArea('')
    setFormMesa('')
    setFormNotas('')
    setFormEstado('pending')
    setFormErrors({})
    setIsModalOpen(true)
  }

  const handleOpenEdit = (item) => {
    setEditingItem(item)
    setFormCliente(item.customer_name ?? item.name ?? '')
    setFormTelefono(item.customer_phone ?? item.phone ?? '')
    setFormCorreo(item.customer_email ?? item.email ?? '')
    setFormFecha(String(item.reservation_date ?? item.date ?? '').split('T')[0])
    setFormHora((item.reservation_time ?? item.time ?? '').slice(0, 5))
    setFormPersonas((item.guests_count ?? item.guests ?? '').toString())
    setFormArea(item.area_id ? item.area_id.toString() : '')
    setFormMesa(item.table_number ?? item.tableNumber ?? '')
    setFormNotas(item.special_requests ?? item.notes ?? '')
    setFormEstado(item.status ?? 'pending')
    setFormErrors({})
    setIsModalOpen(true)
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    
    const trimmedCliente = formCliente.trim()
    const cleanTelefono = formTelefono.replace(/\D/g, '')
    const trimmedCorreo = formCorreo.trim()
    const trimmedNotas = formNotas.trim()

    const errors = {
      cliente: validateField('cliente', trimmedCliente),
      telefono: validateField('telefono', cleanTelefono),
      correo: validateField('correo', trimmedCorreo),
      personas: validateField('personas', formPersonas),
      fecha: validateField('fecha', formFecha),
      hora: validateField('hora', formHora),
      area: validateField('area', formArea),
      mesa: validateField('mesa', formMesa),
      estado: validateField('estado', formEstado),
    }

    const activeErrors = Object.fromEntries(
      Object.entries(errors).filter(([_, err]) => Boolean(err))
    )

    if (Object.keys(activeErrors).length > 0) {
      setFormErrors(activeErrors)
      const firstErrorMsg = Object.values(activeErrors)[0]
      setToast({ message: firstErrorMsg, type: 'error' })
      return
    }

    setFormErrors({})
    setSubmittingForm(true)

    const payload = {
      customer_name: trimmedCliente,
      customer_phone: cleanTelefono,
      customer_email: trimmedCorreo || null,
      reservation_date: formFecha,
      reservation_time: formHora,
      guests_count: parseInt(formPersonas, 10),
      area_id: parseInt(formArea, 10),
      table_number: formMesa,
      special_requests: trimmedNotas ? trimmedNotas.slice(0, 250) : null,
      status: formEstado,
    }

    try {
      if (editingItem) {
        const res = await updateReservation(editingItem.id, payload)
        const updated = res?.data
        if (updated && updated.id) {
          setReservations(prev => (Array.isArray(prev) ? prev : []).map(r => r.id === editingItem.id ? updated : r))
        }
        setToast({ message: 'Reservación actualizada exitosamente', type: 'success' })
      } else {
        const res = await createReservation(payload)
        const newRes = res?.data
        if (newRes && newRes.id) {
          setReservations(prev => [newRes, ...(Array.isArray(prev) ? prev : [])])
        }
        setToast({ message: 'Reservación creada exitosamente', type: 'success' })
      }
      setIsModalOpen(false)
      fetchReservationsData()
    } catch (err) {
      console.error(err)
      const serverMsg = err.response?.data?.message
      const validationErrors = err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(', ') : null
      const msg = serverMsg || validationErrors || 'Error al guardar la reservación'
      setToast({ message: msg, type: 'error' })
    } finally {
      setSubmittingForm(false)
    }
  }

  const hasResData = Array.isArray(reservations) && reservations.length > 0

  const exportToExcel = () => {
    if (!hasResData) {
      setToast({ message: 'No hay datos disponibles para exportar', type: 'error' })
      return
    }

    const data = reservations.map(res => {
      const displayStatus = statusMapToDisplay(res.status)
      const areaName = (typeof res.area === 'string' && res.area.trim()) ? res.area.trim() : (res.area?.name || res.area_name || (res.area_id && areas.find(a => a.id === Number(res.area_id))?.name) || 'General')
      
      const clientName = res.customer_name ?? 'Anon'
      const clientPhone = res.customer_phone ?? '—'
      const clientEmail = res.customer_email ?? '—'
      const resDate = res.reservation_date ?? ''
      const resTime = res.reservation_time ?? ''
      const guestsCount = res.guests_count ?? 0
      const notes = res.special_requests || ''
      
      return {
        'Folio':         res.folio || `RES-${String(res.id).padStart(4, '0')}`,
        'Cliente':       clientName,
        'Teléfono':      clientPhone,
        'Correo':        clientEmail,
        'Fecha':         resDate,
        'Hora':          resTime ? `${resTime.slice(0, 5)} hrs` : '--:--',
        'Personas':      guestsCount,
        'Área':          areaName,
        'Notas':         notes,
        'Estado':        displayStatus ? displayStatus.toUpperCase() : '',
      }
    })

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Reservaciones')

    const fileName = `reservaciones_aurum_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  const exportToCSV = () => {
    if (!hasResData) {
      setToast({ message: 'No hay datos disponibles para exportar', type: 'error' })
      return
    }

    const headers = ['Folio', 'Cliente', 'Teléfono', 'Correo', 'Fecha', 'Hora', 'Personas', 'Área', 'Notas', 'Estado']
    const rows = reservations.map(res => {
      const displayStatus = statusMapToDisplay(res.status)
      const areaName = (typeof res.area === 'string' && res.area.trim()) ? res.area.trim() : (res.area?.name || res.area_name || (res.area_id && areas.find(a => a.id === Number(res.area_id))?.name) || 'General')
      
      const clientName = res.customer_name ?? 'Anon'
      const clientPhone = res.customer_phone ?? '—'
      const clientEmail = res.customer_email ?? '—'
      const resDate = res.reservation_date ?? ''
      const resTime = res.reservation_time ?? ''
      const guestsCount = res.guests_count ?? 0
      const notes = res.special_requests || ''
      
      return [
        res.folio || `RES-${String(res.id).padStart(4, '0')}`,
        clientName,
        clientPhone,
        clientEmail,
        resDate,
        resTime ? `${resTime.slice(0, 5)} hrs` : '--:--',
        guestsCount,
        areaName,
        notes,
        displayStatus ? displayStatus.toUpperCase() : ''
      ]
    })

    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.setAttribute("download", `reservaciones_aurum_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToPDF = () => {
    if (!hasResData) {
      setToast({ message: 'No hay datos disponibles para exportar', type: 'error' })
      return
    }

    try {
      const doc = new jsPDF()

      doc.setFontSize(16)
      doc.text('Listado de Reservaciones - Aurum', 14, 15)

      doc.setFontSize(10)
      doc.text(`Fecha de exportación: ${new Date().toLocaleString('es-MX')}`, 14, 22)

      const tableColumn = ['Folio', 'Cliente', 'Teléfono', 'Fecha/Hora', 'Personas', 'Área', 'Estado']
      const tableRows = reservations.map(r => [
        r.folio || `RES-${String(r.id).padStart(4, '0')}`,
        r.customer_name || 'Anon',
        r.customer_phone || '—',
        `${r.reservation_date || ''} ${r.reservation_time ? r.reservation_time.slice(0, 5) : ''}`,
        r.guests_count || 0,
        (typeof r.area === 'string' && r.area.trim()) ? r.area.trim() : (r.area_name || r.area?.name || (r.area_id && areas.find(a => a.id === Number(r.area_id))?.name) || 'General'),
        statusMapToDisplay(r.status).toUpperCase()
      ])

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 28,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [180, 83, 9] }
      })

      doc.save(`reservaciones_aurum_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (err) {
      console.error('Error generating PDF:', err)
      window.print()
    }
  }

  const statusMapToDisplay = (st) => {
    if (st === 'pending') return 'pendiente'
    if (st === 'confirmed') return 'confirmada'
    if (st === 'rejected') return 'rechazada'
    if (st === 'cancelled') return 'cancelada'
    if (st === 'completed') return 'completada'
    if (st === 'no_show') return 'no_asistio'
    return st
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr + 'T00:00:00')
    if (isNaN(d.getTime())) return dateStr
    const formatted = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
    return formatted.charAt(0).toUpperCase() + formatted.slice(1)
  }

  const formatPhoneNumber = (phone) => {
    if (!phone || phone === '—' || phone === '-') return '—'
    const cleaned = ('' + phone).replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`
    }
    return phone
  }

  const formatTime = (t) => t ? t.slice(0, 5) : '--:--'

  const getAvatarColorClass = (name) => {
    const letter = name[0]?.toUpperCase() ?? 'A'
    if ('A-D'.includes(letter) || 'AD'.indexOf(letter) !== -1) return 'bg-blue-500/20 text-blue-400 border border-blue-500/20'
    if ('E-H'.includes(letter) || 'EH'.indexOf(letter) !== -1) return 'bg-green-500/20 text-green-400 border border-green-500/20'
    if ('I-L'.includes(letter) || 'IL'.indexOf(letter) !== -1) return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20'
    if ('M-P'.includes(letter) || 'MP'.indexOf(letter) !== -1) return 'bg-brand-600/20 text-brand-400 border border-brand-500/20'
    if ('Q-T'.includes(letter) || 'QT'.indexOf(letter) !== -1) return 'bg-pink-500/20 text-pink-400 border border-pink-500/20'
    return 'bg-orange-500/20 text-orange-400 border border-orange-500/20'
  }

  const handleCopyEmail = (email) => {
    if (!email) return
    const onDone = () => {
      setCopiedEmail(email)
      setToast({ message: `Correo copiado: ${email}`, type: 'success' })
      setTimeout(() => setCopiedEmail(null), 2000)
    }

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(email)
        .then(onDone)
        .catch(() => {
          fallbackCopyText(email)
          onDone()
        })
    } else {
      fallbackCopyText(email)
      onDone()
    }
  }

  const fallbackCopyText = (text) => {
    const el = document.createElement('textarea')
    el.value = text
    el.setAttribute('readonly', '')
    el.style.position = 'absolute'
    el.style.left = '-9999px'
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
  }

    return (
      <div className="space-y-6 p-4 md:p-6 lg:p-8 pb-24 animate-fadeIn font-sans">
      <PageHeader 
        title="Reservaciones" 
        description="Gestiona la asignación de mesas, control de aforo y solicitudes especiales."
        action={
          <button
            onClick={handleOpenCreate}
            className="bg-brand-600 hover:bg-brand-700 text-theme-text font-semibold px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer shadow-lg shadow-brand-600/35 flex items-center gap-2 text-sm shrink-0 border border-brand-500/20"
          >
            <Plus size={16} />
            <span>Nueva Reservación</span>
          </button>
        }
      />

      {/* Tarjetas Resumen */}
      <div className="rounded-2xl p-6 transition-colors duration-200 overflow-hidden" style={{ backgroundColor: bgCard, border: `1px solid ${borderSubtle}`, boxShadow: cardShadow }}>
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
                  title="Total Reservaciones"
                  value={resumen.reservas_hoy || statusCounts.todas || reservations.length || 0}
                  subtitle="Registradas en el sistema"
                  icon={CalendarDays}
                  color="blue"
                />
              </div>
              <div className="flex-1 min-w-[280px] md:min-w-[320px] xl:min-w-0 snap-center">
                <StatCard
                  title="Pendientes"
                  value={resumen.pendientes_hoy || statusCounts.pendiente || 0}
                  subtitle="Por confirmar asistencia"
                  icon={Clock}
                  color="yellow"
                />
              </div>
              <div className="flex-1 min-w-[280px] md:min-w-[320px] xl:min-w-0 snap-center">
                <StatCard
                  title="Confirmadas"
                  value={statusCounts.confirmada || statusCounts.confirmadas || 0}
                  subtitle="Mesa reservada activa"
                  icon={Check}
                  color="green"
                />
              </div>
              <div className="flex-1 min-w-[280px] md:min-w-[320px] xl:min-w-0 snap-center">
                <StatCard
                  title="Canceladas"
                  value={statusCounts.cancelada || statusCounts.canceladas || 0}
                  subtitle="Canceladas o rechazadas"
                  icon={X}
                  color="red"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Seccion Principal de Reservaciones en Un Solo Contenedor Nivel 1 (bg-theme-surface) */}
      <div className="rounded-2xl p-6 max-md:p-3 border transition-colors duration-200 space-y-5 max-md:space-y-3" style={{ backgroundColor: 'var(--theme-surface)', borderColor: borderSubtle, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        
        {/* Encabezado con Título y Botones de Exportación compactos a la altura del título */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-md:gap-3">
          <div>
            <h2 className="text-sm font-extrabold text-theme-text tracking-wide uppercase">LISTADO DE RESERVACIONES</h2>
            <p className="text-theme-text-muted text-[10px] mt-0.5 font-bold uppercase tracking-wider">REGISTROS FILTRADOS</p>
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

        {/* Buscador de reservaciones */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Buscar por cliente, teléfono o folio..."
            className="w-full bg-theme-input border border-theme-border-subtle rounded-2xl pl-10 pr-10 py-2.5 text-xs text-theme-text placeholder:text-theme-text-muted outline-none focus:border-brand-500/40 transition-colors"
          />
          {search && (
            <button 
              onClick={() => { setSearchInput(''); setDebouncedSearch('') }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text-muted hover:text-white/50 transition-colors cursor-pointer"
            >
              <X size={14}/>
            </button>
          )}
        </div>

        {/* Contenedor de Filtros: Pasa a flex-col en pantallas max-xl para proteger los bordes */}
        <div className="flex justify-between items-center max-xl:flex-col max-xl:items-start gap-4 max-md:gap-3 mb-6 max-md:mb-3 w-full">
          
          {/* Bloque Izquierdo: Botones de estado */}
          <div className="flex flex-wrap max-md:flex-nowrap max-md:overflow-x-auto max-md:pb-3 hide-scrollbar items-center gap-2 pb-2 w-full">
            {FILTER_OPTS.map(option => {
              const isActive = selectedFilter === option
              const rawLabel = option === 'todas' ? 'Todas' : option === 'no_asistio' ? 'No asistió' : option
              const label = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1)
              return (
                <button 
                  key={option} 
                  onClick={() => setSelectedFilter(option)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isActive 
                      ? 'bg-[var(--theme-primary)] text-white shadow-sm' 
                      : 'bg-[var(--theme-primary)]/10 hover:bg-[var(--theme-primary)]/20 text-[var(--theme-primary)]'
                  }`}
                >
                  <span>{label}</span>
                  <span className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                    isActive 
                      ? 'bg-white/25 text-white' 
                      : 'bg-[var(--theme-primary)]/20 text-[var(--theme-primary)]'
                  }`}>
                    {getCountForFilter(option)}
                  </span>
                </button>
              )
            })}
          </div>

          {/* 2. Rango de Fechas (Inicio y Fin) */}
          <div className="flex max-md:flex-col gap-3 max-md:gap-2 max-md:w-full shrink-0">
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
            />
            {(dateFrom || dateTo) && (
              <button 
                onClick={() => { setDateFrom(''); setDateTo('') }}
                className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-red-500 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all cursor-pointer whitespace-nowrap"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-500/5 border border-red-500/10 text-red-400 text-sm px-4 py-3 rounded-xl text-center font-medium animate-fadeIn">
            {error}
          </div>
        )}

        {loading ? (
            <div className="space-y-2.5">
              <div className="animate-shimmer rounded-lg h-12 w-full" />
              <div className="animate-shimmer rounded-lg h-12 w-full" />
              <div className="animate-shimmer rounded-lg h-12 w-full" />
            </div>
          ) : (
              <div className="overflow-x-auto w-full">
                <Table 
                  className="min-w-[800px]"
                  bg="transparent" 
                  shadow="shadow-lg"
              headers={[
                { label: 'Folio', align: 'left' },
                { label: 'Cliente', align: 'left' },
                { label: 'Teléfono', align: 'left' },
                { label: 'Fecha / Hora', align: 'left' },
                { label: 'Personas', align: 'center' },
                { label: 'Área', align: 'left' },
                { label: 'Notas', align: 'left' },
                { label: 'Estado', align: 'center' },
                { label: 'Acciones', align: 'center' }
              ]}
            >
              {currentReservations.map((res, index) => {
                if (!res) return null
                const displayStatus = statusMapToDisplay(res.status)
                const areaName = (typeof res.area === 'string' && res.area.trim()) ? res.area.trim() : (res.area?.name || res.area_name || (res.area_id && areas.find(a => a.id === Number(res.area_id))?.name) || 'General')
                const delayClass = `delay-${Math.min(index + 1, 5)}`
                
                const clientName = res.customer_name ?? 'Anon'
                const clientPhone = res.customer_phone ?? '—'
                const clientEmail = res.customer_email ?? res.email ?? res.correo ?? ''
                const resDate = res.reservation_date ?? ''
                const resTime = res.reservation_time ?? ''
                const guestsCount = res.guests_count ?? 0
                
                const initials = clientName.slice(0, 2).toUpperCase()
                const resNotes = res.special_requests || ''
                return (
                  <tr 
                    key={res.id} 
                    className={`h-16 border-b transition-colors duration-150 animate-fadeInUp bg-transparent ${delayClass}`}
                    style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border, #CBD5E1)' }}
                  >
                    <td className="px-4 py-3 text-sm font-mono font-bold tracking-[1px] whitespace-nowrap" style={{ color: colorPrimario || 'var(--theme-primary)' }}>
                      {res.folio ? String(res.folio).replace(/-/g, '') : `RES${String(res.id).padStart(4, '0')}`}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-full text-xs flex items-center justify-center font-bold shrink-0 ${getAvatarColorClass(clientName)}`}>
                          {initials}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-theme-text truncate leading-tight" title={clientName}>
                            {clientName}
                          </span>
                          {clientEmail && clientEmail !== '—' && clientEmail !== '-' ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCopyEmail(clientEmail)
                              }}
                              className="group inline-flex items-center gap-1 text-xs text-theme-text-muted hover:text-[var(--theme-primary)] transition-colors cursor-pointer text-left truncate mt-0.5"
                              title="Clic para copiar correo"
                            >
                              <span className="truncate max-w-[180px]">{clientEmail}</span>
                              {copiedEmail === clientEmail ? (
                                <span className="inline-flex items-center text-[10px] font-bold text-emerald-500 gap-0.5 shrink-0">
                                  <Check size={11} className="shrink-0" />
                                  <span>Copiado</span>
                                </span>
                              ) : (
                                <Copy size={11} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-theme-text-muted hover:text-[var(--theme-primary)]" />
                              )}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">
                      {clientPhone && clientPhone !== '—' && clientPhone !== '-' ? (
                        <a 
                          href={`tel:${clientPhone}`} 
                          className="text-theme-text hover:text-[var(--theme-primary)] transition-colors"
                          title="Llamar al cliente"
                        >
                          {formatPhoneNumber(clientPhone)}
                        </a>
                      ) : (
                        <span className="text-theme-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <div className="font-semibold text-theme-text">{formatDate(resDate)}</div>
                      <div className="text-xs text-theme-text-muted">{formatTime(resTime)} hs</div>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-theme-input border border-theme-border-subtle text-theme-text text-xs">
                        <Users size={12} style={{ color: colorPrimario || 'var(--theme-primary)' }} />
                        <span>{guestsCount}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <div className="flex flex-col items-start">
                        <span className="font-semibold text-theme-text">
                          {areaName}
                        </span>
                        {res.table_number && (
                          <span className="text-xs text-theme-text-muted">
                            {String(res.table_number).startsWith('Mesa') ? res.table_number : `Mesa ${res.table_number}`}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs max-w-[140px] relative text-theme-text-muted">
                      {resNotes ? (
                        <div className="relative group/note">
                          <span className="text-xs truncate max-w-[120px] block cursor-help underline decoration-dotted opacity-80 hover:opacity-100 transition-opacity">
                            {resNotes}
                          </span>
                          <div 
                            style={{ 
                              backgroundColor: 'var(--theme-primary)', 
                              color: 'var(--theme-primary-contrast, #ffffff)' 
                            }}
                            className="absolute bottom-full left-0 mb-2 w-56 rounded-xl px-3.5 py-2.5 text-xs font-medium leading-relaxed shadow-2xl opacity-0 group-hover/note:opacity-100 transition-opacity duration-200 pointer-events-none z-30 font-sans border border-black/10 dark:border-white/10"
                          >
                            {resNotes}
                            <div 
                              style={{ backgroundColor: 'var(--theme-primary)' }}
                              className="absolute top-full left-4 w-2 h-2 rotate-45 -mt-1 border-r border-b border-black/10 dark:border-white/10" 
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-theme-text-muted/60">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-center whitespace-nowrap">
                      <Badge status={displayStatus} />
                    </td>
                    <td className="px-3 py-3 text-sm w-[160px]">
                      <div className="flex items-center justify-center gap-1 flex-nowrap">
                        {/* 1. PENDIENTE: Solo opciones de Aceptar y Cancelar */}
                        {res.status === 'pending' && (
                          <>
                            <button
                              onClick={() => {
                                setAsignarMesaItem(res)
                                setAsignarMesaSeleccionada('')
                              }}
                              className="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 rounded-lg px-2 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1 shrink-0 active:scale-95"
                              title="Aceptar reservación"
                            >
                              <Check size={12} className="text-emerald-700 dark:text-emerald-300 shrink-0" />
                              <span>Aceptar</span>
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(res.id, 'cancelled')}
                              className="bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/20 dark:hover:bg-rose-500/30 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40 rounded-lg px-2 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1 shrink-0 active:scale-95"
                              title="Cancelar reservación"
                            >
                              <X size={12} className="text-rose-700 dark:text-rose-300 shrink-0" />
                              <span>Cancelar</span>
                            </button>
                          </>
                        )}

                        {/* 2. CONFIRMADA (ACEPTADA): Opciones de Reprogramar y Editar */}
                        {res.status === 'confirmed' && (
                          <>
                            <button
                              onClick={() => handleOpenReprogram(res)}
                              className="bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/20 dark:hover:bg-blue-500/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-500/40 rounded-lg px-2 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1 shrink-0 active:scale-95"
                              title="Reprogramar fecha / hora"
                            >
                              <Clock size={12} className="text-blue-700 dark:text-blue-300 shrink-0" />
                              <span>Reprogramar</span>
                            </button>
                            <button
                              onClick={() => handleOpenEdit(res)}
                              className="bg-purple-50 hover:bg-purple-100 dark:bg-purple-500/20 dark:hover:bg-purple-500/30 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-500/40 rounded-lg px-2 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1 shrink-0 active:scale-95"
                              title="Editar reservación"
                            >
                              <Edit2 size={12} className="text-purple-700 dark:text-purple-300 shrink-0" />
                              <span>Editar</span>
                            </button>
                          </>
                        )}

                        {/* 3. OTROS ESTADOS (completada, cancelada, rechazada, no asistió): Editar y opcional eliminar */}
                        {!['pending', 'confirmed'].includes(res.status) && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(res)}
                              className="bg-purple-50 hover:bg-purple-100 dark:bg-purple-500/20 dark:hover:bg-purple-500/30 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-500/40 rounded-lg px-2 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1 shrink-0 active:scale-95"
                              title="Editar detalles"
                            >
                              <Edit2 size={12} className="text-purple-700 dark:text-purple-300 shrink-0" />
                              <span>Editar</span>
                            </button>
                            {confirmDelete === res.id ? (
                              <button
                                onClick={() => handleDelete(res.id)}
                                className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg px-2 py-1.5 text-xs font-bold hover:bg-red-500/30 transition-all cursor-pointer shrink-0"
                              >
                                ¿Eliminar?
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setConfirmDelete(res.id)
                                  setTimeout(() => {
                                    setConfirmDelete(prev => prev === res.id ? null : prev)
                                  }, 3000)
                                }}
                                className="bg-theme-input hover:bg-red-600/20 text-theme-text-muted hover:text-red-400 border border-theme-border-subtle hover:border-red-500/30 rounded-lg p-1.5 text-xs transition-all cursor-pointer shrink-0"
                                title="Eliminar registro"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {currentReservations.length > 0 && Array.from({ length: ITEMS_PER_PAGE - currentReservations.length }).map((_, i) => (
                <tr key={`empty-${i}`} className="h-16 border-b border-transparent bg-transparent" style={{ backgroundColor: 'var(--theme-surface)' }}>
                  <td colSpan="9"></td>
                </tr>
              ))}
              {(!Array.isArray(reservations) || reservations.length === 0) && (
                <tr style={{ backgroundColor: 'var(--theme-surface)' }}>
                  <td colSpan="9" className="p-0 border-none relative" style={{ backgroundColor: 'var(--theme-surface)' }}>
                    <div className="h-[32rem] sticky left-0 w-full flex items-center justify-center" style={{ backgroundColor: 'var(--theme-surface)' }}>
                      <EmptyState
                        title="No se encontraron reservaciones"
                        description="Prueba ajustando los filtros de búsqueda o agrega una nueva reservación manual."
                        iconType="reservations"
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
                Mostrando {startItem} a {endItem} de {reservations.length} reservaciones
              </div>

              {/* Lado derecho: Controles */}
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1 || reservations.length === 0}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5"
                  style={currentPage > 1 && reservations.length > 0 ? {
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
                  {reservations.length === 0 ? 1 : currentPage} / {totalPages}
                </div>

                <button 
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage >= totalPages || reservations.length === 0}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5"
                  style={currentPage < totalPages && reservations.length > 0 ? {
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

      {/* Manual Creation / Edit Modal */}
      {isModalOpen && (
        <Modal
          title={editingItem ? `Editar Reservación — ${editingItem.folio || `#${editingItem.id}`}` : "Nueva Reservación"}
          onClose={() => setIsModalOpen(false)}
        >
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Cliente (client_name) - Obligatorio, trim, min 3 chars */}
              <div>
                <label className="block text-xs font-semibold tracking-wider mb-1.5 uppercase" style={{ color: textMuted }}>
                  Cliente *
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="Nombre del cliente"
                  value={formCliente} 
                  onChange={(e) => {
                    setFormCliente(e.target.value)
                    if (formErrors.cliente) setFormErrors(prev => ({ ...prev, cliente: null }))
                  }}
                  onBlur={() => {
                    const trimmed = formCliente.trim()
                    setFormCliente(trimmed)
                    const err = validateField('cliente', trimmed)
                    if (err) setFormErrors(prev => ({ ...prev, cliente: err }))
                  }}
                  style={{ backgroundColor: bgSubcard, borderColor: formErrors.cliente ? '#ef4444' : borderSubtle, color: textColor }}
                  className={`input-subcard bg-slate-100 dark:bg-white/5 border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all duration-200 w-full h-11 font-medium placeholder:opacity-40 ${
                    formErrors.cliente ? '!border-rose-500 ring-1 ring-rose-500/20' : 'border-gray-200 dark:border-white/10 focus:border-brand-500/50'
                  }`}
                />
                {formErrors.cliente && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.cliente}</p>
                )}
              </div>

              {/* 2. Teléfono (phone) - Obligatorio, solo dígitos, exactamente 10 */}
              <div>
                <label className="block text-xs font-semibold tracking-wider mb-1.5 uppercase" style={{ color: textMuted }}>
                  Teléfono * (10 dígitos)
                </label>
                <input 
                  type="tel" 
                  required
                  maxLength={10}
                  placeholder="Ej. 5512345678"
                  value={formTelefono} 
                  onChange={(e) => {
                    const onlyDigits = e.target.value.replace(/\D/g, '').slice(0, 10)
                    setFormTelefono(onlyDigits)
                    if (formErrors.telefono) setFormErrors(prev => ({ ...prev, telefono: null }))
                  }}
                  onBlur={() => {
                    const err = validateField('telefono', formTelefono)
                    if (err) setFormErrors(prev => ({ ...prev, telefono: err }))
                  }}
                  style={{ backgroundColor: bgSubcard, borderColor: formErrors.telefono ? '#ef4444' : borderSubtle, color: textColor }}
                  className={`input-subcard bg-slate-100 dark:bg-white/5 border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all duration-200 w-full h-11 font-medium placeholder:opacity-40 ${
                    formErrors.telefono ? '!border-rose-500 ring-1 ring-rose-500/20' : 'border-gray-200 dark:border-white/10 focus:border-brand-500/50'
                  }`}
                />
                {formErrors.telefono && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.telefono}</p>
                )}
              </div>

              {/* 3. Correo (email) - Opcional, regex si se ingresa */}
              <div>
                <label className="block text-xs font-semibold tracking-wider mb-1.5 uppercase" style={{ color: textMuted }}>
                  Correo (Opcional)
                </label>
                <input 
                  type="email" 
                  placeholder="correo@ejemplo.com"
                  value={formCorreo} 
                  onChange={(e) => {
                    setFormCorreo(e.target.value)
                    if (formErrors.correo) setFormErrors(prev => ({ ...prev, correo: null }))
                  }}
                  onBlur={() => {
                    const trimmed = formCorreo.trim()
                    setFormCorreo(trimmed)
                    const err = validateField('correo', trimmed)
                    if (err) setFormErrors(prev => ({ ...prev, correo: err }))
                  }}
                  style={{ backgroundColor: bgSubcard, borderColor: formErrors.correo ? '#ef4444' : borderSubtle, color: textColor }}
                  className={`input-subcard bg-slate-100 dark:bg-white/5 border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all duration-200 w-full h-11 font-medium placeholder:opacity-40 ${
                    formErrors.correo ? '!border-rose-500 ring-1 ring-rose-500/20' : 'border-gray-200 dark:border-white/10 focus:border-brand-500/50'
                  }`}
                />
                {formErrors.correo && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.correo}</p>
                )}
              </div>

              {/* 4. Personas (people_count) - Obligatorio, type number, min 1 */}
              <div>
                <label className="block text-xs font-semibold tracking-wider mb-1.5 uppercase" style={{ color: textMuted }}>
                  Personas * (Mínimo 1)
                </label>
                <input 
                  type="number" 
                  min="1"
                  step="1"
                  required
                  placeholder="Número de personas"
                  value={formPersonas} 
                  onKeyDown={(e) => {
                    if (['-', 'e', '+', '.'].includes(e.key)) e.preventDefault()
                  }}
                  onChange={(e) => {
                    setFormPersonas(e.target.value)
                    if (formErrors.personas) setFormErrors(prev => ({ ...prev, personas: null }))
                  }}
                  onBlur={() => {
                    const err = validateField('personas', formPersonas)
                    if (err) setFormErrors(prev => ({ ...prev, personas: err }))
                  }}
                  onWheel={(e) => e.target.blur()}
                  style={{ backgroundColor: bgSubcard, borderColor: formErrors.personas ? '#ef4444' : borderSubtle, color: textColor }}
                  className={`input-subcard bg-slate-100 dark:bg-white/5 border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all duration-200 w-full h-11 font-medium placeholder:opacity-40 ${
                    formErrors.personas ? '!border-rose-500 ring-1 ring-rose-500/20' : 'border-gray-200 dark:border-white/10 focus:border-brand-500/50'
                  }`}
                />
                {formErrors.personas && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.personas}</p>
                )}
              </div>

              {/* 5. Fecha (date) - Obligatorio, calendario desplegable */}
              <div>
                <label className="block text-xs font-semibold tracking-wider mb-1.5 uppercase" style={{ color: textMuted }}>
                  Fecha *
                </label>
                <DatePicker
                  value={formFecha}
                  onChange={(val) => {
                    setFormFecha(val)
                    if (formErrors.fecha) setFormErrors(prev => ({ ...prev, fecha: null }))
                  }}
                  placeholder="Selecciona fecha"
                  clearable={false}
                  fullWidth={true}
                  customPrefix=""
                  minDate={todayStr}
                  inputBg={bgSubcard}
                  hasError={!!formErrors.fecha}
                />
                {formErrors.fecha && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.fecha}</p>
                )}
              </div>

              {/* 6. Hora (time) - Obligatorio, selector desplegable de horario operativo */}
              <div>
                <label className="block text-xs font-semibold tracking-wider mb-1.5 uppercase" style={{ color: textMuted }}>
                  Hora *{createEstablished.closed ? ' — Cerrado este día' : ''}
                </label>
                <TimePicker
                  value={formHora}
                  onChange={(val) => {
                    setFormHora(val)
                    if (formErrors.hora) setFormErrors(prev => ({ ...prev, hora: null }))
                  }}
                  placeholder={createEstablished.closed ? 'Restaurante cerrado este día' : 'Selecciona hora'}
                  slots={createTimeSlots}
                  disabled={createEstablished.closed}
                  fullWidth={true}
                  inputBg={bgSubcard}
                  hasError={!!formErrors.hora}
                />
                {formErrors.hora && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.hora}</p>
                )}
              </div>

              {/* 7. Área (area_id) - Obligatorio */}
              <div>
                <label className="block text-xs font-semibold tracking-wider mb-1.5 uppercase" style={{ color: textMuted }}>
                  Área *
                </label>
                <Dropdown
                  options={areaDropdownOptions}
                  value={formArea ? formArea.toString() : ''}
                  onChange={(val) => {
                    setFormArea(val)
                    setFormMesa('')
                    if (formErrors.area) setFormErrors(prev => ({ ...prev, area: null }))
                    if (formErrors.mesa) setFormErrors(prev => ({ ...prev, mesa: null }))
                  }}
                  placeholder="Seleccione un área"
                  buttonBg={bgSubcard}
                  hasError={!!formErrors.area}
                  className="w-full text-xs"
                />
                {formErrors.area && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.area}</p>
                )}
              </div>

              {/* 8. Mesa Asignada (table_id) - Obligatorio, bloqueado hasta elegir área */}
              <div>
                <label className="block text-xs font-semibold tracking-wider mb-1.5 uppercase" style={{ color: textMuted }}>
                  Mesa asignada *
                </label>
                <div>
                  <Dropdown
                    options={tableDropdownOptions}
                    value={formMesa}
                    onChange={(val) => {
                      setFormMesa(val)
                      if (formErrors.mesa) setFormErrors(prev => ({ ...prev, mesa: null }))
                    }}
                    placeholder={
                      !formArea 
                        ? 'Seleccione un área primero' 
                        : availableTables.length === 0 
                          ? 'Sin mesas disponibles' 
                          : 'Seleccione una mesa'
                    }
                    disabled={!formArea || availableTables.length === 0}
                    buttonBg={bgSubcard}
                    hasError={!!formErrors.mesa}
                    className="w-full text-xs"
                  />
                  {formArea && availableTables.length === 0 && (
                    <span className="text-[11px] text-amber-500 font-semibold mt-1 block">
                      ⚠ Todas las mesas de esta área están ocupadas para la fecha seleccionada.
                    </span>
                  )}
                  {formErrors.mesa && (
                    <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.mesa}</p>
                  )}
                </div>
              </div>

              {/* 9. Estado (status) - Obligatorio */}
              <div>
                <label className="block text-xs font-semibold tracking-wider mb-1.5 uppercase" style={{ color: textMuted }}>
                  Estado *
                </label>
                <Dropdown
                  options={STATUS_OPTIONS}
                  value={formEstado}
                  onChange={(val) => {
                    setFormEstado(val)
                    if (formErrors.estado) setFormErrors(prev => ({ ...prev, estado: null }))
                  }}
                  placeholder="Seleccione un estado"
                  buttonBg={bgSubcard}
                  hasError={!!formErrors.estado}
                  className="w-full text-xs"
                />
                {formErrors.estado && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.estado}</p>
                )}
              </div>

              {/* 10. Notas (notes) - Opcional, max 250 chars con contador visual */}
              <div className="md:col-span-2">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold tracking-wider uppercase" style={{ color: textMuted }}>
                    Notas / Solicitudes especiales (Opcional)
                  </label>
                  <span className={`text-[11px] font-semibold ${
                    formNotas.length >= 250 
                      ? 'text-rose-500 font-bold' 
                      : formNotas.length >= 230 
                        ? 'text-amber-500' 
                        : 'text-theme-text-muted opacity-60'
                  }`}>
                    {formNotas.length} / 250
                  </span>
                </div>
                <textarea 
                  placeholder="Ej. Alergias, mesa de cumpleaños, silla de bebé..."
                  value={formNotas} 
                  maxLength={250}
                  onChange={(e) => setFormNotas(e.target.value.slice(0, 250))}
                  rows="3"
                  style={{ backgroundColor: bgSubcard, borderColor: borderSubtle, color: textColor }}
                  className="input-subcard bg-slate-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500/50 placeholder:opacity-40 transition-all duration-200 w-full resize-none font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end items-center gap-3 mt-6 pb-2">
              <button 
                type="button" 
                disabled={submittingForm}
                onClick={() => setIsModalOpen(false)}
                style={{ backgroundColor: bgSubcard, borderColor: borderSubtle, color: textColor }}
                className="input-subcard bg-slate-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:opacity-80 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all cursor-pointer h-11 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={isSubmitDisabled || submittingForm}
                style={{ backgroundColor: colorPrimario, color: primaryBtnText || '#ffffff' }}
                className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-all shadow-md h-11 flex items-center justify-center ${
                  isSubmitDisabled || submittingForm 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'cursor-pointer hover:opacity-90 active:scale-[0.98]'
                }`}
              >
                {submittingForm 
                  ? 'Guardando...' 
                  : (editingItem ? 'Guardar Cambios' : 'Crear Reservación')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Reprogram Modal */}
      {reprogramItem && (
        <Modal
          title={`Reprogramar Reservación — ${reprogramItem.folio || `#${reprogramItem.id}`}`}
          onClose={() => setReprogramItem(null)}
        >
          <form onSubmit={handleReprogramSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-theme-text-muted tracking-wider mb-1.5 uppercase">Nueva Fecha *</label>
                <DatePicker
                  value={reprogramFecha}
                  onChange={setReprogramFecha}
                  placeholder="Selecciona fecha"
                  clearable={false}
                  fullWidth={true}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-theme-text-muted tracking-wider mb-1.5 uppercase">
                  Nueva Hora *{reprogramEstablished.closed ? ' — Cerrado este día' : ''}
                </label>
                <TimePicker
                  value={reprogramHora}
                  onChange={setReprogramHora}
                  placeholder={reprogramEstablished.closed ? 'Restaurante cerrado este día' : 'Selecciona hora'}
                  slots={reprogramTimeSlots}
                  disabled={reprogramEstablished.closed}
                  fullWidth={true}
                  inputBg={bgSubcard}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pb-4">
              <button 
                type="button" 
                onClick={() => setReprogramItem(null)}
                className="bg-theme-input hover:bg-white/10 border border-theme-border-subtle text-theme-text-muted rounded-xl px-4 py-2.5 text-sm transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="bg-gradient-to-r from-brand-600 to-brand-500 text-theme-text rounded-xl px-4 py-2.5 text-sm font-semibold transition-all shadow-md shadow-brand-600/10 cursor-pointer"
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        </Modal>
      )}


      {/* ────────────────────────────────────────────────────
          MODAL ASIGNACIÓN DE MESA — se abre al pulsar "Aceptar"
          ──────────────────────────────────────────────────── */}
      {asignarMesaItem && (() => {
        const resDate = String(asignarMesaItem.reservation_date ?? asignarMesaItem.date ?? '').split('T')[0]
        const areaId = asignarMesaItem.area_id
        const mesasConMeta = getAvailableTablesWithMeta(areaId, resDate, asignarMesaItem.id)
        const areaName = (typeof asignarMesaItem.area === 'string' && asignarMesaItem.area.trim())
          ? asignarMesaItem.area.trim()
          : (asignarMesaItem.area?.name || asignarMesaItem.area_name || 'General')

        return (
          <Modal
            title="Asignar Mesa"
            onClose={() => { setAsignarMesaItem(null); setAsignarMesaSeleccionada('') }}
          >
            <div>
              {/* Folio */}
              <p className="text-sm mb-4" style={{ color: textMuted }}>
                Confirmando folio:{' '}
                <span className="font-bold" style={{ color: colorPrimario || 'var(--theme-primary)' }}>
                  {asignarMesaItem.folio || `#${asignarMesaItem.id}`}
                </span>
              </p>

              {/* Resumen: Personas + Área */}
              <div
                className="grid grid-cols-2 gap-3 p-4 rounded-xl border mb-6"
                style={{ backgroundColor: bgSubcard, borderColor: borderSubtle }}
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: textMuted }}>Personas</p>
                  <p className="text-base font-semibold flex items-center gap-1.5" style={{ color: textColor }}>
                    <span>👥</span>
                    {asignarMesaItem.guests_count ?? asignarMesaItem.personas ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: textMuted }}>Área</p>
                  <p className="text-base font-semibold" style={{ color: textColor }}>{areaName}</p>
                </div>
              </div>

              {/* SELECTOR DE MESA */}
              <div className="mb-8">
                <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: textMuted }}>
                  Seleccionar Mesa <span className="text-rose-400">*</span>
                </label>
                {mesasConMeta.length === 0 ? (
                  <div className="text-sm rounded-xl px-4 py-3 border border-amber-400/30 bg-amber-400/10 text-amber-600 dark:text-amber-400">
                    No hay mesas disponibles para esta área y fecha.
                  </div>
                ) : (
                  <Dropdown
                    options={mesasConMeta.map(({ value, capacity }) => ({
                      value,
                      label: `${value}${capacity ? ` (Para ${capacity} personas)` : ''}`
                    }))}
                    value={asignarMesaSeleccionada}
                    onChange={setAsignarMesaSeleccionada}
                    placeholder="Elige una mesa disponible..."
                    buttonBg={bgSubcard}
                    menuBg="var(--theme-surface)"
                    className="w-full"
                  />
                )}
              </div>

              {/* BOTONERA INFERIOR */}
              <div
                className="flex gap-3 pt-4 border-t"
                style={{ borderColor: borderSubtle }}
              >
                <button
                  type="button"
                  onClick={() => { setAsignarMesaItem(null); setAsignarMesaSeleccionada('') }}
                  className="flex-1 border text-sm font-bold py-3 rounded-xl transition-all cursor-pointer hover:opacity-80"
                  style={{
                    backgroundColor: bgSubcard,
                    borderColor: borderSubtle,
                    color: textMuted,
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!asignarMesaSeleccionada || asignarMesaSubmitting}
                  onClick={handleConfirmarConMesa}
                  className="flex-1 text-sm font-bold py-3 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  style={{
                    background: asignarMesaSeleccionada && !asignarMesaSubmitting
                      ? `linear-gradient(135deg, var(--theme-primary), color-mix(in srgb, var(--theme-primary) 75%, white))`
                      : 'var(--theme-input)',
                    color: asignarMesaSeleccionada && !asignarMesaSubmitting
                      ? 'var(--theme-primary-contrast, #fff)'
                      : 'var(--theme-text-muted)',
                  }}
                >
                  {asignarMesaSubmitting ? 'Confirmando...' : 'Confirmar Reservación'}
                </button>
              </div>
            </div>
          </Modal>
        )
      })()}


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
