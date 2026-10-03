import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, ShoppingBag, Utensils, Clock, Flame, Play, CheckCircle2, ChefHat, RefreshCw, RotateCcw, QrCode, LogOut, Loader2, Volume2, VolumeX, AlertTriangle } from 'lucide-react'

import Badge from '../../components/ui/Badge'
import ScrollHint from '../../components/ui/ScrollHint'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { getKitchenOrders, updateKitchenOrderStatus } from '../../api/orders'
import echo from '../../echo'
import QRCode from 'react-qr-code'

const STATUS_TO_INTERNAL = {
  pendiente: 'pending',
  en_preparacion: 'preparing',
  listo: 'ready',
  pending: 'pending',
  preparing: 'preparing',
  ready: 'ready',
  completed: 'completed',
}

const agruparPlatillos = (platillos) => {
  const grupos = []
  if (!Array.isArray(platillos)) return grupos

  platillos.forEach(platillo => {
    if (typeof platillo === 'string') {
      grupos.push(platillo)
      return
    }

    const name = platillo.name ?? platillo.nombre ?? platillo.dish?.name ?? ''
    const qty = platillo.quantity ?? platillo.cantidad ?? 1
    const extras = platillo.extras
      ? (Array.isArray(platillo.extras) ? platillo.extras : [platillo.extras])
      : []
    const note = platillo.notes ?? platillo.nota ?? ''

    // Sort extras to ensure deterministic comparison
    const key = JSON.stringify({
      nombre: name,
      extras: [...extras].sort(),
      nota: note
    })

    const grupoExistente = grupos.find(g => g.key === key)

    if (grupoExistente) {
      grupoExistente.quantity += qty
    } else {
      grupos.push({
        key,
        name,
        extras,
        notes: note,
        quantity: qty
      })
    }
  })

  return grupos
}

const normalizeOrder = (order) => {
  const rawItems = Array.isArray(order.items)
    ? order.items
    : Array.isArray(order.platillos)
      ? order.platillos
      : []
  const mapped = rawItems.map((item) => {
    if (typeof item === 'string') return item
    return {
      name: item.nombre ?? item.name ?? item.dish?.name ?? '',
      quantity: item.cantidad ?? item.quantity ?? 1,
      extras: item.extras ?? [],
      notes: item.nota ?? item.notes ?? '',
    }
  })

  const rawStatus = order.estado ?? order.status ?? 'pending'
  const modality  = order.canal ?? order.modalidad ?? order.modality ?? 'local'

  return {
    ...order,
    id:           order.id,
    daily_number: order.daily_number ?? order.numero_diario ?? order.daily_order_number ?? order.id,
    folio:        order.numero_pedido ?? order.folio ?? `PED-${String(order.id).padStart(4,'0')}`,
    customer:     order.cliente ?? order.customer ?? order.customer_name ?? 'Cliente local',
    table:        order.table ?? order.table_number ?? order.mesa ?? null,
    modality,
    status:       STATUS_TO_INTERNAL[rawStatus] ?? rawStatus,
    items:        agruparPlatillos(mapped),
    total:        order.total ?? order.total_amount ?? 0,
    address:      order.direccion ?? order.address ?? '',
    phone:        order.telefono ?? order.phone ?? '',
    created_at:   order.fecha ?? order.created_at ?? '',
  }
}

const getLocationLabel = (order) => {
  if (order.table || order.table_number) {
    return `Mesa ${order.table ?? order.table_number}`
  }
  if (order.modality === 'delivery') return 'Delivery'
  if (order.modality === 'pickup') return 'Para llevar'
  return 'Sin mesa'
}

const formatOrderTime = (order) => {
  const raw = order.created_at || order.fecha || order.date
  if (!raw) return ''
  // El backend devuelve hora local — NO agregar Z ni convertir timezone
  const dateStr = raw.replace(' ', 'T')
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return raw
  return date.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

const getDisplayStatus = (status) => {
  if (status === 'pending') return 'pendiente'
  if (status === 'preparing') return 'en_preparacion'
  if (status === 'ready') return 'listo'
  if (status === 'completed') return 'completada'
  return status
}

const isOrderReady = (status) => ['listo', 'ready', 'completed', 'completada'].includes(status)

const ActiveOrderCard = ({
  order,
  index,
  currentTime,
  isTransitioning = false,
  getDisplayStatus,
  getElapsedTime,
  isOrderReady,
  getLocationLabel,
  formatOrderTime,
  handleTransition,
  setActiveQrOrder
}) => {
  const { isPrimaryLight, primaryBtnText } = useTheme()
  const displayStatus = getDisplayStatus(order.status)
  const clientName = order.customer || 'Invitado'
  const clientLabel = order.modality === 'local' ? `Mesero: ${clientName}` : `Usuario: ${clientName}`
  const delayClass = `delay-${Math.min(index + 1, 5)}`
  const elapsed = getElapsedTime(order, currentTime)
  const isUrgent = elapsed.isCritical && (displayStatus === 'pendiente' || displayStatus === 'en_preparacion')

  // Cantidad total de platillos en el pedido
  const totalQty = Array.isArray(order.items)
    ? order.items.reduce((sum, item) => sum + (typeof item === 'string' ? 1 : (item.quantity ?? 1)), 0)
    : 1

  const [showScrollWarning, setShowScrollWarning] = useState(false)
  const bodyRef = useRef(null)

  const checkScroll = () => {
    const el = bodyRef.current
    if (!el) return
    const hasOverflow = el.scrollHeight > el.clientHeight
    const isAtTop = el.scrollTop < 10
    setShowScrollWarning(hasOverflow && isAtTop)
  }

  useEffect(() => {
    const timer = setTimeout(checkScroll, 300)
    window.addEventListener('resize', checkScroll)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', checkScroll)
    }
  }, [order.items])

  // Opción 1: Mini-sistema de Cápsulas en Tono 1 (Blanco Sólido & Máxima Legibilidad)
  const renderKitchenStatusBadge = (status) => {
    const configs = {
      pendiente: {
        bg: 'bg-white',
        border: 'border-amber-200',
        text: 'text-amber-800',
        dot: 'bg-amber-500',
        label: 'Pendiente'
      },
      en_preparacion: {
        bg: 'bg-white',
        border: 'border-sky-200',
        text: 'text-sky-800',
        dot: 'bg-sky-500 animate-pulse',
        label: 'En preparación'
      },
      listo: {
        bg: 'bg-white',
        border: 'border-emerald-200',
        text: 'text-emerald-800',
        dot: 'bg-emerald-500',
        label: 'Listo'
      },
      completada: {
        bg: 'bg-white',
        border: 'border-slate-200',
        text: 'text-slate-800',
        dot: 'bg-slate-500',
        label: 'Completada'
      }
    }

    const cfg = configs[status] || configs.pendiente

    return (
      <span className={`${cfg.bg} ${cfg.text} ${cfg.border} text-xs font-extrabold px-3 py-1 rounded-lg shadow-xs border flex items-center gap-1.5 shrink-0`}>
        <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot} shadow-xs shrink-0`} />
        <span>{cfg.label}</span>
      </span>
    )
  }

  const renderKitchenModalityBadge = (modality) => {
    const mod = modality || ''
    if (mod === 'domicilio' || mod === 'delivery') {
      return (
        <span className="bg-white text-purple-700 font-extrabold text-[10px] px-2.5 py-1 rounded-lg shadow-xs border border-purple-200 uppercase tracking-wider select-none shrink-0 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0" />
          <span>Delivery</span>
        </span>
      )
    }
    if (mod === 'pickup') {
      return (
        <span className="bg-white text-sky-700 font-extrabold text-[10px] px-2.5 py-1 rounded-lg shadow-xs border border-sky-200 uppercase tracking-wider select-none shrink-0 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
          <span>Para llevar</span>
        </span>
      )
    }
    return (
      <span className="bg-white text-emerald-700 font-extrabold text-[10px] px-2.5 py-1 rounded-lg shadow-xs border border-emerald-200 uppercase tracking-wider select-none shrink-0 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
        <span>Local</span>
      </span>
    )
  }

  return (
    <div
      key={order.id}
      style={{ borderRadius: '1rem', color: 'var(--theme-text)' }}
      className={`relative bg-white dark:bg-[var(--theme-surface)] rounded-2xl shadow-sm border border-slate-200 dark:border-white/10 flex flex-col h-[360px] overflow-hidden hover:-translate-y-1 transition-all duration-300 transform animate-fadeInUp ${delayClass} hover:shadow-xl ${
        order.status === 'ready' || order.status === 'listo' || isOrderReady(displayStatus)
          ? 'border-2 border-emerald-500/80 ring-1 ring-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.18)]'
          : isUrgent
            ? 'border border-red-500/30 border-l-4 border-l-red-500 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.15)]'
            : 'border border-white/10 border-l-4 border-l-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.05)]'
      }`}
    >
      {/* Cabecera del ticket (Azul) - Altura natural */}
      <div 
        className="bg-blue-800 text-white p-3 shrink-0 border-b transition-colors duration-200" 
        style={{ 
          backgroundColor: 'var(--theme-primary, #1e40af)',
          borderBottomColor: 'rgba(255, 255, 255, 0.15)',
          color: '#FFFFFF'
        }}
      >
        <div className="flex items-center justify-between mb-1.5 text-sm">
          <span className="text-base font-black text-white tracking-tight flex items-center truncate">
            Pedido #{order.daily_number ?? order.id}
            <span className="mx-2 font-normal opacity-40">·</span>
            <span className="font-bold opacity-95">{getLocationLabel(order)}</span>
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Píldora 1 Platillo Blanco Sólido */}
            <span className="bg-white text-slate-800 text-xs font-extrabold px-2 py-0.5 rounded-lg shadow-xs border border-slate-200/80 flex items-center gap-1 shrink-0">
              <span>{totalQty}</span>
              <span className="text-[10px] text-slate-600 font-semibold">{totalQty === 1 ? 'platillo' : 'platillos'}</span>
            </span>
            {renderKitchenStatusBadge(displayStatus)}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs pt-0.5">
          <div className="leading-relaxed truncate flex items-center flex-wrap gap-x-2 gap-y-0.5 font-medium text-white">
            <span className="font-bold">
              {clientLabel}
            </span>
            {order.folio && (
              <>
                <span className="opacity-40">·</span>
                <span className="bg-white/95 text-slate-800 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shadow-2xs border border-slate-200/60">
                  Folio: {order.folio}
                </span>
              </>
            )}
            <span className="opacity-40">·</span>
            <span className="opacity-90">{formatOrderTime(order)}</span>
            <span className="opacity-40">·</span>
            {isUrgent ? (
              <span className="bg-red-600 text-white font-black text-[10px] px-2 py-0.5 rounded-md shadow-md border border-red-400 flex items-center gap-1 animate-pulse shrink-0">
                <span>⚡</span>
                <span>{elapsed.text}</span>
              </span>
            ) : (
              <span className={`text-xs ${elapsed.isCritical ? 'text-red-300 font-bold' : 'opacity-90 font-medium'}`}>
                {elapsed.text}
              </span>
            )}
          </div>
          <div className="shrink-0">
            {renderKitchenModalityBadge(order.modality)}
          </div>
        </div>
      </div>

      {/* 3. CONTENEDOR DE PLATILLOS (Scroll Interno) */}
      <div
        ref={bodyRef}
        onScroll={checkScroll}
        style={{ background: 'var(--theme-surface)' }}
        className="flex-1 overflow-y-auto p-3 custom-scrollbar min-h-0 bg-[var(--theme-surface)]
          [&::-webkit-scrollbar]:w-1.5
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:bg-slate-300
          dark:[&::-webkit-scrollbar-thumb]:bg-white/20
          [&::-webkit-scrollbar-thumb]:rounded-full"
      >
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
          PLATILLOS
        </span>
        
        <ul className="space-y-2">
          {Array.isArray(order.items) ? (
            order.items.map((item, idx) => {
              if (typeof item === 'string') {
                return (
                  <li key={idx} className="pb-1.5 mb-1.5 border-b border-slate-100 dark:border-white/5 last:border-0 last:pb-0 last:mb-0 text-sm font-semibold" style={{ color: 'var(--theme-text)' }}>
                    {item}
                  </li>
                )
              }

              const name = item.name ?? item.dish?.name ?? ''
              const qty = item.quantity ?? 1
              const extras = item.extras
                ? (Array.isArray(item.extras) ? item.extras : [item.extras])
                : []
              const itemNotes = item.notes ?? item.nota ?? ''

              return (
                <li key={idx} className="pb-1.5 mb-1.5 border-b border-slate-100 dark:border-white/5 last:border-0 last:pb-0 last:mb-0 space-y-0.5">
                  <div className="text-sm font-semibold flex items-center justify-between gap-2" style={{ color: 'var(--theme-text)' }}>
                    <span className="font-semibold text-slate-800 dark:text-theme-text truncate">
                      {name}
                    </span>
                    <span className="bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-theme-text px-2 py-0.5 rounded text-xs font-bold shrink-0">
                      x{qty}
                    </span>
                  </div>
                  
                  {extras.length > 0 && (
                    <div className="space-y-0.5">
                      {extras.map((ex, i) => {
                        const exName = typeof ex === 'object' ? (ex.name || '') : ex
                        if (!exName) return null
                        return (
                          <div key={i} className="text-xs pl-3 text-slate-500 dark:text-theme-text-muted">
                            <span className="text-emerald-500 font-bold">+</span> {exName}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  
                  {itemNotes && (
                    <div className="text-xs text-amber-600 dark:text-yellow-400 pl-3 mt-0.5 font-medium">
                      📝 {itemNotes}
                    </div>
                  )}
                </li>
              )
            })
          ) : (
            <li className="text-sm font-semibold" style={{ color: 'var(--theme-text)' }}>{order.items}</li>
          )}
        </ul>

        {/* Warning Note Banner if order has notes/comments */}
        {(order.notes || order.comment || order.observation) && (
          <div className="bg-amber-50 dark:bg-yellow-500/10 text-amber-800 dark:text-yellow-400/90 text-xs py-1 px-2 rounded-lg border border-amber-200 dark:border-yellow-500/20 flex items-start gap-1 mt-2">
            <span className="font-bold text-amber-600 dark:text-yellow-500 shrink-0">Nota:</span>
            <span>{order.notes || order.comment || order.observation}</span>
          </div>
        )}
      </div>

      {/* Floating Scroll indicator overlay */}
      {showScrollWarning && (
        <div className="absolute bottom-[58px] left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full backdrop-blur-md border shadow-md z-10 pointer-events-none select-none bg-white/90 dark:bg-slate-900/90 border-slate-200 dark:border-white/20">
          <svg
            width="10" height="10" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="3"
            className="animate-bounce shrink-0 text-blue-600 dark:text-blue-400"
          >
            <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[9px] font-bold uppercase tracking-wider select-none whitespace-nowrap text-blue-700 dark:text-blue-400">
            Más platillos abajo
          </span>
        </div>
      )}

      {/* 4. PIE DE TARJETA / BOTÓN (Siempre visible abajo) */}
      <div className="p-3 bg-white dark:bg-[var(--theme-surface)] border-t border-slate-100 dark:border-white/10 shrink-0 mt-auto">
        {displayStatus === 'pendiente' ? (
          <button
            onClick={() => handleTransition(order.id, order.status)}
            disabled={isTransitioning}
            style={{ background: 'var(--theme-primary, #1d4ed8)', color: 'var(--theme-primary-contrast, #fff)' }}
            className="w-full text-sm font-bold py-2.5 px-3 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed active:scale-98 bg-blue-700 text-white hover:bg-blue-800"
          >
            {isTransitioning ? (
              <>
                <Loader2 size={15} className="animate-spin text-white" />
                <span>Iniciando preparación...</span>
              </>
            ) : (
              <>
                <Play size={14} fill="currentColor" />
                <span>Iniciar preparación</span>
              </>
            )}
          </button>
        ) : displayStatus === 'en_preparacion' ? (
          <button
            onClick={() => handleTransition(order.id, order.status)}
            disabled={isTransitioning}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2.5 px-3 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed active:scale-98"
          >
            {isTransitioning ? (
              <>
                <Loader2 size={15} className="animate-spin text-white" />
                <span>Actualizando estado...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={15} />
                <span>
                  {order.modality === 'local' ? 'Platillo terminado' : 'Pedido terminado'}
                </span>
              </>
            )}
          </button>
        ) : displayStatus === 'listo' ? (
          <button
            onClick={() => {
              if (order.modality === 'local') {
                handleTransition(order.id, order.status)
              } else {
                setActiveQrOrder(order)
              }
            }}
            disabled={isTransitioning}
            className={`w-full text-sm font-bold py-2.5 px-3 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed active:scale-98 ${
              order.modality === 'local'
                ? 'bg-blue-700 hover:bg-blue-800 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/25'
            }`}
          >
            {isTransitioning && order.modality === 'local' ? (
              <>
                <Loader2 size={15} className="animate-spin text-white" />
                <span>Terminando orden...</span>
              </>
            ) : (
              <>
                {order.modality === 'local' ? <CheckCircle2 size={15} /> : <QrCode size={15} />}
                <span>
                  {order.modality === 'local' ? 'Terminar orden' : 'Escanear QR · Esperando repartidor'}
                </span>
              </>
            )}
          </button>
        ) : null}
      </div>
    </div>
  )
}

export default function KitchenView() {
  const navigate = useNavigate()
  const { logoutUser } = useAuth()
  const { bgBody, bgCard, bgSubcard, isLight, colorPrimario, primaryBtnText, textColor, textMuted, textSubtle, borderSubtle, logoUrl, restaurantName } = useTheme()

  const [isLogoutHovered, setIsLogoutHovered] = useState(false)

  const handleLogout = () => {
    logoutUser()
    navigate('/login')
  }

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  const [refreshing, setRefreshing] = useState(false)
  const [transitioningIds, setTransitioningIds] = useState([])
  const [confirmingRevertId, setConfirmingRevertId] = useState(null)
  const [activeQrOrder, setActiveQrOrder] = useState(null)
  const [completedCount, setCompletedCount] = useState(0)
  const [audioUnlocked, setAudioUnlocked] = useState(false)

  // Referencias para control de estado
  const prevOrdersCount = useRef(0)
  const revertTimerRef = useRef(null)
  const audioCtxRef = useRef(null)

  // Desbloquear AudioContext con el primer gesto del usuario (clic, toque o tecla)
  const unlockAudio = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (!AudioContextClass) return

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass()
      }

      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().then(() => {
          setAudioUnlocked(true)
        }).catch(() => {})
      } else if (audioCtxRef.current.state === 'running') {
        setAudioUnlocked(true)
      }
    } catch (e) {
      // Ignorar restricciones si el navegador aún no detecta interacción directa
    }
  }, [])

  // Registrar listeners para capturar silenciosamente el primer toque/clic
  useEffect(() => {
    const handleFirstGesture = () => {
      unlockAudio()
      window.removeEventListener('click', handleFirstGesture)
      window.removeEventListener('touchstart', handleFirstGesture)
      window.removeEventListener('keydown', handleFirstGesture)
    }

    window.addEventListener('click', handleFirstGesture, { passive: true })
    window.addEventListener('touchstart', handleFirstGesture, { passive: true })
    window.addEventListener('keydown', handleFirstGesture, { passive: true })

    return () => {
      window.removeEventListener('click', handleFirstGesture)
      window.removeEventListener('touchstart', handleFirstGesture)
      window.removeEventListener('keydown', handleFirstGesture)
    }
  }, [unlockAudio])

  // Reproducir alerta sonora sólo si el AudioContext ya fue desbloqueado por el usuario
  const playNotificationSound = useCallback(() => {
    try {
      const ctx = audioCtxRef.current
      if (!ctx || ctx.state !== 'running') {
        return
      }

      const beep = (startTime, frequency = 880, duration = 0.15) => {
        const oscillator = ctx.createOscillator()
        const gainNode = ctx.createGain()
        oscillator.connect(gainNode)
        gainNode.connect(ctx.destination)
        oscillator.frequency.value = frequency
        oscillator.type = 'sine'
        gainNode.gain.setValueAtTime(0.3, startTime)
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
        oscillator.start(startTime)
        oscillator.stop(startTime + duration)
      }

      beep(ctx.currentTime)
      beep(ctx.currentTime + 0.2)
    } catch (err) {
      // Manejo silencioso de audio
    }
  }, [])

  // Ticking digital clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Fetch kitchen orders
  const fetchOrders = useCallback(async () => {
    try {
      setRefreshing(true)
      const todayStr = new Date().toISOString().split('T')[0]

      const [resActive, resCompleted] = await Promise.all([
        getKitchenOrders({ status: 'pending,preparing,ready' }),
        getKitchenOrders({ status: 'completed', date: todayStr })
      ])

      const newOrders = Array.isArray(resActive.data)
        ? resActive.data
        : Array.isArray(resActive.data?.pedidos)
          ? resActive.data.pedidos
          : Array.isArray(resActive.data?.data)
            ? resActive.data.data
            : []

      const completedList = Array.isArray(resCompleted.data)
        ? resCompleted.data
        : Array.isArray(resCompleted.data?.pedidos)
          ? resCompleted.data.pedidos
          : Array.isArray(resCompleted.data?.data)
            ? resCompleted.data.data
            : []

      setOrders(prevOrders => {
        const backendActive = newOrders.map(normalizeOrder)

        if (backendActive.length > prevOrdersCount.current) {
          playNotificationSound()
        }
        prevOrdersCount.current = backendActive.length
        return backendActive
      })

      // Update completedCount based on backend response (attendedToday) or completedList count
      const attended = resActive.data?.attendedToday
        ?? resActive.data?.attended_today
        ?? resActive.data?.atendidos_hoy
        ?? resCompleted.data?.attendedToday
        ?? resCompleted.data?.attended_today
        ?? resCompleted.data?.atendidos_hoy
        ?? completedList.length

      setCompletedCount(typeof attended === 'number' ? attended : completedList.length)

      setError(null)
    } catch (err) {
      console.warn("Error fetching kitchen orders, using local fallback state:", err)
      setOrders(prev => {
        return prev.filter(o => o.status !== 'completed' && o.status !== 'completado')
      })
      setError(null)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [playNotificationSound])

  // Initial fetch on mount
  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // WebSocket real-time subscription for new orders
  useEffect(() => {
    const channel = echo.private('kitchen.orders')

    const handleNewOrder = (event) => {
      const rawOrder = event?.order ?? event
      if (!rawOrder || (!rawOrder.id && !rawOrder.folio)) return
      const newOrder = normalizeOrder(rawOrder)
      playNotificationSound()
      setOrders(prev => {
        if (prev.some(o => o.id === newOrder.id)) {
          return prev.map(o => o.id === newOrder.id ? newOrder : o)
        }
        return [newOrder, ...prev]
      })
    }

    const handleStatusUpdated = (event) => {
      const rawOrder = event?.order ?? event
      if (!rawOrder || (!rawOrder.id && !rawOrder.folio)) return
      const updatedOrder = normalizeOrder(rawOrder)
      setOrders(prev => {
        if (['completed', 'completado', 'cancelled', 'cancelado', 'delivered', 'entregado'].includes(updatedOrder.status)) {
          return prev.filter(o => o.id !== updatedOrder.id)
        }
        if (prev.some(o => o.id === updatedOrder.id)) {
          return prev.map(o => o.id === updatedOrder.id ? updatedOrder : o)
        }
        return [updatedOrder, ...prev]
      })
      if (['ready', 'completed', 'listo'].includes(updatedOrder.status)) {
        setCompletedCount(c => c + 1)
      }
    }

    // Suscribir a los eventos de backend
    channel
      .listen('OrderCreated', handleNewOrder)
      .listen('.OrderCreated', handleNewOrder)
      .listen('NewOrderCreated', handleNewOrder)
      .listen('.NewOrderCreated', handleNewOrder)
      .listen('App\\Events\\OrderCreated', handleNewOrder)
      .listen('.App\\Events\\OrderCreated', handleNewOrder)
      .listen('OrderStatusUpdated', handleStatusUpdated)
      .listen('.OrderStatusUpdated', handleStatusUpdated)

    return () => {
      channel.stopListening('OrderCreated')
      channel.stopListening('.OrderCreated')
      channel.stopListening('NewOrderCreated')
      channel.stopListening('.NewOrderCreated')
      channel.stopListening('App\\Events\\OrderCreated')
      channel.stopListening('.App\\Events\\OrderCreated')
      channel.stopListening('OrderStatusUpdated')
      channel.stopListening('.OrderStatusUpdated')
      echo.leave('kitchen.orders')
    }
  }, [playNotificationSound])

  // Status transition handler con bloqueo contra múltiples clics y manejo estricto de 409 (Conflict)
  const handleTransition = async (id, currentStatus) => {
    if (transitioningIds.includes(id)) return

    setTransitioningIds(prev => [...prev, id])

    const targetOrder = orders.find(o => o.id === id)
    const isLocal = targetOrder ? targetOrder.modality === 'local' : false

    let nextStatus = 'preparing'
    if (currentStatus === 'pending' || currentStatus === 'pendiente') {
      nextStatus = 'preparing'
    } else if (currentStatus === 'preparing' || currentStatus === 'en_preparacion') {
      nextStatus = isLocal ? 'completed' : 'ready'
    } else if (currentStatus === 'ready' || currentStatus === 'listo') {
      nextStatus = 'completed'
    }

    try {
      // 1. Esperar la respuesta real del servidor ANTES de ocultar o cambiar la tarjeta
      const response = await updateKitchenOrderStatus(id, nextStatus)
      
      // 2. SOLO AQUÍ, si el servidor guardó el cambio con éxito (200 OK / 204), actualizamos la pantalla local
      if (response && (response.status === 200 || response.status === 204 || response.data)) {
        if (nextStatus === 'completed') {
          setCompletedCount(c => c + 1)
          setOrders(prev => prev.filter(o => o.id !== id))
        } else {
          setOrders(prev => prev.map(o => o.id === id ? { ...o, status: nextStatus } : o))
        }
      }
      await fetchOrders()
    } catch (error) {
      // 3. Si falla la petición, la tarjeta NUNCA desaparece antes de tiempo, evitando el parpadeo
      console.error("El servidor rechazó el cambio:", error)
      if (error?.response && error.response.status === 409) {
        console.warn("Desincronización detectada. Recargando comandas desde el servidor...")
        setError("Desincronización detectada (409 Conflict). Recargando comandas desde el servidor...")
        setTimeout(() => setError(null), 4000)
      } else {
        const serverMsg = error?.response?.data?.message || 'Error al actualizar estado del pedido.'
        setError(serverMsg)
        setTimeout(() => setError(null), 5000)
      }
      // Forzar una recarga limpia para asegurar que vemos la realidad de la base de datos
      await fetchOrders()
    } finally {
      setTransitioningIds(prev => prev.filter(item => item !== id))
    }
  }

  // Refrescar pedidos manualmente
  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchOrders()
    setRefreshing(false)
  }

  // Revertir estado a pendiente con doble confirmación de 3s
  const handleRegresarPendiente = (e, orderId) => {
    e.stopPropagation()
    if (confirmingRevertId !== orderId) {
      setConfirmingRevertId(orderId)
      if (revertTimerRef.current) clearTimeout(revertTimerRef.current)
      revertTimerRef.current = setTimeout(() => {
        setConfirmingRevertId(null)
      }, 3000)
    } else {
      if (revertTimerRef.current) clearTimeout(revertTimerRef.current)
      setConfirmingRevertId(null)
      executeRevertStatus(orderId)
    }
  }

  const executeRevertStatus = async (id) => {
    const targetOrder = orders.find(o => o.id === id)
    const currentStatus = targetOrder ? targetOrder.status : 'preparing'
    let prevStatus = 'pending'
    if (currentStatus === 'ready' || currentStatus === 'listo') {
      prevStatus = 'preparing'
    }

    try {
      await updateKitchenOrderStatus(id, prevStatus)
      await fetchOrders()
    } catch (error) {
      if (error?.response && error.response.status === 409) {
        console.warn("Desincronización detectada al revertir. Recargando comandas desde el servidor...")
      } else {
        console.error("Error al revertir estado en cocina:", error)
      }
      await fetchOrders()
    }
  }

  // Limpiar temporizador al desmontar
  useEffect(() => {
    return () => {
      if (revertTimerRef.current) clearTimeout(revertTimerRef.current)
    }
  }, [])

  // Elapsed time helper calculation con SLA reactivo en tiempo real (> 20 min)
  const getElapsedTime = (order, now = currentTime) => {
    const raw = order.created_at || order.fecha || order.date
    if (!raw) return { mins: 0, text: '', isCritical: false }
    // El backend devuelve hora local — NO agregar Z
    const dateStr = raw.replace(' ', 'T')
    const created = new Date(dateStr)
    if (isNaN(created.getTime())) return { mins: 0, text: '', isCritical: false }
    const nowDate = now instanceof Date ? now : new Date()
    const diffMs = nowDate.getTime() - created.getTime()
    const mins = Math.max(0, Math.floor(diffMs / 60000))
    const isCritical = mins >= 20

    let text = ''
    if (mins < 60) {
      text = `Hace ${mins} min`
    } else {
      const hrs = Math.floor(mins / 60)
      const remMins = mins % 60
      text = remMins > 0
        ? `Hace ${hrs} h y ${remMins} min`
        : `Hace ${hrs} h`
    }

    return { mins, text, isCritical }
  }

  // Modality helper
  const renderModality = (order) => {
    const mod = order.modality || ''
    if (mod === 'domicilio' || mod === 'delivery') {
      return (
        <span className="bg-purple-600 text-white font-bold px-3 py-1 rounded-full text-xs tracking-wide uppercase select-none shadow-sm">
          Delivery
        </span>
      )
    }
    if (mod === 'pickup') {
      return (
        <span className="bg-blue-600 text-white font-bold px-3 py-1 rounded-full text-xs tracking-wide uppercase select-none shadow-sm">
          Para llevar
        </span>
      )
    }
    return (
      <span className="bg-green-600 text-white font-bold px-3 py-1 rounded-full text-xs tracking-wide uppercase select-none shadow-sm">
        Local
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col font-sans p-4 md:p-6 lg:p-8 animate-fadeIn" style={{ 
        backgroundColor: 'var(--theme-bg)',
        minHeight: '100vh', 
        color: 'var(--theme-text)' 
      }}>
        {/* Header Skeleton */}
        <div className="h-16 flex flex-wrap items-center justify-between gap-3 px-4 md:px-6 rounded-2xl mb-6" style={{ background: 'color-mix(in srgb, var(--theme-bg) 75%, #000)', borderBottom: '1px solid rgba(128,128,128,0.2)' }}>
          <div className="h-8 w-48 bg-white/5 animate-shimmer rounded-xl" />
          <div className="h-8 w-32 bg-white/5 animate-shimmer rounded-xl" />
        </div>
        {/* Grid Skeleton */}
        <div 
          className="flex-1 grid gap-4 md:gap-6 w-full items-start"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))' }}
        >
          <div className="animate-shimmer rounded-2xl h-80 w-full" />
          <div className="animate-shimmer rounded-2xl h-80 w-full" />
          <div className="animate-shimmer rounded-2xl h-80 w-full" />
        </div>
      </div>
    )
  }

  // Ordenar pedidos activos: más antiguo primero, excluyendo completados y cancelados
  const sortedActiveOrders = orders.filter(o =>
    o.status !== 'completed' &&
    o.status !== 'completado' &&
    o.status !== 'cancelled' &&
    o.status !== 'cancelado'
  ).sort((a, b) => {
    const dateA = new Date(a.created_at || a.time || 0).getTime()
    const dateB = new Date(b.created_at || b.time || 0).getTime()
    return dateA - dateB
  })

  const activeCount = sortedActiveOrders.length
  const colorCountClass = activeCount === 0 ? 'text-green-400' : 
                          activeCount <= 3  ? 'text-yellow-400' : 'text-red-400'

  // Cantidad total de platillos que están en espera o pendiente
  const pendingDishesCount = orders
    .filter(o => o.status === 'pending' || o.status === 'pendiente')
    .reduce((sum, o) => {
      const qty = Array.isArray(o.items)
        ? o.items.reduce((itemSum, item) => itemSum + (typeof item === 'string' ? 1 : (item.quantity ?? 1)), 0)
        : 1
      return sum + qty
    }, 0)

  return (
    <div className="min-h-screen flex flex-col font-sans select-none" style={{ 
      backgroundColor: 'var(--theme-bg)',
      minHeight: '100vh',
      color: 'var(--theme-text)'
    }}>
      {/* Header bar */}
      <header 
        className="bg-blue-800 text-white p-4 md:p-5 flex flex-wrap items-start md:items-center gap-4 w-full shrink-0 sticky top-0 z-40 transition-all duration-200" 
        style={{ 
          backgroundColor: 'var(--theme-primary, #1e40af)', 
          color: 'var(--theme-primary-contrast, #ffffff)', 
          borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 4px 20px -2px rgba(0,0,0,0.1)'
        }}
      >
        {/* 1. GRUPO IZQUIERDO: Operaciones (Crece y hace wrap si es necesario) */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Contenedor Nombre del Establecimiento + Identidad Cocina (Tono 1) */}
          <div 
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl shrink-0 max-w-[55vw] sm:max-w-[65vw] shadow-xs"
            style={{
              backgroundColor: bgCard,
              border: `1px solid ${borderSubtle}`,
            }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-7 h-7 object-contain rounded-lg shrink-0" />
            ) : (
              <div 
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shadow-xs shrink-0"
                style={{
                  backgroundColor: colorPrimario,
                  color: primaryBtnText
                }}
              >
                <span className="font-bold">
                  {(restaurantName || 'R')[0].toUpperCase()}
                </span>
              </div>
            )}
            <span 
              className="font-bold tracking-wider uppercase text-xs sm:text-sm truncate" 
              style={{ color: textColor }}
              title={restaurantName || 'Restaurante'}
            >
              {restaurantName || 'Restaurante'}
            </span>
            <span 
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider"
              style={{ 
                backgroundColor: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)', 
                color: textMuted,
                border: `1px solid ${borderSubtle}` 
              }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Cocina</span>
            </span>
          </div>
          
          {/* Contenedor Indicador de Pedidos Activos (Tono 1) */}
          <div 
            className="flex items-center gap-2 px-3 py-2 rounded-xl shadow-xs text-xs font-bold transition-all"
            style={{ 
              backgroundColor: bgCard,
              border: `1px solid ${borderSubtle}`,
              color: textColor
            }}
          >
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              activeCount === 0 ? 'bg-emerald-500' : 
              activeCount <= 3  ? 'bg-amber-500' : 'bg-rose-500 animate-pulse'
            }`} />
            <span className="tracking-wide">
              {activeCount === 0 ? 'Sin pedidos activos' : `${activeCount} pedido${activeCount > 1 ? 's' : ''} activo${activeCount > 1 ? 's' : ''}`}
            </span>
          </div>

          {/* Botón Manual Refresh (Tono 1) */}
          <button
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="p-2.5 rounded-xl cursor-pointer transition-all duration-200 hover:opacity-90 active:scale-95 disabled:opacity-50 flex items-center justify-center shadow-xs"
            style={{ 
              backgroundColor: bgCard,
              border: `1px solid ${borderSubtle}`,
              color: textColor
            }}
            title="Refrescar pedidos"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} style={{ color: textColor }} />
          </button>

          {/* Botón de Sonido / Audio Notification */}
          <button
            onClick={unlockAudio}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            style={{ 
              backgroundColor: bgCard,
              border: `1px solid ${borderSubtle}`,
              color: textColor
            }}
            title={audioUnlocked ? "Sonido activado" : "Clic para activar alertas sonoras"}
          >
            {audioUnlocked ? (
              <>
                <Volume2 size={14} className="text-emerald-500 shrink-0" />
                <span className="hidden sm:inline text-emerald-600 dark:text-emerald-400 font-semibold">Audio activo</span>
              </>
            ) : (
              <>
                <VolumeX size={14} className="text-amber-500 animate-pulse shrink-0" />
                <span className="text-amber-600 dark:text-amber-400 font-bold">Activar sonido</span>
              </>
            )}
          </button>
        </div>

        {/* 2. GRUPO DERECHO: Sistema (Anclado a la derecha) */}
        <div className="flex items-center gap-3 ml-auto shrink-0 mt-2 md:mt-0">
          {/* Digital Clock en Tono 1 */}
          <div 
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold shadow-xs"
            style={{ 
              backgroundColor: bgCard,
              border: `1px solid ${borderSubtle}`,
              color: textColor
            }}
          >
            <Clock size={14} className="text-amber-500 shrink-0" />
            <span className="tracking-widest">{currentTime.toLocaleTimeString()}</span>
          </div>

          {/* Logout Button en Tono 1 */}
          <button
            onClick={handleLogout}
            onMouseEnter={() => setIsLogoutHovered(true)}
            onMouseLeave={() => setIsLogoutHovered(false)}
            className="flex items-center gap-1.5 text-xs font-bold transition-all duration-200 cursor-pointer py-2 px-3.5 rounded-xl shadow-xs"
            style={{ 
              backgroundColor: isLogoutHovered ? '#e11d48' : bgCard,
              border: isLogoutHovered ? '1px solid #e11d48' : `1px solid ${borderSubtle}`,
              boxShadow: isLogoutHovered ? '0 4px 12px rgba(225, 29, 72, 0.3)' : undefined,
              color: isLogoutHovered ? '#FFFFFF' : textColor
            }}
            title="Cerrar sesión"
          >
            <LogOut size={13} className={isLogoutHovered ? 'text-white' : 'text-rose-500'} />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      {/* Franja de Estadísticas Rápidas */}
      <div className="py-3 px-4 md:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-3 w-full text-xs font-medium select-none" style={{ background: 'var(--theme-surface)', borderBottom: '1px solid rgba(128,128,128,0.15)', color: 'var(--theme-text-muted)' }}>
        <div className="flex items-center gap-1.5">
          <span className="text-sm">🍽</span>
          <span>Atendidos hoy:</span>
          <span className="font-bold" style={{ color: 'var(--theme-text)' }}>{completedCount}</span>
        </div>
        <div className="w-1.5 h-1.5 rounded-full bg-white/10 hidden sm:block" />
        <div className="flex items-center gap-1.5">
          <span className="text-sm">⏱</span>
          <span>Platillos en espera:</span>
          <span className="font-bold" style={{ color: 'var(--theme-text)' }}>
            {pendingDishesCount}
          </span>
        </div>
        <div className="w-1.5 h-1.5 rounded-full bg-white/10 hidden sm:block" />
        <div className="flex items-center gap-1.5">
          <span className="text-sm">🔥</span>
          <span>En preparación:</span>
          <span className="font-bold" style={{ color: 'var(--theme-text)' }}>
            {orders.filter(o => o.status === 'preparing').length}
          </span>
        </div>
      </div>

      {/* Main Panel Content */}
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        {error && (
          <div className="text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 rounded-xl flex items-center justify-between gap-3 mb-4 animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchOrders}
              className="text-xs underline font-bold hover:opacity-80 shrink-0 cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Active orders grid */}
        <div 
          className="grid gap-4 md:gap-6 w-full items-start" 
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))' }}
        >
          {sortedActiveOrders.map((order, index) => (
            <ActiveOrderCard
              key={order.id}
              order={order}
              index={index}
              currentTime={currentTime}
              isTransitioning={transitioningIds.includes(order.id)}
              getDisplayStatus={getDisplayStatus}
              getElapsedTime={getElapsedTime}
              isOrderReady={isOrderReady}
              getLocationLabel={getLocationLabel}
              formatOrderTime={formatOrderTime}
              renderModality={renderModality}
              handleTransition={handleTransition}
              setActiveQrOrder={setActiveQrOrder}
            />
          ))}

          {sortedActiveOrders.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center text-center animate-fadeIn shadow-2xl max-h-[300px]" style={{ 
              background: bgCard,
              borderRadius: '0.75rem',
              border: '1px solid rgba(128,128,128,0.15)',
              padding: '3rem'
            }}>
              <div className="w-16 h-16 rounded-2xl bg-white/3 flex items-center justify-center mb-3 border border-white/5 shadow-inner text-white/20">
                <ChefHat size={32} strokeWidth={1.5} className="text-brand-500 animate-pulse" />
              </div>
              <h3 className="text-md font-bold mb-1" style={{ color: 'var(--theme-text)' }}>Todo en orden</h3>
              <p className="text-xs max-w-xs" style={{ color: 'var(--theme-text-muted)' }}>No hay pedidos pendientes de preparación en este momento.</p>
            </div>
          )}
        </div>
      </main>

      {/* Modal de Código QR de Entrega */}
      {activeQrOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-scaleIn flex flex-col items-center text-center relative overflow-hidden" style={{ background: 'var(--theme-surface)', color: 'var(--theme-text)' }}>
            <div className="w-12 h-12 rounded-xl border flex items-center justify-center mb-3 shadow-md" style={{ background: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)', borderColor: 'color-mix(in srgb, var(--theme-primary) 30%, transparent)', color: 'var(--theme-primary)' }}>
              <QrCode size={24} />
            </div>

            <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--theme-text)' }}>
              Código de Entrega al Repartidor
            </h3>
            <p className="text-xs mb-4" style={{ color: 'var(--theme-text-muted)' }}>
              {activeQrOrder.daily_number ? `Turno #${activeQrOrder.daily_number}` : (activeQrOrder.folio || 'Pedido')} · {activeQrOrder.modality === 'pickup' ? 'Retiro en Sucursal' : 'Envío a Domicilio'}
            </p>

            {/* Dynamic QR Code Box - Totalmente limpio sin overlays */}
            <div className="w-64 h-64 bg-white p-4 rounded-2xl shadow-inner relative overflow-hidden mb-5 flex items-center justify-center">
              {(() => {
                const token = activeQrOrder.dispatch_token || activeQrOrder.folio || activeQrOrder.id
                const driverUrl = `${window.location.origin}/repartidor/pedido/${token}`
                return (
                  <QRCode
                    value={driverUrl}
                    size={256}
                    style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                    viewBox="0 0 256 256"
                  />
                )
              })()}
            </div>

            {/* Delivery Data details block */}
            <div className="w-full space-y-3 rounded-2xl p-4 border text-left text-sm mb-5" style={{ background: 'var(--theme-card)', borderColor: 'rgba(128,128,128,0.2)' }}>
              {/* Folio de Vinculación / Código Manual con dispatch_token */}
              <div className="flex items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: 'rgba(128,128,128,0.15)' }}>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: 'var(--theme-text-muted)' }}>
                    Folio de Vinculación / Código Manual
                  </span>
                  <span className="text-xs truncate block" style={{ color: 'var(--theme-text-muted)' }}>
                    Ingrésalo en la app si no puedes escanear
                  </span>
                </div>
                <div className="text-right shrink-0">
                  {(() => {
                    const rawToken = activeQrOrder.dispatch_token
                    const formattedToken = rawToken
                      ? (rawToken.length === 6 ? `${rawToken.slice(0, 3)}-${rawToken.slice(3)}` : rawToken)
                      : (activeQrOrder.daily_number ? `Turno #${activeQrOrder.daily_number}` : (activeQrOrder.folio || 'PEDIDO'))

                    const labelSub = [
                      activeQrOrder.daily_number ? `Turno #${activeQrOrder.daily_number}` : '',
                      activeQrOrder.folio ? activeQrOrder.folio : ''
                    ].filter(Boolean).join(' · ')

                    return (
                      <>
                        <span className="font-bold text-2xl sm:text-3xl tracking-tight block font-mono uppercase whitespace-nowrap" style={{ color: 'var(--theme-primary)' }}>
                          {formattedToken}
                        </span>
                        {labelSub && (
                          <span className="text-[11px] font-mono opacity-60 block whitespace-nowrap" style={{ color: 'var(--theme-text)' }}>
                            {labelSub}
                          </span>
                        )}
                      </>
                    )
                  })()}
                </div>
              </div>

              <div className="flex justify-between gap-3">
                <span className="shrink-0 font-medium" style={{ color: 'var(--theme-text-muted)' }}>Cliente:</span>
                <span className="font-semibold truncate" style={{ color: 'var(--theme-text)' }}>{activeQrOrder.customer}</span>
              </div>
              {activeQrOrder.modality !== 'pickup' && (
                <div className="flex justify-between gap-3">
                  <span className="shrink-0 font-medium" style={{ color: 'var(--theme-text-muted)' }}>Dirección:</span>
                  <span className="font-medium truncate" style={{ color: 'var(--theme-text)' }} title={activeQrOrder.address}>
                    {activeQrOrder.address}
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <span className="shrink-0 font-medium" style={{ color: 'var(--theme-text-muted)' }}>Teléfono:</span>
                <span className="font-mono font-medium" style={{ color: 'var(--theme-text)' }}>{activeQrOrder.phone}</span>
              </div>
              <div className="flex justify-between gap-3 border-t border-white/5 pt-2">
                <span className="shrink-0 font-medium" style={{ color: 'var(--theme-text-muted)' }}>Orden:</span>
                <span className="font-medium truncate" style={{ color: 'var(--theme-text)' }} title={activeQrOrder.items && Array.isArray(activeQrOrder.items) ? activeQrOrder.items.map(i => typeof i === 'object' ? `${i.quantity}x ${i.name}` : i).join(', ') : ''}>
                  {activeQrOrder.items && Array.isArray(activeQrOrder.items)
                    ? activeQrOrder.items.map(i => typeof i === 'object' ? `${i.quantity}x ${i.name}` : i).join(', ')
                    : ''}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="w-full flex gap-3">
              <button
                onClick={() => {
                  setActiveQrOrder(null)
                }}
                className="flex-1 font-semibold py-2.5 px-4 rounded-xl border transition-colors cursor-pointer"
                style={{ background: 'color-mix(in srgb, var(--theme-text) 5%, transparent)', color: 'var(--theme-text)', borderColor: 'rgba(128,128,128,0.3)' }}
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  handleTransition(activeQrOrder.id, activeQrOrder.status)
                  setActiveQrOrder(null)
                }}
                className="flex-1 font-semibold py-2.5 px-4 rounded-xl shadow-lg transition-all cursor-pointer"
                style={{ background: 'var(--theme-primary)', color: 'var(--theme-primary-contrast, #fff)' }}
              >
                Confirmar Entrega
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
