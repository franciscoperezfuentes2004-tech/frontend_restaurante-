import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  LogOut, Clock, MapPin, User, Phone, DollarSign, 
  Scooter, Receipt, CheckCircle, CheckCircle2, Navigation, Camera, 
  AlertCircle, AlertTriangle, Play, Sparkles, X, Wallet, MessageSquare,
  RefreshCw, Loader2
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { Html5Qrcode } from 'html5-qrcode'
import client from '../../api/client'
import echo from '../../echo'

// Helper para extraer ID / folio de pedido de strings de QR, JSONs o URLs
const extractOrderId = (code) => {
  if (!code) return null
  const trimmed = String(code).trim()
  
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed)
      return parsed.folio || parsed.id || parsed.order_id || parsed.orderId || parsed.pedido_id || null
    } catch (e) {}
  }
  
  const urlMatch = trimmed.match(/\/([^\/]+)\/?$/)
  if (urlMatch && !/^\d{4}-\d{2}-\d{2}$/.test(urlMatch[1])) {
    return urlMatch[1]
  }

  return trimmed
}

// Normalizador unificado de la respuesta del backend
const normalizeDeliveryOrder = (data, fallbackId) => {
  const raw = data?.order || data?.pedido || data?.data || data || {}
  
  const rawItems = Array.isArray(raw.platillos) 
    ? raw.platillos 
    : Array.isArray(raw.items) 
      ? raw.items 
      : []

  const platillos = rawItems.map(p => ({
    nombre: p.nombre ?? p.name ?? p.dish?.name ?? p.dish_name ?? 'Platillo',
    cantidad: p.cantidad ?? p.quantity ?? 1,
    precio: Number(p.precio ?? p.price ?? p.unit_price ?? 0),
    notas: p.notas ?? p.notes ?? p.nota ?? '',
    extras: (Array.isArray(p.extras) ? p.extras : []).map(e => ({
      nombre: typeof e === 'object' ? (e.name ?? e.nombre ?? e.extra?.name ?? 'Extra') : String(e),
      precio: typeof e === 'object' ? Number(e.price ?? e.precio ?? 0) : 0
    }))
  }))

  const rawStatus = raw.estado ?? raw.status ?? 'asignado'
  const estado = (rawStatus === 'in_transit' || rawStatus === 'en_camino' || rawStatus === 'delivering')
    ? 'en_camino'
    : (rawStatus === 'delivered' || rawStatus === 'completed' || rawStatus === 'entregado')
      ? 'entregado'
      : 'asignado'

  return {
    ...raw,
    id: raw.id ?? fallbackId,
    estado,
    cliente: raw.cliente ?? raw.customer ?? raw.customer_name ?? 'Cliente',
    telefono: raw.telefono ?? raw.phone ?? raw.customer_phone ?? '',
    direccion: raw.direccion ?? raw.address ?? raw.delivery_address ?? 'Dirección no especificada',
    colonia: raw.colonia ?? raw.neighborhood ?? '',
    ciudad: raw.ciudad ?? raw.city ?? '',
    referencias: raw.referencias ?? raw.references ?? raw.notes ?? '',
    platillos: platillos.length > 0 ? platillos : [{ nombre: 'Pedido general', cantidad: 1, precio: Number(raw.total ?? 0) }],
    total: Number(raw.total ?? raw.total_amount ?? 0),
    metodoPago: (raw.metodo_pago ?? raw.payment_method ?? raw.metodoPago ?? 'efectivo').toLowerCase(),
    montoPago: Number(raw.monto_pago ?? raw.payment_amount ?? raw.total ?? 0),
    asignadoHace: raw.asignado_hace ?? 0,
    notaEntrega: raw.nota_entrega ?? raw.delivery_note ?? raw.notas ?? ''
  }
}

const todayStr = new Date().toLocaleDateString()

export default function DeliveryView() {
  const navigate = useNavigate()
  const { user, logoutUser } = useAuth()
  const { 
    bgBody, 
    bgTopbar, 
    bgCard, 
    bgSubcard, 
    bgTable,
    bgInput,
    textColor, 
    textMuted, 
    textSubtle, 
    colorPrimario,
    primaryBtnText,
    borderSubtle, 
    modalShadow, 
    isLight, 
    logoUrl, 
    restaurantName 
  } = useTheme()
  const primaryColor = colorPrimario || '#7c3aed'

  // --- ESTADOS PRINCIPALES ---
  const [isLogoutHovered, setIsLogoutHovered] = useState(false)
  const [activeTab, setActiveTab] = useState('entregas') // 'entregas' | 'nueva_entrega' | 'historial'
  const [entregaActiva, setEntregaActiva] = useState(null)
  const [cutData, setCutData] = useState(null)
  const [loadingCut, setLoadingCut] = useState(false)
  const [notifyingCut, setNotifyingCut] = useState(false)
  const [showCorteConfirm, setShowCorteConfirm] = useState(false)
  const [hasPendingCut, setHasPendingCut] = useState(false)
  const [corteConfirmado, setCorteConfirmado] = useState(false)
  const [currentCashTotal, setCurrentCashTotal] = useState(0)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0)
  const [fechaInicioCamino, setFechaInicioCamino] = useState(null)
  const [segundosCamino, setSegundosCamino] = useState(0)

  // --- CÁLCULO CENTRALIZADO DE EFECTIVO Y ENTREGAS DEL CORTE ---
  const cashTotal = useMemo(() => {
    if (cutData?.cash_total !== undefined) return Number(cutData.cash_total)
    if (cutData?.total_cash !== undefined) return Number(cutData.total_cash)
    const deliveriesList = cutData?.orders || cutData?.deliveries || cutData?.entregas || []
    return deliveriesList.filter(e => {
      const m = (e.payment_method || e.metodoPago || e.metodo_pago || '').toLowerCase()
      return m === 'efectivo' || m === 'cash' || !m
    }).reduce((sum, e) => sum + Number(e.total || e.total_amount || e.amount || e.monto || 0), 0)
  }, [cutData])

  const totalCompletedOrders = useMemo(() => {
    if (cutData?.total_orders !== undefined) return Number(cutData.total_orders)
    if (cutData?.completed_count !== undefined) return Number(cutData.completed_count)
    if (cutData?.total_completadas !== undefined) return Number(cutData.total_completadas)
    const deliveriesList = cutData?.orders || cutData?.deliveries || cutData?.entregas || []
    return deliveriesList.length
  }, [cutData])

  // --- TIMER LOGIC ---
  useEffect(() => {
    let timer = null
    
    if (entregaActiva) {
      if (entregaActiva.estado === 'asignado') {
        // Increment minutes every 60 seconds
        setTiempoTranscurrido(entregaActiva.asignadoHace || 0)
        timer = setInterval(() => {
          setTiempoTranscurrido(prev => prev + 1)
        }, 60000)
      } else if (entregaActiva.estado === 'en_camino') {
        // Real-time stopwatch ticking every second
        const start = fechaInicioCamino || Date.now()
        if (!fechaInicioCamino) {
          setFechaInicioCamino(start)
        }
        
        const updateStopwatch = () => {
          const elapsedMs = Date.now() - start
          setSegundosCamino(Math.floor(elapsedMs / 1000))
        }
        
        updateStopwatch() // Initial call
        timer = setInterval(updateStopwatch, 1000)
      }
    } else {
      setTiempoTranscurrido(0)
      setSegundosCamino(0)
      setFechaInicioCamino(null)
    }
    
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [entregaActiva, fechaInicioCamino])

  // --- HELPERS ---
  const formatStopwatch = (totalSecs) => {
    const hours = Math.floor(totalSecs / 3600)
    const mins = Math.floor((totalSecs % 3600) / 60)
    const secs = totalSecs % 60
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const [montoRecibido, setMontoRecibido] = useState('0')

  useEffect(() => {
    setMontoRecibido('0')
  }, [entregaActiva?.id])

  // --- ESTADOS DE ESCANEO / MANUAL ---
  const [folioInput, setFolioInput] = useState('')
  const [searchError, setSearchError] = useState(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [scannedPedido, setScannedPedido] = useState(null)

  // --- TOAST NOTIFICATION ---
  const [toastMessage, setToastMessage] = useState(null)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // --- RELOJ ---
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // --- QR SCANNER LOGIC (HTML5QRCODE DIRECT STREAM CON CONTROL MANUAL) ---
  const [isScanning, setIsScanning] = useState(false)
  const html5QrCodeRef = useRef(null)
  const isProcessingRef = useRef(false)
  const [processingCode, setProcessingCode] = useState(false)
  const [cameraError, setCameraError] = useState(null)

  useEffect(() => {
    isProcessingRef.current = processingCode
  }, [processingCode])

  useEffect(() => {
    let isMounted = true
    let qrCodeInstance = null

    if (activeTab === 'nueva_entrega' && !entregaActiva && isScanning) {
      setCameraError(null)

      const startScanner = async () => {
        try {
          await new Promise(r => setTimeout(r, 120))
          if (!isMounted) return

          const element = document.getElementById('qr-reader-element')
          if (!element) return

          qrCodeInstance = new Html5Qrcode('qr-reader-element')
          html5QrCodeRef.current = qrCodeInstance

          const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          }

          // Iniciar cámara trasera directamente o cámara por defecto
          await qrCodeInstance.start(
            { facingMode: 'environment' },
            config,
            (decodedText) => {
              if (isProcessingRef.current) return
              isProcessingRef.current = true
              handleProcessCode(decodedText)
            },
            () => {
              // Frame parse ignore
            }
          )
        } catch (err) {
          console.warn('Error con environment facingMode, intentando fallback de cámara:', err)
          if (!isMounted) return

          const isPermissionDenied = 
            err?.name === 'NotAllowedError' || 
            err?.name === 'PermissionDeniedError' ||
            String(err?.message || err).toLowerCase().includes('permission') ||
            String(err?.message || err).toLowerCase().includes('denied') ||
            String(err?.message || err).toLowerCase().includes('notallowed')

          if (isPermissionDenied) {
            setCameraError('Permisos de cámara denegados. Otorga acceso o usa el ingreso manual.')
            return
          }

          try {
            const cameras = await Html5Qrcode.getCameras()
            if (cameras && cameras.length > 0 && isMounted) {
              const cameraId = cameras[0].id
              await qrCodeInstance.start(
                cameraId,
                { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
                (decodedText) => {
                  if (isProcessingRef.current) return
                  isProcessingRef.current = true
                  handleProcessCode(decodedText)
                },
                () => {}
              )
            } else {
              setCameraError('Permisos de cámara denegados. Otorga acceso o usa el ingreso manual.')
            }
          } catch (cameraErr) {
            console.error('Error al acceder a las cámaras:', cameraErr)
            if (isMounted) {
              setCameraError('Permisos de cámara denegados. Otorga acceso o usa el ingreso manual.')
            }
          }
        }
      }

      startScanner()

      return () => {
        isMounted = false
        if (qrCodeInstance) {
          try {
            if (qrCodeInstance.isScanning) {
              qrCodeInstance.stop().then(() => {
                qrCodeInstance.clear()
              }).catch(e => console.error('Error stopping scanner:', e))
            } else {
              qrCodeInstance.clear()
            }
          } catch (err) {
            console.error('Error limpiando scanner:', err)
          }
        }
      }
    } else {
      // Si isScanning es false, limpiar cualquier instancia previa
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.stop().then(() => {
              html5QrCodeRef.current.clear()
              html5QrCodeRef.current = null
            }).catch(() => {})
          } else {
            html5QrCodeRef.current.clear()
            html5QrCodeRef.current = null
          }
        } catch (e) {}
      }
    }
  }, [activeTab, entregaActiva, isScanning])

  // --- CARGAR ENTREGA ACTIVA EXISTENTE ---
  useEffect(() => {
    client.get('/delivery/mi-entrega-activa')
      .then(res => {
        const orderData = res.data?.order || res.data?.pedido || res.data?.data || res.data
        if (orderData && (orderData.id || orderData.cliente || orderData.direccion)) {
          setEntregaActiva(normalizeDeliveryOrder(orderData, orderData.id))
        }
      })
      .catch(() => {
        // Fallback silencioso si no hay entrega activa
      })
  }, [])

  // --- ACCIÓN: PROCESAR CÓDIGO (QR O MANUAL CON PROTECCIÓN DE CONCURRENCIA) ---
  const handleProcessCode = async (code) => {
    if (processingCode || isProcessingRef.current) return
    isProcessingRef.current = true
    setProcessingCode(true)

    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        try {
          await html5QrCodeRef.current.pause(true)
        } catch (e) {}
      }
    } catch (e) {}

    const extracted = extractOrderId(code)
    const clean = String(extracted || code || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').trim()
    if (!clean) {
      setProcessingCode(false)
      isProcessingRef.current = false
      return
    }

    setIsScanning(false)
    navigate(`/repartidor/pedido/${encodeURIComponent(clean)}`)
  }

  const handleManualSearch = (e) => {
    if (e) e.preventDefault()
    if (processingCode || isProcessingRef.current) return

    const clean = folioInput.toUpperCase().replace(/[^A-Z0-9-]/g, '').trim()
    if (!clean) {
      const msg = 'Ingresa el código del ticket para continuar.'
      setSearchError(msg)
      showToast(`⚠️ ${msg}`)
      return
    }

    setProcessingCode(true)
    isProcessingRef.current = true

    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        try {
          html5QrCodeRef.current.pause(true)
        } catch (e) {}
      }
    } catch (e) {}

    setIsScanning(false)
    navigate(`/repartidor/pedido/${encodeURIComponent(clean)}`)
  }

  // --- CARGAR DATOS DE MI CORTE ---
  const fetchMyCut = async (silent = false) => {
    if (!silent) setLoadingCut(true)
    try {
      const res = await client.get('/driver/corte').catch(() => client.get('/delivery/my-cut'))
      const data = res.data?.corte || res.data?.cut || res.data?.data || res.data || {}
      setCutData(data)
      setHasPendingCut(data.has_pending_cut ?? false)
      setCurrentCashTotal(data.cash_total ?? 0)
      setCorteConfirmado(data.has_confirmed_cut ?? false)
      if (!silent) {
        showToast('✓ Datos de corte actualizados', 'info')
      }
    } catch (err) {
      console.warn("Error cargando datos de corte:", err)
      if (!silent) {
        showToast('⚠️ No se pudieron refrescar los datos de corte', 'error')
      }
    } finally {
      setLoadingCut(false)
    }
  }

  // Refrescar al montar inicialmente el componente
  useEffect(() => {
    fetchMyCut(true)
  }, [])

  // Refrescar cada vez que el repartidor entra a la pestaña de corte
  useEffect(() => {
    if (activeTab === 'historial' || activeTab === 'corte') {
      fetchMyCut(true)
    }
  }, [activeTab])

  // Refrescar automáticamente al re-enfocar la ventana/pestaña móvil
  useEffect(() => {
    const handleFocus = () => {
      if (activeTab === 'historial' || activeTab === 'corte') {
        fetchMyCut(true)
      }
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [activeTab])

  // --- WEBSOCKET EN TIEMPO REAL (REVERB / ECHO) ---
  useEffect(() => {
    let channel = null
    const currentUserId = user?.id

    if (!currentUserId) return

    const handleCutConfirmed = (event) => {
      const eventUserId = event?.user_id ?? event?.userId
      if (eventUserId && Number(eventUserId) === Number(currentUserId)) {
        setCorteConfirmado(true)
        setHasPendingCut(false)
        showToast('✅ Tu corte fue confirmado. ¡Hasta pronto!')
      }
    }

    try {
      channel = echo.channel('delivery.cuts')
      channel.listen('.cash.cut.confirmed', handleCutConfirmed)
      channel.listen('cash.cut.confirmed', handleCutConfirmed)
      channel.listen('CashCutConfirmed', handleCutConfirmed)
    } catch (err) {
      console.warn("WebSocket Reverb no disponible para delivery.cuts:", err)
    }

    return () => {
      if (channel) {
        try {
          channel.stopListening('.cash.cut.confirmed')
          channel.stopListening('cash.cut.confirmed')
          channel.stopListening('CashCutConfirmed')
          echo.leaveChannel('delivery.cuts')
        } catch (e) {}
      }
    }
  }, [user?.id])

  // --- ACCIÓN: ACEPTAR NUEVA ENTREGA ---
  const handleAcceptDelivery = async () => {
    if (!scannedPedido) return
    await handleProcessCode(scannedPedido.id)
  }

  // --- ACCIÓN: CAMBIAR ESTADO DE CAMINO ---
  const handleStartRoute = () => {
    setFechaInicioCamino(Date.now())
    setEntregaActiva(prev => prev ? { ...prev, estado: 'en_camino' } : null)
    showToast('🚀 Iniciaste tu camino de entrega')
  }

  // --- ACCIÓN: CONFIRMAR ENTREGA COMPLETADA ---
  const handleConfirmDelivery = async () => {
    if (!entregaActiva) return

    try {
      await client.patch(`/delivery/${entregaActiva.id}/status`, { status: 'entregado' })
    } catch (e) {
      showToast('⚠️ No se pudo registrar la entrega. Intenta de nuevo.')
      return
    }

    setEntregaActiva(null)
    setFechaInicioCamino(null)
    setSegundosCamino(0)
    showToast('🎉 ¡Entrega registrada con éxito!')
    fetchMyCut()
  }

  // --- ACCIÓN: NOTIFICAR CORTE ---
  const handleNotificarCorte = async () => {
    if (notifyingCut) return
    setNotifyingCut(true)
    try {
      const declared = cashTotal !== undefined ? cashTotal : currentCashTotal
      await client.post('/driver/corte/notificar', { cash_declared: declared })
        .catch(() => client.post('/delivery/notify-cut', { cash_declared: declared }))
      setShowCorteConfirm(false)
      setHasPendingCut(true)
      showToast('✓ Corte notificado al encargado')
      fetchMyCut()
    } catch (err) {
      console.error("Error notificando corte:", err)
      const msg = err.response?.data?.message || err.response?.data?.error || 'No se pudo notificar el corte al encargado.'
      showToast(`⚠️ ${msg}`)
    } finally {
      setNotifyingCut(false)
    }
  }

  // --- LOGOUT ---
  const handleLogout = () => {
    logoutUser()
    navigate('/login')
  }

  return (
    <div 
      className="min-h-screen flex flex-col font-sans select-none pb-12" 
      style={{ 
        backgroundColor: bgBody,
        minHeight: '100vh',
        color: textColor
      }}
    >
      
      {/* HEADER BAR (2 LÍNEAS) */}
      <header 
        className="bg-blue-800 text-white p-4 md:p-5 flex flex-col gap-4 w-full shrink-0 sticky top-0 z-40" 
        style={{ 
          backgroundColor: 'var(--theme-primary, #1e40af)', 
          borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: isLight ? '0 1px 3px 0 rgba(0, 0, 0, 0.05)' : 'none'
        }}
      >
        {/* ================= LÍNEA 1: Marca y Controles ================= */}
        <div className="flex justify-between items-center w-full">
          {/* Izquierda: Logo y Nombre Comercial */}
          <div 
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-full shadow-xs shrink-0"
            style={{ 
              backgroundColor: bgCard,
              border: `1px solid ${borderSubtle}`,
              color: textColor
            }}
          >
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={restaurantName || 'Logo'} 
                className="w-6 h-6 object-contain rounded-full shrink-0 shadow-xs" 
              />
            ) : (
              <div 
                className="w-6 h-6 rounded-md flex items-center justify-center font-black text-xs shrink-0 shadow-xs"
                style={{ 
                  backgroundColor: colorPrimario, 
                  color: primaryBtnText || '#ffffff' 
                }}
              >
                {(restaurantName || 'R')[0].toUpperCase()}
              </div>
            )}

            <span 
              className="font-bold text-xs sm:text-sm tracking-wider uppercase truncate max-w-[120px] sm:max-w-xs"
              style={{ color: textColor }}
              title={restaurantName || 'Restaurante'}
            >
              {restaurantName || 'Restaurante'}
            </span>
          </div>

          {/* Derecha: Hora y Salir */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Digital Clock */}
            <div 
              className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold shadow-xs hidden sm:flex" 
              style={{ 
                backgroundColor: bgCard, 
                color: textColor, 
                border: `1px solid ${borderSubtle}` 
              }}
            >
              <Clock size={14} className="text-amber-500 shrink-0" />
              <span className="tracking-wider font-mono">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              onMouseEnter={() => setIsLogoutHovered(true)}
              onMouseLeave={() => setIsLogoutHovered(false)}
              style={{ 
                backgroundColor: isLogoutHovered ? '#e11d48' : bgCard,
                border: isLogoutHovered ? '1px solid #e11d48' : `1px solid ${borderSubtle}`,
                color: isLogoutHovered ? '#FFFFFF' : '#e11d48',
                boxShadow: isLogoutHovered ? '0 4px 12px rgba(225, 29, 72, 0.3)' : undefined
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold cursor-pointer transition-all duration-200 shadow-xs"
              title="Cerrar sesión"
            >
              <LogOut size={14} className={isLogoutHovered ? 'text-white' : 'text-rose-500'} />
              <span>Salir</span>
            </button>
          </div>
        </div>

        {/* ================= LÍNEA 2: Rol y Bienvenida ================= */}
        <div className="relative flex flex-col md:flex-row items-center justify-center w-full gap-3 md:gap-0 mt-1">
          {/* Izquierda: Rol */}
          <div className="md:absolute md:left-0 shrink-0">
            <div 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-xs text-xs font-bold"
              style={{ 
                backgroundColor: bgCard,
                border: `1px solid ${borderSubtle}`,
                color: textColor
              }}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="uppercase tracking-wider text-[10px] sm:text-xs">Repartidor</span>
            </div>
          </div>

          {/* Centro: Mensaje de Bienvenida */}
          <div 
            className="flex items-center justify-center gap-1.5 px-4 md:px-6 py-1.5 rounded-full text-xs sm:text-sm font-medium text-center shadow-xs z-10 w-full sm:w-auto"
            style={{ 
              backgroundColor: bgCard,
              border: `1px solid ${borderSubtle}`,
              color: textColor
            }}
          >
            <span>Bienvenido,</span>
            <span className="font-bold" style={{ color: colorPrimario }}>
              {user?.name || user?.nombre || user?.username || 'Repartidor'}
            </span>
          </div>
        </div>
      </header>

      {/* TABS SELECTOR — Barra de Pestañas con Pestañas Inactivas en Tono Pálido del Primario */}
      <div 
        className="py-2.5 px-4 sm:px-8 max-md:px-2 max-md:gap-1.5 max-md:justify-center flex flex-wrap items-center gap-3 shrink-0 select-none mb-2" 
        style={{ 
          backgroundColor: bgCard, 
          borderBottom: `1px solid ${borderSubtle}` 
        }}
      >
        <button
          onClick={() => setActiveTab('entregas')}
          style={activeTab === 'entregas' 
            ? { 
                backgroundColor: colorPrimario, 
                color: '#ffffff',
                border: `1px solid ${colorPrimario}`,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
              } 
            : {
                backgroundColor: `color-mix(in srgb, ${colorPrimario} 14%, #ffffff)`,
                color: colorPrimario,
                border: `1px solid color-mix(in srgb, ${colorPrimario} 28%, #ffffff)`
              }
          }
          className={`flex items-center gap-2 px-4 py-2 max-md:px-2.5 max-md:py-1.5 rounded-xl text-xs max-md:text-[11px] font-bold transition-all duration-200 cursor-pointer shrink-0 shadow-xs ${
            activeTab === 'entregas' 
              ? 'scale-[1.02] text-white shadow-md' 
              : 'hover:brightness-95 hover:scale-[1.01] active:scale-95'
          }`}
        >
          <Scooter size={15} className="max-md:w-3.5 max-md:h-3.5" />
          <span>Mis Entregas</span>
        </button>

        <button
          onClick={() => setActiveTab('nueva_entrega')}
          style={activeTab === 'nueva_entrega' 
            ? { 
                backgroundColor: colorPrimario, 
                color: '#ffffff',
                border: `1px solid ${colorPrimario}`,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
              } 
            : {
                backgroundColor: `color-mix(in srgb, ${colorPrimario} 14%, #ffffff)`,
                color: colorPrimario,
                border: `1px solid color-mix(in srgb, ${colorPrimario} 28%, #ffffff)`
              }
          }
          className={`flex items-center gap-2 px-4 py-2 max-md:px-2.5 max-md:py-1.5 rounded-xl text-xs max-md:text-[11px] font-bold transition-all duration-200 cursor-pointer shrink-0 shadow-xs ${
            activeTab === 'nueva_entrega' 
              ? 'scale-[1.02] text-white shadow-md' 
              : 'hover:brightness-95 hover:scale-[1.01] active:scale-95'
          }`}
        >
          <Camera size={15} className="max-md:w-3.5 max-md:h-3.5" />
          <span>Nueva Entrega</span>
        </button>

        <button
          onClick={() => setActiveTab('historial')}
          style={activeTab === 'historial' 
            ? { 
                backgroundColor: colorPrimario, 
                color: '#ffffff',
                border: `1px solid ${colorPrimario}`,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
              } 
            : {
                backgroundColor: `color-mix(in srgb, ${colorPrimario} 14%, #ffffff)`,
                color: colorPrimario,
                border: `1px solid color-mix(in srgb, ${colorPrimario} 28%, #ffffff)`
              }
          }
          className={`flex items-center gap-2 px-4 py-2 max-md:px-2.5 max-md:py-1.5 rounded-xl text-xs max-md:text-[11px] font-bold transition-all duration-200 cursor-pointer shrink-0 shadow-xs ${
            activeTab === 'historial' 
              ? 'scale-[1.02] text-white shadow-md' 
              : 'hover:brightness-95 hover:scale-[1.01] active:scale-95'
          }`}
        >
          <Wallet size={15} className="max-md:w-3.5 max-md:h-3.5" />
          <span>Mi Corte</span>
        </button>
      </div>

      {/* MAIN CONTAINER */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 w-full max-md:p-3 max-md:space-y-4">
        
        {/* TAB 1 — MIS ENTREGAS */}
        {activeTab === 'entregas' && (
          <div className="space-y-4 animate-fadeIn">

            {!entregaActiva ? (
              <div 
                className="max-w-xl mx-auto w-full flex flex-col items-center justify-center text-center animate-fadeIn rounded-2xl py-12 px-6 max-md:py-8 max-md:px-4 shadow-xl" 
                style={{ 
                  background: bgCard,
                  borderRadius: '1rem',
                  border: `1px solid ${borderSubtle}`,
                  boxShadow: isLight ? '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)' : '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                }}
              >
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border shadow-inner"
                  style={{ 
                    background: 'color-mix(in srgb, var(--theme-primary) 12%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--theme-primary) 25%, transparent)',
                    color: colorPrimario
                  }}
                >
                  <Scooter size={32} strokeWidth={1.75} className="animate-pulse" style={{ color: colorPrimario }} />
                </div>
                <h3 className="text-base font-bold mb-1.5" style={{ color: textColor }}>Sin entrega activa</h3>
                <p className="text-xs max-w-xs mb-6 font-medium leading-relaxed" style={{ color: textMuted }}>
                  No tienes pedidos asignados actualmente. Escanea un código QR en la pestaña "Nueva Entrega" para aceptar un pedido.
                </p>
                <button
                  onClick={() => setActiveTab('nueva_entrega')}
                  style={{ background: colorPrimario, color: 'var(--theme-primary-contrast, #fff)' }}
                  className="px-6 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 shadow-lg hover:brightness-110 active:scale-95"
                >
                  <span>→ Ir a Nueva Entrega</span>
                </button>
              </div>
            ) : (() => {
              const isAsignado = entregaActiva.estado === 'asignado'
              const isEnCamino = entregaActiva.estado === 'en_camino'

              const metodoPago = entregaActiva.payment_method || entregaActiva.metodoPago || entregaActiva.metodo_pago || 'efectivo'
              const isPaid = entregaActiva.payment_status === 'paid' || entregaActiva.estado_pago === 'pagado'
              const esPagoEfectivo = !isPaid && ((metodoPago || '').toLowerCase() === 'efectivo' || (metodoPago || '').toLowerCase() === 'cash')
              const montoValido = !esPagoEfectivo || (parseFloat(montoRecibido) > 0)

              const badgeClass = isAsignado ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40' :
                                 isEnCamino ? 'bg-blue-500/20 text-blue-800 dark:text-blue-300 border-blue-500/40' :
                                 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40'

              const statusLabel = isAsignado ? 'Asignado' :
                                  isEnCamino ? 'En camino' :
                                  'Entregado'

              return (
                <div 
                  className="grid gap-6 items-start w-full"
                  style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 450px), 1fr))' }}
                >
                  {/* TARJETA DE ENTREGA */}
                  <div 
                    className="rounded-2xl shadow-sm border flex flex-col overflow-hidden"
                    style={{ 
                      background: bgCard, 
                      borderColor: borderSubtle,
                      color: textColor,
                      boxShadow: isLight ? '0 10px 25px -5px rgba(0, 0, 0, 0.08)' : '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                    }}
                  >
                    {/* 1. Header de la tarjeta (shrink-0) */}
                    <div 
                      className="p-4 border-b flex justify-between items-center shrink-0"
                      style={{ 
                        borderColor: borderSubtle,
                        background: bgSubcard
                      }}
                    >
                      <span className="font-extrabold text-sm" style={{ color: textColor }}>Entrega #{entregaActiva.id}</span>
                      <span className={`px-2.5 py-1 border rounded-lg text-[10px] font-black uppercase tracking-wider ${badgeClass}`}>
                        {statusLabel}
                      </span>
                    </div>

                    {/* 2. Cuerpo con scroll elástico (max-h-[60vh]) */}
                    <div className="p-4 md:p-5 max-md:p-3 max-md:gap-3 flex flex-col gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                      {/* Sección de Dirección Destacada */}
                      <div 
                        className="p-4 rounded-xl space-y-2.5"
                        style={{ 
                          background: bgSubcard, 
                          border: `1px solid ${borderSubtle}`
                        }}
                      >
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: colorPrimario }}>
                          <MapPin size={16} />
                          <span>Dirección de Entrega</span>
                        </div>
                        
                        <div className="space-y-1 pl-6">
                          <div className="text-base font-black leading-tight" style={{ color: textColor }}>
                            {entregaActiva.direccion}
                          </div>
                          <div className="text-sm font-semibold" style={{ color: textMuted }}>
                            {entregaActiva.colonia}, {entregaActiva.ciudad}
                          </div>
                          {entregaActiva.referencias && (
                            <div 
                              className="text-xs font-semibold p-3 rounded-xl border mt-2 leading-relaxed bg-amber-500/15 border-amber-500/30 text-amber-900 dark:text-amber-200 shadow-2xs"
                            >
                              <span className="font-extrabold block mb-0.5 text-amber-950 dark:text-amber-100">📍 Referencia:</span>
                              {entregaActiva.referencias}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="h-[1px] w-full" style={{ background: borderSubtle }} />

                      {/* Información del Cliente y Botonera de Contacto Directo */}
                      <div className="flex flex-wrap items-center justify-between gap-3 text-sm" style={{ color: textMuted }}>
                        <div className="flex items-center gap-2 font-bold">
                          <User size={15} style={{ color: textSubtle }} />
                          <span style={{ color: textColor }}>{entregaActiva.cliente}</span>
                        </div>

                        {(() => {
                          const numeroLimpio = String(entregaActiva.telefono || '').replace(/\D/g, '')
                          const waLink = `https://wa.me/52${numeroLimpio}?text=Hola,%20soy%20el%20repartidor%20y%20voy%20en%20camino%20con%20tu%20pedido.`

                          return (
                            <div className="flex items-center gap-2 flex-wrap">
                              <a 
                                href={`tel:${entregaActiva.telefono}`} 
                                className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-3.5 py-2 rounded-xl font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer text-xs sm:text-sm shadow-xs"
                              >
                                <Phone size={14} />
                                <span>Llamar: <span className="font-black" style={{ color: textColor }}>{entregaActiva.telefono}</span></span>
                              </a>

                              {numeroLimpio && (
                                <a
                                  href={waLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/30 px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer text-xs sm:text-sm shadow-xs active:scale-95"
                                >
                                  <MessageSquare size={14} className="text-emerald-400" />
                                  <span>WhatsApp</span>
                                </a>
                              )}
                            </div>
                          )
                        })()}
                      </div>

                      <div className="h-[1px] w-full" style={{ background: borderSubtle }} />

                      {/* Items details list */}
                      <div className="space-y-2 pr-1">
                        <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest mb-1.5" style={{ color: textSubtle }}>
                          <span>Detalle del Pedido</span>
                          <span 
                            className="px-2 py-0.5 rounded-lg font-mono normal-case"
                            style={{ 
                              background: bgSubcard, 
                              border: `1px solid ${borderSubtle}`,
                              color: textMuted
                            }}
                          >
                            Total Platillos: {entregaActiva.platillos.reduce((sum, p) => sum + p.cantidad, 0)}
                          </span>
                        </div>
                        {entregaActiva.platillos.map((p, idx) => {
                          const unitPrice = p.precio || 0
                          const extras = Array.isArray(p.extras) ? p.extras : []
                          const extrasTotal = extras.reduce((sum, e) => sum + (typeof e === 'object' ? Number(e.precio || e.price || 0) : 0), 0)
                          const subtotal = (unitPrice + extrasTotal) * p.cantidad

                          return (
                            <div 
                              key={idx} 
                              className="rounded-xl p-3 border space-y-2 transition-all shadow-2xs"
                              style={{ 
                                backgroundColor: bgSubcard, 
                                borderColor: borderSubtle 
                              }}
                            >
                              {/* Fila 1: Nombre del platillo y Cantidad */}
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-sm leading-tight" style={{ color: textColor }}>
                                  {p.nombre}
                                </span>
                                <span 
                                  className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-md border shrink-0"
                                  style={{ 
                                    backgroundColor: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)', 
                                    borderColor: 'color-mix(in srgb, var(--theme-primary) 30%, transparent)', 
                                    color: colorPrimario 
                                  }}
                                >
                                  x{p.cantidad}
                                </span>
                              </div>

                              {/* Fila 2: Modificadores o complementos */}
                              {extras.length > 0 && (
                                <div className="space-y-1 pl-1">
                                  {extras.map((ex, eIdx) => {
                                    const exNombre = typeof ex === 'object' ? (ex.nombre || ex.name || 'Extra') : String(ex)
                                    const exPrecio = typeof ex === 'object' ? Number(ex.precio || ex.price || 0) : 0
                                    return (
                                      <div key={eIdx} className="text-xs flex items-center gap-1.5" style={{ color: textMuted }}>
                                        <span style={{ color: textSubtle }}>•</span>
                                        <span>+ {exNombre}</span>
                                        {exPrecio > 0 && (
                                          <span className="font-mono text-[11px] opacity-75" style={{ color: textSubtle }}>
                                            (+${exPrecio.toFixed(2)})
                                          </span>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}

                              {/* Fila 3: Notas exclusivas del platillo */}
                              {p.notas && (
                                <div className="text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 px-2.5 py-1.5 rounded-lg flex items-start gap-1.5 shadow-2xs">
                                  <span className="shrink-0">📝</span>
                                  <span className="leading-snug">{p.notas}</span>
                                </div>
                              )}

                              {/* Fila 4: Subtotal del platillo */}
                              <div className="flex items-center justify-between pt-1 border-t text-xs" style={{ borderColor: borderSubtle }}>
                                <span style={{ color: textSubtle }}>
                                  {unitPrice > 0 ? `Precio unitario: $${unitPrice.toFixed(2)}` : 'Subtotal'}
                                </span>
                                <span className="font-mono font-bold text-sm text-emerald-500">
                                  ${subtotal.toFixed(2)} MXN
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {entregaActiva.notaEntrega && (
                        <>
                          <div className="h-[1px] w-full" style={{ background: borderSubtle }} />
                          <div className="text-xs space-y-1" style={{ color: textMuted }}>
                            <span className="text-[10px] uppercase font-black tracking-widest block" style={{ color: textSubtle }}>📝 Nota:</span>
                            <p className="italic font-semibold p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 shadow-2xs">{entregaActiva.notaEntrega}</p>
                          </div>
                        </>
                      )}

                      <div className="h-[1px] w-full" style={{ background: borderSubtle }} />

                      {/* Información de Pago */}
                      <div 
                        className="text-xs space-y-3.5 p-4 rounded-xl"
                        style={{ 
                          background: bgSubcard, 
                          border: `1px solid ${borderSubtle}`
                        }}
                      >
                        <span className="text-[10px] uppercase font-black tracking-widest block mb-1" style={{ color: textSubtle }}>Información de Pago</span>
                        {(() => {
                          const m = (entregaActiva.payment_method || entregaActiva.metodoPago || entregaActiva.metodo_pago || 'efectivo').toLowerCase()
                          const isPaid = entregaActiva.payment_status === 'paid' || entregaActiva.estado_pago === 'pagado'
                          const isEfectivo = m === 'efectivo' || m === 'cash'
                          const isTerminal = m === 'terminal' || m === 'tarjeta' || m === 'card'
                          const isTransfer = m === 'transferencia' || m === 'transfer' || m === 'spei'

                          return (
                            <div className="space-y-3">
                              <div className="flex justify-between items-center text-xs">
                                <span style={{ color: textMuted }}>
                                  {isEfectivo ? '💰 Método de pago:' : isTerminal ? '💳 Método de pago:' : '📱 Método de pago:'}
                                </span>
                                <span 
                                  className="font-bold px-2.5 py-1 rounded-lg border shadow-sm uppercase tracking-wider text-[11px]"
                                  style={{ 
                                    background: bgCard, 
                                    border: `1px solid ${borderSubtle}`,
                                    color: textColor
                                  }}
                                >
                                  {isEfectivo ? 'Efectivo' : isTerminal ? 'Terminal / Tarjeta' : isTransfer ? 'Transferencia' : m}
                                </span>
                              </div>

                              {/* Alertas Visuales de Cobro en Puerta */}
                              {isPaid ? (
                                <div className="p-3 rounded-xl font-extrabold text-xs uppercase tracking-wider bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30 flex items-center gap-2 shadow-sm">
                                  <span>✓</span>
                                  <span>PAGADO ONLINE / VALIDADO</span>
                                </div>
                              ) : isEfectivo ? (
                                <div className="p-3 rounded-xl font-extrabold text-xs uppercase tracking-wider bg-amber-500/20 text-amber-950 dark:text-amber-200 border border-amber-500/40 flex items-center gap-2 shadow-sm animate-pulse">
                                  <span>⚠️</span>
                                  <span>POR COBRAR EN PUERTA — Llevar cambio</span>
                                </div>
                              ) : isTerminal ? (
                                <div className="p-3 rounded-xl font-extrabold text-xs uppercase tracking-wider bg-orange-500/20 text-orange-950 dark:text-orange-200 border border-orange-500/40 flex items-center gap-2 shadow-sm animate-pulse">
                                  <span>💳</span>
                                  <span>POR COBRAR EN PUERTA — Llevar Terminal Física</span>
                                </div>
                              ) : (
                                <div className="p-3 rounded-xl font-extrabold text-xs uppercase tracking-wider bg-rose-500/20 text-rose-950 dark:text-rose-200 border border-rose-500/40 flex items-center gap-2 shadow-sm animate-pulse">
                                  <span>📱</span>
                                  <span>POR COBRAR EN PUERTA — Validar comprobante con el cliente</span>
                                </div>
                              )}

                              <div className="flex justify-between items-center text-sm pb-1" style={{ borderBottom: `1px solid ${borderSubtle}` }}>
                                <span style={{ color: textMuted }}>Total a cobrar:</span>
                                <span className="font-black font-mono text-base" style={{ color: colorPrimario }}>${entregaActiva.total} MXN</span>
                              </div>

                              {/* Input interactivo para registrar monto recibido */}
                              {isEfectivo && !isPaid && (
                                <>
                                  <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold block uppercase tracking-wider" style={{ color: textSubtle }}>¿Cuánto efectivo recibiste?</label>
                                    <div className="relative rounded-xl shadow-sm">
                                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center font-mono text-xs pointer-events-none z-10" style={{ color: textSubtle }}>$</span>
                                      <input
                                        type="number"
                                        placeholder="0"
                                        value={montoRecibido}
                                        onChange={(e) => setMontoRecibido(e.target.value)}
                                        style={{ 
                                          background: bgCard, 
                                          border: `1px solid ${borderSubtle}`,
                                          color: textColor
                                        }}
                                        className="w-full rounded-xl pl-6 pr-3 py-2 text-xs font-mono placeholder-gray-400 focus:outline-none transition-all shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      />
                                    </div>

                                    {/* CAMBIO 3 — Mensaje de guía cuando el monto es 0 */}
                                    {esPagoEfectivo && (!montoRecibido || parseFloat(montoRecibido) <= 0 || isNaN(parseFloat(montoRecibido))) && (
                                      <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 pt-0.5 animate-fadeIn">
                                        <span>⚠️</span>
                                        <span>Ingresa el monto recibido antes de confirmar la entrega.</span>
                                      </p>
                                    )}
                                  </div>

                                  {/* Cálculo en tiempo real */}
                                  {(() => {
                                    const parsedVal = parseFloat(montoRecibido)
                                    if (isNaN(parsedVal) || parsedVal <= 0 || montoRecibido.trim() === '') {
                                      return (
                                        <div className="flex justify-between font-bold pt-1" style={{ color: textSubtle }}>
                                          <span>Cambio a entregar:</span>
                                          <span className="font-mono">--</span>
                                        </div>
                                      )
                                    }
                                    if (parsedVal < entregaActiva.total) {
                                      return (
                                        <div className="flex justify-between text-red-500 font-bold pt-1" style={{ borderTop: `1px solid ${borderSubtle}` }}>
                                          <span>Monto insuficiente. Faltan:</span>
                                          <span className="font-mono">${(entregaActiva.total - parsedVal).toFixed(2)} MXN</span>
                                        </div>
                                      )
                                    }
                                    return (
                                      <div className="flex justify-between text-emerald-500 font-bold pt-1" style={{ borderTop: `1px solid ${borderSubtle}` }}>
                                        <span>Cambio a entregar:</span>
                                        <span className="font-mono text-sm">${(parsedVal - entregaActiva.total).toFixed(2)} MXN</span>
                                      </div>
                                    )
                                  })()}
                                </>
                              )}
                            </div>
                          )
                        })()}
                      </div>

                      <div className="h-[1px] w-full" style={{ background: borderSubtle }} />

                      {/* Monitoreo de Tiempos Destacado */}
                      <div 
                        className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl"
                        style={{ 
                          background: bgSubcard, 
                          border: `1px solid ${borderSubtle}`
                        }}
                      >
                        <span className="text-[10px] uppercase font-black tracking-widest" style={{ color: textSubtle }}>Tiempo de entrega</span>
                        {isAsignado ? (
                          tiempoTranscurrido >= 10 ? (
                            <div className="bg-red-500/15 text-red-800 dark:text-red-300 border border-red-500/30 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 text-xs font-mono">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                              <span>⚡ Retrasado: {formatStopwatch(tiempoTranscurrido * 60)}</span>
                            </div>
                          ) : (
                            <div className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 text-xs font-mono">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span>⏱ Asignado: {formatStopwatch(tiempoTranscurrido * 60)}</span>
                            </div>
                          )
                        ) : (
                          <div className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-3 py-1.5 rounded-xl font-black font-mono flex items-center gap-2 text-sm shadow-sm">
                            <span className="relative flex h-2 w-2 shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            <span>🛵 En camino: {formatStopwatch(segundosCamino)}</span>
                          </div>
                        )}
                      </div>

                      <div className="h-[1px] w-full" style={{ background: borderSubtle }} />

                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[10px] uppercase font-black tracking-wider" style={{ color: textSubtle }}>Monto Total</span>
                        <div className="flex items-center gap-1 font-bold">
                          <span className="text-xs" style={{ color: textMuted }}>Total:</span>
                          <span className="text-emerald-500 font-mono text-base font-black">${entregaActiva.total} MXN</span>
                        </div>
                      </div>
                    </div>

                    {/* 3. Footer protegido (shrink-0) */}
                    <div 
                      className="p-4 border-t shrink-0 flex gap-3"
                      style={{ 
                        borderColor: borderSubtle,
                        background: bgCard
                      }}
                    >
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(entregaActiva.direccion)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ 
                          background: bgSubcard, 
                          border: `1px solid ${borderSubtle}`,
                          color: textColor
                        }}
                        className="flex-1 rounded-xl py-3 text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 hover:brightness-105 shadow-sm"
                      >
                        <Navigation size={13} />
                        <span>Ver en mapa</span>
                      </a>

                      {isAsignado && (
                        <button
                          onClick={handleStartRoute}
                          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-3 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                        >
                          <Scooter size={13} />
                          <span>Salir a entregar</span>
                        </button>
                      )}

                      {isEnCamino && (
                        <button
                          onClick={handleConfirmDelivery}
                          disabled={!montoValido}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-emerald-600"
                        >
                          <CheckCircle size={13} />
                          <span>Confirmar entrega</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* TAB 2 — NUEVA ENTREGA */}
        {activeTab === 'nueva_entrega' && (
          <div className="space-y-4 animate-fadeIn">

            {entregaActiva ? (
              <div 
                className="max-w-xl mx-auto w-full flex flex-col items-center justify-center text-center animate-fadeIn rounded-2xl py-12 px-6 max-md:py-8 max-md:px-4 shadow-xl" 
                style={{ 
                  background: bgCard,
                  borderRadius: '1rem',
                  border: `1px solid ${borderSubtle}`,
                  boxShadow: isLight ? '0 10px 25px -5px rgba(0, 0, 0, 0.08)' : '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                }}
              >
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-2 mx-auto border text-amber-500"
                  style={{ 
                    background: 'color-mix(in srgb, #f59e0b 15%, transparent)',
                    borderColor: 'color-mix(in srgb, #f59e0b 30%, transparent)'
                  }}
                >
                  <AlertCircle size={32} className="animate-bounce" />
                </div>
                <h3 className="text-base font-bold mb-1.5" style={{ color: textColor }}>⚠️ Ya tienes una entrega en curso</h3>
                <p className="text-xs max-w-xs mb-6 font-semibold" style={{ color: textMuted }}>Debes confirmar la entrega actual antes de aceptar un nuevo pedido.</p>
                <button
                  onClick={() => setActiveTab('entregas')}
                  style={{ background: colorPrimario, color: 'var(--theme-primary-contrast, #fff)' }}
                  className="px-6 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 shadow-lg hover:brightness-110 active:scale-95"
                >
                  <span>→ Ver mi entrega activa</span>
                </button>
              </div>
            ) : (
              <div 
                className="rounded-2xl p-6 max-md:p-4 max-md:space-y-4 shadow-xl space-y-5 max-w-xl mx-auto w-full"
                style={{ 
                  background: bgCard, 
                  border: `1px solid ${borderSubtle}`,
                  color: textColor,
                  boxShadow: isLight ? '0 10px 25px -5px rgba(0, 0, 0, 0.08)' : '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                }}
              >
                {/* QR Reader Area */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider" style={{ color: textMuted }}>
                    <div className="flex items-center gap-2">
                      <Camera size={14} style={{ color: colorPrimario }} />
                      <span>Cámara de escáner</span>
                    </div>
                    {processingCode && (
                      <span className="text-[10px] font-bold flex items-center gap-1 animate-pulse" style={{ color: colorPrimario }}>
                        <Sparkles size={12} /> Procesando entrega...
                      </span>
                    )}
                  </div>

                  {!isScanning ? (
                    /* Estado Cámara Apagada */
                    <div 
                      className="rounded-xl overflow-hidden flex flex-col items-center justify-center relative p-6 border-2 border-dashed min-h-[220px] text-center"
                      style={{ 
                        background: bgSubcard, 
                        borderColor: borderSubtle
                      }}
                    >
                      <div 
                        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-inner"
                        style={{ 
                          background: 'color-mix(in srgb, var(--theme-primary) 12%, transparent)',
                          color: colorPrimario
                        }}
                      >
                        <Camera size={28} style={{ color: colorPrimario }} />
                      </div>
                      <p className="text-xs font-bold mb-1" style={{ color: textColor }}>Cámara apagada</p>
                      <p className="text-[11px] max-w-xs mb-4" style={{ color: textMuted }}>
                        Activa la cámara para escanear el código QR del ticket de entrega
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsScanning(true)}
                        style={{ backgroundColor: primaryColor, color: 'var(--theme-primary-contrast, #fff)' }}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 shadow-md hover:brightness-110 active:scale-95"
                      >
                        <Camera size={14} />
                        <span>Activar Cámara</span>
                      </button>
                    </div>
                  ) : (
                    /* Estado Cámara Encendida */
                    <div className="space-y-3">
                      <div 
                        className="rounded-xl overflow-hidden flex flex-col items-center justify-center relative p-2 border-2 border-dashed min-h-[260px]"
                        style={{ 
                          background: bgSubcard, 
                          borderColor: cameraError ? 'rgba(239, 68, 68, 0.4)' : borderSubtle
                        }}
                      >
                        {cameraError ? (
                          <div className="p-6 text-center space-y-3 flex flex-col items-center justify-center my-auto animate-fadeIn">
                            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-sm animate-pulse">
                              <AlertCircle size={30} />
                            </div>
                            <p className="text-xs font-bold text-red-500 max-w-xs leading-relaxed">
                              Permisos de cámara denegados. Otorga acceso o usa el ingreso manual.
                            </p>
                            <p className="text-[11px] font-medium" style={{ color: textMuted }}>
                              Puedes ingresar el código numérico o token abajo.
                            </p>
                          </div>
                        ) : (
                          <div id="qr-reader-element" className="w-full max-w-[280px] mx-auto text-xs" style={{ color: textMuted }}></div>
                        )}

                        {/* Overlay de Carga durante procesamiento API */}
                        {processingCode && (
                          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center p-6 space-y-3 z-20 animate-fadeIn">
                            <div 
                              className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" 
                              style={{ borderColor: `${colorPrimario} transparent ${colorPrimario} ${colorPrimario}` }}
                            />
                            <p className="text-xs font-bold text-white animate-pulse">Asignando entrega al repartidor...</p>
                            <p className="text-[11px] text-gray-300">Conectando con el servidor</p>
                          </div>
                        )}
                      </div>

                      {/* Botón de Apagar Cámara */}
                      <div className="flex justify-center pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setCameraError(null)
                            setIsScanning(false)
                          }}
                          className="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 border border-red-500/30 text-red-500 bg-red-500/10 hover:bg-red-500/20 active:scale-95 shadow-sm"
                        >
                          <X size={14} />
                          <span>Apagar Cámara</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center gap-3">
                  <div className="h-[1px] flex-1" style={{ background: borderSubtle }} />
                  <span className="text-[10px] uppercase font-black tracking-wider shrink-0" style={{ color: textSubtle }}>o ingresa el código</span>
                  <div className="h-[1px] flex-1" style={{ background: borderSubtle }} />
                </div>

                {/* Manual search input form */}
                <div className="space-y-1.5">
                  <form onSubmit={handleManualSearch} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Código o Token (ej: X8A-9BQ o 29)"
                      value={folioInput}
                      onChange={(e) => {
                        const sanitized = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '')
                        setFolioInput(sanitized)
                        if (searchError) setSearchError(null)
                      }}
                      style={{ 
                        background: bgSubcard, 
                        border: `1px solid ${searchError ? 'rgba(239, 68, 68, 0.6)' : borderSubtle}`,
                        color: textColor
                      }}
                      className="flex-1 rounded-xl px-4 py-2.5 text-xs placeholder-gray-400 focus:outline-none transition-all font-mono shadow-sm uppercase tracking-wider"
                    />
                    <button
                      type="submit"
                      disabled={processingCode}
                      style={{ backgroundColor: primaryColor, color: 'var(--theme-primary-contrast, #fff)' }}
                      className="text-xs font-bold px-5 max-md:px-3 py-2.5 rounded-xl cursor-pointer transition-all shadow-md hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px] max-md:min-w-[80px] flex items-center justify-center gap-1.5"
                    >
                      {processingCode ? (
                        <>
                          <Loader2 size={14} className="animate-spin text-white" />
                          <span>Buscando...</span>
                        </>
                      ) : (
                        <span>Buscar</span>
                      )}
                    </button>
                  </form>
                  {searchError && (
                    <p className="text-red-500 text-[11px] font-semibold pl-1 animate-fadeIn flex items-center gap-1">
                      <span>⚠️</span>
                      <span>{searchError}</span>
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3 — MI CORTE */}
        {activeTab === 'historial' && (() => {
          if (corteConfirmado) {
            return (
              <div className="flex flex-col items-center justify-center py-16 gap-6 text-center max-w-sm mx-auto animate-fadeIn">
                <div className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)' }}>
                  <CheckCircle2 size={40} style={{ color: 'var(--theme-primary)' }} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-black" style={{ color: 'var(--theme-text)' }}>
                    Corte registrado con éxito
                  </h2>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--theme-text-muted)' }}>
                    El encargado verificó y registró tu corte correctamente.<br />
                    ¡Nos vemos pronto, buen trabajo hoy!
                  </p>
                </div>
              </div>
            )
          }

          const deliveriesList = cutData?.orders || cutData?.deliveries || cutData?.entregas || []
          
          const formatCurrency = (val) => new Intl.NumberFormat('es-MX', { 
            style: 'currency', 
            currency: 'MXN',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(Number(val) || 0)

          const cashTotal = cutData?.cash_total !== undefined 
            ? Number(cutData.cash_total) 
            : (cutData?.total_cash !== undefined 
              ? Number(cutData.total_cash) 
              : deliveriesList.filter(e => {
                  const m = (e.payment_method || e.metodoPago || e.metodo_pago || '').toLowerCase()
                  return m === 'efectivo' || m === 'cash' || !m
                }).reduce((sum, e) => sum + Number(e.total || e.total_amount || e.amount || e.monto || 0), 0))

          const terminalTotal = cutData?.terminal_total !== undefined 
            ? Number(cutData.terminal_total) 
            : (cutData?.total_terminal !== undefined 
              ? Number(cutData.total_terminal) 
              : (cutData?.total_card !== undefined 
                ? Number(cutData.total_card)
                : deliveriesList.filter(e => {
                    const m = (e.payment_method || e.metodoPago || e.metodo_pago || '').toLowerCase()
                    return m === 'terminal' || m === 'card' || m === 'tarjeta'
                  }).reduce((sum, e) => sum + Number(e.total || e.total_amount || e.amount || e.monto || 0), 0)))

          const transferTotal = cutData?.transfer_total !== undefined 
            ? Number(cutData.transfer_total) 
            : (cutData?.total_transfer !== undefined 
              ? Number(cutData.total_transfer) 
              : (cutData?.total_transferencia !== undefined 
                ? Number(cutData.total_transferencia) 
                : deliveriesList.filter(e => {
                    const m = (e.payment_method || e.metodoPago || e.metodo_pago || '').toLowerCase()
                    return m === 'transferencia' || m === 'transfer'
                  }).reduce((sum, e) => sum + Number(e.total || e.total_amount || e.amount || e.monto || 0), 0)))

          const totalOrders = cutData?.total_orders !== undefined 
            ? Number(cutData.total_orders) 
            : (cutData?.completed_count !== undefined 
              ? Number(cutData.completed_count) 
              : (cutData?.total_completadas !== undefined 
                ? Number(cutData.total_completadas) 
                : deliveriesList.length))

          const fechaCorte = cutData?.fecha_corte || cutData?.fechaCorte || todayStr

          const downloadCSV = () => {
            if (deliveriesList.length === 0) {
              showToast('⚠️ No hay entregas registradas para exportar.')
              return
            }
            let csv = 'Folio,Hora Entrega,Metodo Pago,Total\n'
            deliveriesList.forEach((e, idx) => {
              const m = (e.payment_method || e.metodoPago || e.metodo_pago || 'efectivo').toLowerCase()
              const metodoStr = m === 'efectivo' ? 'Efectivo' : m === 'terminal' ? 'Terminal' : 'Transferencia'
              const folio = e.folio || e.dispatch_token || e.id || e.order_id || (idx + 1)
              const tot = Number(e.total || e.total_amount || e.amount || e.monto || 0)
              const h = e.hora || e.time || ''
              csv += `"${folio}","${h}","${metodoStr}",${tot}\n`
            })
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.setAttribute('href', url)
            link.setAttribute('download', `Corte_Repartidor_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`)
            link.style.visibility = 'hidden'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            showToast('✓ CSV descargado correctamente')
          }

          const downloadExcel = () => {
            if (deliveriesList.length === 0) {
              showToast('⚠️ No hay entregas registradas para exportar.')
              return
            }
            let html = '<html><head><meta charset="utf-8"/></head><body><table><tr><th>Folio (Token)</th><th>Hora de Entrega</th><th>Método de Pago</th><th>Total</th></tr>'
            deliveriesList.forEach((e, idx) => {
              const m = (e.payment_method || e.metodoPago || e.metodo_pago || 'efectivo').toLowerCase()
              const metodoStr = m === 'efectivo' ? 'Efectivo' : m === 'terminal' ? 'Terminal' : 'Transferencia'
              const folio = e.folio || e.dispatch_token || e.id || e.order_id || (idx + 1)
              const tot = Number(e.total || e.total_amount || e.amount || e.monto || 0)
              const h = e.hora || e.time || ''
              html += `<tr><td>${folio}</td><td>${h}</td><td>${metodoStr}</td><td>$${tot}</td></tr>`
            })
            html += '</table></body></html>'
            const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.setAttribute('href', url)
            link.setAttribute('download', `Corte_Repartidor_${new Date().toLocaleDateString().replace(/\//g, '-')}.xls`)
            link.style.visibility = 'hidden'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            showToast('✓ Excel descargado correctamente')
          }

          const downloadPDF = () => {
            if (deliveriesList.length === 0) {
              showToast('⚠️ No hay entregas registradas para exportar.')
              return
            }
            const printWindow = window.open('', '_blank')
            let content = `
              <html>
              <head>
                <title>Corte de Caja - Repartidor</title>
                <style>
                  body { font-family: sans-serif; padding: 20px; color: #333; }
                  h1 { margin-bottom: 5px; }
                  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                  th { background-color: #f2f2f2; }
                </style>
              </head>
              <body>
                <h1>Reporte de Corte de Caja</h1>
                <p>Fecha: ${fechaCorte}</p>
                <p>Efectivo a entregar: ${formatCurrency(cashTotal)}</p>
                <p>Cobrado con terminal: ${formatCurrency(terminalTotal)}</p>
                <p>Cobrado con transferencia: ${formatCurrency(transferTotal)}</p>
                <table>
                  <thead>
                    <tr>
                      <th>Folio (Token)</th>
                      <th>Hora de Entrega</th>
                      <th>Método de Pago</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
            `
            deliveriesList.forEach((e, idx) => {
              const m = (e.payment_method || e.metodoPago || e.metodo_pago || 'efectivo').toLowerCase()
              const metodoStr = m === 'efectivo' ? 'Efectivo' : m === 'terminal' ? 'Terminal' : 'Transferencia'
              const folio = e.folio || e.dispatch_token || e.id || e.order_id || (idx + 1)
              const tot = Number(e.total || e.total_amount || e.amount || e.monto || 0)
              const h = e.hora || e.time || ''
              content += `<tr><td>${folio}</td><td>${h}</td><td>${metodoStr}</td><td>${formatCurrency(tot)}</td></tr>`
            })
            content += `
                  </tbody>
                </table>
                <script>
                  window.onload = function() { window.print(); window.close(); }
                </script>
              </body>
              </html>
            `
            printWindow.document.write(content)
            printWindow.document.close()
            showToast('✓ PDF generado para imprimir')
          }

          return (
            <div className="space-y-5 max-md:space-y-4 animate-fadeIn max-w-2xl mx-auto w-full">
              {/* Header con botón Actualizar Corte */}
              <div className="flex items-center justify-between gap-3 px-1">
                <div>
                  <h2 className="text-base sm:text-lg font-black tracking-tight" style={{ color: textColor }}>
                    Mi Corte de Caja
                  </h2>
                  <p className="text-xs" style={{ color: textMuted }}>
                    Turno de hoy · {fechaCorte}
                  </p>
                </div>

                <button
                  onClick={() => fetchMyCut(false)}
                  disabled={loadingCut}
                  className="flex items-center gap-1.5 px-3.5 py-2 max-md:px-2 rounded-xl text-xs font-bold border transition-all shadow-xs active:scale-95 cursor-pointer hover:brightness-105"
                  style={{
                    backgroundColor: bgSubcard,
                    borderColor: borderSubtle,
                    color: colorPrimario
                  }}
                  title="Actualizar datos del corte"
                >
                  <RefreshCw size={13} className={loadingCut ? 'animate-spin' : ''} />
                  <span>{loadingCut ? 'Actualizando...' : 'Actualizar Corte'}</span>
                </button>
              </div>

              {/* Tarjeta de Resumen del Corte */}
              <div 
                className="rounded-2xl p-6 max-md:p-4 max-md:space-y-3 shadow-xl space-y-4 w-full"
                style={{ 
                  background: bgCard, 
                  border: `1px solid ${borderSubtle}`,
                  color: textColor,
                  boxShadow: isLight ? '0 10px 25px -5px rgba(0, 0, 0, 0.08)' : '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                }}
              >
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center pb-3" style={{ borderBottom: `1px solid ${borderSubtle}` }}>
                    <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: textMuted }}>
                      💵 Efectivo a entregar
                    </span>
                    <span className="text-emerald-500 font-mono text-3xl font-black">
                      {formatCurrency(cashTotal)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-1">
                    <div 
                      className="flex justify-between items-center text-xs p-3 rounded-xl border shadow-sm"
                      style={{ 
                        background: bgSubcard, 
                        borderColor: borderSubtle,
                        color: textMuted
                      }}
                    >
                      <span className="flex items-center gap-1.5 font-medium">
                        💳 Cobrado con terminal
                      </span>
                      <span className="font-mono font-bold" style={{ color: textColor }}>
                        {formatCurrency(terminalTotal)}
                      </span>
                    </div>

                    <div 
                      className="flex justify-between items-center text-xs p-3 rounded-xl border shadow-sm"
                      style={{ 
                        background: bgSubcard, 
                        borderColor: borderSubtle,
                        color: textMuted
                      }}
                    >
                      <span className="flex items-center gap-1.5 font-medium">
                        📲 Cobrado con transferencia
                      </span>
                      <span className="font-mono font-bold" style={{ color: textColor }}>
                        {formatCurrency(transferTotal)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div 
                      className="rounded-xl p-3 flex items-center justify-between text-xs border shadow-sm"
                      style={{ 
                        background: bgSubcard, 
                        borderColor: borderSubtle,
                        color: textMuted
                      }}
                    >
                      <span className="font-medium">📦 Completadas</span>
                      <span className="font-bold font-mono text-sm" style={{ color: textColor }}>{totalOrders}</span>
                    </div>
                    <div 
                      className="rounded-xl p-3 flex items-center justify-between text-xs border shadow-sm"
                      style={{ 
                        background: bgSubcard, 
                        borderColor: borderSubtle,
                        color: textMuted
                      }}
                    >
                      <span className="font-medium">💵 Total Efectivo</span>
                      <span className="font-bold font-mono text-emerald-500 text-sm">{formatCurrency(cashTotal)}</span>
                    </div>
                  </div>
                </div>

                <div 
                  className="border rounded-xl p-3 max-md:p-2 text-center"
                  style={{ 
                    backgroundColor: 'color-mix(in srgb, var(--theme-primary) 10%, transparent)', 
                    borderColor: 'color-mix(in srgb, var(--theme-primary) 25%, transparent)' 
                  }}
                >
                  <p className="text-[11px] font-semibold leading-relaxed" style={{ color: colorPrimario }}>
                    Este es el monto que debes entregar al encargado al final de tu turno.
                  </p>
                </div>
              </div>

              {/* Tabla de Detalle de Entregas */}
              <div 
                className="rounded-2xl overflow-hidden shadow-xl w-full"
                style={{ 
                  background: bgCard, 
                  border: `1px solid ${borderSubtle}`,
                  color: textColor,
                  boxShadow: isLight ? '0 10px 25px -5px rgba(0, 0, 0, 0.08)' : '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                }}
              >
                <div 
                  className="p-3.5 max-md:p-3 flex flex-wrap items-center justify-between gap-3"
                  style={{ 
                    background: bgSubcard, 
                    borderBottom: `1px solid ${borderSubtle}`
                  }}
                >
                  <span className="text-xs font-bold uppercase tracking-wider pl-1" style={{ color: textMuted }}>
                    Detalle del Corte
                  </span>
                  
                  <div className="flex items-center gap-1.5 text-[10px] max-md:w-full max-md:justify-end">
                    <button 
                      onClick={downloadExcel}
                      disabled={deliveriesList.length === 0}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2 max-md:px-2 rounded-xl shadow-sm transition-all duration-200 cursor-pointer flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-600 disabled:shadow-none"
                      title={deliveriesList.length === 0 ? 'Sin entregas para exportar' : 'Exportar a Excel'}
                    >
                      📈 Excel
                    </button>
                    <button 
                      onClick={downloadCSV}
                      disabled={deliveriesList.length === 0}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3.5 py-2 max-md:px-2 rounded-xl shadow-sm transition-all duration-200 cursor-pointer flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600 disabled:shadow-none"
                      title={deliveriesList.length === 0 ? 'Sin entregas para exportar' : 'Exportar a CSV'}
                    >
                      📊 CSV
                    </button>
                    <button 
                      onClick={downloadPDF}
                      disabled={deliveriesList.length === 0}
                      className="bg-red-600 hover:bg-red-500 text-white font-bold px-3.5 py-2 max-md:px-2 rounded-xl shadow-sm transition-all duration-200 cursor-pointer flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-600 disabled:shadow-none"
                      title={deliveriesList.length === 0 ? 'Sin entregas para exportar' : 'Exportar a PDF'}
                    >
                      📄 PDF
                    </button>
                  </div>
                </div>

                {deliveriesList.length === 0 ? (
                  <div className="p-8 text-center text-xs" style={{ color: textSubtle }}>
                    Aún no has registrado entregas en este corte.
                  </div>
                ) : (
                  <div className="overflow-x-auto text-xs custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[500px]">
                      <thead>
                        <tr 
                          className="text-[10px] uppercase font-bold tracking-wider"
                          style={{ 
                            background: bgSubcard, 
                            borderBottom: `1px solid ${borderSubtle}`,
                            color: textSubtle
                          }}
                        >
                          <th className="p-3">Folio (Token)</th>
                          <th className="p-3">Hora de Entrega</th>
                          <th className="p-3">Método de Pago</th>
                          <th className="p-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody style={{ color: textMuted }}>
                        {deliveriesList.map((item, idx) => {
                          const method = (item.payment_method || item.metodoPago || item.metodo_pago || 'efectivo').toLowerCase()
                          const isTerminal = method === 'terminal' || method === 'tarjeta' || method === 'card'
                          const isTransferencia = method === 'transferencia' || method === 'transfer'
                          
                          let methodText = '💵 Efectivo'
                          if (isTerminal) methodText = '💳 Terminal'
                          if (isTransferencia) methodText = '📱 Transferencia'

                          const displayFolio = item.folio || item.dispatch_token || item.id || item.order_id || `#${idx + 1}`
                          const displayTotal = Number(item.total || item.total_amount || item.amount || item.monto || 0)
                          const displayHora = item.hora || item.time || (item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--')

                          return (
                            <tr 
                              key={item.id || item.folio || idx} 
                              className="transition-colors hover:bg-white/5"
                              style={{ borderBottom: `1px solid ${borderSubtle}` }}
                            >
                              <td className="p-3 font-mono font-extrabold text-xs" style={{ color: textColor }}>
                                {displayFolio}
                              </td>
                              <td className="p-3 font-mono text-xs" style={{ color: textMuted }}>
                                {displayHora}
                              </td>
                              <td className="p-3 font-medium text-xs">
                                {methodText}
                              </td>
                              <td className="p-3 font-mono font-bold text-emerald-500 text-right text-xs">
                                {formatCurrency(displayTotal)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Botón de Notificar Corte */}
              <div className="w-full pt-1">
                <button
                  onClick={() => setShowCorteConfirm(true)}
                  disabled={notifyingCut || hasPendingCut}
                  style={{ background: colorPrimario, color: 'var(--theme-primary-contrast, #fff)' }}
                  className="font-bold rounded-xl py-3.5 w-full text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {notifyingCut ? (
                    <>
                      <Loader2 size={15} className="animate-spin text-white" />
                      <span>Notificando corte al encargado...</span>
                    </>
                  ) : hasPendingCut ? (
                    <>
                      <Clock size={15} />
                      <span>Corte notificado · Esperando validación</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={15} />
                      <span>Notificar corte al encargado</span>
                    </>
                  )}
                </button>
                {hasPendingCut && (
                  <p className="text-center text-xs mt-2" style={{ color: colorPrimario }}>
                    Ya tienes un corte pendiente. Espera a que el encargado lo confirme.
                  </p>
                )}
              </div>
            </div>
          )
        })()}
      </main>

      {/* --- CONFIRM DELIVERY ACCEPTANCE MODAL --- */}
      {showConfirmModal && scannedPedido && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            className="rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-scaleIn space-y-4 text-xs"
            style={{ 
              background: bgCard, 
              border: `1px solid ${borderSubtle}`,
              color: textColor,
              boxShadow: modalShadow
            }}
          >
            <div className="flex justify-between items-start pb-2" style={{ borderBottom: `1px solid ${borderSubtle}` }}>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colorPrimario }}>Nueva entrega disponible</span>
                <h3 className="text-md font-bold mt-0.5" style={{ color: textColor }}>Pedido #{scannedPedido.id}</h3>
              </div>
              <button
                onClick={() => {
                  setShowConfirmModal(false)
                  setScannedPedido(null)
                }}
                className="p-1.5 rounded-lg cursor-pointer transition-all hover:opacity-80"
                style={{ color: textMuted }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Address and client info */}
            <div className="space-y-2" style={{ color: textMuted }}>
              <div className="flex gap-2">
                <User size={13} className="shrink-0 mt-0.5" style={{ color: colorPrimario }} />
                <span>{scannedPedido.cliente} · {scannedPedido.telefono}</span>
              </div>
              <div className="flex gap-2">
                <MapPin size={13} className="shrink-0 mt-0.5" style={{ color: colorPrimario }} />
                <div>
                  <span className="font-bold" style={{ color: textColor }}>{scannedPedido.direccion}</span>
                  {scannedPedido.referencias && (
                    <span className="text-[10px] block mt-0.5" style={{ color: textSubtle }}>({scannedPedido.referencias})</span>
                  )}
                </div>
              </div>
            </div>

            <div className="h-[1px] w-full" style={{ background: borderSubtle }} />

            {/* Items breakdown list */}
            <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
              {scannedPedido.platillos.map((p, idx) => (
                <div key={idx} className="flex justify-between" style={{ color: textMuted }}>
                  <span>{p.nombre}</span>
                  <span className="font-mono" style={{ color: textSubtle }}>x{p.cantidad}</span>
                </div>
              ))}
            </div>

            <div className="h-[1px] w-full" style={{ background: borderSubtle }} />

            {/* Payment method & Alert */}
            {(() => {
              const m = (scannedPedido.metodo_pago || scannedPedido.payment_method || scannedPedido.metodoPago || 'efectivo').toLowerCase()
              const isPaid = scannedPedido.payment_status === 'paid' || scannedPedido.estado_pago === 'pagado'
              const isEfectivo = m === 'efectivo' || m === 'cash'
              const isTerminal = m === 'terminal' || m === 'tarjeta' || m === 'card'

              if (isPaid) {
                return (
                  <div className="p-2 rounded-xl font-bold text-[10px] uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1.5">
                    <span>✓</span>
                    <span>PAGADO ONLINE / VALIDADO</span>
                  </div>
                )
              }
              if (isTerminal) {
                return (
                  <div className="p-2 rounded-xl font-bold text-[10px] uppercase tracking-wider bg-orange-500/15 text-orange-500 border border-orange-500/30 flex items-center gap-1.5">
                    <span>💳</span>
                    <span>POR COBRAR EN PUERTA — Llevar Terminal Física</span>
                  </div>
                )
              }
              if (isEfectivo) {
                return (
                  <div className="p-2 rounded-xl font-bold text-[10px] uppercase tracking-wider bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center gap-1.5">
                    <span>⚠️</span>
                    <span>POR COBRAR EN PUERTA — Llevar cambio</span>
                  </div>
                )
              }
              return (
                <div className="p-2 rounded-xl font-bold text-[10px] uppercase tracking-wider bg-rose-500/15 text-rose-500 border border-rose-500/30 flex items-center gap-1.5">
                  <span>📱</span>
                  <span>POR COBRAR EN PUERTA — Validar comprobante con el cliente</span>
                </div>
              )
            })()}

            {/* Total value */}
            <div className="flex justify-between items-center text-sm font-bold">
              <span style={{ color: textMuted }}>Total:</span>
              <span className="text-emerald-500 font-mono">${scannedPedido.total} MXN</span>
            </div>

            {/* Modal actions footer buttons */}
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                onClick={() => {
                  setShowConfirmModal(false)
                  setScannedPedido(null)
                  showToast('Rechazaste la asignación de entrega')
                }}
                style={{ 
                  background: bgSubcard, 
                  border: `1px solid ${borderSubtle}`,
                  color: textMuted
                }}
                className="rounded-xl py-3 font-bold cursor-pointer transition-all hover:brightness-105 shadow-sm"
              >
                Rechazar
              </button>
              <button
                onClick={handleAcceptDelivery}
                style={{ background: colorPrimario, color: 'var(--theme-primary-contrast, #fff)' }}
                className="rounded-xl py-3 font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-md hover:brightness-110 active:scale-95"
              >
                <CheckCircle size={14} />
                <span>Aceptar entrega</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Corte */}
      {showCorteConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            className="rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-scaleIn space-y-4 text-xs"
            style={{ 
              background: bgCard, 
              border: `1px solid ${borderSubtle}`,
              color: textColor,
              boxShadow: modalShadow
            }}
          >
            <div className="flex justify-between items-start pb-2" style={{ borderBottom: `1px solid ${borderSubtle}` }}>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colorPrimario }}>Confirmación de Cierre</span>
                <h3 className="text-md font-bold mt-0.5" style={{ color: textColor }}>Notificar entrega de valores</h3>
              </div>
              <button 
                onClick={() => !notifyingCut && setShowCorteConfirm(false)}
                disabled={notifyingCut}
                className="p-1.5 rounded cursor-pointer transition-all hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ color: textMuted }}
              >
                <X size={16} />
              </button>
            </div>
            {(() => {
              const formatCurrency = (val) => new Intl.NumberFormat('es-MX', { 
                style: 'currency', 
                currency: 'MXN',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              }).format(Number(val) || 0)

              return (
                <>
                  {totalCompletedOrders === 0 && (
                    <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 text-xs font-semibold flex items-start gap-2">
                      <AlertTriangle size={16} className="shrink-0 text-amber-500 mt-0.5" />
                      <span>⚠️ Estás a punto de cerrar un turno sin entregas registradas.</span>
                    </div>
                  )}

                  <p className="leading-relaxed" style={{ color: textMuted }}>
                    ¿Estás seguro de notificar tu corte? Deberás entregar <span className="font-extrabold text-emerald-500 font-mono">{formatCurrency(cashTotal)}</span> en efectivo al encargado. Esta acción no se puede deshacer.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      onClick={() => setShowCorteConfirm(false)}
                      disabled={notifyingCut}
                      style={{ 
                        background: bgSubcard, 
                        border: `1px solid ${borderSubtle}`,
                        color: textMuted
                      }}
                      className="rounded-xl py-2.5 font-bold transition-all cursor-pointer text-center hover:brightness-105 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleNotificarCorte}
                      disabled={notifyingCut}
                      style={{ background: colorPrimario, color: 'var(--theme-primary-contrast, #fff)' }}
                      className="rounded-xl py-2.5 font-bold transition-all cursor-pointer text-center shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:brightness-110"
                    >
                      {notifyingCut ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Notificando...</span>
                        </>
                      ) : (
                        <span>Confirmar</span>
                      )}
                    </button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* --- TOAST PANEL --- */}
      {toastMessage && (
        <div 
          style={{ background: colorPrimario, color: 'var(--theme-primary-contrast, #fff)' }}
          className="fixed bottom-4 right-4 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-fadeInUp z-50"
        >
          <Sparkles size={14} className="animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
