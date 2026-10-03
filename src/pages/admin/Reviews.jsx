import { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Star,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Search,
  Download,
  Eye,
  Image as ImageIcon,
  User,
  Mail,
  Phone,
  Calendar,
  X,
  Send,
  Flag,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  Check,
  Info,
  Clock,
  ListFilter
} from 'lucide-react'
import * as XLSX from 'xlsx'

import PageHeader from '../../components/ui/PageHeader'
import ScrollHint from '../../components/ui/ScrollHint'
import DatePicker from '../../components/ui/DatePicker'
import Toast from '../../components/ui/Toast'
import Dropdown from '../../components/ui/Dropdown'
import StatCard from '../../components/ui/StatCard'
import MetricCardsLayout from '../../components/ui/MetricCardsLayout'
import Table from '../../components/ui/Table'
import EmptyState from '../../components/ui/EmptyState'
import LoaderGlobal from '../../components/ui/LoaderGlobal'
import { useTheme } from '../../context/ThemeContext'
import {
  adminGetReviews,
  adminRespondReview,
  adminReportReview,
  adminDeleteReview
} from '../../api/reviews'

const ITEMS_PER_PAGE = 8

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Todos los Estados" },
  { value: "pendiente", label: "Pendientes" },
  { value: "respondida", label: "Respondidas" },
  { value: "reportada", label: "Reportadas" }
]

const ORIGIN_FILTER_OPTIONS = [
  { value: "all", label: "Todos los Orígenes" },
  { value: "consumo", label: "Consumo en Local" },
  { value: "delivery", label: "Delivery" },
  { value: "reservacion", label: "Reservación" }
]

// 1. Función para estandarizar folios de reseñas (prefijo COM)
export const formatearFolioResena = (folioOriginal, fechaCreacion) => {
  if (!folioOriginal) return 'COM000000000000'
  const strFolio = String(folioOriginal)

  // Si ya es un folio nuevo (más de 10 caracteres y sin guiones), pasa directo
  if (strFolio.length > 10 && !strFolio.includes('-')) {
    return strFolio
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

  // Rescatamos los dígitos finales (4 dígitos)
  const numeros = (strFolio.replace(/\D/g, '').slice(-4) || '0').padStart(4, '0')

  // Construimos el string unificado con prefijo COM
  return `COM${strFecha}${numeros}`
}

export default function Reviews() {
  const { colorPrimario, bgCard, bgSubcard, bgTable, bgInput, borderSubtle, cardShadow } = useTheme()
  const [reviewsScrolled, setReviewsScrolled] = useState(false)
  const reviewsScrollRef = useRef(null)

  // Data states from backend
  const [reviewsList, setReviewsList] = useState([])
  const [resumen, setResumen] = useState({
    calificacion_promedio: 0.0,
    por_responder: 0,
    total_resenas: 0,
    reportadas: 0,
    exp_verificadas: 0,
    distribucion: { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 }
  })

  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  // Filter & Search states
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [starFilter, setStarFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [originFilter, setOriginFilter] = useState('all')
  const [imageFilter, setImageFilter] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, starFilter, statusFilter, originFilter, imageFilter, startDate, endDate])

  // Expanded comment state per review ID in table
  const [expandedComments, setExpandedComments] = useState({})

  // Detail Modal State
  const [selectedReviewId, setSelectedReviewId] = useState(null)
  const [detailData, setDetailData] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Response text inside detail modal
  const [replyText, setReplyText] = useState('')
  const [errorValidacion, setErrorValidacion] = useState('')
  const [textoPositivo, setTextoPositivo] = useState('')
  const [textoNegativo, setTextoNegativo] = useState('')
  const [submittingAction, setSubmittingAction] = useState(false)

  // Real-time validation for reply text
  const validarRespuesta = (texto) => {
    setReplyText(texto)
    const trimmed = texto.trim()
    if (trimmed.length === 0) {
      setErrorValidacion("La respuesta no puede estar vacía.")
    } else if (trimmed.length < 10) {
      setErrorValidacion("La respuesta es muy corta (mínimo 10 caracteres).")
    } else if (trimmed.length > 500) {
      setErrorValidacion("La respuesta excede el límite de 500 caracteres.")
    } else {
      setErrorValidacion("") // Válido
    }
  }

  // Photo Lightbox state
  const [activeLightbox, setActiveLightbox] = useState(null)

  // Debounce search input (400ms) con validación de .trim() y mínimo 3 caracteres
  useEffect(() => {
    const handler = setTimeout(() => {
      const trimmed = search.trim()
      if (trimmed.length === 0) {
        setDebouncedSearch('')
      } else if (trimmed.length >= 3) {
        setDebouncedSearch(trimmed)
      } else {
        // Menos de 3 caracteres: no disparar consulta para cadenas cortas
        setDebouncedSearch('')
      }
    }, 400)
    return () => clearTimeout(handler)
  }, [search])

  // Dynamic rating distribution calculation from backend
  const distribucionData = useMemo(() => {
    const totalCount = resumen.total_resenas ?? resumen.exp_verificadas ?? 0
    const rawDist = resumen.distribucion

    if (Array.isArray(rawDist) && rawDist.length > 0) {
      return rawDist.map(item => ({
        nivel: item.nivel ?? item.rating ?? 5,
        cantidad: Number(item.cantidad ?? item.count ?? 0),
        porcentaje: Number(item.porcentaje ?? (totalCount > 0 ? Math.round(((item.cantidad ?? 0) / totalCount) * 100) : 0))
      }))
    }

    return [5, 4, 3, 2, 1].map(star => {
      const count = rawDist && typeof rawDist === 'object' ? Number(rawDist[String(star)] ?? rawDist[star] ?? 0) : 0
      const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0
      return {
        nivel: star,
        cantidad: count,
        porcentaje: pct
      }
    })
  }, [resumen])

  // Fetch reviews from backend whenever filters change
  const fetchReviewsData = async () => {
    try {
      setLoading(true)
      const params = {}
      const trimmedSearch = (debouncedSearch || '').trim()
      if (trimmedSearch.length >= 3) {
        params.search = trimmedSearch
      }
      if (starFilter !== 'all') params.rating = starFilter
      if (statusFilter !== 'all') params.estado = statusFilter
      if (originFilter !== 'all') params.origen = originFilter
      if (imageFilter) params.con_imagenes = true
      if (startDate) params.fecha_inicio = startDate
      if (endDate && (!startDate || endDate >= startDate)) {
        params.fecha_fin = endDate
      }

      const res = await adminGetReviews(params)
      if (res.data) {
        setReviewsList(res.data.reviews || [])
        if (res.data.resumen) {
          setResumen(res.data.resumen)
        }
      }
    } catch (e) {
      console.error("Error al cargar reseñas del backend:", e)
      setToast({ message: "Error al cargar las reseñas desde el servidor", type: "error" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReviewsData()
  }, [debouncedSearch, starFilter, statusFilter, originFilter, imageFilter, startDate, endDate])

  // Open Detail Modal Handler (Carga directa de datos en memoria sin petición extra)
  const handleOpenDetailModal = (review) => {
    if (!review) return
    const reviewFolio = formatearFolioResena(review.folio || `COM-${String(review.id).padStart(4, '0')}`, review.created_at)
    
    const rawImages = review.images || review.fotos || review.imagenes || []
    const cleanImages = rawImages.map(img => typeof img === 'string' ? img : (img?.url || img?.path || '')).filter(Boolean)

    const normalized = {
      ...review,
      id: review.id,
      folio: reviewFolio,
      customer_name: review.customer_name || review.nombre || review.cliente_nombre || 'Cliente General',
      customer_email: review.customer_email || review.correo || '',
      customer_phone: review.customer_phone || review.telefono || '',
      rating: Number(review.rating || 5),
      comment: review.comment || review.comentario || '',
      origen: review.origen || 'local',
      estado: review.estado || (review.is_approved ? 'aprobada' : 'pendiente'),
      images: cleanImages,
      created_at: review.created_at || '',
      respuesta: review.respuesta || (review.response ? { texto: review.response } : null),
      operacion: review.operacion || (review.order_id ? { tipo: 'pedido', folio: `PED-${review.order_id}` } : null)
    }

    const clientName = normalized.customer_name || 'Cliente'
    setTextoPositivo(`Muchas gracias por tu visita ${clientName}. Nos alegra mucho saber que disfrutaste la experiencia. ¡Esperamos verte pronto de regreso!`)
    setTextoNegativo(`Estimado/a ${clientName}, lamentamos que tu experiencia no haya sido la esperada. Nos comprometemos a mejorar y nos gustaría conocer más detalles. Te invitamos a contactarnos directamente.`)

    setSelectedReviewId(review.id)
    setDetailData(normalized)
    setLoadingDetail(false)
    const initialText = normalized.respuesta?.texto || ''
    setReplyText(initialText)
    if (initialText.trim().length > 0) {
      if (initialText.trim().length < 10) {
        setErrorValidacion("La respuesta es muy corta (mínimo 10 caracteres).")
      } else if (initialText.trim().length > 500) {
        setErrorValidacion("La respuesta excede el límite de 500 caracteres.")
      } else {
        setErrorValidacion("")
      }
    } else {
      setErrorValidacion("")
    }
  }

  // Load Template Handlers
  const handleLoadPositiveTemplate = () => {
    validarRespuesta(textoPositivo)
    setToast({ message: "Plantilla positiva aplicada al editor", type: "success" })
  }

  const handleLoadNegativeTemplate = () => {
    validarRespuesta(textoNegativo)
    setToast({ message: "Plantilla de atención aplicada al editor", type: "success" })
  }

  // Save / Respond Handler (Guarda y automáticamente marca como respondida/atendida)
  const handleSaveResponse = async () => {
    if (!detailData) return
    const trimmed = replyText.trim()
    if (trimmed.length === 0) {
      setErrorValidacion("La respuesta no puede estar vacía.")
      setToast({ message: "Por favor escribe una respuesta antes de guardar", type: "error" })
      return
    }
    if (trimmed.length < 10) {
      setErrorValidacion("La respuesta es muy corta (mínimo 10 caracteres).")
      setToast({ message: "La respuesta es muy corta (mínimo 10 caracteres)", type: "error" })
      return
    }
    if (trimmed.length > 500) {
      setErrorValidacion("La respuesta excede el límite de 500 caracteres.")
      setToast({ message: "La respuesta excede el límite de 500 caracteres", type: "error" })
      return
    }

    try {
      setSubmittingAction(true)
      await adminRespondReview(detailData.id, { response: trimmed })
      setToast({
        message: "Respuesta guardada y reseña marcada como atendida",
        type: "success"
      })
      setSelectedReviewId(null)
      setDetailData(null)
      setReplyText('')
      setErrorValidacion('')
      fetchReviewsData()
    } catch (err) {
      console.error("Error guardando respuesta:", err)
      const msg = err.response?.data?.message || "No se pudo guardar la respuesta"
      setToast({ message: msg, type: "error" })
    } finally {
      setSubmittingAction(false)
    }
  }

  // Report Handler
  const handleReportReview = async () => {
    if (!detailData) return
    if (!window.confirm(`¿Estás seguro de reportar el comentario de "${detailData.customer_name}"?`)) {
      return
    }

    try {
      setSubmittingAction(true)
      await adminReportReview(detailData.id)
      setToast({ message: "Comentario reportado correctamente", type: "success" })
      setSelectedReviewId(null)
      setDetailData(null)
      fetchReviewsData()
    } catch (err) {
      console.error("Error reportando reseña:", err)
      setToast({ message: "Error al reportar el comentario", type: "error" })
    } finally {
      setSubmittingAction(false)
    }
  }

  // Delete Action Handler (from table)
  const handleDeleteReview = async (reviewId, customerName) => {
    if (!window.confirm("¿Eliminar reseña?")) {
      return
    }

    try {
      // Optimistic update: retirar de la lista inmediatamente para bajarla de la vista
      setReviewsList(prev => prev.filter(r => r.id !== reviewId))
      await adminDeleteReview(reviewId)
      setToast({ message: "Reseña eliminada correctamente", type: "success" })
      if (selectedReviewId === reviewId) {
        setSelectedReviewId(null)
        setDetailData(null)
      }
      fetchReviewsData()
    } catch (err) {
      console.error("Error eliminando reseña:", err)
      setToast({ message: "Error al eliminar la reseña", type: "error" })
      fetchReviewsData()
    }
  }

  // Clear all filters
  const handleClearAllFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setStarFilter('all')
    setStatusFilter('all')
    setOriginFilter('all')
    setImageFilter(false)
    setStartDate('')
    setEndDate('')
  }

  // Handle start date change: reset endDate if it becomes invalid (< startDate)
  const handleStartDateChange = (val) => {
    setStartDate(val)
    if (val && endDate && endDate < val) {
      setEndDate('')
    }
  }

  // Buscador reactivo por nombre, comentario y folio para la tabla
  const filteredReviewsList = useMemo(() => {
    if (!Array.isArray(reviewsList)) return []
    const term = search.trim().toLowerCase()
    if (!term) return reviewsList
    return reviewsList.filter(r => {
      const name = (r.customer_name || r.nombre || '').toLowerCase()
      const comment = (r.comment || r.comentario || '').toLowerCase()
      const folio = (r.folio || '').toLowerCase()
      const status = (r.estado || '').toLowerCase()
      return name.includes(term) || comment.includes(term) || folio.includes(term) || status.includes(term)
    })
  }, [reviewsList, search])

  const hasReviewsData = Array.isArray(filteredReviewsList) && filteredReviewsList.length > 0

  // Pagination calculations
  const totalPages = Math.ceil(filteredReviewsList.length / ITEMS_PER_PAGE) || 1
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE
  const indexOfFirstItem = (currentPage - 1) * ITEMS_PER_PAGE
  const currentReviews = (Array.isArray(filteredReviewsList) ? filteredReviewsList : []).slice(indexOfFirstItem, indexOfLastItem)
  const startItem = filteredReviewsList.length === 0 ? 0 : indexOfFirstItem + 1
  const endItem = Math.min(indexOfLastItem, filteredReviewsList.length)

  // Export Handlers with Empty Table Validation
  const handleExportCSV = () => {
    if (!hasReviewsData) {
      setToast({ message: "No hay datos disponibles para exportar", type: "error" })
      return
    }

    const headers = [
      "ID",
      "Folio",
      "Cliente",
      "Calificación",
      "Comentario",
      "Origen",
      "Estado",
      "Respuesta",
      "Fecha"
    ]

    const rows = reviewsList.map(r => [
      r.id,
      formatearFolioResena(r.folio || `COM-${String(r.id).padStart(4, '0')}`, r.created_at),
      r.customer_name || r.nombre,
      `${r.rating} estrellas`,
      r.comment || r.comentario,
      r.origen || 'local',
      r.estado || 'pendiente',
      r.response || '',
      r.created_at
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => {
        const text = String(val ?? '').replace(/"/g, '""')
        return text.includes(',') || text.includes('\n') || text.includes('"') ? `"${text}"` : text
      }).join(","))
    ].join("\n")

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `aurum_reseñas_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setToast({ message: "Reseñas exportadas en CSV correctamente", type: "success" })
  }

  const handleExportExcel = () => {
    if (!hasReviewsData) {
      setToast({ message: "No hay datos disponibles para exportar", type: "error" })
      return
    }

    const data = reviewsList.map(r => ({
      'ID': r.id,
      'Folio': formatearFolioResena(r.folio || `COM-${String(r.id).padStart(4, '0')}`, r.created_at),
      'Cliente': r.customer_name || r.nombre,
      'Calificación': `${r.rating}★`,
      'Comentario': r.comment || r.comentario,
      'Origen': r.origen || 'local',
      'Estado': (r.estado || 'pendiente').toUpperCase(),
      'Respuesta': r.response || '',
      'Fecha': r.created_at
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Reseñas')
    const fileName = `aurum_reseñas_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)

    setToast({ message: "Reseñas exportadas en Excel correctamente", type: "success" })
  }

  const handleExportPDF = () => {
    if (!hasReviewsData) {
      setToast({ message: "No hay datos disponibles para exportar", type: "error" })
      return
    }

    window.print()
    setToast({ message: "Vista de impresión activada", type: "success" })
  }

  // Star visual renderer
  const renderStars = (rating, size = 14) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            size={size}
            className={`${
              s <= rating 
                ? 'text-yellow-400 fill-yellow-400 filter drop-shadow-[0_0_2px_rgba(250,204,21,0.5)]' 
                : 'text-theme-text-muted opacity-20'
            }`}
          />
        ))}
      </div>
    )
  }

  // Status badge renderer: Pendiente (amarillo), Respondida (verde), Reportada (rojo)
  const renderStatusBadge = (estado) => {
    const statusLower = (estado || 'pendiente').toLowerCase()
    if (statusLower === 'respondida') {
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          Respondida
        </span>
      )
    }
    if (statusLower === 'reportada') {
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-500/15 text-red-300 border border-red-500/30 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
          Reportada
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
        Pendiente
      </span>
    )
  }

  // Origin badge renderer
  const renderOriginBadge = (origen) => {
    const origLower = (origen || 'consumo').toLowerCase()
    if (origLower === 'delivery') {
      return (
        <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 whitespace-nowrap">
          Delivery
        </span>
      )
    }
    if (origLower === 'reservacion' || origLower === 'reservación') {
      return (
        <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 whitespace-nowrap">
          Reservación
        </span>
      )
    }
    return (
      <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 whitespace-nowrap">
        Consumo Local
      </span>
    )
  }

  return (
    <div className="space-y-6 pb-12 p-4 md:p-6 lg:p-8 animate-fadeIn font-sans text-theme-text">
      <PageHeader 
        title="Reseñas" 
        description="Administra los comentarios, valoraciones y opiniones de los clientes."
      />

      {/* 1. Nuevas 4 Tarjetas de Resumen KPI */}
      <div className="rounded-2xl p-6 border transition-colors duration-200 overflow-hidden" style={{ backgroundColor: bgCard, borderColor: borderSubtle, boxShadow: cardShadow }}>
        <MetricCardsLayout>
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
                title="Promedio de Calificación"
                value={resumen.calificacion_promedio ? resumen.calificacion_promedio.toFixed(1) : '0.0'}
                subtitle="Valoración general"
                icon={Star}
                color="yellow"
              />
              <StatCard
                title="Total Reseñas"
                value={resumen.total_resenas ?? resumen.exp_verificadas ?? 0}
                subtitle="Registradas por clientes"
                icon={MessageSquare}
                color="blue"
              />
              <StatCard
                title="Por Responder"
                value={resumen.por_responder || 0}
                subtitle="Pendientes de respuesta"
                icon={Clock}
                color="green"
              />
              <StatCard
                title="Reportadas"
                value={resumen.reportadas || 0}
                subtitle="Marcadas para revisión"
                icon={AlertTriangle}
                color="red"
              />
            </>
          )}
        </MetricCardsLayout>
      </div>

      {/* 2. Distribución de Calificaciones (Card) */}
      <div className="rounded-2xl p-6 border transition-colors duration-200 animate-fadeInUp" style={{ backgroundColor: bgCard, borderColor: borderSubtle, boxShadow: cardShadow }}>
        <div className="border rounded-2xl p-6 transition-colors duration-200" style={{ backgroundColor: bgSubcard, borderColor: borderSubtle }}>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Summary Left Skeleton */}
              <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-theme-border-subtle pb-6 md:pb-0 md:pr-6 flex flex-col items-center md:items-start justify-center space-y-3">
                <div className="animate-shimmer rounded-lg h-4 w-36" />
                <div className="animate-shimmer rounded-xl h-12 w-28" />
                <div className="animate-shimmer rounded-lg h-5 w-32" />
                <div className="animate-shimmer rounded-lg h-4 w-48" />
              </div>

              {/* Bars Right Skeleton */}
              <div className="md:col-span-8 space-y-3">
                <div className="animate-shimmer rounded-lg h-4 w-48 mb-3" />
                <div className="space-y-3">
                  {[5, 4, 3, 2, 1].map((star) => (
                    <div key={star} className="flex items-center gap-2">
                      <div className="animate-shimmer rounded-md h-4 w-8 shrink-0" />
                      <div className="animate-shimmer rounded-full h-3 flex-1" />
                      <div className="animate-shimmer rounded-md h-4 w-16 shrink-0" />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end pt-1">
                  <div className="animate-shimmer rounded-lg h-3 w-56" />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Summary Left */}
              <div className="md:col-span-4 text-center md:text-left border-b md:border-b-0 md:border-r border-theme-border-subtle pb-6 md:pb-0 md:pr-6 flex flex-col items-center md:items-start justify-center">
                <h3 className="text-xs font-bold text-theme-text-muted tracking-wider uppercase mb-2 select-none">
                  Calificación General
                </h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold text-theme-text">
                    {resumen.calificacion_promedio ? resumen.calificacion_promedio.toFixed(1) : '0.0'}
                  </span>
                  <span className="text-sm text-theme-text-muted font-medium">/ 5.0</span>
                </div>
                <div className="mt-2">
                  {renderStars(Math.round(resumen.calificacion_promedio || 0), 18)}
                </div>
                <p className="text-xs text-theme-text-muted mt-3 leading-relaxed">
                  Basado en <span className="text-theme-text font-semibold">{resumen.total_resenas ?? resumen.exp_verificadas ?? 0}</span> opiniones registradas.
                </p>
              </div>

              {/* Bars Right */}
              <div className="md:col-span-8 space-y-3">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white tracking-widest uppercase mb-3 select-none">
                  Distribución de Calificaciones
                </h3>
                
                <div className="flex flex-col gap-2.5">
                  {distribucionData.map((item) => (
                    <div 
                      key={`star-${item.nivel}`} 
                      onClick={() => setStarFilter(starFilter === String(item.nivel) ? 'all' : String(item.nivel))}
                      className="flex items-center gap-3 text-sm group cursor-pointer"
                    >
                      {/* Nivel de estrellas (5★, 4★, etc.) */}
                      <span 
                        className={`w-8 font-bold flex items-center gap-1 font-mono transition-colors select-none shrink-0 ${
                          starFilter === String(item.nivel)
                            ? 'font-extrabold scale-105'
                            : 'text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white'
                        }`}
                        style={starFilter === String(item.nivel) ? { color: colorPrimario } : {}}
                      >
                        {item.nivel}
                        <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </span>
                      
                      {/* La barra de progreso (Fondo gris con borde sutil delimitador) */}
                      <div className="flex-1 h-3 bg-slate-200/80 dark:bg-white/10 rounded-full overflow-hidden relative border border-slate-300 dark:border-slate-600/80 shadow-inner">
                        {/* EL RELLENO DINÁMICO (Barra amarilla) */}
                        <div 
                          className="absolute top-0 left-0 h-full bg-amber-400 rounded-full transition-all duration-1000 ease-out group-hover:bg-amber-500 shadow-xs"
                          style={{ width: `${item.porcentaje}%` }}
                        />
                      </div>
                      
                      {/* Porcentaje y cantidad exacta */}
                      <div className="w-20 text-right flex items-center justify-end gap-1.5 font-mono select-none shrink-0">
                        <span className="font-bold text-xs text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">
                          {item.porcentaje}%
                        </span>
                        <span className="text-slate-400 dark:text-slate-500 text-[10px]">
                          ({item.cantidad})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <p className="text-right text-[10px] text-slate-500 dark:text-slate-400 mt-3 select-none">
                  Haz clic en cualquier estrella para filtrar la tabla por rating.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Combined Table Container (Estructura 1 - Tabla Completa con Filtros) */}
      <div className="rounded-2xl p-6 max-md:p-3 transition-colors duration-200 animate-fadeInUp" style={{ backgroundColor: bgCard, border: `1px solid ${borderSubtle}`, boxShadow: cardShadow }}>
        <div className="flex flex-col space-y-4 max-md:space-y-3">
          {/* Encabezado de Sección */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-md:gap-3">
            <div>
              <h2 className="text-sm font-bold text-theme-text tracking-wide uppercase">Registro de Reseñas</h2>
              <p className="text-theme-text-muted text-[10px] mt-0.5 font-bold uppercase tracking-wider">Opiniones y valoraciones de los clientes</p>
            </div>
          </div>

          {/* Row 1: Buscador + Botones de Exportación */}
          <div className="flex flex-col md:flex-row max-md:flex-col items-center gap-3 max-md:gap-3 w-full">
            <div className="relative flex-1 w-full min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por cliente, comentario, folio o pedido..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ backgroundColor: bgInput }}
                className="pl-10 pr-4 py-2.5 border border-transparent rounded-xl text-sm text-theme-text placeholder-theme-text-muted/60 focus:outline-none focus:border-brand-500/50 w-full transition-all"
              />
              {search && (
                <button 
                  onClick={() => {
                    setSearch('')
                    setDebouncedSearch('')
                  }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-theme-text-muted hover:text-theme-text transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Botones de Exportación */}
            <div className="flex flex-col w-full md:w-auto items-end max-md:items-start gap-1.5 self-end md:self-auto">
              <div className="flex items-center gap-2 max-md:flex-wrap max-md:gap-1.5 w-full">
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 text-sm font-medium rounded-lg shadow-md transition-all duration-200 cursor-pointer opacity-100 shrink-0 max-md:flex-1 max-md:justify-center text-xs"
                  title="Exportar a Excel"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span>Excel</span>
                </button>
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 text-sm font-medium rounded-lg shadow-md transition-all duration-200 cursor-pointer opacity-100 shrink-0 max-md:flex-1 max-md:justify-center text-xs"
                  title="Exportar a CSV"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 text-sm font-medium rounded-lg shadow-md transition-all duration-200 cursor-pointer opacity-100 shrink-0 max-md:flex-1 max-md:justify-center text-xs"
                  title="Imprimir PDF"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span>PDF</span>
                </button>
              </div>
              <p className="text-theme-text-muted text-[9px] font-semibold tracking-wide uppercase select-none">
                Exporta la lista filtrada a Excel, CSV o PDF
              </p>
            </div>
          </div>

          {/* Row 2: Selectores, Toggles & Date Range (Sin bordes negros) */}
          <div className="flex flex-wrap items-center gap-3 max-md:gap-2 w-full pt-1">
            <div className="flex flex-wrap max-md:flex-col items-start max-md:items-stretch gap-3 max-md:gap-2 w-full lg:w-auto">
              {/* Star buttons Badges */}
              <div className="flex items-center gap-1.5 max-md:flex-nowrap max-md:overflow-x-auto max-md:pb-3 hide-scrollbar w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setStarFilter('all')}
                  style={
                    starFilter === 'all'
                      ? { backgroundColor: colorPrimario || '#dc2626', color: '#ffffff' }
                      : { backgroundColor: colorPrimario ? `${colorPrimario}18` : 'rgba(220, 38, 38, 0.12)', color: colorPrimario || '#b91c1c' }
                  }
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1 shadow-xs whitespace-nowrap shrink-0 hover:opacity-90"
                >
                  <span>Todas</span>
                  <span className="font-sans">★</span>
                </button>
                {[5, 4, 3, 2, 1].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStarFilter(String(s))}
                    style={
                      starFilter === String(s)
                        ? { backgroundColor: colorPrimario || '#dc2626', color: '#ffffff' }
                        : { backgroundColor: colorPrimario ? `${colorPrimario}18` : 'rgba(220, 38, 38, 0.12)', color: colorPrimario || '#b91c1c' }
                    }
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1 shadow-xs whitespace-nowrap shrink-0 hover:opacity-90"
                  >
                    <span>{s}</span>
                    <Star size={11} style={starFilter === String(s) ? { fill: '#ffffff', color: '#ffffff' } : { fill: colorPrimario || '#b91c1c', color: colorPrimario || '#b91c1c' }} />
                  </button>
                ))}
              </div>

              {/* Status Dropdown */}
              <Dropdown
                options={STATUS_FILTER_OPTIONS}
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="Todos los Estados"
                className="w-full sm:w-48 text-xs shrink-0"
              />

              {/* Origin Dropdown */}
              <Dropdown
                options={ORIGIN_FILTER_OPTIONS}
                value={originFilter}
                onChange={setOriginFilter}
                placeholder="Todos los Orígenes"
                className="w-full sm:w-48 text-xs shrink-0"
              />

              {/* Con imágenes toggle sin borde negro */}
              <div 
                onClick={() => setImageFilter(!imageFilter)}
                className="flex items-center gap-3 border border-transparent transition-all rounded-xl px-3.5 py-2.5 cursor-pointer select-none max-md:w-full shrink-0"
                style={{ backgroundColor: bgInput }}
              >
                <span className="text-[11px] font-semibold flex items-center gap-1.5 text-theme-text flex-1">
                  <ImageIcon size={13} className="text-theme-text-muted" /> Con imágenes
                </span>
                <button 
                  type="button"
                  className="relative w-8 h-4.5 rounded-full transition-all duration-300 cursor-pointer"
                  style={{ backgroundColor: imageFilter ? colorPrimario : bgInput }}
                >
                  <span className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-white rounded-full shadow transition-transform duration-300 ${
                    imageFilter ? 'translate-x-3.5' : 'translate-x-0'
                  }`}/>
                </button>
              </div>
            </div>

            {/* Date Pickers */}
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <div className="w-1/2 lg:w-40">
                <DatePicker
                  value={startDate}
                  onChange={handleStartDateChange}
                  placeholder="Fecha Inicio"
                  customPrefix="Del:"
                  clearable={true}
                  fullWidth={true}
                />
              </div>
              <div className="w-1/2 lg:w-40">
                <DatePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="Fecha Fin"
                  customPrefix="Al:"
                  clearable={true}
                  align="right"
                  fullWidth={true}
                  minDate={startDate || undefined}
                />
              </div>
              
              {(search || starFilter !== 'all' || statusFilter !== 'all' || originFilter !== 'all' || imageFilter || startDate || endDate) && (
                <button
                  onClick={handleClearAllFilters}
                  className="text-xs text-rose-400 hover:text-rose-300 font-semibold px-2.5 py-2 hover:bg-rose-500/5 rounded-xl border border-rose-500/10 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                  title="Limpiar Filtros"
                >
                  Limpiar
                </button>
              )}
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
                <Table className="min-w-[800px]" shadow="shadow-lg" headers={['Folio', 'Cliente', 'Calificación', 'Comentario', 'Imágenes', 'Fecha', { label: 'Acciones', align: 'center' }]}>
                {currentReviews.map((review, index) => {
                  const isExpanded = !!expandedComments[review.id]
                  const delayClass = `delay-${Math.min(index + 1, 5)}`
                  const clientName = review.customer_name || review.nombre || review.cliente_nombre || 'Cliente General'
                  const initials = clientName[0]?.toUpperCase() || 'C'
                  const reviewFolio = formatearFolioResena(review.folio || `COM-${String(review.id).padStart(4, '0')}`, review.created_at)
                  const imagesList = (review.images || review.fotos || review.imagenes || [])

                  return (
                    <tr 
                      key={review.id}
                      className={`h-16 border-b transition-colors duration-150 animate-fadeInUp text-xs ${delayClass}`}
                      style={{ backgroundColor: 'var(--theme-surface)', borderColor: borderSubtle }}
                    >
                      {/* 1. Folio con Formato Bancario */}
                      <td className="py-3.5 px-4 text-left">
                        <span className="font-mono font-bold text-sm tracking-[1px] text-slate-900 dark:text-white">
                          {reviewFolio}
                        </span>
                      </td>

                      {/* 2. Cliente */}
                      <td className="py-3.5 px-4 text-left">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            {initials}
                          </div>
                          <span className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                            {clientName}
                          </span>
                        </div>
                      </td>

                      {/* 3. Calificación */}
                      <td className="py-3.5 px-4 text-left">
                        <div className="flex items-center gap-1.5">
                          {renderStars(review.rating, 14)}
                          <span className="font-mono font-bold text-xs text-slate-700 dark:text-slate-300">
                            {Number(review.rating || 0).toFixed(1)}
                          </span>
                        </div>
                      </td>

                      {/* 4. Comentario */}
                      <td className="py-3.5 px-4 max-w-[260px] text-left">
                        <div className="space-y-1">
                          <p className={`text-sm text-slate-600 dark:text-slate-300 italic ${isExpanded ? '' : 'line-clamp-2'}`}>
                            "{review.comment || review.comentario || 'Sin comentario'}"
                          </p>
                          
                          {(review.comment || review.comentario) && (review.comment || review.comentario).length > 60 && (
                            <button
                              type="button"
                              onClick={() => setExpandedComments(prev => ({ ...prev, [review.id]: !isExpanded }))}
                              className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-0.5 transition-colors cursor-pointer"
                            >
                              {isExpanded ? (
                                <>Ver menos <ChevronUp size={10} /></>
                              ) : (
                                <>Ver más <ChevronDown size={10} /></>
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* 5. Imágenes en su propia columna */}
                      <td className="py-3.5 px-4 text-left">
                        {imagesList && imagesList.length > 0 ? (
                          <div className="flex items-center gap-1.5">
                            {imagesList.map((img, imgIdx) => {
                              const imgUrl = typeof img === 'string' ? img : (img?.url || img?.path || '')
                              if (!imgUrl) return null
                              return (
                                <div
                                  key={imgIdx}
                                  onClick={() => setActiveLightbox(imgUrl)}
                                  className="w-8 h-11 rounded border border-slate-200 dark:border-white/10 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity bg-slate-100 dark:bg-white/5 shrink-0 shadow-xs"
                                  title="Ver foto adjunta"
                                >
                                  <img src={imgUrl} alt="Reseña" className="w-full h-full object-cover" />
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                            Sin fotos
                          </span>
                        )}
                      </td>

                      {/* 6. Fecha */}
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-500 dark:text-slate-400 text-left">
                        {review.created_at}
                      </td>

                      {/* 7. Acciones */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenDetailModal(review)}
                            className="inline-flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-600 text-blue-700 dark:text-blue-300 hover:text-white dark:hover:text-white border border-blue-500/30 rounded-xl px-3.5 py-1.5 text-[11px] font-bold transition-all duration-200 cursor-pointer shadow-xs whitespace-nowrap"
                            title="Ver detalles y responder"
                          >
                            <Eye size={14} className="shrink-0" />
                            <span>Ver Detalles</span>
                          </button>

                          <button
                            onClick={() => handleDeleteReview(review.id, clientName)}
                            className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-600 text-red-600 dark:text-red-400 hover:text-white dark:hover:text-white border border-red-500/30 transition-all duration-200 cursor-pointer shadow-xs flex items-center justify-center"
                            title="Eliminar reseña"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {currentReviews.length > 0 && Array.from({ length: ITEMS_PER_PAGE - currentReviews.length }).map((_, i) => (
                  <tr key={`empty-${i}`} className="h-16 border-b border-transparent" style={{ backgroundColor: 'var(--theme-surface)' }}>
                    <td colSpan={7}></td>
                  </tr>
                ))}
                {(!Array.isArray(filteredReviewsList) || filteredReviewsList.length === 0) && (
                  <tr style={{ backgroundColor: 'var(--theme-surface)' }}>
                    <td colSpan={7} className="p-0 border-none" style={{ backgroundColor: 'var(--theme-surface)' }}>
                      <div className="h-[32rem] flex items-center justify-center" style={{ backgroundColor: 'var(--theme-surface)' }}>
                        <EmptyState
                          title="Sin reseñas encontradas"
                          description={search || starFilter !== 'all' || statusFilter !== 'all' || originFilter !== 'all' || imageFilter || startDate || endDate ? "No hay opiniones registradas para el período o los filtros seleccionados." : "Aún no tienes reseñas de clientes registradas."}
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
                  {filteredReviewsList.length === 0 ? (
                    <span>Mostrando <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>0</span> a <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>0</span> de <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>0</span> registros</span>
                  ) : (
                    <span>Mostrando <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>{startItem}</span> a <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>{endItem}</span> de <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>{filteredReviewsList.length}</span> registros</span>
                  )}
                </div>

                {/* Lado derecho: Botones Anterior / Siguiente */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1 || filteredReviewsList.length === 0}
                    className="px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5"
                    style={currentPage > 1 && filteredReviewsList.length > 0 ? {
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
                    {filteredReviewsList.length === 0 ? 1 : currentPage} / {totalPages}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage >= totalPages || filteredReviewsList.length === 0}
                    className="px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5"
                    style={currentPage < totalPages && filteredReviewsList.length > 0 ? {
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

      {/* MODAL DE DETALLE DE RESEÑA VISTA COMPLETA */}
      {selectedReviewId && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-md animate-fadeIn">
          {/* Loader global al enviar respuesta */}
          {submittingAction && <LoaderGlobal texto="GUARDANDO RESPUESTA..." />}

          {/* Click overlay closes */}
          <div className="absolute inset-0 cursor-default" onClick={() => setSelectedReviewId(null)} />

          <div className="relative rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden animate-scaleIn flex flex-col max-h-[70vh] md:max-h-[90vh] z-10 font-sans text-theme-text" style={{ backgroundColor: bgCard, boxShadow: cardShadow }}>
            
            {/* Header del Modal */}
            <div 
              className="flex items-center justify-between px-6 max-md:px-4 py-4 shrink-0 transition-colors border-t border-x border-b"
              style={{ 
                backgroundColor: colorPrimario || 'var(--theme-primary)', 
                borderColor: colorPrimario || 'var(--theme-primary)',
                color: 'var(--theme-primary-contrast, #ffffff)' 
              }}
            >
              <div className="flex items-center gap-3">
                <h2 className="font-bold text-lg tracking-wide" style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}>Detalle de Reseña</h2>
                {detailData && (
                  <span className="font-mono text-xs font-bold tracking-[1px] bg-white/20 border border-white/30 px-2.5 py-0.5 rounded-full" style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}>
                    {detailData.folio}
                  </span>
                )}
              </div>
              {/* Se cierra únicamente con el botón X del header o con Cancelar */}
              <button
                type="button"
                onClick={() => setSelectedReviewId(null)}
                className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer"
                style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}
                title="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            {loadingDetail || !detailData ? (
              <div 
                className="p-12 text-center text-theme-text-muted space-y-3 flex-1 flex flex-col items-center justify-center border-x border-b border-theme-border-subtle rounded-b-2xl"
                style={{ borderColor: borderSubtle }}
              >
                <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-semibold">Cargando detalle de la reseña...</p>
              </div>
            ) : (
              <div 
                className="p-6 max-lg:p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent flex-1 grid grid-cols-2 max-md:grid-cols-1 gap-6 max-lg:gap-4 text-left border-x border-b border-theme-border-subtle rounded-b-2xl"
                style={{ borderColor: borderSubtle }}
              >
                
                {/* Columna Izquierda (Info e Imágenes) */}
                <div className="space-y-6 max-lg:space-y-3 border-b max-md:border-b max-md:pb-6 md:border-b-0 md:border-r border-theme-border-subtle md:pr-4 lg:pr-6">
                  
                  {/* Sección "Información del Cliente" */}
                  <div className="space-y-3 max-lg:space-y-1.5">
                    <h3 className="text-[10px] max-lg:text-[9px] font-bold text-theme-text-muted uppercase tracking-wider flex items-center gap-1.5 select-none">
                      <User size={13} />
                      Información del Cliente
                    </h3>
                    <div className="border rounded-xl p-4 max-lg:p-3 space-y-3 max-lg:space-y-2 text-left" style={{ backgroundColor: bgSubcard, borderColor: borderSubtle }}>
                      <div className="flex items-center gap-3 max-lg:gap-2">
                        <div className="w-8 h-8 max-lg:w-7 max-lg:h-7 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/15 flex items-center justify-center shrink-0">
                          <User size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] max-lg:text-[9px] text-theme-text-muted font-bold uppercase tracking-wider">Nombre del Cliente</p>
                          <p className="text-sm max-lg:text-xs font-semibold text-theme-text truncate">{detailData.customer_name}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 max-lg:gap-2 border-t border-theme-border-subtle pt-3 max-lg:pt-2">
                        <div className="w-8 h-8 max-lg:w-7 max-lg:h-7 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/15 flex items-center justify-center shrink-0">
                          <Mail size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] max-lg:text-[9px] text-theme-text-muted font-bold uppercase tracking-wider">Correo Electrónico</p>
                          <p className="text-xs max-lg:text-[11px] font-semibold text-theme-text truncate">
                            {detailData.customer_email || 'No registrado'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 max-lg:gap-2 border-t border-theme-border-subtle pt-3 max-lg:pt-2">
                        <div className="w-8 h-8 max-lg:w-7 max-lg:h-7 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/15 flex items-center justify-center shrink-0">
                          <Phone size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] max-lg:text-[9px] text-theme-text-muted font-bold uppercase tracking-wider">Teléfono</p>
                          <p className="text-xs max-lg:text-[11px] font-semibold text-theme-text truncate">
                            {detailData.customer_phone || 'No registrado'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sección "Detalles de la Reseña" */}
                  <div className="space-y-3 max-lg:space-y-1.5">
                    <h3 className="text-[10px] max-lg:text-[9px] font-bold text-theme-text-muted uppercase tracking-wider flex items-center gap-1.5 select-none">
                      <Info size={13} />
                      Detalles de la Reseña
                    </h3>
                    <div className="border rounded-xl p-4 max-lg:p-3 space-y-3 max-lg:space-y-1.5" style={{ backgroundColor: bgSubcard, borderColor: borderSubtle }}>
                      {/* Calificación otorgada */}
                      <div className="flex items-center justify-between py-1.5 max-lg:py-1 border-b border-theme-border-subtle">
                        <span className="text-theme-text-muted text-xs max-lg:text-[11px]">Calificación Otorgada:</span>
                        <div className="flex items-center gap-1">
                          {renderStars(detailData.rating, 13)}
                          <span className="font-extrabold text-xs max-lg:text-[11px] text-yellow-400 ml-1">({detailData.rating}★)</span>
                        </div>
                      </div>

                      {/* Fecha de la reseña */}
                      <div className="flex items-center justify-between py-1.5 max-lg:py-1 border-b border-theme-border-subtle">
                        <span className="text-theme-text-muted text-xs max-lg:text-[11px]">Fecha de Reseña:</span>
                        <span className="text-theme-text font-mono text-xs max-lg:text-[11px]">
                          {typeof detailData.created_at === 'string' ? detailData.created_at.split(' ')[0] : (detailData.created_at || 'N/A')}
                        </span>
                      </div>

                      {/* Hora de la reseña */}
                      <div className="flex items-center justify-between py-1.5 max-lg:py-1 border-b border-theme-border-subtle">
                        <span className="text-theme-text-muted text-xs max-lg:text-[11px] flex items-center gap-1">
                          <Clock size={12} className="text-theme-text-muted" />
                          Hora:
                        </span>
                        <span className="text-theme-text font-mono text-xs max-lg:text-[11px]">
                          {typeof detailData.created_at === 'string' && detailData.created_at.includes(' ')
                            ? detailData.created_at.split(' ')[1]
                            : '12:00:00'}
                        </span>
                      </div>

                      {/* Fotos adjuntas */}
                      <div className="flex items-center justify-between py-1.5 max-lg:py-1">
                        <span className="text-theme-text-muted text-xs max-lg:text-[11px]">Imágenes Adjuntas:</span>
                        <span className="text-xs max-lg:text-[11px] font-bold text-brand-300">
                          {detailData.images && detailData.images.length > 0
                            ? `${detailData.images.length} foto${detailData.images.length > 1 ? 's' : ''} adjunta${detailData.images.length > 1 ? 's' : ''}`
                            : 'Sin fotos adjuntas'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sección "Imágenes Adjuntas" */}
                  <div className="space-y-3 max-lg:space-y-1.5">
                    <h3 className="text-[10px] max-lg:text-[9px] font-bold text-theme-text-muted uppercase tracking-wider flex items-center gap-1.5 select-none">
                      <ImageIcon size={13} />
                      Imágenes Adjuntas ({detailData.images ? Math.min(detailData.images.length, 4) : 0}/4)
                    </h3>
                    <div className="border rounded-xl p-4 max-lg:p-3" style={{ backgroundColor: bgSubcard, borderColor: borderSubtle }}>
                      {detailData.images && detailData.images.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2.5 max-lg:gap-2">
                          {detailData.images.slice(0, 4).map((imgUrl, index) => (
                            <div 
                              key={index}
                              onClick={() => setActiveLightbox(imgUrl)}
                              className="h-36 max-lg:h-24 rounded-lg overflow-hidden border border-theme-border-subtle hover:border-brand-500/50 cursor-zoom-in relative group transition-all"
                            >
                              <img src={imgUrl} alt={`Foto ${index + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Eye size={16} className="text-theme-text" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-4 max-lg:py-2 text-center text-xs max-lg:text-[11px] text-theme-text-muted italic">
                          Sin imágenes adjuntas en esta reseña
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Columna Derecha (Opinión y Respuesta) */}
                <div className="flex flex-col space-y-6 max-lg:space-y-3">
                  
                  {/* Sección "Opinión Completa" (Limpio sólo para el comentario) */}
                  <div className="space-y-3 max-lg:space-y-1.5">
                    <h3 className="text-[10px] max-lg:text-[9px] font-bold text-theme-text-muted uppercase tracking-wider select-none">
                      Opinión Completa
                    </h3>
                    <div className="border rounded-xl p-5 max-lg:p-3 space-y-3 max-lg:space-y-1.5" style={{ backgroundColor: bgSubcard, borderColor: borderSubtle }}>
                      <div className="flex items-center justify-between">
                        {renderStars(detailData.rating, 16)}
                        <span className="text-[10px] max-lg:text-[9px] font-mono text-theme-text-muted">{detailData.created_at}</span>
                      </div>

                      <p className="text-xs max-lg:text-[11px] text-theme-text leading-relaxed italic">
                        "{detailData.comment}"
                      </p>
                    </div>
                  </div>

                  {/* Sección "Historial de Respuestas del Negocio" */}
                  <div className="space-y-3 max-lg:space-y-1.5">
                    <h3 className="text-[10px] max-lg:text-[9px] font-bold text-theme-text-muted uppercase tracking-wider select-none">
                      Historial de Respuestas del Negocio
                    </h3>
                    <div className="border rounded-xl p-4 max-lg:p-3" style={{ backgroundColor: bgSubcard, borderColor: borderSubtle }}>
                      {detailData.respuesta?.texto ? (
                        <div className="space-y-2 max-lg:space-y-1">
                          <div className="flex items-center justify-between text-[11px] max-lg:text-[10px] pb-2 max-lg:pb-1 border-b border-theme-border-subtle">
                            <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                              <CheckCircle size={13} />
                              Respondido por: {detailData.respuesta.admin_nombre || 'Administrador'}
                            </span>
                            <span className="font-mono text-[10px] max-lg:text-[9px] text-theme-text-muted">
                              {detailData.respuesta.fecha_respuesta}
                            </span>
                          </div>
                          <p className="text-xs max-lg:text-[11px] text-theme-text italic leading-relaxed pt-1">
                            "{detailData.respuesta.texto}"
                          </p>
                        </div>
                      ) : (
                        <div className="py-3 max-lg:py-2 text-center text-xs max-lg:text-[11px] text-theme-text-muted italic">
                          No hay respuestas registradas aún para esta reseña.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sección "Plantillas de Respuesta Predeterminada" (Dos plantillas separadas y editables) */}
                  <div className="space-y-4 max-lg:space-y-2">
                    <h3 className="text-[10px] max-lg:text-[9px] font-bold text-theme-text-muted uppercase tracking-wider select-none flex items-center gap-1.5">
                      <FileText size={13} className="text-brand-400" />
                      Plantillas de Respuesta Predeterminada
                    </h3>

                    <div className="space-y-3 max-lg:space-y-2">
                      {/* Plantilla Positiva (4-5 ★) */}
                      <div className="border rounded-xl p-4 max-lg:p-3 space-y-2 max-lg:space-y-1 text-left" style={{ backgroundColor: bgSubcard, borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] max-lg:text-[10px] font-bold text-emerald-400">
                            Plantilla Positiva (4-5 ★)
                          </span>
                        </div>
                        <textarea
                          rows={2}
                          value={textoPositivo}
                          onChange={(e) => setTextoPositivo(e.target.value)}
                          placeholder="Plantilla positiva..."
                          style={{ backgroundColor: bgInput }}
                          className="w-full min-h-[50px] max-lg:min-h-[40px] border border-theme-border-subtle hover:border-white/20 focus:border-emerald-500/50 rounded-lg p-2.5 max-lg:p-2 text-xs max-lg:text-[11px] leading-relaxed outline-none resize-none transition-all"
                        />
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={handleLoadPositiveTemplate}
                            className="bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/70 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 font-bold px-4 max-lg:px-2.5 py-2 max-lg:py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 text-xs max-lg:text-[10px]"
                          >
                            <FileText size={13} />
                            <span>Usar esta plantilla</span>
                          </button>
                        </div>
                      </div>

                      {/* Plantilla Negativa (1-3 ★) */}
                      <div className="border rounded-xl p-4 max-lg:p-3 space-y-2 max-lg:space-y-1 text-left" style={{ backgroundColor: bgSubcard, borderColor: 'rgba(244, 63, 94, 0.2)' }}>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] max-lg:text-[10px] font-bold text-rose-400">
                            Plantilla Negativa (1-3 ★)
                          </span>
                        </div>
                        <textarea
                          rows={2}
                          value={textoNegativo}
                          onChange={(e) => setTextoNegativo(e.target.value)}
                          placeholder="Plantilla de atención..."
                          style={{ backgroundColor: bgInput }}
                          className="w-full min-h-[50px] max-lg:min-h-[40px] border border-theme-border-subtle hover:border-white/20 focus:border-rose-500/50 rounded-lg p-2.5 max-lg:p-2 text-xs max-lg:text-[11px] leading-relaxed outline-none resize-none transition-all"
                        />
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={handleLoadNegativeTemplate}
                            className="bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/70 dark:hover:bg-rose-900 border border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200 font-bold px-4 max-lg:px-2.5 py-2 max-lg:py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 text-xs max-lg:text-[10px]"
                          >
                            <FileText size={13} />
                            <span>Usar esta plantilla</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sección "Editar Respuesta Pública" & Acciones */}
                  <div className="space-y-3 max-lg:space-y-2 pt-2 max-lg:pt-1 border-t border-theme-border-subtle">
                    <h3 className="text-[10px] max-lg:text-[9px] font-bold text-theme-text-muted uppercase tracking-wider select-none">
                      Editar Respuesta Pública
                    </h3>

                    {/* TEXTAREA CON ESTADO DE ERROR */}
                    <textarea
                      rows={3}
                      value={replyText}
                      onChange={(e) => validarRespuesta(e.target.value)}
                      placeholder="Escribe o edita la respuesta oficial..."
                      style={{ backgroundColor: bgInput }}
                      className={`w-full min-h-[100px] max-lg:min-h-[75px] border rounded-xl p-3.5 max-lg:p-2.5 text-xs max-lg:text-[11px] text-theme-text placeholder-theme-text-muted/40 transition-all outline-none resize-none ${
                        errorValidacion
                          ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/30"
                          : "border-theme-border-subtle hover:border-white/20 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                      }`}
                    />

                    {/* MENSAJE DE ERROR VISUAL */}
                    {errorValidacion && (
                      <p className="text-red-500 text-xs max-lg:text-[11px] font-bold mt-1">
                        {errorValidacion}
                      </p>
                    )}

                  </div>
                </div>
              </div>
            )}
            
            {/* Sticky Footer for action buttons */}
            {detailData && (
              <div className="flex gap-3 justify-end p-4 shrink-0 border-t" style={{ borderColor: borderSubtle, backgroundColor: 'var(--theme-surface)' }}>
                <button
                  type="button"
                  onClick={() => setSelectedReviewId(null)}
                  disabled={submittingAction}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold px-4 py-2 rounded-xl text-sm transition-colors cursor-pointer disabled:opacity-50 max-md:flex-1"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleSaveResponse}
                  disabled={!!errorValidacion || replyText.trim().length === 0 || submittingAction}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-xl shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex justify-center items-center gap-2 text-sm max-md:flex-1"
                >
                  <Send size={14} className="text-white" />
                  <span>{submittingAction ? "Guardando..." : "Guardar"}</span>
                </button>
              </div>
            )}

          </div>
        </div>,
        document.body
      )}

      {/* Lightbox photo portal */}
      {activeLightbox && (
        createPortal(
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 animate-fadeIn">
            <div className="absolute inset-0 cursor-zoom-out" onClick={() => setActiveLightbox(null)}></div>
            <div className="relative max-w-4xl max-h-[85vh] z-10 animate-scaleIn">
              <img src={activeLightbox} alt="Evidencia en pantalla completa" className="rounded-xl shadow-2xl max-w-full max-h-[80vh] object-contain border border-theme-border-subtle" />
              <button
                onClick={() => setActiveLightbox(null)}
                className="absolute -top-10 right-0 w-8 h-8 rounded-full bg-white/10 text-theme-text flex items-center justify-center hover:bg-white/20 transition-all text-lg cursor-pointer"
                title="Cerrar imagen"
              >
                ×
              </button>
            </div>
          </div>,
          document.body
        )
      )}

      {/* Toast feedback alerts */}
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
