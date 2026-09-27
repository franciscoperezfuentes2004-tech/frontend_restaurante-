import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from '../../../context/ThemeContext'
import {
  TrendingUp, Package, Users, Truck, CalendarDays, Download,
  Star, Clock, ArrowUpRight, Award, HelpCircle, FileText,
  Printer, Mail, Plus, Trash2, Play, Pause, Calendar,
  DollarSign, Layers, Settings, AlertTriangle, Check,
  RefreshCw, Sliders, Search, Shield, FileSpreadsheet, Eye, X, Pencil,
  FileBarChart, CalendarClock, ChevronDown
} from 'lucide-react'
import DatePicker from '../../../components/ui/DatePicker'
import Dropdown from '../../../components/ui/Dropdown'
import TimePicker from '../../../components/ui/TimePicker'
import EmptyState from '../../../components/ui/EmptyState'
import Modal from '../../../components/ui/Modal'
import Toast from '../../../components/ui/Toast'
import {
  adminGenerateReport,
  adminSendReport,
  adminGetReports,
  adminGetReportDetail,
  adminDeleteReport,
  adminGetScheduledReports,
  adminCreateScheduledReport,
  adminUpdateScheduledReport,
  adminDeleteScheduledReport,
  adminToggleScheduledReport
} from '../../../api/reports'

/* ── Helpers ── */
const fmt = (n) => `$${Math.round(Number(n || 0)).toLocaleString('es-MX')}`
const EMAIL_REGEX = /^\S+@\S+\.\S+$/

// Diccionario de tipos de reporte
const REPORT_TYPES = {
  exec: 'Resumen Ejecutivo',
  sales: 'Ventas',
  products: 'Productos',
  inventory: 'Inventario',
  delivery: 'Delivery',
  reservations: 'Reservaciones',
  costs: 'Costos',
  finances: 'Finanzas',
  taxes: 'Impuestos'
}

const REPORT_TYPE_API_KEYS = {
  exec: 'ejecutivo',
  sales: 'ventas',
  products: 'productos',
  inventory: 'inventario',
  delivery: 'delivery',
  reservations: 'reservaciones',
  costs: 'costos',
  finances: 'finanzas',
  taxes: 'impuestos'
}

const ALL_TYPE_OPTIONS = [
  { value: 'all', label: 'Todos los Tipos' },
  { value: 'ejecutivo', label: 'Resumen Ejecutivo' },
  { value: 'ventas', label: 'Ventas' },
  { value: 'productos', label: 'Productos' },
  { value: 'inventario', label: 'Inventario' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'reservaciones', label: 'Reservaciones' },
  { value: 'costos', label: 'Costos' },
  { value: 'finanzas', label: 'Finanzas' },
  { value: 'impuestos', label: 'Impuestos' }
]

// Tabs Principales
const MAIN_TABS = [
  { id: 'generator', label: 'Generar Reporte', icon: Sliders },
  { id: 'history',   label: 'Historial de Reportes', icon: Clock },
  { id: 'scheduled', label: 'Reportes Programados', icon: CalendarDays }
]

export default function Reports() {
  const { bgCard, bgSubcard, bgTable, bgInput, borderSubtle, cardShadow, colorPrimario } = useTheme()
  /* ── State ── */
  const [activeTab, setActiveTab] = useState('generator')
  const [reportType, setReportType] = useState('exec')
  
  const todayStr = new Date().toISOString().slice(0, 10)
  const [fromDate, setFromDate] = useState('2026-07-20')
  const [toDate, setToDate] = useState(todayStr)
  const [useCustomDates, setUseCustomDates] = useState(false)

  const [isGenerated, setIsGenerated] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [toast, setToast] = useState(null)

  // Reporte generado en pestaña principal
  const [generatedReport, setGeneratedReport] = useState(null)

  // Modal para enviar por correo
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  const [sendEmailsList, setSendEmailsList] = useState([''])
  const [sendLoading, setSendLoading] = useState(false)
  const [emailErrors, setEmailErrors] = useState([])
  const [emailTargetReportId, setEmailTargetReportId] = useState(null)

  // Historial de reportes (Backend API state)
  const [historyReports, setHistoryReports] = useState([])
  const [historyTotal, setHistoryTotal] = useState(0)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historySearch, setHistorySearch] = useState('')
  const [historyDebouncedSearch, setHistoryDebouncedSearch] = useState('')
  const [historyTypeFilter, setHistoryTypeFilter] = useState('all')

  // Modal de Detalle de Reporte del Historial (Acción "Ver")
  const [viewModalReport, setViewModalReport] = useState(null)
  const [viewModalLoading, setViewModalLoading] = useState(false)

  // Confirmación de eliminación de reporte de historial
  const [deleteConfirmReport, setDeleteConfirmReport] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Reportes Programados (Backend API State)
  const [scheduledList, setScheduledList] = useState([])
  const [scheduledLoading, setScheduledLoading] = useState(false)
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)
  const [editingScheduleItem, setEditingScheduleItem] = useState(null)
  const [scheduleName, setScheduleName] = useState('')
  const [scheduleType, setScheduleType] = useState('ventas')
  const [scheduleFrequency, setScheduleFrequency] = useState('diario')
  const [scheduleTime, setScheduleTime] = useState('23:30')
  const [scheduleWeekday, setScheduleWeekday] = useState('Domingo')
  const [scheduleMonthDay, setScheduleMonthDay] = useState(1)
  const [scheduleFormat, setScheduleFormat] = useState('PDF')
  const [scheduleEmails, setScheduleEmails] = useState([])
  const [recipientEmailInput, setRecipientEmailInput] = useState('')
  const [recipientEmailError, setRecipientEmailError] = useState('')
  const [scheduleErrors, setScheduleErrors] = useState({})
  const [scheduleTouched, setScheduleTouched] = useState({})
  const [scheduleSubmitted, setScheduleSubmitted] = useState(false)
  const [expandedEmails, setExpandedEmails] = useState({})
  const [saveScheduleLoading, setSaveScheduleLoading] = useState(false)

  // Modal de eliminación de reporte programado
  const [deleteScheduleConfirm, setDeleteScheduleConfirm] = useState(null)
  const [deleteScheduleLoading, setDeleteScheduleLoading] = useState(false)

  // ── Paginación Universal (8 registros por página) ──
  const ITEMS_PER_PAGE = 8
  const [generatorPage, setGeneratorPage] = useState(1)
  const [historyPage, setHistoryPage] = useState(1)
  const [scheduledPage, setScheduledPage] = useState(1)

  // Debounce para el buscador del historial (400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setHistoryDebouncedSearch(historySearch)
    }, 400)
    return () => clearTimeout(timer)
  }, [historySearch])

  useEffect(() => {
    setHistoryPage(1)
  }, [historyDebouncedSearch, historyTypeFilter])

  useEffect(() => {
    setGeneratorPage(1)
  }, [generatedReport])

  // Paginación Generador
  const generatorRows = generatedReport?.data?.rows || []
  const currentGeneratorRows = generatorRows.slice((generatorPage - 1) * ITEMS_PER_PAGE, generatorPage * ITEMS_PER_PAGE)
  const totalGeneratorPages = Math.max(1, Math.ceil(generatorRows.length / ITEMS_PER_PAGE))
  const generatorStartItem = generatorRows.length === 0 ? 0 : (generatorPage - 1) * ITEMS_PER_PAGE + 1
  const generatorEndItem = Math.min(generatorPage * ITEMS_PER_PAGE, generatorRows.length)

  // Paginación Historial
  const currentHistoryReports = historyReports.slice((historyPage - 1) * ITEMS_PER_PAGE, historyPage * ITEMS_PER_PAGE)
  const totalHistoryPages = Math.max(1, Math.ceil(historyReports.length / ITEMS_PER_PAGE))
  const historyStartItem = historyReports.length === 0 ? 0 : (historyPage - 1) * ITEMS_PER_PAGE + 1
  const historyEndItem = Math.min(historyPage * ITEMS_PER_PAGE, historyReports.length)

  // Paginación Programados
  const currentScheduledList = scheduledList.slice((scheduledPage - 1) * ITEMS_PER_PAGE, scheduledPage * ITEMS_PER_PAGE)
  const totalScheduledPages = Math.max(1, Math.ceil(scheduledList.length / ITEMS_PER_PAGE))
  const scheduledStartItem = scheduledList.length === 0 ? 0 : (scheduledPage - 1) * ITEMS_PER_PAGE + 1
  const scheduledEndItem = Math.min(scheduledPage * ITEMS_PER_PAGE, scheduledList.length)

  // Cargar Historial desde el Backend (GET /api/admin/reports)
  const fetchHistoryReports = async () => {
    try {
      setHistoryLoading(true)
      const params = {}
      if (historyDebouncedSearch) params.search = historyDebouncedSearch
      if (historyTypeFilter && historyTypeFilter !== 'all') params.type = historyTypeFilter

      const res = await adminGetReports(params)
      if (res.data) {
        setHistoryReports(res.data.reportes || [])
        setHistoryTotal(res.data.total || 0)
      }
    } catch (err) {
      console.error("Error al cargar historial de reportes:", err)
      setToast({ message: "No se pudo sincronizar el historial de reportes", type: "error" })
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistoryReports()
    }
  }, [activeTab, historyDebouncedSearch, historyTypeFilter])

  // Cargar Reportes Programados desde el Backend (GET /api/admin/reports/scheduled)
  const fetchScheduledReports = async () => {
    try {
      setScheduledLoading(true)
      const res = await adminGetScheduledReports()
      if (res.data) {
        setScheduledList(res.data.programados || [])
      }
    } catch (err) {
      console.error("Error al cargar reportes programados:", err)
      setToast({ message: "No se pudieron obtener los reportes programados", type: "error" })
    } finally {
      setScheduledLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'scheduled') {
      fetchScheduledReports()
    }
  }, [activeTab])

  /* ── Quick Date Range ── */
  const setQuickRange = (rangeType) => {
    const today = new Date().toISOString().slice(0, 10)
    if (rangeType === 'today') {
      setFromDate(today)
      setToDate(today)
    } else if (rangeType === 'week') {
      const d = new Date()
      d.setDate(d.getDate() - 7)
      setFromDate(d.toISOString().slice(0, 10))
      setToDate(today)
    } else if (rangeType === 'month') {
      const d = new Date()
      d.setDate(1)
      setFromDate(d.toISOString().slice(0, 10))
      setToDate(today)
    }
    setUseCustomDates(false)
    setIsGenerated(false)
  }

  const activeQuickRange = useMemo(() => {
    if (useCustomDates) return null
    const today = new Date().toISOString().slice(0, 10)
    if (fromDate === today && toDate === today) return 'today'
    if (fromDate === new Date(new Date().setDate(1)).toISOString().slice(0, 10)) return 'month'
    return 'week'
  }, [fromDate, toDate, useCustomDates])

  /* ── Handlers de Generación y Envío ── */
  const handleGenerate = async () => {
    try {
      setIsLoading(true)
      const apiKey = REPORT_TYPE_API_KEYS[reportType] || 'ventas'
      const payload = {
        type: apiKey,
        periodo: useCustomDates ? 'personalizado' : (activeQuickRange || 'semana'),
        fecha_inicio: useCustomDates ? fromDate : null,
        fecha_fin: useCustomDates ? toDate : null,
      }

      const res = await adminGenerateReport(payload)
      if (res.data) {
        setGeneratedReport(res.data)
        setIsGenerated(true)
        setToast({ message: "Reporte generado exitosamente", type: "success" })
      }
    } catch (err) {
      console.error("Error al generar reporte:", err)
      setToast({ message: "No se pudo generar el reporte. Inténtalo de nuevo.", type: "error" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewReportDetail = async (reportId) => {
    try {
      setViewModalLoading(true)
      const res = await adminGetReportDetail(reportId)
      if (res.data) {
        setViewModalReport(res.data)
      }
    } catch (err) {
      console.error("Error al obtener detalle del reporte:", err)
      setToast({ message: "No se pudieron cargar los datos del reporte seleccionado", type: "error" })
    } finally {
      setViewModalLoading(false)
    }
  }

  const handleRegenerateReport = async (item) => {
    try {
      setToast({ message: `Regenerando ${item.nombre}...`, type: "success" })
      const payload = {
        type: item.type,
        periodo: item.periodo || 'semana',
      }
      const res = await adminGenerateReport(payload)
      if (res.data) {
        setToast({ message: `Reporte ${item.nombre} regenerado correctamente`, type: "success" })
        fetchHistoryReports()
      }
    } catch (err) {
      console.error("Error al regenerar reporte:", err)
      setToast({ message: "No se pudo regenerar el reporte", type: "error" })
    }
  }

  const handleDeleteReport = async () => {
    if (!deleteConfirmReport?.id) return
    try {
      setDeleteLoading(true)
      await adminDeleteReport(deleteConfirmReport.id)
      setToast({ message: "Reporte eliminado del historial correctamente", type: "success" })
      setDeleteConfirmReport(null)
      fetchHistoryReports()
    } catch (err) {
      console.error("Error al eliminar reporte:", err)
      setToast({ message: "No se pudo eliminar el reporte", type: "error" })
    } finally {
      setDeleteLoading(false)
    }
  }

  // Multi-email modal handlers
  const handleOpenEmailModal = (reportId) => {
    setEmailTargetReportId(reportId || generatedReport?.id)
    setIsEmailModalOpen(true)
  }

  const handleSendReportByEmail = async (e) => {
    if (e) e.preventDefault()
    const targetId = emailTargetReportId || generatedReport?.id
    if (!targetId) {
      setToast({ message: "Genera o selecciona un reporte antes de enviarlo", type: "error" })
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const errors = []
    const validEmails = []

    sendEmailsList.forEach((emailStr, idx) => {
      const trimmed = emailStr.trim()
      if (!trimmed || !emailRegex.test(trimmed)) {
        errors.push(`Correo #${idx + 1} inválido`)
      } else {
        validEmails.push(trimmed)
      }
    })

    if (errors.length > 0 || validEmails.length === 0) {
      setEmailErrors(errors)
      setToast({ message: "Formato de correo electrónico inválido", type: "error" })
      return
    }

    setEmailErrors([])
    try {
      setSendLoading(true)
      const res = await adminSendReport(targetId, { emails: validEmails })
      setToast({ message: res.data?.message || "Reporte enviado exitosamente por correo", type: "success" })
      setIsEmailModalOpen(false)
      setSendEmailsList([''])
    } catch (err) {
      console.error("Error al enviar reporte por correo:", err)
      setToast({ message: "Error al enviar el reporte por correo", type: "error" })
    } finally {
      setSendLoading(false)
    }
  }

  const handleExportTarget = (reportObj, format) => {
    const rep = reportObj || generatedReport
    if (!rep || !rep.data) {
      setToast({ message: "No hay datos disponibles para exportar", type: "error" })
      return
    }

    if (format === 'PDF' || format === 'Imprimir') {
      window.print()
      return
    }

    let csv = `REPORTE: ${(rep.nombre || rep.type).toUpperCase()}\n`
    csv += `Periodo: ${rep.periodo}\n`
    csv += `Generado por: ${rep.generated_by_name || rep.generated_by || 'Super Administrador'}\n`
    csv += `Fecha: ${rep.created_at}\n\n`

    if (rep.data.headers) {
      csv += rep.data.headers.join(',') + '\n'
    }

    if (rep.data.rows) {
      rep.data.rows.forEach(row => {
        const line = row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')
        csv += line + '\n'
      })
    }

    const filename = `Reporte_${rep.type}_${new Date().toISOString().slice(0, 10)}.csv`
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setToast({ message: `Reporte exportado en formato ${format} correctamente`, type: 'success' })
  }

  /* ── Handlers de Reportes Programados (Scheduled API) ── */
  const validateSchedule = (name, type, freq, time, format, emails) => {
    const errs = {}
    const trimmed = (name || '').trim()
    if (!trimmed) {
      errs.name = 'El nombre de la programación es obligatorio'
    } else if (trimmed.length < 3) {
      errs.name = 'El nombre debe tener al menos 3 caracteres'
    } else if (trimmed.length > 100) {
      errs.name = 'El nombre no puede superar los 100 caracteres'
    }

    if (!type) {
      errs.type = 'Selecciona un tipo de reporte válido'
    }

    if (!freq) {
      errs.frequency = 'Selecciona una frecuencia válida'
    }

    if (!time) {
      errs.time = 'La hora de envío es obligatoria'
    }

    if (!format || !['PDF', 'EXCEL', 'CSV'].includes(format.toUpperCase())) {
      errs.format = 'Selecciona un formato de exportación válido'
    }

    if (!emails || emails.length === 0) {
      errs.emails = 'Debes agregar al menos 1 correo a la lista de destinatarios'
    }

    return errs
  }

  const handleAddRecipientEmail = (e) => {
    if (e) e.preventDefault()
    const trimmed = (recipientEmailInput || '').trim()
    if (!trimmed) {
      setRecipientEmailError('Ingresa una dirección de correo')
      return
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setRecipientEmailError('Formato de correo inválido (ej. usuario@dominio.com)')
      return
    }
    if (scheduleEmails.some(em => em.toLowerCase() === trimmed.toLowerCase())) {
      setRecipientEmailError('Este correo ya ha sido agregado')
      return
    }
    setScheduleEmails(prev => [...prev, trimmed])
    setRecipientEmailInput('')
    setRecipientEmailError('')
    setScheduleErrors(prev => ({ ...prev, emails: undefined }))
  }

  const handleRemoveRecipientEmail = (emailToRemove) => {
    setScheduleEmails(prev => prev.filter(em => em !== emailToRemove))
  }

  useEffect(() => {
    if (scheduleSubmitted) {
      setScheduleErrors(validateSchedule(scheduleName, scheduleType, scheduleFrequency, scheduleTime, scheduleFormat, scheduleEmails))
    }
  }, [scheduleName, scheduleType, scheduleFrequency, scheduleTime, scheduleFormat, scheduleEmails, scheduleSubmitted])

  const openCreateScheduleModal = () => {
    setEditingScheduleItem(null)
    setScheduleName('')
    setScheduleType('ventas')
    setScheduleFrequency('diario')
    setScheduleTime('23:30')
    setScheduleWeekday('Domingo')
    setScheduleMonthDay(1)
    setScheduleFormat('PDF')
    setScheduleEmails([])
    setRecipientEmailInput('')
    setRecipientEmailError('')
    setScheduleErrors({})
    setScheduleTouched({})
    setScheduleSubmitted(false)
    setIsScheduleModalOpen(true)
  }

  const openEditScheduleModal = (item) => {
    setEditingScheduleItem(item)
    setScheduleName(item.name || '')
    setScheduleType(item.type || 'ventas')
    setScheduleFrequency(item.frequency || 'diario')
    setScheduleTime(item.time || '23:30')
    setScheduleWeekday(item.day_of_week || 'Domingo')
    setScheduleMonthDay(item.day_of_month || 1)
    setScheduleFormat(item.format?.toUpperCase() || 'PDF')
    setScheduleEmails(Array.isArray(item.emails) ? item.emails.filter(Boolean) : (typeof item.emails === 'string' ? [item.emails] : []))
    setRecipientEmailInput('')
    setRecipientEmailError('')
    setScheduleErrors({})
    setScheduleTouched({})
    setScheduleSubmitted(false)
    setIsScheduleModalOpen(true)
  }

  const handleSaveScheduleSubmit = async (e) => {
    e.preventDefault()
    setScheduleSubmitted(true)

    // Si el usuario dejó un correo escrito en el input sin presionar agregar
    let currentEmails = [...scheduleEmails]
    const pendingEmail = (recipientEmailInput || '').trim()
    if (pendingEmail) {
      if (!EMAIL_REGEX.test(pendingEmail)) {
        setRecipientEmailError('Formato de correo inválido (ej. usuario@dominio.com)')
        return
      }
      if (!currentEmails.some(em => em.toLowerCase() === pendingEmail.toLowerCase())) {
        currentEmails.push(pendingEmail)
        setScheduleEmails(currentEmails)
        setRecipientEmailInput('')
        setRecipientEmailError('')
      }
    }

    const trimmedName = (scheduleName || '').trim()
    const errs = validateSchedule(trimmedName, scheduleType, scheduleFrequency, scheduleTime, scheduleFormat, currentEmails)
    setScheduleErrors(errs)

    if (Object.keys(errs).length > 0) {
      const firstError = Object.values(errs)[0]
      setToast({ message: firstError, type: "error" })
      return
    }

    const payload = {
      name: trimmedName,
      type: scheduleType,
      frequency: scheduleFrequency,
      time: scheduleTime,
      day_of_week: scheduleFrequency === 'semanal' ? scheduleWeekday : null,
      day_of_month: scheduleFrequency === 'mensual' ? Number(scheduleMonthDay) : null,
      emails: currentEmails,
      format: scheduleFormat.toLowerCase(),
      active: editingScheduleItem ? editingScheduleItem.active : true,
    }

    try {
      setSaveScheduleLoading(true)
      if (editingScheduleItem) {
        await adminUpdateScheduledReport(editingScheduleItem.id, payload)
        setToast({ message: "Reporte programado actualizado correctamente", type: "success" })
      } else {
        await adminCreateScheduledReport(payload)
        setToast({ message: "Reporte programado creado correctamente", type: "success" })
      }
      setIsScheduleModalOpen(false)
      fetchScheduledReports()
    } catch (err) {
      console.error("Error al guardar reporte programado:", err)
      setToast({ message: "No se pudo guardar la programación del reporte", type: "error" })
    } finally {
      setSaveScheduleLoading(false)
    }
  }

  const handleToggleScheduledStatus = async (item) => {
    try {
      const res = await adminToggleScheduledReport(item.id)
      setToast({ message: res.data?.message || `Estado actualizado a ${!item.active ? 'Activo' : 'Pausado'}`, type: "success" })
      fetchScheduledReports()
    } catch (err) {
      console.error("Error al conmutar estado del reporte programado:", err)
      setToast({ message: "No se pudo conmutar el estado del reporte", type: "error" })
    }
  }

  const handleDeleteScheduledItem = async () => {
    if (!deleteScheduleConfirm?.id) return
    try {
      setDeleteScheduleLoading(true)
      await adminDeleteScheduledReport(deleteScheduleConfirm.id)
      setToast({ message: "Reporte programado eliminado correctamente", type: "success" })
      setDeleteScheduleConfirm(null)
      fetchScheduledReports()
    } catch (err) {
      console.error("Error al eliminar reporte programado:", err)
      setToast({ message: "No se pudo eliminar la programación", type: "error" })
    } finally {
      setDeleteScheduleLoading(false)
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

      {/* CSS para Impresión */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report, #printable-report * {
            visibility: visible;
          }
          #printable-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
          }
          #printable-report p, #printable-report span, #printable-report th, #printable-report td, #printable-report h1, #printable-report h2, #printable-report h3, #printable-report h4 {
            color: black !important;
          }
          #printable-report th {
            background-color: #f3f4f6 !important;
            border-bottom: 2px solid #e5e7eb !important;
          }
          #printable-report td {
            border-bottom: 1px solid #e5e7eb !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />

      {/* Header de la Vista (Nombre y descripción de la vista) */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-black tracking-wider uppercase text-theme-text">CENTRO DE REPORTES Y EXPORTACIÓN</h1>
          <p className="text-theme-text-muted text-xs font-semibold uppercase tracking-wider mt-1">
            Módulo de generación histórica, compilación contable y reportes programados
          </p>
        </div>

        {/* Pestañas para cambiar de pestaña (FUERA del contenedor de la tabla, justo abajo del nombre y descripción de la vista) */}
        <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar md:flex-wrap items-center gap-3 max-md:pb-2">
          {MAIN_TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            const count = tab.id === 'history' ? historyTotal : tab.id === 'scheduled' ? scheduledList.length : null
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={
                  isActive
                    ? { backgroundColor: colorPrimario || '#dc2626', color: '#ffffff' }
                    : { backgroundColor: colorPrimario ? `${colorPrimario}18` : 'rgba(220, 38, 38, 0.12)', color: colorPrimario || '#b91c1c' }
                }
                className="px-4 py-2 rounded-2xl text-xs font-extrabold uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-xs flex items-center gap-2 whitespace-nowrap hover:opacity-90 snap-center"
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                {count !== null && (
                  <span
                    style={
                      isActive
                        ? { backgroundColor: 'rgba(255, 255, 255, 0.25)', color: '#ffffff' }
                        : { backgroundColor: colorPrimario ? `${colorPrimario}25` : 'rgba(220, 38, 38, 0.2)', color: colorPrimario || '#b91c1c' }
                    }
                    className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center font-mono"
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Contenido del Tab Activo en Contenedor Nivel 1 (bgCard) */}
      <div className="animate-fadeIn mt-4">
        {activeTab === 'generator' && (
          <div className="rounded-2xl p-6 space-y-5 transition-colors duration-200" style={{ backgroundColor: bgCard, border: `1px solid ${borderSubtle}`, boxShadow: cardShadow }}>
            {/* Header de Sección */}
            <div>
              <h2 className="text-sm font-extrabold text-theme-text tracking-wide uppercase">GENERADOR DE REPORTES</h2>
              <p className="text-theme-text-muted text-[10px] mt-0.5 font-bold uppercase tracking-wider">CONFIGURA Y COMPILA REPORTES EJECUTIVOS, CONTABLES Y OPERATIVOS</p>
            </div>

            {/* Panel de Configuración y Filtros (Distribuidos directamente en bgCard) */}
            <div className="space-y-4">
              {/* FILA 1: Tipo de Reporte + Filtros Rápidos */}
              <div className="flex flex-wrap items-end gap-4 relative z-20">
                <div className="space-y-1.5 w-full sm:w-60 shrink-0">
                  <label className="text-xs font-bold uppercase tracking-wider text-theme-text-muted block">Tipo de Reporte</label>
                  <Dropdown
                    options={Object.entries(REPORT_TYPES).map(([k, v]) => ({
                      value: k,
                      label: v
                    }))}
                    value={reportType}
                    onChange={(val) => {
                      setReportType(val)
                      setIsGenerated(false)
                    }}
                    icon={<FileText size={14} className="text-theme-text-muted" />}
                    className="w-full"
                  />
                </div>

                <div className="flex flex-col gap-1.5 pb-1 max-md:w-full">
                  <span className="text-[10px] font-bold tracking-wider uppercase transition-colors text-theme-text-muted">
                    Filtros Rápidos
                  </span>
                  <div
                    className="inline-flex max-md:flex items-center gap-1.5 p-1.5 rounded-2xl border shadow-xs transition-all duration-200 max-md:w-full max-md:justify-between"
                    style={{ backgroundColor: bgSubcard, borderColor: borderSubtle }}
                  >
                    {[
                      { id: 'today', label: 'Hoy' },
                      { id: 'week', label: 'Semana' },
                      { id: 'month', label: 'Mes' }
                    ].map(tab => {
                      const isActive = activeQuickRange === tab.id
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setQuickRange(tab.id)}
                          style={
                            isActive
                              ? { backgroundColor: colorPrimario || '#dc2626', color: '#ffffff' }
                              : { backgroundColor: colorPrimario ? `${colorPrimario}18` : 'rgba(220, 38, 38, 0.12)', color: colorPrimario || '#b91c1c' }
                          }
                          className="px-4 py-1.5 max-md:flex-1 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shadow-xs hover:opacity-90 min-w-[70px] text-center"
                        >
                          {tab.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Resumen + Botón Generar en la misma fila en PC, apilados en tablet */}
                <div className="flex flex-wrap items-center gap-3 ml-auto max-xl:ml-0 max-xl:w-full">
                  <div className="bg-theme-input/70 border border-theme-border-subtle rounded-2xl px-4 py-2.5 text-[11px] text-theme-text-muted space-y-1 min-w-[200px] shadow-xs max-xl:flex-1">
                    <p className="truncate">Reporte: <span className="text-brand-400 font-bold">{REPORT_TYPES[reportType]}</span></p>
                    <p>Periodo: <span className="text-theme-text font-semibold">{useCustomDates ? 'Personalizado' : activeQuickRange === 'today' ? 'Hoy' : activeQuickRange === 'month' ? 'Mes' : 'Semana'}</span></p>
                    <p>Fechas: <span className="text-theme-text font-mono text-[10px]">{fromDate} al {toDate}</span></p>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isLoading}
                    style={{ backgroundColor: colorPrimario || '#dc2626', color: '#ffffff' }}
                    className="hover:opacity-90 disabled:opacity-50 text-white text-xs font-extrabold uppercase tracking-wider px-6 py-4 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-md opacity-100 transition-all active:scale-95 shrink-0 max-md:w-full"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="animate-spin" size={14} /> Generando...
                      </>
                    ) : (
                      <>
                        <Check size={14} /> GENERAR REPORTE
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* FILA 2: Fechas personalizadas */}
              <div className="flex flex-wrap items-end gap-4 pt-2 border-t border-theme-border-subtle relative z-10">
                <div className="flex items-center pb-2.5">
                  <label className="inline-flex items-center gap-2.5 cursor-pointer select-none group">
                    <div className="relative inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={useCustomDates}
                        onChange={(e) => {
                          const val = e.target.checked
                          setUseCustomDates(val)
                          setIsGenerated(false)
                        }}
                        className="sr-only peer"
                      />
                      <div 
                        className={`w-11 h-6 rounded-full transition-all duration-300 border shadow-inner ${
                          useCustomDates
                            ? 'bg-blue-600 border-blue-600 dark:bg-blue-600 dark:border-blue-500 shadow-blue-500/20'
                            : 'bg-slate-300 dark:bg-slate-700 border-slate-400/80 dark:border-slate-600'
                        }`}
                        style={useCustomDates && colorPrimario ? { backgroundColor: colorPrimario, borderColor: colorPrimario } : {}}
                      >
                        <div 
                          className={`w-4.5 h-4.5 bg-white rounded-full shadow-[0_2px_5px_rgba(0,0,0,0.3)] border border-black/10 absolute top-[3px] left-[3px] transition-transform duration-300 ease-out ${
                            useCustomDates ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </div>
                    </div>
                    <span className={`text-xs font-bold transition-colors ${
                      useCustomDates 
                        ? 'text-slate-900 dark:text-white' 
                        : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200'
                    }`}>
                      Filtros por Fecha
                    </span>
                  </label>
                </div>

                <div className="flex flex-row gap-3 shrink-0 max-md:w-full max-md:flex-col">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold transition-colors block text-theme-text-muted">Fecha Inicio</label>
                    <DatePicker
                      value={fromDate}
                      onChange={(formatted) => {
                        setFromDate(formatted)
                        setUseCustomDates(true)
                        setIsGenerated(false)
                      }}
                      disabled={!useCustomDates}
                      fullWidth={false}
                      clearable={false}
                      customPrefix=""
                      placeholder="Fecha Inicio"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold transition-colors block text-theme-text-muted">Fecha Fin</label>
                    <DatePicker
                      value={toDate}
                      onChange={(formatted) => {
                        setToDate(formatted)
                        setUseCustomDates(true)
                        setIsGenerated(false)
                      }}
                      disabled={!useCustomDates}
                      fullWidth={false}
                      clearable={false}
                      customPrefix=""
                      placeholder="Fecha Fin"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Vista Previa del Reporte */}
            {isGenerated && generatedReport ? (
              <div id="printable-report" className="bg-theme-surface border border-theme-border-subtle rounded-2xl p-8 shadow-xl space-y-6 animate-fadeIn relative">
                <div className="absolute inset-0 bg-[radial-gradient(#ffffff01_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none opacity-20 no-print" />
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <Shield className="text-brand-400 no-print" size={20} />
                      <h2 className="text-2xl font-black text-theme-text tracking-tight uppercase">
                        {REPORT_TYPES[reportType] || generatedReport.type}
                      </h2>
                    </div>
                    <p className="text-xs text-theme-text-muted mt-1 uppercase tracking-widest font-mono">
                      Documento Oficial de Reporte · {generatedReport.periodo}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 max-md:flex-wrap no-print">
                    <button
                      onClick={() => handleExportTarget(generatedReport, 'PDF')}
                      className="flex justify-center items-center gap-1.5 text-xs bg-red-500 hover:bg-red-600 text-white font-bold px-4 py-2.5 max-md:px-3 max-md:py-1.5 max-md:rounded-xl rounded-2xl shadow-md transition-all duration-200 cursor-pointer opacity-100"
                    >
                      <FileText size={14} /> PDF
                    </button>
                    <button
                      onClick={() => handleExportTarget(generatedReport, 'Excel')}
                      className="flex justify-center items-center gap-1.5 text-xs bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2.5 max-md:px-3 max-md:py-1.5 max-md:rounded-xl rounded-2xl shadow-md transition-all duration-200 cursor-pointer opacity-100"
                    >
                      <FileSpreadsheet size={14} /> Excel
                    </button>
                    <button
                      onClick={() => handleExportTarget(generatedReport, 'CSV')}
                      className="flex justify-center items-center gap-1.5 text-xs bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 py-2.5 max-md:px-3 max-md:py-1.5 max-md:rounded-xl rounded-2xl shadow-md transition-all duration-200 cursor-pointer opacity-100"
                    >
                      <Download size={14} /> CSV
                    </button>
                    <button
                      onClick={() => handleExportTarget(generatedReport, 'Imprimir')}
                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 max-md:px-3 max-md:py-1.5 max-md:rounded-xl rounded-2xl flex justify-center items-center gap-1.5 transition-all cursor-pointer shadow-md opacity-100"
                    >
                      <Printer size={13} /> Imprimir
                    </button>
                    <button
                      onClick={() => handleOpenEmailModal(generatedReport.id)}
                      className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-3.5 py-2 max-md:px-3 max-md:py-1.5 max-md:rounded-xl rounded-xl flex justify-center items-center gap-1.5 transition-all cursor-pointer shadow-md"
                    >
                      <Mail size={13} /> Enviar
                    </button>
                  </div>
                </div>

                {generatedReport.data?.kpis && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.entries(generatedReport.data.kpis).map(([k, val], idx) => (
                      <div key={idx} className="bg-theme-card border border-theme-border-subtle rounded-xl p-4 flex flex-col gap-1.5">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-theme-text-muted">
                          {k.replace(/_/g, ' ')}
                        </span>
                        <span className="text-2xl font-black text-brand-400 font-mono">
                          {typeof val === 'number' ? (k.includes('ventas') || k.includes('costo') || k.includes('ticket') || k.includes('monto') || k.includes('ingresos') || k.includes('cobrado') || k.includes('iva') || k.includes('base') ? fmt(val) : val.toLocaleString()) : val}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {generatedReport.data?.headers && (
                  <div className="rounded-2xl p-4 mt-4 space-y-4" style={{ backgroundColor: bgSubcard, border: `1px solid ${borderSubtle}` }}>
                    <div className="rounded-2xl border transition-colors duration-200 overflow-hidden w-full" style={{ backgroundColor: bgSubcard, borderColor: borderSubtle }}>
                    <div className="overflow-x-auto w-full shadow-sm rounded-xl border border-slate-200">
                      <table className="w-full text-left border-collapse min-w-[900px]">
                          <thead className="sticky top-0 z-10" style={{ backgroundColor: bgSubcard }}>
                            <tr className="text-theme-text text-[10px] font-extrabold uppercase tracking-wider" style={{ backgroundColor: bgSubcard }}>
                              {generatedReport.data.headers.map((h, i) => (
                                <th key={i} className="pb-3.5 pt-3.5 px-4 text-left">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-theme-border-subtle text-xs" style={{ backgroundColor: 'var(--theme-surface)' }}>
                            {currentGeneratorRows.map((row, rowIdx) => (
                              <tr key={rowIdx} className="h-16 border-b transition-colors duration-150 hover:bg-theme-input/40 group" style={{ backgroundColor: 'var(--theme-surface)', borderColor: borderSubtle }}>
                                {row.map((cell, cellIdx) => {
                                  const isMoney = String(cell).startsWith('$');
                                  return (
                                    <td key={cellIdx} className={`px-4 py-3.5 font-medium ${isMoney ? 'text-emerald-400 font-bold' : 'text-theme-text'}`}>
                                      {cell}
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                            {currentGeneratorRows.length > 0 && Array.from({ length: ITEMS_PER_PAGE - currentGeneratorRows.length }).map((_, i) => (
                              <tr key={`empty-${i}`} className="h-16 border-b border-transparent" style={{ backgroundColor: 'var(--theme-surface)' }}>
                                <td colSpan={generatedReport.data.headers.length}></td>
                              </tr>
                            ))}
                            {generatorRows.length === 0 && (
                              <tr style={{ backgroundColor: 'var(--theme-surface)' }}>
                                <td colSpan={generatedReport.data.headers.length} className="p-0 border-none" style={{ backgroundColor: 'var(--theme-surface)' }}>
                                  <div className="h-[32rem] flex items-center justify-center" style={{ backgroundColor: 'var(--theme-surface)' }}>
                                    <EmptyState
                                      icon={FileBarChart}
                                      title="Sin registros"
                                      description="No se encontraron registros para este reporte."
                                    />
                                  </div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Footer de Paginación */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t" style={{ borderColor: borderSubtle }}>
                      <div className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                        {generatorRows.length === 0 ? (
                          <span>Mostrando <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>0</span> a <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>0</span> de <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>0</span> registros</span>
                        ) : (
                          <span>Mostrando <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>{generatorStartItem}</span> a <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>{generatorEndItem}</span> de <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>{generatorRows.length}</span> registros</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setGeneratorPage(prev => Math.max(prev - 1, 1))}
                          disabled={generatorPage === 1 || generatorRows.length === 0}
                          className="px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5"
                          style={generatorPage > 1 && generatorRows.length > 0 ? {
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
                          {generatorRows.length === 0 ? 1 : generatorPage} / {totalGeneratorPages}
                        </div>

                        <button
                          onClick={() => setGeneratorPage(prev => Math.min(prev + 1, totalGeneratorPages))}
                          disabled={generatorPage >= totalGeneratorPages || generatorRows.length === 0}
                          className="px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5"
                          style={generatorPage < totalGeneratorPages && generatorRows.length > 0 ? {
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
                )}

                <div className="bg-theme-card border border-theme-border-subtle rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-[11px] font-medium font-mono text-theme-text-muted">
                  <div className="space-y-1">
                    <p className="text-[9px] uppercase font-bold tracking-widest text-theme-text-muted font-sans">Detalles de Generación</p>
                    <p>ID Reporte: <span className="text-theme-text font-bold">#{generatedReport.id}</span></p>
                    <p>Fecha Generado: <span className="text-theme-text">{generatedReport.created_at || 'N/A'}</span></p>
                    <p>Usuario: <span className="text-theme-text">{generatedReport.generated_by || 'Super Administrador'}</span></p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-[9px] uppercase font-bold tracking-widest text-theme-text-muted font-sans">Periodo y Rango</p>
                    <p>Periodo: <span className="text-theme-text">{generatedReport.periodo}</span></p>
                    <p>Rango: <span className="text-theme-text">{generatedReport.fecha_inicio || fromDate} al {toDate}</span></p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[9px] uppercase font-bold tracking-widest text-theme-text-muted font-sans">Formato</p>
                    <p>Tipo: <span className="text-brand-400 font-bold">{REPORT_TYPES[reportType]}</span></p>
                    <p>Estado: <span className="text-emerald-400 font-bold">Oficial</span></p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border transition-colors duration-200 overflow-hidden w-full shadow-lg" style={{ borderColor: borderSubtle }}>
                  <div className="relative">
                    <div className="overflow-x-auto w-full shadow-sm">
                      <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead className="sticky top-0 z-10" style={{ backgroundColor: bgSubcard }}>
                          <tr className="text-theme-text text-[10px] font-extrabold uppercase tracking-wider" style={{ backgroundColor: bgSubcard }}>
                            <th className="pb-3.5 pt-3.5 px-4 text-left">Tipo de Reporte</th>
                            <th className="pb-3.5 pt-3.5 px-4 text-left">Periodo</th>
                            <th className="pb-3.5 pt-3.5 px-4 text-left">Rango de Fechas</th>
                            <th className="pb-3.5 pt-3.5 px-4 text-left">Registros</th>
                            <th className="pb-3.5 pt-3.5 px-4 text-right">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs" style={{ backgroundColor: 'var(--theme-surface)' }}>
                          <tr style={{ backgroundColor: 'var(--theme-surface)' }}>
                            <td colSpan={5} className="p-0 border-none" style={{ backgroundColor: 'var(--theme-surface)' }}>
                              <div className="h-[32rem] flex items-center justify-center" style={{ backgroundColor: 'var(--theme-surface)' }}>
                                <EmptyState
                                  icon={FileBarChart}
                                  title="Sin vista previa"
                                  description="Selecciona un tipo de reporte y presiona Generar Reporte para compilar los datos."
                                />
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Footer de Paginación Obligatorio (Sin datos) */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t" style={{ borderColor: borderSubtle }}>
                  <div className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                    <span>Mostrando <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>0</span> a <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>0</span> de <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>0</span> registros</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      disabled
                      className="px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5"
                      style={{
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
                      1 / 1
                    </div>

                    <button
                      disabled
                      className="px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5"
                      style={{
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
            )}
          </div>
        )}

        {/* Tab 2: Historial de Reportes Generados */}
        {activeTab === 'history' && (
          <div className="rounded-2xl p-6 space-y-5 transition-colors duration-200" style={{ backgroundColor: bgCard, border: `1px solid ${borderSubtle}`, boxShadow: cardShadow }}>
            {/* Header de Sección con Título y Subtítulo */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-extrabold text-theme-text tracking-wide uppercase">HISTORIAL DE REPORTES GENERADOS</h2>
                <p className="text-theme-text-muted text-[10px] mt-0.5 font-bold uppercase tracking-wider">REGISTRO HISTÓRICO Y MONITOREO DE REPORTES DESCARGABLES</p>
              </div>
            </div>

            {/* Filtros e información colocados ARRIBA del sub-card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 flex-grow">
                <div className="relative flex-grow max-w-xs">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Buscar por ID, nombre o usuario..."
                    className="w-full bg-theme-input border border-theme-border-subtle rounded-2xl pl-10 pr-3 py-2 text-xs text-theme-text placeholder:text-theme-text-muted outline-none focus:border-brand-500/40 transition-colors"
                  />
                </div>
                <Dropdown
                  options={ALL_TYPE_OPTIONS}
                  value={historyTypeFilter}
                  onChange={setHistoryTypeFilter}
                  className="w-56 text-xs"
                />
              </div>
              <span className="text-xs text-theme-text-muted font-mono font-medium shrink-0 bg-theme-input/70 px-4 py-2 rounded-2xl border border-theme-border-subtle shadow-xs">
                {historyReports.length} de {historyTotal} reportes
              </span>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border-[1.5px] transition-all duration-200 overflow-hidden w-full shadow-lg" style={{ borderColor: borderSubtle }}>
                {historyLoading ? (
                  <div className="p-6 space-y-2.5">
                    <div className="animate-shimmer rounded-lg h-12 w-full" />
                    <div className="animate-shimmer rounded-lg h-12 w-full" />
                    <div className="animate-shimmer rounded-lg h-12 w-full" />
                  </div>
                ) : (
                  <div className="overflow-x-auto w-full shadow-sm rounded-xl border border-slate-200">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                      <thead className="sticky top-0 z-10" style={{ backgroundColor: bgSubcard }}>
                        <tr className="text-theme-text text-[10px] font-extrabold uppercase tracking-wider" style={{ backgroundColor: bgSubcard }}>
                          <th className="pb-3.5 pt-3.5 px-4">ID</th>
                          <th className="pb-3.5 pt-3.5 px-4">Nombre del Reporte</th>
                          <th className="pb-3.5 pt-3.5 px-4">Tipo</th>
                          <th className="pb-3.5 pt-3.5 px-4">Generado en</th>
                          <th className="pb-3.5 pt-3.5 px-4">Usuario</th>
                          <th className="pb-3.5 pt-3.5 px-4">Estado</th>
                          <th className="pb-3.5 pt-3.5 px-4 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-theme-border-subtle text-xs" style={{ backgroundColor: 'var(--theme-surface)' }}>
                        {currentHistoryReports.map(item => (
                          <tr 
                            key={item.id} 
                            className="h-16 border-b transition-colors duration-150 hover:bg-theme-input/40 group"
                            style={{ backgroundColor: 'var(--theme-surface)', borderColor: borderSubtle }}
                          >
                            <td className="px-4 py-3.5 text-brand-400 font-mono font-bold">#{item.id}</td>
                            <td className="px-4 py-3.5 font-semibold text-theme-text">{item.nombre}</td>
                            <td className="px-4 py-3.5 text-theme-text-muted font-semibold uppercase">{item.type}</td>
                            <td className="px-4 py-3.5 text-theme-text-muted whitespace-nowrap">{item.created_at || 'N/A'}</td>
                            <td className="px-4 py-3.5 text-theme-text-muted font-medium">{item.generated_by_name}</td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981]">
                                Listo
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleViewReportDetail(item.id)}
                                  className="p-1.5 rounded-lg bg-theme-input hover:bg-brand-600/20 text-theme-text-muted hover:text-brand-300 border border-theme-border-subtle hover:border-brand-500/30 transition-all cursor-pointer"
                                  title="Ver reporte"
                                >
                                  <Eye size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRegenerateReport(item)}
                                  className="p-1.5 rounded-lg bg-theme-input hover:bg-blue-600/20 text-theme-text-muted hover:text-blue-300 border border-theme-border-subtle hover:border-blue-500/30 transition-all cursor-pointer"
                                  title="Regenerar reporte"
                                >
                                  <RefreshCw size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmReport(item)}
                                  className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-600/20 text-red-400 border border-red-500/30 transition-all cursor-pointer"
                                  title="Eliminar reporte"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {currentHistoryReports.length > 0 && Array.from({ length: ITEMS_PER_PAGE - currentHistoryReports.length }).map((_, i) => (
                          <tr key={`empty-${i}`} className="h-16 border-b border-transparent" style={{ backgroundColor: 'var(--theme-surface)' }}>
                            <td colSpan={7}></td>
                          </tr>
                        ))}
                        {historyReports.length === 0 && (
                          <tr style={{ backgroundColor: 'var(--theme-surface)' }}>
                            <td colSpan={7} className="p-0 border-none" style={{ backgroundColor: 'var(--theme-surface)' }}>
                              <div className="h-[32rem] flex items-center justify-center" style={{ backgroundColor: 'var(--theme-surface)' }}>
                                <EmptyState
                                  icon={Clock}
                                  title="Sin reportes generados"
                                  description="Los reportes que generes aparecerán aquí"
                                />
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Footer de Paginación */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t" style={{ borderColor: borderSubtle }}>
                {/* Lado izquierdo: Conteo */}
                <div className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                  {historyReports.length === 0 ? (
                    <span>Mostrando <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>0</span> a <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>0</span> de <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>0</span> registros</span>
                  ) : (
                    <span>Mostrando <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>{historyStartItem}</span> a <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>{historyEndItem}</span> de <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>{historyReports.length}</span> registros</span>
                  )}
                </div>

                {/* Lado derecho: Botones Anterior / Siguiente */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setHistoryPage(prev => Math.max(prev - 1, 1))}
                    disabled={historyPage === 1 || historyReports.length === 0}
                    className="px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5"
                    style={historyPage > 1 && historyReports.length > 0 ? {
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
                    {historyReports.length === 0 ? 1 : historyPage} / {totalHistoryPages}
                  </div>

                  <button
                    onClick={() => setHistoryPage(prev => Math.min(prev + 1, totalHistoryPages))}
                    disabled={historyPage >= totalHistoryPages || historyReports.length === 0}
                    className="px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5"
                    style={historyPage < totalHistoryPages && historyReports.length > 0 ? {
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
        )}

        {/* Tab 3: Reportes Programados */}
        {activeTab === 'scheduled' && (
          <div className="rounded-2xl p-6 space-y-5 transition-colors duration-200" style={{ backgroundColor: bgCard, border: `1px solid ${borderSubtle}`, boxShadow: cardShadow }}>
            {/* Título y botón de acción colocados ARRIBA del sub-card */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-extrabold text-theme-text tracking-wide uppercase">REPORTES PROGRAMADOS</h2>
                <p className="text-theme-text-muted text-[10px] mt-0.5 font-bold uppercase tracking-wider">AUTOMATIZACIÓN Y PROGRAMACIÓN DE ENVÍOS PERIÓDICOS</p>
              </div>
              <button
                type="button"
                onClick={openCreateScheduleModal}
                style={{ backgroundColor: colorPrimario || '#dc2626', color: '#ffffff' }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-md hover:opacity-90 active:scale-95"
              >
                <Plus size={14} /> Programar Reporte
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border-[1.5px] transition-all duration-200 overflow-hidden w-full shadow-lg" style={{ borderColor: borderSubtle }}>
                {scheduledLoading ? (
                  <div className="p-6 space-y-2.5">
                    <div className="animate-shimmer rounded-lg h-12 w-full" />
                    <div className="animate-shimmer rounded-lg h-12 w-full" />
                    <div className="animate-shimmer rounded-lg h-12 w-full" />
                  </div>
                ) : (
                  <div className="overflow-x-auto w-full shadow-sm rounded-xl border border-slate-200">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                      <thead className="sticky top-0 z-10" style={{ backgroundColor: bgSubcard }}>
                        <tr className="text-theme-text text-[10px] font-extrabold uppercase tracking-wider" style={{ backgroundColor: bgSubcard }}>
                          <th className="pb-3.5 pt-3.5 px-4">Nombre de la Programación</th>
                          <th className="pb-3.5 pt-3.5 px-4">Frecuencia de Envío</th>
                          <th className="pb-3.5 pt-3.5 px-4">Destinatarios</th>
                          <th className="pb-3.5 pt-3.5 px-4">Próxima Ejecución</th>
                          <th className="pb-3.5 pt-3.5 px-4">Formato</th>
                          <th className="pb-3.5 pt-3.5 px-4">Estado</th>
                          <th className="pb-3.5 pt-3.5 px-4 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-theme-border-subtle text-xs" style={{ backgroundColor: 'var(--theme-surface)' }}>
                        {currentScheduledList.map(item => (
                          <tr 
                            key={item.id} 
                            className="h-16 border-b transition-colors duration-150 hover:bg-theme-input/40 group"
                            style={{ backgroundColor: 'var(--theme-surface)', borderColor: borderSubtle }}
                          >
                            <td className="px-4 py-3.5 font-semibold text-theme-text">
                              <div>{item.name}</div>
                              <span className="text-[10px] text-brand-400 font-mono font-medium">{item.type_label || item.type}</span>
                            </td>
                            <td className="px-4 py-3 text-theme-text-muted whitespace-nowrap">
                              {item.freq_label}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                {(expandedEmails[item.id] ? item.emails : item.emails.slice(0, 2)).map((email, idx) => (
                                  <div key={idx} className="flex items-center gap-1.5 text-theme-text-muted">
                                    <Mail size={11} className="text-theme-text-muted shrink-0" />
                                    <span className="truncate max-w-[180px]">{email}</span>
                                  </div>
                                ))}
                                {item.emails.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => setExpandedEmails(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                                    className="text-[10px] text-brand-400 hover:text-brand-300 font-bold pl-4 text-left transition-colors cursor-pointer bg-transparent border-0 flex items-center gap-1 w-fit mt-0.5"
                                  >
                                    {expandedEmails[item.id] ? 'Ver menos' : `+${item.emails.length - 2} más`}
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="font-semibold text-theme-text">{item.next_run ? item.next_run.split(' ')[0] : 'N/A'}</div>
                              <div className="text-xs text-theme-text-muted font-medium mt-0.5">{item.next_run ? item.next_run.split(' ')[1] + ' hrs' : ''}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-lg border tracking-wide text-center min-w-[50px] ${
                                item.format === 'PDF' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                item.format === 'EXCEL' || item.format === 'Excel' ? 'bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981]' :
                                'bg-blue-500/10 border-blue-500/20 text-blue-400'
                              }`}>
                                {item.format}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                item.active
                                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                                  : 'bg-theme-input border-theme-border-subtle text-theme-text-muted'
                              }`}>
                                {item.active ? 'Activo' : 'Pausado'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {/* Editar */}
                                <button
                                  type="button"
                                  onClick={() => openEditScheduleModal(item)}
                                  className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 transition-all cursor-pointer"
                                  title="Editar programación"
                                >
                                  <Pencil size={13} />
                                </button>
                                {/* Pausar / Activar */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleScheduledStatus(item)}
                                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                    item.active
                                      ? 'bg-amber-500/10 hover:bg-amber-600/20 text-amber-400 border-amber-500/30'
                                      : 'bg-[#10B981]/10 hover:bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30'
                                  }`}
                                  title={item.active ? 'Pausar envío' : 'Activar envío'}
                                >
                                  {item.active ? <Pause size={13} /> : <Play size={13} />}
                                </button>
                                {/* Eliminar */}
                                <button
                                  type="button"
                                  onClick={() => setDeleteScheduleConfirm(item)}
                                  className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-600/20 text-red-400 border border-red-500/30 transition-all cursor-pointer"
                                  title="Eliminar programación"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {currentScheduledList.length > 0 && Array.from({ length: ITEMS_PER_PAGE - currentScheduledList.length }).map((_, i) => (
                          <tr key={`empty-${i}`} className="h-16 border-b border-transparent" style={{ backgroundColor: 'var(--theme-surface)' }}>
                            <td colSpan={7}></td>
                          </tr>
                        ))}
                        {scheduledList.length === 0 && (
                          <tr style={{ backgroundColor: 'var(--theme-surface)' }}>
                            <td colSpan={7} className="p-0 border-none" style={{ backgroundColor: 'var(--theme-surface)' }}>
                              <div className="h-[32rem] flex items-center justify-center" style={{ backgroundColor: 'var(--theme-surface)' }}>
                                <EmptyState
                                  icon={CalendarClock}
                                  title="Sin reportes programados"
                                  description="Programa reportes automáticos para recibirlos por correo"
                                />
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Footer de Paginación */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t" style={{ borderColor: borderSubtle }}>
                {/* Lado izquierdo: Conteo */}
                <div className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                  {scheduledList.length === 0 ? (
                    <span>Mostrando <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>0</span> a <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>0</span> de <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>0</span> registros</span>
                  ) : (
                    <span>Mostrando <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>{scheduledStartItem}</span> a <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>{scheduledEndItem}</span> de <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>{scheduledList.length}</span> registros</span>
                  )}
                </div>

                {/* Lado derecho: Botones Anterior / Siguiente */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setScheduledPage(prev => Math.max(prev - 1, 1))}
                    disabled={scheduledPage === 1 || scheduledList.length === 0}
                    className="px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5"
                    style={scheduledPage > 1 && scheduledList.length > 0 ? {
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
                    {scheduledList.length === 0 ? 1 : scheduledPage} / {totalScheduledPages}
                  </div>

                  <button
                    onClick={() => setScheduledPage(prev => Math.min(prev + 1, totalScheduledPages))}
                    disabled={scheduledPage >= totalScheduledPages || scheduledList.length === 0}
                    className="px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5"
                    style={scheduledPage < totalScheduledPages && scheduledList.length > 0 ? {
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
        )}
      </div>

      {/* Modal para "Ver" Detalle de Reporte del Historial */}
      {viewModalReport && (
        <Modal title={`Detalle del Reporte #${viewModalReport.id}`} onClose={() => setViewModalReport(null)}>
          {viewModalLoading ? (
            <div className="py-12 text-center space-y-2">
              <RefreshCw className="animate-spin text-brand-400 mx-auto" size={24} />
              <p className="text-xs text-theme-text-muted">Cargando reporte...</p>
            </div>
          ) : (
            <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
              <div className="flex justify-between items-center border-b border-theme-border-subtle pb-4">
                <div>
                  <h3 className="text-xl font-bold text-theme-text">{viewModalReport.nombre}</h3>
                  <p className="text-xs text-theme-text-muted font-mono mt-0.5">
                    Periodo: {viewModalReport.periodo} · Generado el {viewModalReport.created_at} por {viewModalReport.generated_by_name}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 max-md:flex-wrap">
                  <button
                    onClick={() => handleExportTarget(viewModalReport, 'PDF')}
                    className="flex items-center gap-1.5 text-xs bg-red-500 hover:bg-red-600 text-white font-bold px-4 max-md:px-3 py-2.5 max-md:py-1.5 rounded-xl shadow-md transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    PDF
                  </button>
                  <button
                    onClick={() => handleExportTarget(viewModalReport, 'Excel')}
                    className="flex items-center gap-1.5 text-xs bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 max-md:px-3 py-2.5 max-md:py-1.5 rounded-xl shadow-md transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Excel
                  </button>
                  <button
                    onClick={() => handleExportTarget(viewModalReport, 'CSV')}
                    className="flex items-center gap-1.5 text-xs bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 max-md:px-3 py-2.5 max-md:py-1.5 rounded-xl shadow-md transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    CSV
                  </button>
                  <button
                    onClick={() => handleExportTarget(viewModalReport, 'Imprimir')}
                    className="bg-amber-500/10 text-amber-300 text-xs font-bold px-3 py-1.5 rounded-lg border border-amber-500/25 hover:bg-amber-500/20"
                  >
                    Imprimir
                  </button>
                  <button
                    onClick={() => { setViewModalReport(null); handleOpenEmailModal(viewModalReport.id); }}
                    className="bg-brand-600 text-theme-text text-xs font-bold px-3 py-1.5 rounded-lg shadow-md hover:bg-brand-500"
                  >
                    Enviar
                  </button>
                </div>
              </div>

              {viewModalReport.data?.kpis && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(viewModalReport.data.kpis).map(([k, val], idx) => (
                    <div key={idx} className="bg-theme-card border border-theme-border-subtle rounded-xl p-3.5 space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-theme-text-muted">{k.replace(/_/g, ' ')}</span>
                      <p className="text-xl font-black text-brand-400 font-mono">
                        {typeof val === 'number' ? (k.includes('ventas') || k.includes('costo') || k.includes('ticket') || k.includes('monto') || k.includes('ingresos') ? fmt(val) : val) : val}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {viewModalReport.data?.headers && (
                <div className="bg-theme-surface rounded-xl shadow w-full">
                  <div className="overflow-x-auto w-full shadow-sm rounded-xl border border-slate-200">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead className="bg-theme-card">
                      <tr className="bg-theme-card">
                        {viewModalReport.data.headers.map((h, i) => (
                          <th key={i} className="text-theme-text-muted text-xs uppercase font-semibold tracking-wider px-4 py-3 text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-theme-border-subtle text-xs bg-theme-surface">
                      {viewModalReport.data.rows?.map((row, rowIdx) => (
                        <tr key={rowIdx} className="border-b border-[var(--theme-card)] hover:bg-[var(--theme-card)] transition-colors duration-150 group">
                          {row.map((cell, cellIdx) => (
                            <td key={cellIdx} className="text-theme-text px-4 py-3 font-medium">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}

      {/* Modal de Confirmación de Eliminación del Historial */}
      {deleteConfirmReport && (
        <Modal title="Confirmar Eliminación" onClose={() => setDeleteConfirmReport(null)}>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/25 rounded-xl">
              <AlertTriangle className="text-red-400 shrink-0" size={24} />
              <div>
                <p className="text-sm font-semibold text-red-300">¿Estás seguro de eliminar este reporte?</p>
                <p className="text-xs text-red-200/60 mt-0.5">
                  El reporte <span className="font-bold">"{deleteConfirmReport.nombre}"</span> (#{deleteConfirmReport.id}) será removido permanentemente.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmReport(null)}
                className="bg-theme-input hover:bg-theme-card border border-theme-border-subtle text-theme-text-muted hover:text-theme-text px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleDeleteReport}
                className="bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-theme-text px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-lg shadow-red-600/25 flex items-center gap-1.5"
              >
                {deleteLoading ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
                Eliminar Reporte
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de Confirmación de Eliminación de Reporte Programado */}
      {deleteScheduleConfirm && (
        <Modal title="Eliminar Reporte Programado" onClose={() => setDeleteScheduleConfirm(null)}>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/25 rounded-xl">
              <AlertTriangle className="text-red-400 shrink-0" size={24} />
              <div>
                <p className="text-sm font-semibold text-red-300">¿Eliminar la programación del reporte?</p>
                <p className="text-xs text-red-200/60 mt-0.5">
                  Se cancelará el envío automático de <span className="font-bold">"{deleteScheduleConfirm.name}"</span>.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteScheduleConfirm(null)}
                className="bg-theme-input hover:bg-theme-card border border-theme-border-subtle text-theme-text-muted hover:text-theme-text px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleteScheduleLoading}
                onClick={handleDeleteScheduledItem}
                className="bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-theme-text px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-lg shadow-red-600/25 flex items-center gap-1.5"
              >
                {deleteScheduleLoading ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
                Eliminar Programación
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal para Programar / Editar Reporte */}
      {isScheduleModalOpen && createPortal(
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-fadeIn"
          style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
          onClick={() => setIsScheduleModalOpen(false)}
        >
          <div 
            className="rounded-2xl w-full max-w-md shadow-2xl relative animate-scaleUp overflow-hidden text-left"
            style={{ backgroundColor: bgCard || 'var(--theme-surface, #FFFFFF)' }}
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
              <div className="flex items-center gap-2.5">
                {editingScheduleItem ? (
                  <Pencil size={18} style={{ color: 'var(--theme-primary-contrast, #ffffff)' }} />
                ) : (
                  <CalendarDays size={18} style={{ color: 'var(--theme-primary-contrast, #ffffff)' }} />
                )}
                <h3 className="text-base font-bold" style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}>
                  {editingScheduleItem ? 'Editar Programación de Reporte' : 'Programar Reporte Automático'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer"
                style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}
              >
                <X size={18} />
              </button>
            </div>
            
            <form 
              onSubmit={handleSaveScheduleSubmit} 
              className="p-6 space-y-4 border-x border-b border-theme-border-subtle rounded-b-2xl"
              style={{ borderColor: borderSubtle }}
            >
              {/* Nombre */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-theme-text-muted">
                    Nombre de la Programación <span className="text-red-400">*</span>
                  </label>
                  <span className="text-[10px] text-theme-text-muted font-mono">
                    {scheduleName.length}/100
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={100}
                  placeholder="Ej. Cierre Diario de Caja"
                  value={scheduleName}
                  onBlur={() => {
                    setScheduleTouched(prev => ({ ...prev, name: true }))
                    setScheduleName(prev => (prev || '').trim())
                  }}
                  onChange={(e) => {
                    setScheduleName(e.target.value)
                    if (scheduleErrors.name) {
                      setScheduleErrors(prev => ({ ...prev, name: undefined }))
                    }
                  }}
                  className={`w-full bg-slate-100 dark:bg-white/5 border rounded-xl px-4 py-2.5 text-sm text-theme-text focus:outline-none placeholder:text-theme-text-muted transition-all font-medium ${
                    (scheduleSubmitted || scheduleTouched.name) && scheduleErrors.name
                      ? '!border-rose-500 ring-1 ring-rose-500/20'
                      : 'border-gray-200 dark:border-white/10 hover:border-brand-500/50 focus:border-brand-500/50'
                  }`}
                />
                {(scheduleSubmitted || scheduleTouched.name) && scheduleErrors.name && (
                  <p className="text-rose-500 text-[11px] mt-1 flex items-center gap-1 animate-fadeIn">
                    {scheduleErrors.name}
                  </p>
                )}
              </div>

              {/* Tipo de Reporte */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-theme-text-muted">
                  Tipo de Reporte <span className="text-red-400">*</span>
                </label>
                <Dropdown
                  options={Object.entries(REPORT_TYPES).map(([k, v]) => ({
                    value: REPORT_TYPE_API_KEYS[k],
                    label: v
                  }))}
                  value={scheduleType}
                  onChange={(val) => {
                    if (val) {
                      setScheduleType(val)
                      if (scheduleErrors.type) {
                        setScheduleErrors(prev => ({ ...prev, type: undefined }))
                      }
                    }
                  }}
                  className="w-full"
                  hasError={(scheduleSubmitted || scheduleTouched.type) && Boolean(scheduleErrors.type)}
                />
                {(scheduleSubmitted || scheduleTouched.type) && scheduleErrors.type && (
                  <p className="text-rose-500 text-[11px] mt-1 flex items-center gap-1 animate-fadeIn">
                    {scheduleErrors.type}
                  </p>
                )}
              </div>

              {/* Frecuencia y Hora */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-theme-text-muted">
                    Frecuencia <span className="text-red-400">*</span>
                  </label>
                  <Dropdown
                    options={[
                      { value: 'diario', label: 'Diario' },
                      { value: 'semanal', label: 'Semanal' },
                      { value: 'mensual', label: 'Mensual' }
                    ]}
                    value={scheduleFrequency}
                    onChange={(val) => {
                      if (val) {
                        setScheduleFrequency(val)
                        if (scheduleErrors.frequency) {
                          setScheduleErrors(prev => ({ ...prev, frequency: undefined }))
                        }
                      }
                    }}
                    className="w-full"
                    hasError={(scheduleSubmitted || scheduleTouched.frequency) && Boolean(scheduleErrors.frequency)}
                  />
                  {(scheduleSubmitted || scheduleTouched.frequency) && scheduleErrors.frequency && (
                    <p className="text-rose-500 text-[11px] mt-1 flex items-center gap-1 animate-fadeIn">
                      {scheduleErrors.frequency}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-theme-text-muted">
                    Hora de Envío <span className="text-red-400">*</span>
                  </label>
                  <TimePicker
                    value={scheduleTime}
                    onChange={(val) => {
                      if (val) {
                        setScheduleTime(val)
                        if (scheduleErrors.time) {
                          setScheduleErrors(prev => ({ ...prev, time: undefined }))
                        }
                      }
                    }}
                    className="w-full"
                    fullWidth={true}
                  />
                  {(scheduleSubmitted || scheduleTouched.time) && scheduleErrors.time && (
                    <p className="text-rose-500 text-[11px] mt-1 flex items-center gap-1 animate-fadeIn">
                      {scheduleErrors.time}
                    </p>
                  )}
                </div>
              </div>

              {scheduleFrequency === 'semanal' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-theme-text-muted">Día de la Semana</label>
                  <Dropdown
                    options={['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(d => ({
                      value: d,
                      label: d
                    }))}
                    value={scheduleWeekday}
                    onChange={setScheduleWeekday}
                    className="w-full"
                  />
                </div>
              )}

              {scheduleFrequency === 'mensual' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-theme-text-muted">Día del Mes</label>
                  <Dropdown
                    options={Array.from({ length: 28 }, (_, i) => i + 1).map(d => ({
                      value: d,
                      label: `Día ${d}`
                    }))}
                    value={scheduleMonthDay}
                    onChange={setScheduleMonthDay}
                    className="w-full"
                  />
                </div>
              )}

              {/* Formato */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-theme-text-muted">
                  Formato de Exportación <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-2" role="radiogroup" aria-label="Formato de exportación">
                  {['PDF', 'Excel', 'CSV'].map(fmt => {
                    const isSelected = scheduleFormat.toUpperCase() === fmt.toUpperCase()
                    return (
                      <button
                        key={fmt}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => {
                          setScheduleFormat(fmt)
                          if (scheduleErrors.format) {
                            setScheduleErrors(prev => ({ ...prev, format: undefined }))
                          }
                        }}
                        className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-brand-600 border-brand-500 text-theme-text shadow-lg shadow-brand-600/15'
                            : 'bg-theme-input border-theme-border-subtle text-theme-text-muted hover:bg-theme-surface hover:text-theme-text'
                        }`}
                      >
                        {fmt}
                      </button>
                    )
                  })}
                </div>
                {(scheduleSubmitted || scheduleTouched.format) && scheduleErrors.format && (
                  <p className="text-rose-500 text-[11px] mt-1 flex items-center gap-1 animate-fadeIn">
                    {scheduleErrors.format}
                  </p>
                )}
              </div>

              {/* Destinatarios (Correos con píldoras) */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-theme-text-muted font-sans">
                    Destinatarios (Correos) <span className="text-red-400">*</span>
                  </label>
                  <span className="text-[10px] text-theme-text-muted">
                    {scheduleEmails.length} {scheduleEmails.length === 1 ? 'correo agregado' : 'correos agregados'}
                  </span>
                </div>

                {/* Input con botón para agregar */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" size={14} />
                    <input
                      type="email"
                      placeholder="ejemplo@restauranteaurum.com"
                      value={recipientEmailInput}
                      onChange={(e) => {
                        setRecipientEmailInput(e.target.value)
                        if (recipientEmailError) setRecipientEmailError('')
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddRecipientEmail(e)
                        }
                      }}
                      className={`w-full bg-slate-100 dark:bg-white/5 border rounded-xl pl-10 pr-4 py-2 text-xs text-theme-text focus:outline-none placeholder:text-theme-text-muted transition-all font-medium ${
                        recipientEmailError
                          ? '!border-rose-500 ring-1 ring-rose-500/20'
                          : 'border-gray-200 dark:border-white/10 hover:border-brand-500/50 focus:border-brand-500/50'
                      }`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddRecipientEmail}
                    className="flex items-center gap-1 px-3 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shrink-0 shadow-md shadow-brand-600/20"
                  >
                    <Plus size={13} /> Agregar Correo
                  </button>
                </div>

                {/* Mensaje de error al agregar correo inválido o repetido */}
                {recipientEmailError && (
                  <p className="text-rose-500 text-[11px] flex items-center gap-1 animate-fadeIn">
                    {recipientEmailError}
                  </p>
                )}

                {/* Píldoras de correos agregados */}
                {scheduleEmails.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1 max-h-32 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-theme-border-subtle">
                    {scheduleEmails.map((email, idx) => (
                      <span
                        key={`${email}-${idx}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-white/10 text-theme-text border border-gray-200 dark:border-white/10 shadow-2xs animate-fadeIn"
                      >
                        <Mail size={11} className="text-theme-text-muted" />
                        <span className="select-all">{email}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveRecipientEmail(email)}
                          className="text-theme-text-muted hover:text-rose-500 rounded-full p-0.5 transition-colors cursor-pointer"
                          title={`Eliminar ${email}`}
                          aria-label={`Eliminar ${email}`}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-theme-text-muted/70 italic">
                    Escribe un correo y presiona "Enter" o "+ Agregar Correo" para añadirlo a la lista.
                  </p>
                )}

                {/* Error si no hay correos al intentar enviar */}
                {(scheduleSubmitted || scheduleTouched.emails) && scheduleErrors.emails && scheduleEmails.length === 0 && (
                  <p className="text-rose-500 text-[11px] mt-1 flex items-center gap-1 animate-fadeIn">
                    {scheduleErrors.emails}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="bg-theme-input hover:bg-theme-card border border-theme-border-subtle text-theme-text-muted hover:text-theme-text px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saveScheduleLoading}
                  className="bg-brand-600 hover:bg-brand-500 disabled:bg-brand-800 text-theme-text px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-lg shadow-brand-600/25 flex items-center gap-1.5"
                >
                  {saveScheduleLoading ? <RefreshCw size={12} className="animate-spin" /> : null}
                  {editingScheduleItem ? 'Guardar Cambios' : 'Crear Programación'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal para Enviar por Correo */}
      {isEmailModalOpen && createPortal(
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-fadeIn"
          style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
          onClick={() => setIsEmailModalOpen(false)}
        >
          <div 
            className="rounded-2xl w-full max-w-md shadow-2xl relative animate-scaleUp overflow-hidden text-left"
            style={{ backgroundColor: bgCard || 'var(--theme-surface, #FFFFFF)' }}
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
              <div className="flex items-center gap-2.5">
                <Mail size={18} style={{ color: 'var(--theme-primary-contrast, #ffffff)' }} />
                <h3 className="text-base font-bold" style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}>Enviar Reporte por Correo</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEmailModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer"
                style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}
              >
                <X size={18} />
              </button>
            </div>
            
            <div 
              className="p-6 border-x border-b border-theme-border-subtle rounded-b-2xl"
              style={{ borderColor: borderSubtle }}
            >
              <p className="text-xs text-theme-text-muted leading-relaxed mb-4">
                Se enviará el reporte a las direcciones especificadas.
              </p>

              <form onSubmit={handleSendReportByEmail} className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-theme-text-muted">Destinatarios</label>
                  <button
                    type="button"
                    onClick={() => setSendEmailsList(prev => [...prev, ''])}
                    className="flex items-center gap-1 text-xs font-bold text-brand-400 hover:text-brand-300 transition-colors cursor-pointer bg-transparent border-0"
                  >
                    <Plus size={12} /> Agregar correo
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-theme-border-subtle">
                  {sendEmailsList.map((emailVal, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
                        <input
                          type="email"
                          required
                          placeholder="correo@ejemplo.com"
                          value={emailVal}
                          onChange={(e) => {
                            const val = e.target.value
                            setSendEmailsList(prev => prev.map((item, i) => i === idx ? val : item))
                          }}
                          className="w-full bg-slate-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-theme-text focus:outline-none focus:border-brand-500/40 placeholder:text-theme-text-muted transition-all"
                        />
                      </div>
                      {sendEmailsList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setSendEmailsList(prev => prev.filter((_, i) => i !== idx))}
                          className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 transition-all cursor-pointer shrink-0"
                          title="Eliminar"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {emailErrors.length > 0 && (
                  <div className="text-[11px] text-red-400 space-y-0.5 font-medium pt-1">
                    {emailErrors.map((err, i) => (
                      <p key={i}>• {err}</p>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-theme-border-subtle">
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(false)}
                  className="bg-theme-input hover:bg-theme-card border border-theme-border-subtle text-theme-text-muted hover:text-theme-text px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={sendLoading}
                  className="bg-brand-600 hover:bg-brand-500 disabled:bg-brand-800 text-theme-text px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-lg shadow-brand-600/25 flex items-center gap-1.5"
                >
                  {sendLoading ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" /> Enviando...
                    </>
                  ) : (
                    'Enviar Reporte'
                  )}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
