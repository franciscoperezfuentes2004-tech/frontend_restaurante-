import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom'
import { 
  Banknote, Clock, CheckCircle2, AlertCircle, AlertTriangle,
  X, RefreshCw, ChevronRight, User, Receipt, 
  DollarSign, FileText, Check, Eye
} from 'lucide-react'
import client from '../../api/client'
import echo from '../../echo'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import Table from '../../components/ui/Table'
import { TableSkeleton } from '../../components/ui/Skeletons'

const ITEMS_PER_PAGE = 8

export default function CashCuts() {
  const { user } = useAuth()
  const userRole = user?.role
  const canConfirm = userRole === 'gerente'

  const { bgCard, bgSubcard, borderSubtle, cardShadow, colorPrimario, primaryBtnText } = useTheme()
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()

  // --- ESTADOS PRINCIPALES ---
  const [cuts, setCuts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('pendientes') // 'pendientes' | '30dias' | '60dias'
  
  // --- ESTADOS DETALLE Y CONFIRMACIÓN ---
  const [selectedCutId, setSelectedCutId] = useState(null)
  const [cutDetail, setCutDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')
  const [receivedCash, setReceivedCash] = useState('')
  const [confirming, setConfirming] = useState(false)

  // --- TOAST LOCAL ---
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const formatCurrency = (val) => new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(val) || 0)

  // --- ESTADOS DE PAGINACIÓN ---
  const [currentPage, setCurrentPage] = useState(1)
  const [paginationMeta, setPaginationMeta] = useState({
    from: 0,
    to: 0,
    total: 0,
    lastPage: 1,
    perPage: ITEMS_PER_PAGE
  })

  // --- CARGAR LISTADO DE CORTES ---
  const fetchCuts = useCallback(async (statusFilter = filterStatus, page = currentPage) => {
    setLoading(true)
    try {
      const params = {
        page,
        per_page: ITEMS_PER_PAGE
      }
      if (statusFilter === 'pendiente' || statusFilter === 'pendientes') {
        params.status = 'pendiente'
        params.filtro = 'pendientes'
      } else {
        params.status = statusFilter
        params.filtro = statusFilter
      }
      const res = await client.get('/admin/cash-cuts', { params })
      const data = res.data
      const list = Array.isArray(data) ? data : (data?.data || data?.cash_cuts || [])
      setCuts(list)

      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const total = data.total ?? list.length
        const perPage = data.per_page ?? ITEMS_PER_PAGE
        const from = data.from ?? (total > 0 ? (page - 1) * perPage + 1 : 0)
        const to = data.to ?? (total > 0 ? Math.min(page * perPage, total) : 0)
        const lastPage = data.last_page ?? Math.max(1, Math.ceil(total / perPage))

        setPaginationMeta({
          from,
          to,
          total,
          lastPage,
          perPage
        })
      } else {
        const total = list.length
        setPaginationMeta({
          from: total > 0 ? (page - 1) * ITEMS_PER_PAGE + 1 : 0,
          to: total > 0 ? Math.min(page * ITEMS_PER_PAGE, total) : 0,
          total,
          lastPage: Math.max(1, Math.ceil(total / ITEMS_PER_PAGE)),
          perPage: ITEMS_PER_PAGE
        })
      }
    } catch (err) {
      console.error("Error al cargar cortes:", err)
      showToast('⚠️ No se pudieron cargar los cortes de caja', 'error')
    } finally {
      setLoading(false)
    }
  }, [filterStatus, currentPage])

  useEffect(() => {
    fetchCuts(filterStatus, currentPage)
  }, [filterStatus, currentPage, fetchCuts])

  // --- CARGAR DETALLE DE UN CORTE ---
  const fetchCutDetail = useCallback(async (id) => {
    if (!id) return
    setLoadingDetail(true)
    try {
      const res = await client.get(`/admin/cash-cuts/${id}`)
      const data = res.data || {}
      setCutDetail(data)
      setAdminNotes(data.cash_cut?.notes || '')
    } catch (err) {
      console.error("Error al cargar detalle del corte:", err)
      showToast('⚠️ No se pudo obtener el detalle del corte', 'error')
      setSelectedCutId(null)
      setCutDetail(null)
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  // Si la URL trae ?id=X o location.state trae cashCutId, abrir automáticamente
  const idFromQuery = searchParams.get('id')
  const idFromState = location.state?.cashCutId

  useEffect(() => {
    const targetId = idFromQuery || idFromState

    // Si venía por location.state, limpiarlo para que no persista en el historial y no re-abra al cerrar
    if (idFromState) {
      navigate(location.pathname + (idFromQuery ? `?id=${idFromQuery}` : ''), { replace: true, state: null })
    }

    if (targetId) {
      const numId = Number(targetId)
      if (numId && numId !== selectedCutId) {
        setSelectedCutId(numId)
        fetchCutDetail(numId)
      }
    }
  }, [idFromQuery, idFromState, fetchCutDetail])

  // Al seleccionar un corte manualmente
  const handleSelectCut = (id) => {
    setSelectedCutId(id)
    setReceivedCash('')
    fetchCutDetail(id)
    setSearchParams({ id }, { replace: true })
  }

  const handleCloseDetail = () => {
    setSelectedCutId(null)
    setCutDetail(null)
    setAdminNotes('')
    setReceivedCash('')
    setSearchParams({}, { replace: true })
    if (location.state?.cashCutId) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }

  // --- CONFIRMAR RECEPCIÓN DEL CORTE ---
  const handleConfirmCut = async () => {
    if (!selectedCutId || confirming) return
    setConfirming(true)
    try {
      const res = await client.post(`/admin/cash-cuts/${selectedCutId}/confirmar`, {
        notes: adminNotes.trim(),
        received_cash: receivedCash !== '' ? parseFloat(receivedCash) : null
      })
      const updatedCut = res.data?.cash_cut || res.data?.data
      const driverName = cutDetail?.driver?.name || cutDetail?.cash_cut?.driver?.name || 'Repartidor'

      // Actualizar estado en la lista local sin recargar todo
      setCuts(prev => prev.map(c => {
        if (c.id === selectedCutId) {
          return {
            ...c,
            status: 'confirmado',
            notes: adminNotes.trim(),
            received_cash: receivedCash !== '' ? parseFloat(receivedCash) : null,
            ...(updatedCut || {})
          }
        }
        return c
      }))

      // Actualizar detalle si sigue abierto
      if (cutDetail?.cash_cut) {
        setCutDetail(prev => ({
          ...prev,
          cash_cut: {
            ...prev.cash_cut,
            status: 'confirmado',
            notes: adminNotes.trim(),
            received_cash: receivedCash !== '' ? parseFloat(receivedCash) : null,
            ...(updatedCut || {})
          }
        }))
      }

      showToast(`✓ Corte de ${driverName} confirmado correctamente`)
      window.dispatchEvent(new CustomEvent('cash-cut-updated'))
      handleCloseDetail()
    } catch (err) {
      console.error("Error al confirmar corte:", err)
      const msg = err.response?.data?.message || 'Error al confirmar la recepción del corte'
      showToast(`⚠️ ${msg}`, 'error')
    } finally {
      setConfirming(false)
    }
  }

  // --- WEBSOCKET EN TIEMPO REAL (REVERB) ---
  useEffect(() => {
    let channel = null
    try {
      channel = echo.channel('delivery.cuts')

      const handleRealtimeCut = (event) => {
        const newCut = event?.cutData || event?.cash_cut || event
        const driverName = newCut?.driver_name || newCut?.driver?.name || 'un repartidor'

        showToast(`🔔 Nuevo corte pendiente de ${driverName}`, 'info')
        window.dispatchEvent(new CustomEvent('cash-cut-updated'))

        // Agregar fila automáticamente si coincide con el filtro
        setCuts(prev => {
          const cutId = newCut?.id || newCut?.cash_cut_id
          const exists = prev.some(c => c.id === cutId)
          if (exists) return prev

          const formattedCut = {
            id: cutId,
            driver_id: newCut.driver_id,
            driver_name: driverName,
            driver: { name: driverName },
            cash_declared: newCut.cash_declared,
            expected_cash: newCut.expected_cash || newCut.total_cash,
            total_orders: newCut.total_orders || newCut.completed_count || 0,
            status: 'pendiente',
            created_at: newCut.fecha_corte || new Date().toISOString(),
            hora_corte: newCut.hora_corte
          }

          return [formattedCut, ...prev]
        })
      }

      channel.listen('.delivery.cut.notified', handleRealtimeCut)
      channel.listen('delivery.cut.notified', handleRealtimeCut)
      channel.listen('DeliveryCutNotified', handleRealtimeCut)
    } catch (err) {
      console.warn("WebSocket Reverb no disponible para delivery.cuts:", err)
    }

    return () => {
      if (channel) {
        try { echo.leaveChannel('delivery.cuts') } catch (e) {}
      }
    }
  }, [])

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8 pb-24 animate-fadeIn font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 animate-scaleIn">
          <div 
            className={`px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-2.5 text-xs font-bold ${
              toast.type === 'error'
                ? 'bg-rose-500/95 text-white border-rose-600'
                : toast.type === 'info'
                ? 'bg-blue-600/95 text-white border-blue-700'
                : 'bg-emerald-600/95 text-white border-emerald-700'
            }`}
          >
            {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header y Filtro (afuera, en su posición original) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-wide" style={{ color: 'var(--theme-text)' }}>
            Cortes
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--theme-text-muted)' }}>
            Recepción y validación de efectivo recaudado por el personal
          </p>
        </div>

        {/* Contenedor Padre de las Acciones del Header (Filtros + Recargar) */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Pestañas de Filtro: Scroll horizontal en móvil, expandido en PC */}
          <div 
            className="flex max-md:flex-nowrap max-md:overflow-x-auto max-md:w-full hide-scrollbar items-center gap-1 p-1.5 rounded-xl shadow-sm border"
            style={{ 
              backgroundColor: 'var(--theme-surface)', 
              borderColor: borderSubtle 
            }}
          >
            <button
              type="button"
              onClick={() => {
                setFilterStatus('pendientes')
                setCurrentPage(1)
              }}
              className={`px-4 py-1.5 rounded-lg text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0 ${(filterStatus === 'pendientes' || filterStatus === 'pendiente') ? 'font-bold shadow-sm' : 'font-medium hover:brightness-95'}`}
              style={(filterStatus === 'pendientes' || filterStatus === 'pendiente') ? {
                backgroundColor: colorPrimario || 'var(--theme-primary)',
                color: 'var(--theme-primary-contrast, #fff)'
              } : {
                backgroundColor: 'transparent',
                color: 'var(--theme-text-muted)'
              }}
            >
              Pendientes
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterStatus('30dias')
                setCurrentPage(1)
              }}
              className={`px-4 py-1.5 rounded-lg text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0 ${filterStatus === '30dias' ? 'font-bold shadow-sm' : 'font-medium hover:brightness-95'}`}
              style={filterStatus === '30dias' ? {
                backgroundColor: colorPrimario || 'var(--theme-primary)',
                color: 'var(--theme-primary-contrast, #fff)'
              } : {
                backgroundColor: 'transparent',
                color: 'var(--theme-text-muted)'
              }}
            >
              Historial (30 días)
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterStatus('60dias')
                setCurrentPage(1)
              }}
              className={`px-4 py-1.5 rounded-lg text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0 ${filterStatus === '60dias' ? 'font-bold shadow-sm' : 'font-medium hover:brightness-95'}`}
              style={filterStatus === '60dias' ? {
                backgroundColor: colorPrimario || 'var(--theme-primary)',
                color: 'var(--theme-primary-contrast, #fff)'
              } : {
                backgroundColor: 'transparent',
                color: 'var(--theme-text-muted)'
              }}
            >
              Historial (60 días)
            </button>
          </div>


        </div>
      </div>

      {/* Primer Contenedor: Tono 1 (Card principal con bordes y sombra, idéntico a Delivery) */}
      <div 
        className="rounded-2xl p-6 max-md:p-3 transition-colors duration-200" 
        style={{ 
          backgroundColor: bgCard, 
          border: `1px solid ${borderSubtle}`, 
          boxShadow: cardShadow 
        }}
      >
        <div className="space-y-4">
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
                'Usuario', 
                'Monto Declarado', 
                'Monto Esperado', 
                'Diferencia', 
                { label: 'Pedidos', align: 'center' }, 
                'Fecha', 
                'Hora', 
                { label: 'Estado', align: 'center' }, 
                ...(!canConfirm ? ['Autorizado por'] : []),
                'Acciones'
              ]}
            >
              {cuts.map((cut, index) => {
                const delayClass = `delay-${Math.min(index + 1, 5)}`
                const userName = cut.user?.name || cut.driver?.name || cut.driver_name || cut.driver?.user?.name || 'Usuario'
                const declared = Number(cut.cash_declared || 0)
                const expected = Number(cut.expected_cash || 0)
                const diff = declared - expected
                const isPositiveOrZero = diff >= 0
                const isPending = cut.status === 'pendiente'

                // Tipo de corte para badge
                const cutType = String(cut.cut_type || '').toLowerCase().trim()
                let typeBadgeLabel = 'General'
                let typeBadgeColor = 'bg-gray-100 text-gray-600 border-gray-300'

                if (cutType === 'repartidor') {
                  typeBadgeLabel = 'Repartidor'
                  typeBadgeColor = 'bg-blue-100 text-blue-700 border-blue-300'
                } else if (cutType === 'cajero') {
                  typeBadgeLabel = 'Cajero'
                  typeBadgeColor = 'bg-purple-100 text-purple-700 border-purple-300'
                } else if (cutType) {
                  typeBadgeLabel = cutType.charAt(0).toUpperCase() + cutType.slice(1)
                }

                // Nombre del autorizador / confirmado por
                const authorizerName = 
                  cut.confirmedBy?.name || 
                  cut.confirmed_by?.name || 
                  cut.confirmed_by_user?.name || 
                  (typeof cut.confirmed_by === 'string' ? cut.confirmed_by : null) || 
                  cut.confirmed_by_name || 
                  null

                // Formateo de fecha / hora
                const rawDate = cut.created_at || cut.fecha_corte || cut.fecha
                let fechaDisplay = '--'
                let horaDisplay = cut.hora_corte || ''
                if (rawDate) {
                  const d = new Date(rawDate)
                  if (!isNaN(d.getTime())) {
                    fechaDisplay = d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    if (!horaDisplay) {
                      horaDisplay = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }
                  }
                }

                return (
                  <tr
                    key={cut.id}
                    onClick={() => handleSelectCut(cut.id)}
                    className={`h-16 border-b transition-colors duration-150 animate-fadeInUp bg-transparent cursor-pointer hover:brightness-95 dark:hover:brightness-110 ${delayClass}`}
                    style={{ backgroundColor: 'var(--theme-surface)', borderColor: borderSubtle }}
                  >
                    {/* Usuario */}
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold shrink-0 text-xs"
                          style={{ backgroundColor: 'var(--theme-card)', color: 'var(--theme-primary)', border: `1px solid ${borderSubtle}` }}
                        >
                          <User size={15} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold tracking-tight text-xs" style={{ color: 'var(--theme-text)' }}>
                            {userName}
                          </span>
                          <span className="inline-block mt-0.5">
                            <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${typeBadgeColor}`}>
                              {typeBadgeLabel}
                            </span>
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Declarado */}
                    <td className="px-4 py-3 text-sm font-mono font-bold text-emerald-500">
                      {formatCurrency(declared)}
                    </td>

                    {/* Esperado */}
                    <td className="px-4 py-3 text-sm font-mono font-bold" style={{ color: 'var(--theme-text)' }}>
                      {formatCurrency(expected)}
                    </td>

                    {/* Diferencia */}
                    <td className="px-4 py-3 text-sm font-mono font-extrabold">
                      <span className={isPositiveOrZero ? 'text-emerald-500' : 'text-rose-500'}>
                        {isPositiveOrZero ? `+${formatCurrency(diff)}` : `-${formatCurrency(Math.abs(diff))}`}
                      </span>
                    </td>

                    {/* Pedidos */}
                    <td className="px-4 py-3 text-sm text-center font-mono">
                      <span 
                        className="px-2.5 py-0.5 rounded-md font-semibold text-xs"
                        style={{ backgroundColor: 'var(--theme-input)', color: 'var(--theme-text)' }}
                      >
                        {cut.total_orders ?? 0}
                      </span>
                    </td>

                    {/* Fecha */}
                    <td className="px-4 py-3 text-sm font-mono font-medium whitespace-nowrap" style={{ color: 'var(--theme-text)' }}>
                      {fechaDisplay}
                    </td>

                    {/* Hora */}
                    <td className="px-4 py-3 text-sm font-mono font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                      {horaDisplay || '--:--'}
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-3 text-sm text-center">
                      <span 
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${
                          isPending 
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30' 
                            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {isPending ? 'Pendiente' : 'Confirmado'}
                      </span>
                    </td>

                    {/* Autorizado por */}
                    {!canConfirm && (
                      <td className="px-4 py-3 text-sm">
                        {authorizerName ? (
                          <div className="flex items-center gap-1.5 font-medium text-xs" style={{ color: 'var(--theme-text)' }}>
                            <User size={13} className="shrink-0 text-emerald-500" />
                            <span className="truncate max-w-[130px]">{authorizerName}</span>
                          </div>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                            —
                          </span>
                        )}
                      </td>
                    )}

                    {/* Acciones */}
                    <td className="px-4 py-3 text-sm text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelectCut(cut.id)
                        }}
                        className="border rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1 hover:brightness-95 active:scale-95"
                        style={{ 
                          backgroundColor: 'var(--theme-input)', 
                          borderColor: borderSubtle, 
                          color: 'var(--theme-text)' 
                        }}
                        title="Ver Detalle Completo"
                      >
                        <Eye size={12} />
                        <span>Detalle</span>
                      </button>
                    </td>
                  </tr>
                )
              })}

              {/* Relleno para garantizar exactamente los 8 espacios de registros */}
              {cuts.length > 0 && Array.from({ length: Math.max(0, ITEMS_PER_PAGE - cuts.length) }).map((_, i) => (
                <tr 
                  key={`empty-${i}`} 
                  className="h-16 border-b border-transparent bg-transparent" 
                  style={{ backgroundColor: 'var(--theme-surface)' }}
                >
                  <td colSpan={canConfirm ? 9 : 10}></td>
                </tr>
              ))}

              {/* Estado Vacío */}
              {(!Array.isArray(cuts) || cuts.length === 0) && (
                <tr style={{ backgroundColor: 'var(--theme-surface)' }}>
                  <td colSpan={canConfirm ? 9 : 10} className="p-0 border-none" style={{ backgroundColor: 'var(--theme-surface)' }}>
                    <div 
                      className="h-[32rem] flex flex-col items-center justify-center gap-2" 
                      style={{ backgroundColor: 'var(--theme-surface)', color: 'var(--theme-text-muted)' }}
                    >
                      <Banknote size={40} className="opacity-40" />
                      <span className="text-base font-semibold" style={{ color: 'var(--theme-text)' }}>
                        No hay cortes registrados
                      </span>
                      <span className="text-xs">
                        {filterStatus === 'pendiente' || filterStatus === 'pendientes'
                          ? 'No hay cortes pendientes por confirmar en este momento.' 
                          : 'No hay cortes registrados en este periodo de historial.'}
                      </span>
                    </div>
                  </td>
                </tr>
              )}
            </Table>
          </div>
          )}

          {/* Footer de Paginación (idéntico a Delivery) */}
          {!loading && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t" style={{ borderColor: borderSubtle }}>
              {/* Lado izquierdo: Conteo */}
              <div className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                Mostrando {paginationMeta.total === 0 ? 0 : paginationMeta.from} a {paginationMeta.to} de {paginationMeta.total} cortes
              </div>

              {/* Lado derecho: Controles */}
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1 || cuts.length === 0}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5"
                  style={currentPage > 1 && cuts.length > 0 ? {
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
                  {paginationMeta.total === 0 ? 1 : currentPage} / {paginationMeta.lastPage}
                </div>

                <button 
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, paginationMeta.lastPage))}
                  disabled={currentPage >= paginationMeta.lastPage || cuts.length === 0}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5"
                  style={currentPage < paginationMeta.lastPage && cuts.length > 0 ? {
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

      {/* SECCIÓN B — MODAL / PANEL DE DETALLE Y CONFIRMACIÓN */}
      {selectedCutId && createPortal(
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-fadeIn cursor-pointer"
          onClick={handleCloseDetail}
        >
          <div
            className="rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[70vh] md:max-h-[90vh] animate-scaleIn cursor-default text-left"
            style={{ backgroundColor: 'var(--theme-surface)', color: 'var(--theme-text)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div 
              className="px-6 max-md:px-4 py-4 flex items-center justify-between shrink-0 transition-colors border-t border-x border-b" 
              style={{ 
                backgroundColor: colorPrimario || 'var(--theme-primary)', 
                borderColor: colorPrimario || 'var(--theme-primary)',
                color: 'var(--theme-primary-contrast, #ffffff)' 
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/20 text-white shadow-sm shrink-0">
                  <Receipt size={20} className="text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-black tracking-tight truncate" style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}>
                      Corte #{selectedCutId} —{' '}
                      {cutDetail?.cash_cut?.user?.name || cutDetail?.cash_cut?.driver?.name || 'Usuario'}
                    </h2>
                    {cutDetail?.cash_cut?.cut_type && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-white/20 border-white/30 whitespace-nowrap" style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}>
                        {cutDetail.cash_cut.cut_type.charAt(0).toUpperCase() + cutDetail.cash_cut.cut_type.slice(1)}
                      </span>
                    )}
                    {cutDetail?.cash_cut?.status && (
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border whitespace-nowrap ${
                        cutDetail.cash_cut.status === 'pendiente'
                          ? 'bg-amber-400/20 text-amber-200 border-amber-400/40'
                          : 'bg-emerald-400/20 text-emerald-200 border-emerald-400/40'
                      }`}>
                        {cutDetail.cash_cut.status === 'pendiente' ? 'Pendiente' : 'Confirmado'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5 opacity-80" style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}>
                    Registrado: {cutDetail?.cash_cut?.created_at ? new Date(cutDetail.cash_cut.created_at).toLocaleString('es-MX') : 'Cargando...'}
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={handleCloseDetail} 
                className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer shrink-0" 
                style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Contenido */}
            <div 
              className="p-6 max-md:p-4 space-y-6 max-md:space-y-4 overflow-y-auto flex-1 border-x border-b border-theme-border-subtle rounded-b-2xl"
              style={{ borderColor: borderSubtle }}
            >
              {loadingDetail ? (
                <div className="py-16 text-center flex flex-col items-center gap-2">
                  <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--theme-primary)' }} />
                  <span className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Cargando desglose...</span>
                </div>
              ) : (
                <>
                  {/* Tarjetas de montos — Tono 2 */}
                  {(() => {
                    const declared = Number(cutDetail?.cash_cut?.cash_declared || 0)
                    const expected = Number(cutDetail?.cash_cut?.expected_cash || 0)
                    const diff = declared - expected
                    const isPositiveOrZero = diff >= 0
                    const cutTypeLabel = cutDetail?.cash_cut?.cut_type
                      ? cutDetail.cash_cut.cut_type.charAt(0).toUpperCase() + cutDetail.cash_cut.cut_type.slice(1)
                      : 'Usuario'
                    const hasReceived = cutDetail?.cash_cut?.status === 'confirmado' && cutDetail?.cash_cut?.received_cash != null

                    return (
                      <div className={`grid ${hasReceived ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'} gap-3`}>
                        <div className="rounded-xl p-4 flex flex-col gap-1 transition-colors" style={{ backgroundColor: 'var(--theme-subcard-bg)', border: '1px solid color-mix(in srgb, #10b981 25%, transparent)' }}>
                          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>
                            Declarado por {cutTypeLabel}
                          </span>
                          <span className="text-xl font-black font-mono text-emerald-500">{formatCurrency(declared)}</span>
                        </div>
                        <div className="rounded-xl p-4 flex flex-col gap-1 transition-colors" style={{ backgroundColor: 'var(--theme-subcard-bg)', border: `1px solid ${borderSubtle}` }}>
                          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Esperado por sistema</span>
                          <span className="text-xl font-black font-mono" style={{ color: 'var(--theme-text)' }}>{formatCurrency(expected)}</span>
                        </div>
                        <div className="rounded-xl p-4 flex flex-col gap-1 transition-colors" style={{ backgroundColor: 'var(--theme-subcard-bg)', border: `1px solid color-mix(in srgb, ${isPositiveOrZero ? '#10b981' : '#f43f5e'} 25%, transparent)` }}>
                          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Diferencia</span>
                          <span className={`text-xl font-black font-mono ${isPositiveOrZero ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {isPositiveOrZero ? `+${formatCurrency(diff)}` : `-${formatCurrency(Math.abs(diff))}`}
                          </span>
                        </div>
                        {hasReceived && (
                          <div className="rounded-xl p-4 flex flex-col gap-1 transition-colors" style={{ backgroundColor: 'var(--theme-subcard-bg)', border: '1px solid color-mix(in srgb, var(--theme-primary) 30%, transparent)' }}>
                            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Recibido físicamente</span>
                            <span className="text-xl font-black font-mono" style={{ color: colorPrimario || 'var(--theme-primary)' }}>
                              {formatCurrency(cutDetail.cash_cut.received_cash)}
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* Tabla de órdenes — Tono 2 */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--theme-text-muted)' }}>
                      Desglose de órdenes entregadas ({cutDetail?.orders?.length || 0})
                    </p>
                    <div className="rounded-xl shadow-xs overflow-hidden overflow-x-auto w-full border transition-colors" style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: borderSubtle }}>
                      <table className="w-full min-w-[800px] text-left">
                        <thead style={{ backgroundColor: 'var(--theme-subcard-bg)', borderBottom: `1px solid ${borderSubtle}` }}>
                          <tr>
                            <th className="text-theme-text-muted text-xs uppercase font-semibold tracking-wider px-4 py-3">Folio</th>
                            <th className="text-theme-text-muted text-xs uppercase font-semibold tracking-wider px-4 py-3">Hora entrega</th>
                            <th className="text-theme-text-muted text-xs uppercase font-semibold tracking-wider px-4 py-3">Método de pago</th>
                            <th className="text-theme-text-muted text-xs uppercase font-semibold tracking-wider px-4 py-3 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: borderSubtle }}>
                          {(!cutDetail?.orders || cutDetail.orders.length === 0) ? (
                            <tr><td colSpan={4} className="text-theme-text px-4 py-6 text-center text-xs" style={{ color: 'var(--theme-text-muted)' }}>Sin órdenes registradas en este turno.</td></tr>
                          ) : (
                            cutDetail.orders.map((order, idx) => {
                              const pm = (order.metodoPago || order.metodo_pago || order.payment_method || 'efectivo').toLowerCase()
                              const isCash = pm === 'efectivo' || pm === 'cash'
                              const isTerminal = pm === 'terminal' || pm === 'tarjeta' || pm === 'card'
                              let badgeText = '💵 Efectivo'
                              if (isTerminal) badgeText = '💳 Terminal'
                              if (!isCash && !isTerminal) badgeText = '📲 Transferencia'
                              const folio = order.folio || order.dispatch_token || `#${order.id || idx + 1}`
                              const amount = Number(order.total || order.total_amount || 0)
                              return (
                                <tr key={order.id || idx} className="transition-colors hover:bg-black/5 dark:hover:bg-white/5" style={{ backgroundColor: 'var(--theme-subcard-bg)' }}>
                                  <td className="text-theme-text px-4 py-3 font-mono font-bold text-xs tracking-[1px]">{folio}</td>
                                  <td className="text-theme-text px-4 py-3 font-mono text-xs" style={{ color: 'var(--theme-text-muted)' }}>{order.hora || order.time || '--:--'}</td>
                                  <td className="text-theme-text px-4 py-3">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isCash ? 'bg-green-100 text-green-700 border-green-300' : isTerminal ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-blue-100 text-blue-700 border-blue-300'}`}>
                                      {badgeText}
                                    </span>
                                  </td>
                                  <td className={`text-theme-text px-4 py-3 font-mono font-bold text-xs text-right ${isCash ? 'text-emerald-500' : ''}`}>{formatCurrency(amount)}</td>
                                </tr>
                              )
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Monto físico recibido (solo gerente) */}
                  {canConfirm && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold flex items-center gap-1.5" style={{ color: 'var(--theme-text)' }}>
                        <Banknote size={13} style={{ color: 'var(--theme-primary)' }} />
                        Monto físico recibido
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold pointer-events-none z-10" style={{ color: 'var(--theme-text-muted)' }}>$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={receivedCash}
                          onChange={(e) => setReceivedCash(e.target.value)}
                          placeholder={cutDetail?.cash_cut?.expected_cash || '0.00'}
                          disabled={cutDetail?.cash_cut?.status === 'confirmado'}
                          className="input-subcard w-full text-xs pl-6 pr-3 py-3 rounded-xl border focus:outline-none transition-all disabled:opacity-60 font-mono font-bold"
                          style={{ backgroundColor: bgSubcard || 'var(--theme-subcard-bg)', borderColor: borderSubtle, color: 'var(--theme-text)' }}
                        />
                      </div>

                      {/* Comparación en tiempo real */}
                      {receivedCash !== '' && (() => {
                        const received = parseFloat(receivedCash) || 0
                        const expected = parseFloat(cutDetail?.cash_cut?.expected_cash) || 0
                        const diff = received - expected
                        const isExact = Math.abs(diff) < 0.01

                        if (isExact) {
                          return (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-green-100 text-green-700 border border-green-300">
                              <CheckCircle2 size={13} />
                              <span>Monto exacto — el corte está completo.</span>
                            </div>
                          )
                        }
                        return (
                          <div className="flex items-start gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-300">
                            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                            <span>
                              {diff < 0
                                ? `Falta $${Math.abs(diff).toFixed(2)} — se recibirán $${received.toFixed(2)} de $${expected.toFixed(2)} esperados. Quedará registrada la discrepancia.`
                                : `Sobrante de $${diff.toFixed(2)} — se recibirán $${received.toFixed(2)} de $${expected.toFixed(2)} esperados. Quedará registrada la diferencia.`
                              }
                            </span>
                          </div>
                        )
                      })()}
                    </div>
                  )}

                  {/* Notas — Tono 2 */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold flex items-center gap-1.5" style={{ color: 'var(--theme-text)' }}>
                      <FileText size={13} style={{ color: 'var(--theme-primary)' }} />
                      Notas de la recepción (opcional)
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Anotar discrepancias o comentarios sobre el efectivo entregado..."
                      rows={3}
                      disabled={cutDetail?.cash_cut?.status === 'confirmado'}
                      className="input-subcard w-full text-xs p-3 rounded-xl border focus:outline-none transition-all resize-none disabled:opacity-60"
                      style={{ backgroundColor: bgSubcard || 'var(--theme-subcard-bg)', borderColor: borderSubtle, color: 'var(--theme-text)' }}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 flex items-center justify-end gap-3" style={{ backgroundColor: 'var(--theme-surface)', borderTop: `1px solid ${borderSubtle}` }}>
              <button
                type="button"
                onClick={handleCloseDetail}
                className="px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer hover:brightness-110 active:scale-95 flex items-center justify-center"
                style={{
                  backgroundColor: colorPrimario || 'var(--theme-primary)',
                  borderColor: colorPrimario || 'var(--theme-primary)',
                  color: primaryBtnText || '#ffffff'
                }}
              >
                Cancelar
              </button>
              {canConfirm ? (
                <button
                  type="button"
                  onClick={handleConfirmCut}
                  disabled={confirming || cutDetail?.cash_cut?.status === 'confirmado' || (canConfirm && receivedCash === '')}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white"
                  style={{ backgroundColor: cutDetail?.cash_cut?.status === 'confirmado' ? '#10b981' : 'var(--theme-primary)' }}
                >
                  {confirming ? (<><RefreshCw size={14} className="animate-spin" /><span>Confirmando...</span></>) :
                   cutDetail?.cash_cut?.status === 'confirmado' ? (<><Check size={14} /><span>Corte confirmado</span></>) :
                   (<><CheckCircle2 size={14} /><span>Confirmar recepción</span></>)}
                </button>
              ) : (
                <p className="text-xs py-2" style={{ color: 'var(--theme-text-muted)' }}>Solo el gerente puede confirmar cortes.</p>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
