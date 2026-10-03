import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  LogOut, Plus, Minus, X, Utensils, Sparkles, Check, Clock, ChevronDown, Pencil, Copy, MapPin, Loader2
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { getAllMesas } from '../../api/areas'
import { getDishes } from '../../api/dishes'
import { getConfiguracion } from '../../api/settings'
import client from '../../api/client'
import echo from '../../echo'

export default function WaiterView() {
  const navigate = useNavigate()
  const { user, logoutUser } = useAuth()
  const { 
    colorFondo, 
    colorPrimario, 
    bgCard, 
    bgSubcard, 
    borderSubtle, 
    textColor, 
    textMuted, 
    textSubtle, 
    primaryBtnText, 
    modalShadow, 
    isLight, 
    logoUrl, 
    restaurantName 
  } = useTheme()

  // --- ESTADOS PRINCIPALES ---
  const [isLogoutHovered, setIsLogoutHovered] = useState(false)
  const [mesas, setMesas] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())

  // --- ESTADOS DRAWER Y SELECCIÓN ---
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedMesa, setSelectedMesa] = useState(null)
  const [hoveredMesa, setHoveredMesa] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [categoriaActiva, setCategoriaActiva] = useState('Todos')
  const [areaActiva, setAreaActiva] = useState('todas')
  const [orderItems, setOrderItems] = useState([])
  const [abriendoMesaId, setAbriendoMesaId] = useState(null)
  const [enviandoOrden, setEnviandoOrden] = useState(false)

  // Debounce de 300ms para el buscador de platillos
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchTerm])

  // --- ESTADOS MODAL MOBILE 2 PASOS + BOTTOM SHEET ---
  const [ordenStep, setOrdenStep] = useState('catalogo') // 'catalogo' | 'resumen'
  const [platilloSeleccionado, setPlatilloSeleccionado] = useState(null)
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false)
  const [modalClosing, setModalClosing] = useState(false)
  const [sheetClosing, setSheetClosing] = useState(false)
  const [extrasDropdownOpen, setExtrasDropdownOpen] = useState(false)
  const [editandoUid, setEditandoUid] = useState(null)
  const [sheetCantidad, setSheetCantidad] = useState(1)
  const [sheetExtras, setSheetExtras] = useState([])
  const [sheetNota, setSheetNota] = useState('')
  const extrasDropdownRef = useRef(null)

  // Cierre inteligente del menú de extras al hacer clic fuera (Click Outside)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (extrasDropdownRef.current && !extrasDropdownRef.current.contains(event.target)) {
        setExtrasDropdownOpen(false)
      }
    }
    if (extrasDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [extrasDropdownOpen])

  // --- ESTADO MODAL DETALLE / VER ORDEN ---
  const [activeOrderView, setActiveOrderView] = useState(null)

  // --- ESTADOS DETALLE MESA OCUPADA & COBRO ---
  const [mesaDetalleOpen, setMesaDetalleOpen]   = useState(false)
  const [mesaDetalle, setMesaDetalle]           = useState(null)
  const [ordenesDetalle, setOrdenesDetalle]     = useState([])
  const [cobroStep, setCobroStep]               = useState('cuenta')  // 'cuenta' | 'cobro-junto' | 'cobro-separado'
  const [formaPago, setFormaPago]               = useState(null)      // 'cash' | 'card' | 'transfer'
  const [platillosSeleccionados, setPlatillosSeleccionados] = useState([])
  const [platillosCobrados, setPlatillosCobrados] = useState([])
  const [cargandoCobro, setCargandoCobro]       = useState(false)

  // --- CONFIGURACIÓN DE MÉTODOS DE PAGO (GLOBAL / ADMIN) ---
  const [metodosPagoConfig, setMetodosPagoConfig] = useState({
    efectivo: true,
    tarjeta: true,
    transferencia: false,
    banco: '',
    clabe: '',
    titular: ''
  })
  const [copiedClabe, setCopiedClabe] = useState(false)

  const handleCopyClabe = (clabe) => {
    if (!clabe) return
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(clabe)
      setCopiedClabe(true)
      setTimeout(() => setCopiedClabe(false), 2000)
    }
  }

  const formasPagoDisponibles = useMemo(() => {
    const lista = []
    if (metodosPagoConfig.efectivo !== false) {
      lista.push({ id: 'cash', label: 'Efectivo', emoji: '💵' })
    }
    if (metodosPagoConfig.tarjeta !== false) {
      lista.push({ id: 'card', label: 'Terminal', emoji: '💳' })
    }
    if (metodosPagoConfig.transferencia === true) {
      lista.push({ id: 'transfer', label: 'Transferencia', emoji: '📲' })
    }
    if (lista.length === 0) {
      lista.push({ id: 'cash', label: 'Efectivo', emoji: '💵' })
    }
    return lista
  }, [metodosPagoConfig])

  // Ajustar forma de pago por defecto si la seleccionada no está disponible
  useEffect(() => {
    if ((cobroStep === 'cobro-junto' || cobroStep === 'cobro-separado') && formasPagoDisponibles.length > 0) {
      if (!formaPago || !formasPagoDisponibles.some(fp => fp.id === formaPago)) {
        setFormaPago(formasPagoDisponibles[0].id)
      }
    }
  }, [cobroStep, formasPagoDisponibles, formaPago])

  // --- TOAST NOTIFICATION ---
  const [toastMessage, setToastMessage] = useState(null)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 4000)
  }

  // --- CARGA DE DATOS DE API ---
  const cargarMesasConOrdenes = async () => {
    try {
      const resMesas = await getAllMesas()
      const mesasBackend = Array.isArray(resMesas.data)
        ? resMesas.data
        : resMesas.data?.mesas || []

      // Preservar estado local de mesas ocupadas
      setMesas(prev => mesasBackend.map(mesaBackend => {
        const mesaLocal = prev.find(m => m.id === mesaBackend.id)
        // Si la mesa ya está marcada como ocupada localmente, mantenerla así
        if (mesaLocal && mesaLocal.estado === 'ocupada') {
          return { ...mesaBackend, estado: 'ocupada', pedido: mesaLocal.pedido }
        }
        return mesaBackend
      }))
    } catch (error) {
      console.error('Error al cargar mesas:', error)
    } finally {
      setLoadingData(false)
    }
  }

  const cargarMesas = cargarMesasConOrdenes
  const fetchData = cargarMesasConOrdenes

  const cargarConfiguracionMetodos = () => {
    getConfiguracion().then(res => {
      const d = res?.data || {}
      const mp = d.metodos_pago || d.payment_methods || {}
      setMetodosPagoConfig({
        efectivo: d.acepta_efectivo !== undefined ? Boolean(d.acepta_efectivo) : (d.aceptaEfectivo !== undefined ? Boolean(d.aceptaEfectivo) : (mp.efectivo !== undefined ? Boolean(mp.efectivo) : (d.pago_efectivo !== undefined ? Boolean(d.pago_efectivo) : true))),
        tarjeta: d.acepta_tarjeta !== undefined ? Boolean(d.acepta_tarjeta) : (d.aceptaTarjeta !== undefined ? Boolean(d.aceptaTarjeta) : (mp.tarjeta !== undefined ? Boolean(mp.tarjeta) : (d.pago_tarjeta !== undefined ? Boolean(d.pago_tarjeta) : true))),
        transferencia: d.acepta_transferencia !== undefined ? Boolean(d.acepta_transferencia) : (d.aceptaTransferencia !== undefined ? Boolean(d.aceptaTransferencia) : (mp.transferencia !== undefined ? Boolean(mp.transferencia) : (d.pago_transferencia !== undefined ? Boolean(d.pago_transferencia) : false))),
        banco: d.banco_nombre ?? d.bancoNombre ?? mp.transferencia_banco ?? d.transferencia_banco ?? d.bank_name ?? '',
        clabe: d.banco_clabe ?? d.bancoClabe ?? mp.transferencia_clabe ?? d.transferencia_clabe ?? d.bank_clabe ?? '',
        titular: d.banco_titular ?? d.bancoTitular ?? mp.transferencia_titular ?? d.transferencia_titular ?? d.bank_account_holder ?? ''
      })
    }).catch((err) => {
      console.error('Error cargando configuración de métodos de pago en WaiterView:', err)
    })
  }

  useEffect(() => {
    cargarMesasConOrdenes()
    cargarConfiguracionMetodos()
    client.get('/pos/menu')
      .catch(() => client.get('/dishes'))
      .then(res => {
        const raw = res?.data?.dishes || res?.data?.data || res?.data
        if (Array.isArray(raw)) setMenuItems(raw)
        else if (Array.isArray(res?.data)) setMenuItems(res.data)
      }).catch(() => {})
  }, [])

  // --- WEBSOCKETS EN TIEMPO REAL & POLLING ACTIVO (DEFENSA DE INTERFAZ) ---
  useEffect(() => {
    // Polling recurrente de 8s como fallback seguro
    const interval = setInterval(() => {
      cargarMesasConOrdenes()
    }, 8000)

    // Suscripción WebSocket con Laravel Echo / Reverb
    let kitchenChannel = null
    let tablesChannel = null
    let ordersChannel = null

    try {
      kitchenChannel = echo.private('kitchen.orders')
      const handleRealtimeUpdate = () => {
        cargarMesasConOrdenes()
      }

      kitchenChannel
        .listen('OrderCreated', handleRealtimeUpdate)
        .listen('.OrderCreated', handleRealtimeUpdate)
        .listen('NewOrderCreated', handleRealtimeUpdate)
        .listen('.NewOrderCreated', handleRealtimeUpdate)
        .listen('App\\Events\\OrderCreated', handleRealtimeUpdate)
        .listen('.App\\Events\\OrderCreated', handleRealtimeUpdate)
        .listen('OrderStatusUpdated', handleRealtimeUpdate)
        .listen('.OrderStatusUpdated', handleRealtimeUpdate)

      tablesChannel = echo.channel('tables')
      tablesChannel
        .listen('TableStatusUpdated', handleRealtimeUpdate)
        .listen('.TableStatusUpdated', handleRealtimeUpdate)
        .listen('TableUpdated', handleRealtimeUpdate)
        .listen('.TableUpdated', handleRealtimeUpdate)
        .listen('MesaActualizada', handleRealtimeUpdate)
        .listen('.MesaActualizada', handleRealtimeUpdate)

      ordersChannel = echo.channel('orders')
      ordersChannel
        .listen('OrderPaid', handleRealtimeUpdate)
        .listen('.OrderPaid', handleRealtimeUpdate)
        .listen('OrderStatusUpdated', handleRealtimeUpdate)
        .listen('.OrderStatusUpdated', handleRealtimeUpdate)
    } catch (err) {
      console.warn('Echo/WebSockets no disponible o no conectado:', err)
    }

    return () => {
      clearInterval(interval)
      try {
        if (kitchenChannel) {
          kitchenChannel.stopListening('OrderCreated')
          kitchenChannel.stopListening('.OrderCreated')
          kitchenChannel.stopListening('NewOrderCreated')
          kitchenChannel.stopListening('.NewOrderCreated')
          kitchenChannel.stopListening('App\\Events\\OrderCreated')
          kitchenChannel.stopListening('.App\\Events\\OrderCreated')
          kitchenChannel.stopListening('OrderStatusUpdated')
          kitchenChannel.stopListening('.OrderStatusUpdated')
          echo.leave('kitchen.orders')
        }
        if (tablesChannel) {
          tablesChannel.stopListening('TableStatusUpdated')
          tablesChannel.stopListening('.TableStatusUpdated')
          tablesChannel.stopListening('TableUpdated')
          tablesChannel.stopListening('.TableUpdated')
          tablesChannel.stopListening('MesaActualizada')
          tablesChannel.stopListening('.MesaActualizada')
          echo.leaveChannel('tables')
        }
        if (ordersChannel) {
          ordersChannel.stopListening('OrderPaid')
          ordersChannel.stopListening('.OrderPaid')
          ordersChannel.stopListening('OrderStatusUpdated')
          ordersChannel.stopListening('.OrderStatusUpdated')
          echo.leaveChannel('orders')
        }
      } catch (e) {}
    }
  }, [])

  // --- RELOJ EN TIEMPO REAL ---
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // --- LOGOUT ---
  const handleLogout = () => {
    logoutUser()
    navigate('/login')
  }

  // --- TOTAL DE ORDEN ---
  const totalOrden = orderItems.reduce((sum, item) => {
    const extrasTotal = (item.selectedExtras || []).reduce((s, e) => s + (Number(e.price || e.precio) || 0), 0)
    return sum + (Number(item.precio || item.price || 0) + extrasTotal) * item.quantity
  }, 0)

  // --- ABRIR / CERRAR MODAL ORDEN (VALIDACIÓN ESTRICTA & ANTI-DOBLE CLIC) ---
  const handleOpenOrder = (mesa) => {
    // Si no está estrictamente libre, redirigir a ver orden / cobrar
    if (mesa.estado !== 'libre') {
      abrirDetalleMesa(mesa)
      return
    }
    if (abriendoMesaId === mesa.id || enviandoOrden) return

    setAbriendoMesaId(mesa.id)
    setSelectedMesa(mesa)
    setOrderItems([])
    setSearchTerm('')
    setCategoriaActiva('Todos')
    setOrdenStep('catalogo')
    setModalClosing(false)
    setEditandoUid(null)
    setIsDrawerOpen(true)

    setTimeout(() => {
      setAbriendoMesaId(null)
    }, 400)
  }

  const regresarAlCatalogo = () => {
    setOrdenStep('catalogo')
  }

  const cerrarModal = () => {
    setIsDrawerOpen(false)
    setBottomSheetOpen(false)
    setModalClosing(false)
    setSheetClosing(false)
    setEditandoUid(null)
    setOrdenStep('catalogo')
  }

  const cerrarModalAnimado = () => {
    setModalClosing(true)
    setTimeout(() => {
      setModalClosing(false)
      cerrarModal()
    }, 320)
  }

  const cerrarSheet = () => {
    setSheetClosing(true)
    setExtrasDropdownOpen(false)
    setEditandoUid(null)
    setTimeout(() => {
      setSheetClosing(false)
      setBottomSheetOpen(false)
    }, 320)
  }

  const abrirBottomSheet = (platillo) => {
    if (platillo?.is_sold_out) return
    setPlatilloSeleccionado(platillo)
    setSheetCantidad(1)
    setSheetExtras([])
    setSheetNota('')
    setEditandoUid(null)
    setExtrasDropdownOpen(false)
    setSheetClosing(false)
    setBottomSheetOpen(true)
  }

  const editarItem = (item) => {
    const platilloOriginal = menuItems.find(p => p.id === item.id)
    if (!platilloOriginal) return
    setPlatilloSeleccionado(platilloOriginal)
    setSheetCantidad(item.quantity)
    setSheetExtras(item.selectedExtras || [])
    setSheetNota(item.notes || '')
    setEditandoUid(item.uid)
    setExtrasDropdownOpen(false)
    setSheetClosing(false)
    setBottomSheetOpen(true)
  }

  const agregarDesdeSheet = () => {
    if (!platilloSeleccionado) return
    const cantValida = Math.min(50, Math.max(1, Number(sheetCantidad) || 1))
    const nuevoItem = {
      uid: editandoUid || (Date.now() + Math.random()),
      id: platilloSeleccionado.id,
      nombre: platilloSeleccionado.name,
      precio: platilloSeleccionado.price,
      quantity: cantValida,
      selectedExtras: sheetExtras,
      notes: (sheetNota || '').trim(),
    }

    if (editandoUid) {
      setOrderItems(prev => prev.map(i =>
        i.uid === editandoUid ? nuevoItem : i
      ))
      setEditandoUid(null)
    } else {
      setOrderItems(prev => [...prev, nuevoItem])
    }

    cerrarSheet()
  }

  // --- AGREGAR RÁPIDO DESDE CATÁLOGO (ESTADO LOCAL EN MEMORIA SIN AXIOS) ---
  const handleQuickAddDish = (e, platillo) => {
    e.stopPropagation()
    if (platillo?.is_sold_out) return
    // Si el platillo tiene extras configurables, abrimos el sheet
    if (platillo.extras && platillo.extras.length > 0) {
      abrirBottomSheet(platillo)
      return
    }
    // Si no tiene extras, incrementamos directamente en el carrito local en memoria
    setOrderItems(prev => {
      const existingIndex = prev.findIndex(
        i => i.id === platillo.id && (!i.selectedExtras || i.selectedExtras.length === 0) && !i.notes
      )
      if (existingIndex >= 0) {
        const updated = [...prev]
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1
        }
        return updated
      }
      return [
        ...prev,
        {
          uid: Date.now() + Math.random(),
          id: platillo.id,
          nombre: platillo.name,
          precio: platillo.price,
          quantity: 1,
          selectedExtras: [],
          notes: '',
        }
      ]
    })
  }

  // --- CONFIRMAR ORDEN AL BACKEND (CON PROTECCIÓN ANTI-DOBLE CLIC) ---
  const handleConfirmOrder = async () => {
    if (enviandoOrden || orderItems.length === 0) return
    setEnviandoOrden(true)

    const body = {
      modality:       'local',
      payment_method: 'cash',
      table_number:   selectedMesa ? String(selectedMesa.numero) : null,
      notes:          null,
      items: orderItems.map(item => ({
        dish_id:  item.id,
        quantity: item.quantity,
        notes:    item.notes || null,
        extras:   (item.selectedExtras || []).map(e => (typeof e === 'object' && e?.id ? e.id : e)),
      })),
    }

    try {
      const response = await client.post('/orders', body)
      const nuevaOrden = response?.data?.order || response?.data?.pedido || response?.data || {}
      showToast('✓ Orden enviada a cocina correctamente')

      // Marcar la mesa como ocupada localmente
      setMesas(prev => prev.map(m =>
        m.id === selectedMesa?.id
          ? { ...m, estado: 'ocupada', pedido: { id: nuevaOrden.id, total: totalOrden, items: orderItems } }
          : m
      ))

      // Limpiar orden
      setOrderItems([])
      setOrdenStep('catalogo')
      // Cerrar modal con animación
      cerrarModalAnimado()
    } catch (error) {
      console.error('Error al confirmar orden:', error?.response?.data || error)
      alert('Error al guardar la orden. Revisa la consola.')
    } finally {
      setEnviandoOrden(false)
    }
  }

  // --- DETALLE MESA OCUPADA & COBRO ---
  const abrirDetalleMesa = async (mesa) => {
    setMesaDetalle(mesa)
    setCobroStep('cuenta')
    setFormaPago(null)
    setPlatillosSeleccionados([])
    setPlatillosCobrados([])
    // Cargar órdenes activas de esta mesa
    try {
      const numMesa = mesa.numero ?? mesa.numero_mesa ?? mesa.table_number ?? mesa.number ?? ''
      const res = await client.get('/waiter/orders', {
        params: {
          table_number: String(numMesa),
          status: 'pending,preparing,ready'
        }
      })
      const ordenes = Array.isArray(res.data)
        ? res.data
        : res.data?.pedidos || []
      setOrdenesDetalle(ordenes)
    } catch (e) {
      setOrdenesDetalle([])
    }
    setMesaDetalleOpen(true)
  }

  const platillosUnificados = ordenesDetalle.flatMap(orden => {
    const items = Array.isArray(orden.items)
      ? orden.items
      : []
    return items.map(item => {
      const basePrice = parseFloat(item.price ?? item.precio ?? 0)
      const extrasPrice = (item.extras || [])
        .reduce((s, e) => s + parseFloat(e.price || 0), 0)
      return {
        uid:      `${orden.id}-${item.id}`,
        orden_id: orden.id,
        name:     item.name || item.nombre || '',
        quantity: item.quantity || item.cantidad || 1,
        price:    basePrice + extrasPrice,
        extras:   item.extras || [],
        notes:    item.notes || item.nota || '',
      }
    })
  })

  const totalCuenta = platillosUnificados.reduce(
    (sum, p) => sum + p.price * p.quantity, 0
  )

  const totalSeleccionado = platillosUnificados
    .filter(p => platillosSeleccionados.includes(p.uid))
    .reduce((sum, p) => sum + p.price * p.quantity, 0)

  const cobrarTodo = async () => {
    if (!formaPago) return
    setCargandoCobro(true)
    try {
      await Promise.all(ordenesDetalle.map(orden =>
        client.patch(`/waiter/orders/${orden.id}/status`, { status: 'completed' })
          .then(() => client.patch(`/waiter/orders/${orden.id}/payment`, {
            payment_method: formaPago,
            payment_status: 'paid',
          }))
      ))
      // Liberar mesa localmente
      setMesas(prev => prev.map(m =>
        m.id === mesaDetalle?.id
          ? { ...m, estado: 'libre', pedido: null }
          : m
      ))
      setMesaDetalleOpen(false)
      setPlatillosCobrados([])
      setPlatillosSeleccionados([])
      setFormaPago(null)
      setCobroStep('cuenta')
      showToast('✓ Cuenta cobrada — mesa liberada')
    } catch (e) {
      alert('Error al procesar el cobro')
    } finally {
      setCargandoCobro(false)
    }
  }

  // --- MARCAR COBRADA ---
  const handleMarkPaid = async (mesa) => {
    try {
      if (mesa.pedido?.id) {
        await client.post(`/orders/${mesa.pedido.id}/pay`, { payment_method: 'cash' }).catch(() => {})
      }
      setMesas(prev => prev.map(m => {
        if (m.id === mesa.id) {
          return { ...m, estado: 'libre', pedido: null, total: 0 }
        }
        return m
      }))
      showToast(`✓ Mesa ${mesa.numero} marcada como cobrada`)
    } catch (e) {
      showToast(`✓ Mesa ${mesa.numero} liberada`)
    }
  }

  // --- CÁLCULO DE MÉTRICAS ---
  const countOcupadas = mesas.filter(m => m.estado === 'ocupada' || m.estado === 'esperando_cocina').length
  const countActivas = mesas.filter(m => m.estado === 'ocupada' || m.estado === 'esperando_cocina' || m.pedido).length
  const countPorCobrar = mesas.filter(m => m.estado === 'lista_cobrar' || m.estado === 'por_cobrar').length

  // --- LISTA DE ÁREAS ---
  const areasDisponibles = ['todas', ...Array.from(new Set(mesas.map(m => m.area).filter(Boolean)))]

  // --- MESAS FILTRADAS ---
  const mesasFiltradas = areaActiva === 'todas'
    ? mesas
    : mesas.filter(m => (m.area || '').toLowerCase() === areaActiva.toLowerCase())

  // --- PLATILLOS FILTRADOS EN CATÁLOGO CON DEBOUNCE Y MEMOIZACIÓN ---
  const categoriasPlatillos = useMemo(() => [
    ...new Set(
      (menuItems || [])
        .map(p => p.category_name)
        .filter(Boolean)
    )
  ], [menuItems])

  const platillosFiltrados = useMemo(() => {
    const term = (debouncedSearchTerm || '').trim().toLowerCase()
    return (menuItems || []).filter(p => {
      const coincideCategoria = categoriaActiva === 'Todos' || p.category_name === categoriaActiva
      if (!term) return coincideCategoria
      const matchName = (p.name || '').toLowerCase().includes(term)
      const matchCat = (p.category_name || '').toLowerCase().includes(term)
      return coincideCategoria && (matchName || matchCat)
    })
  }, [menuItems, categoriaActiva, debouncedSearchTerm])

  // Colores por estado de mesa
  const mesaEstadoColor = {
    libre:            '#10b981',
    ocupada:          '#f59e0b',
    esperando_cocina: '#f59e0b',
    por_cobrar:       '#3b82f6',
    lista_cobrar:     '#3b82f6',
    inactiva:         '#6b7280',
  }

  // Inicial del mesero
  const userName = user?.name || user?.nombre || user?.username || 'Mesero'
  const userInitial = userName.charAt(0).toUpperCase()

  const sheetStyle = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    margin: '0 auto',
    width: '100%',
    maxWidth: '600px',
    background: bgCard,
    color: textColor,
    borderTop: `1px solid ${borderSubtle}`,
    borderRadius: '24px 24px 0 0',
    zIndex: 61,
    maxHeight: '80vh',
    overflowY: 'auto',
    padding: '0 20px 32px',
    boxShadow: '0 -8px 40px rgba(0,0,0,0.25)',
    animation: sheetClosing
      ? 'slideDown 0.32s cubic-bezier(0.32, 0.72, 0, 1) forwards'
      : 'slideUp 0.38s cubic-bezier(0.32, 0.72, 0, 1) forwards',
  }

  return (
    <div 
      className="flex flex-col select-none font-sans w-full max-w-[100vw]"
      style={{
        height: '100vh',
        background: 'var(--theme-bg)',
        color: 'var(--theme-text)',
        overflow: 'hidden'
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes slideDown {
          from { transform: translateY(0); }
          to   { transform: translateY(100%); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes scaleDown {
          from { opacity: 1; transform: scale(1); }
          to   { opacity: 0; transform: scale(0.96); }
        }
      `}</style>
      {/* 1. HEADER (Fijo arriba) */}
      <header 
        className="h-16 flex items-center justify-between px-4 sm:px-8 max-md:px-2 max-md:gap-1 shrink-0 sticky top-0 z-40 backdrop-blur-md" 
        style={{ 
          backgroundColor: 'var(--theme-primary, #1e40af)', 
          borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: isLight ? '0 1px 3px 0 rgba(0, 0, 0, 0.05)' : 'none'
        }}
      >
        {/* Lado izquierdo: Establecimiento / Logo + Avatar y Rol Mesero en Tono 1 */}
        <div className="flex items-center gap-2.5 sm:gap-3 max-md:gap-1.5 relative z-10 min-w-0">
          {/* Contenedor Nombre del Establecimiento / Logo en Tono 1 */}
          <div 
            className="flex items-center gap-2.5 max-md:gap-1.5 px-3 max-md:px-2 py-1.5 rounded-xl shadow-xs min-w-0"
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
                className="w-7 h-7 max-md:w-5 max-md:h-5 object-contain rounded-lg shrink-0 shadow-xs" 
              />
            ) : (
              <div 
                className="w-7 h-7 max-md:w-5 max-md:h-5 rounded-lg flex items-center justify-center font-black text-xs shrink-0 shadow-xs"
                style={{ 
                  backgroundColor: colorPrimario, 
                  color: primaryBtnText || '#ffffff' 
                }}
              >
                {(restaurantName || 'R')[0].toUpperCase()}
              </div>
            )}

            <span 
              className="font-bold text-xs sm:text-sm max-md:text-[10px] tracking-wider uppercase truncate max-w-[120px] sm:max-w-xs max-md:max-w-[70px]"
              style={{ color: textColor }}
              title={restaurantName || 'Restaurante'}
            >
              {restaurantName || 'Restaurante'}
            </span>
          </div>

          {/* Contenedor Avatar + Nombre + Rol Mesero en Tono 1 */}
          <div 
            className="flex items-center gap-2 max-md:gap-1.5 px-3 max-md:px-2 py-1.5 rounded-xl shadow-xs text-xs font-bold min-w-0"
            style={{ 
              backgroundColor: bgCard,
              border: `1px solid ${borderSubtle}`,
              color: textColor
            }}
          >
            <div 
              className="w-6 h-6 max-md:w-5 max-md:h-5 rounded-full flex items-center justify-center font-bold text-xs max-md:text-[10px] text-white shrink-0 shadow-xs"
              style={{ backgroundColor: colorPrimario }}
            >
              {userInitial}
            </div>
            <span className="font-semibold text-xs max-md:text-[10px] truncate max-w-[100px] max-md:max-w-[60px] sm:max-w-none" style={{ color: textColor }}>
              {userName}
            </span>
            <span 
              className="px-2 max-md:px-1.5 py-0.5 rounded-full text-[10px] max-md:text-[8px] font-bold uppercase tracking-wider shrink-0"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)',
                color: colorPrimario,
                border: `1px solid color-mix(in srgb, var(--theme-primary) 25%, transparent)`
              }}
            >
              Mesero
            </span>
          </div>
        </div>

        {/* Lado derecho: Reloj + Botón logout en Tono 1 */}
        <div className="flex items-center gap-2.5 sm:gap-3 max-md:gap-1.5 relative z-10 shrink-0">
          {/* Digital Clock en Tono 1 */}
          <div 
            className="flex items-center gap-2 max-md:gap-1 px-3.5 max-md:px-2 py-1.5 rounded-xl text-xs max-md:text-[10px] font-mono font-bold shadow-xs" 
            style={{ 
              backgroundColor: bgCard, 
              color: textColor, 
              border: `1px solid ${borderSubtle}` 
            }}
          >
            <Clock size={14} className="text-amber-500 shrink-0 max-md:w-3 max-md:h-3" />
            <span className="tracking-wider">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          {/* Logout Button en Tono 1 con hover interactivo */}
          <button
            onClick={handleLogout}
            onMouseEnter={() => setIsLogoutHovered(true)}
            onMouseLeave={() => setIsLogoutHovered(false)}
            style={{ 
              backgroundColor: isLogoutHovered ? '#e11d48' : bgCard,
              border: isLogoutHovered ? '1px solid #e11d48' : `1px solid ${borderSubtle}`,
              color: isLogoutHovered ? '#FFFFFF' : textColor,
              boxShadow: isLogoutHovered ? '0 4px 12px rgba(225, 29, 72, 0.3)' : undefined
            }}
            className="flex items-center gap-1.5 max-md:gap-1 px-3.5 max-md:px-2 py-1.5 rounded-xl text-xs max-md:text-[10px] font-bold cursor-pointer transition-all duration-200 shadow-xs"
            title="Cerrar Sesión"
          >
            <LogOut size={14} className="max-md:w-3 max-md:h-3" style={{ color: isLogoutHovered ? '#FFFFFF' : textColor }} />
            <span className="max-md:hidden">Salir</span>
          </button>
        </div>
      </header>

      {/* 2. BARRA DE MÉTRICAS (Debajo del header) */}
      <section
        className="flex flex-wrap items-center justify-center sm:justify-around gap-4 max-md:gap-2 max-md:p-3 bg-white p-4 shadow-sm w-full shrink-0 border-b border-slate-100 dark:border-white/5"
        style={{
          borderColor: borderSubtle,
          backgroundColor: bgCard,
        }}
      >
        <div className="flex flex-col items-center text-center gap-0.5 min-w-[100px] max-md:min-w-[80px]">
          <div className="text-lg sm:text-xl font-black leading-tight" style={{ color: colorPrimario }}>
            {countOcupadas}
          </div>
          <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider" style={{ color: textMuted }}>
            Mesas ocupadas
          </div>
        </div>

        <div className="flex flex-col items-center text-center gap-0.5 min-w-[100px] max-md:min-w-[80px]">
          <div className="text-lg sm:text-xl font-black leading-tight" style={{ color: colorPrimario }}>
            {countActivas}
          </div>
          <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider" style={{ color: textMuted }}>
            Órdenes activas
          </div>
        </div>

        <div className="flex flex-col items-center text-center gap-0.5 min-w-[100px] max-md:min-w-[80px]">
          <div className="text-lg sm:text-xl font-black leading-tight" style={{ color: colorPrimario }}>
            {countPorCobrar}
          </div>
          <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider" style={{ color: textMuted }}>
            Por cobrar
          </div>
        </div>
      </section>

      {/* CONTENEDOR PRINCIPAL SCROLLABLE */}
      <div className="p-4 md:p-6 lg:p-8 max-md:p-3 w-full flex-1 overflow-y-auto flex flex-col">
        
        {/* 3. FILTROS DE ÁREA */}
        <section className="flex flex-wrap items-center gap-2 max-md:gap-1.5 mb-6 max-md:mb-4 w-full shrink-0">
          {areasDisponibles.map((area) => {
            const isActive = areaActiva.toLowerCase() === area.toLowerCase()
            const label = area === 'todas' ? 'Todas' : area
            const count = area === 'todas'
              ? mesas.length
              : mesas.filter(m => (m.area || '').toLowerCase() === area.toLowerCase()).length

            return (
              <button
                key={area}
                onClick={() => setAreaActiva(area.toLowerCase())}
                style={isActive ? {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: colorPrimario,
                  color: primaryBtnText || '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '7px 16px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                } : {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: `color-mix(in srgb, ${colorPrimario} 14%, #ffffff)`,
                  color: colorPrimario,
                  border: `1px solid color-mix(in srgb, ${colorPrimario} 28%, #ffffff)`,
                  borderRadius: '12px',
                  padding: '7px 16px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = `color-mix(in srgb, ${colorPrimario} 22%, #ffffff)`
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = `color-mix(in srgb, ${colorPrimario} 14%, #ffffff)`
                }}
                className="max-md:px-3 max-md:py-1.5 max-md:text-[11px] max-md:rounded-lg"
              >
                {label}
                <span 
                  style={isActive ? {
                    background: 'rgba(255,255,255,0.25)',
                    color: primaryBtnText || '#ffffff',
                    borderRadius: '8px',
                    padding: '1px 7px',
                    fontSize: '11px',
                    fontWeight: 700,
                    minWidth: '20px',
                    textAlign: 'center',
                  } : {
                    background: `color-mix(in srgb, ${colorPrimario} 24%, #ffffff)`,
                    color: colorPrimario,
                    borderRadius: '8px',
                    padding: '1px 7px',
                    fontSize: '11px',
                    fontWeight: 700,
                    minWidth: '20px',
                    textAlign: 'center',
                  }}
                  className="max-md:text-[9px] max-md:px-1.5 max-md:py-0.5 max-md:min-w-[16px]"
                >
                  {count}
                </span>
              </button>
            )
          })}
        </section>

        {/* 4. GRID DE MESAS */}
        <main
          className="grid gap-4 md:gap-6 max-md:gap-3 items-start w-full grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
        >
          {/* Estado vacío cuando no hay mesas */}
          {mesasFiltradas.length === 0 && (
            <div 
              style={{
                gridColumn: '1 / -1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4rem 2rem',
                color: 'var(--theme-text-muted)',
                textAlign: 'center'
              }}
            >
              <Utensils size={48} style={{ opacity: 0.2, marginBottom: '1rem', color: 'var(--theme-primary)' }} />
              <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem', color: 'var(--theme-text)' }}>
                No hay mesas disponibles
              </p>
              <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                Configura las áreas y mesas desde el panel de administración
              </p>
            </div>
          )}

          {/* Tarjetas de Mesa individuales: 2 Estados Visuales + Validación Condicional Estricta */}
          {mesasFiltradas.map((mesa) => {
            const isLibre = mesa.estado === 'libre'
            const isPorPagar = mesa.estado === 'por_pagar' || mesa.estado === 'por_cobrar' || mesa.estado === 'lista_cobrar' || mesa.estado === 'sucia'
            const isAbriendo = abriendoMesaId === mesa.id

            // --- ESTADO LIBRE (🟢 Gradiente Emerald Intenso -> White) ---
            if (isLibre) {
              return (
                <div
                  key={mesa.id}
                  onClick={() => !isAbriendo && !enviandoOrden && handleOpenOrder(mesa)}
                  className="bg-white rounded-2xl max-md:rounded-xl shadow-sm border border-emerald-100 flex flex-col overflow-hidden p-4 max-md:p-2.5 relative transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-pointer select-none bg-gradient-to-b from-emerald-100/60 via-emerald-50/30 to-white"
                >
                  <div className="flex justify-between items-start mb-6 max-md:mb-3 gap-2">
                    <div>
                      <h3 className="text-lg max-md:text-sm font-bold text-slate-800 leading-none">
                        Mesa {mesa.numero}
                      </h3>
                      <span className="text-xs max-md:text-[10px] text-slate-500 flex items-center gap-1 mt-1.5 max-md:mt-1">
                        <MapPin size={13} className="shrink-0 text-slate-400 max-md:w-3 max-md:h-3" />
                        <span className="truncate max-w-[80px]">{mesa.area || 'General'}</span>
                      </span>
                    </div>
                    <span className="bg-emerald-500 text-white text-[10px] max-md:text-[8px] font-bold px-2.5 py-1 max-md:px-2 max-md:py-0.5 rounded-full uppercase tracking-wide shrink-0">
                      Libre
                    </span>
                  </div>

                  <button
                    disabled={isAbriendo || enviandoOrden}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleOpenOrder(mesa)
                    }}
                    style={{
                      backgroundColor: colorPrimario || '#1d4ed8',
                      color: primaryBtnText || '#ffffff',
                    }}
                    className={`w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2.5 max-md:py-1.5 rounded-xl max-md:rounded-lg transition-colors text-sm max-md:text-xs mt-auto flex justify-center items-center gap-1.5 max-md:gap-1 shadow-xs select-none ${
                      isAbriendo || enviandoOrden
                        ? 'opacity-70 cursor-not-allowed'
                        : 'cursor-pointer active:scale-[0.98]'
                    }`}
                  >
                    {isAbriendo ? (
                      <>
                        <Loader2 size={14} className="animate-spin max-md:w-3 max-md:h-3" />
                        <span>Abriendo orden...</span>
                      </>
                    ) : (
                      <>
                        <Plus size={14} className="max-md:w-3 max-md:h-3" />
                        <span>+ Abrir orden</span>
                      </>
                    )}
                  </button>
                </div>
              )
            }

            // --- ESTADO OCUPADA / POR PAGAR (🟡 Gradiente Amber Intenso -> White) ---
            const activeDishes = mesa.pedido?.items || [
              { nombre: 'Comanda en curso', status: 'in_progress' }
            ]

            return (
              <div
                key={mesa.id}
                onClick={() => abrirDetalleMesa(mesa)}
                className="bg-white rounded-2xl max-md:rounded-xl shadow-sm border border-amber-200/80 flex flex-col overflow-hidden p-4 max-md:p-2.5 relative transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-pointer select-none bg-gradient-to-b from-amber-100/60 via-amber-50/30 to-white"
              >
                <div className="flex justify-between items-start mb-4 max-md:mb-2.5 gap-2">
                  <div>
                    <h3 className="text-lg max-md:text-sm font-bold text-slate-800 leading-none">
                      Mesa {mesa.numero}
                    </h3>
                    <span className="text-xs max-md:text-[10px] text-slate-500 flex items-center gap-1 mt-1.5 max-md:mt-1">
                      <MapPin size={13} className="shrink-0 text-slate-400 max-md:w-3 max-md:h-3" />
                      <span className="truncate max-w-[80px]">{mesa.area || 'General'}</span>
                    </span>
                  </div>
                  <span className={`text-white text-[10px] max-md:text-[8px] font-bold px-2.5 py-1 max-md:px-2 max-md:py-0.5 rounded-full uppercase tracking-wide shrink-0 ${
                    isPorPagar ? 'bg-amber-600' : 'bg-amber-500'
                  }`}>
                    {isPorPagar ? 'Por pagar' : 'Ocupada'}
                  </span>
                </div>

                {/* Lista de platillos del pedido activo */}
                <div className="mb-4 max-md:mb-3 flex flex-col gap-1.5 max-md:gap-1 flex-1">
                  {activeDishes.slice(0, 2).map((dish, i) => (
                    <div key={i} className="flex justify-between items-center text-xs max-md:text-[10px] gap-1">
                      <span className="truncate flex-1 min-w-0 font-medium text-slate-700">
                        {dish.nombre || dish.name || 'Platillo'}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] max-md:text-[8px] font-semibold ${
                          dish.status === 'ready'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {dish.status === 'ready' ? 'Listo' : 'Preparando'}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    abrirDetalleMesa(mesa)
                  }}
                  className={`w-full font-semibold py-2.5 max-md:py-1.5 rounded-xl max-md:rounded-lg shadow-xs transition-colors flex justify-center items-center gap-1.5 text-sm max-md:text-xs cursor-pointer active:scale-[0.98] mt-auto text-white ${
                    isPorPagar ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-500 hover:bg-amber-600'
                  }`}
                >
                  {isPorPagar ? (
                    <>
                      <Check size={14} className="max-md:w-3 max-md:h-3" />
                      <span>Cobrar</span>
                    </>
                  ) : (
                    <span>Ver orden</span>
                  )}
                </button>
              </div>
            )
          })}
        </main>
      </div>

      {/* 5. MODAL DE TOMA DE ORDEN (Mobile-first, 2 pasos + Bottom Sheet) */}
      {(isDrawerOpen || modalClosing) && (
        <div 
          onClick={cerrarModalAnimado}
          className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center pt-10 pb-0 max-md:px-3 max-md:pb-0"
          style={{
            backdropFilter: 'blur(4px)',
            animation: modalClosing
              ? 'fadeOut 0.28s ease forwards'
              : 'fadeIn 0.24s ease forwards',
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-t-3xl max-md:rounded-t-2xl rounded-b-none shadow-2xl w-full max-w-2xl h-[55vh] max-md:h-[70vh] flex flex-col overflow-hidden mb-0"
            style={{
              background: bgCard,
              animation: modalClosing
                ? 'slideDown 0.3s cubic-bezier(0.32, 0.72, 0, 1) forwards'
                : 'slideUp 0.35s cubic-bezier(0.32, 0.72, 0, 1) forwards',
            }}
          >
            {/* Renderiza PASO 1 o PASO 2 según ordenStep */}
            {ordenStep === 'catalogo' ? (
              <div className="flex flex-col flex-1 h-full overflow-hidden">
                {/* 3. CABECERA AZUL */}
                <div 
                  className="bg-blue-800 text-white p-4 md:p-5 max-md:p-3 shrink-0 flex justify-between items-center"
                  style={{
                    backgroundColor: colorPrimario,
                    color: primaryBtnText || '#ffffff',
                  }}
                >
                  <div>
                    <h2 className="font-bold text-lg md:text-xl max-md:text-base text-white leading-none">
                      Mesa {selectedMesa?.numero}
                    </h2>
                    <span className="text-xs md:text-sm max-md:text-[10px] text-blue-200 mt-0.5 inline-block" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                      {selectedMesa?.area || 'Área General'}
                    </span>
                  </div>
                  <button 
                    onClick={cerrarModalAnimado} 
                    className="bg-blue-700 hover:bg-blue-600 bg-white/20 hover:bg-white/30 rounded-full w-8 h-8 max-md:w-6 max-md:h-6 flex items-center justify-center text-white transition-colors active:scale-95 cursor-pointer shrink-0"
                    title="Cerrar"
                  >
                    <X size={18} className="max-md:w-4 max-md:h-4" />
                  </button>
                </div>

                {/* 4. BUSCADOR Y FILTROS */}
                <div 
                  className="p-4 max-md:p-3 border-b border-slate-100 dark:border-white/5 shrink-0"
                  style={{
                    borderBottom: `1px solid ${borderSubtle}`,
                    backgroundColor: bgCard,
                  }}
                >
                  <input
                    type="text"
                    placeholder="Buscar platillo..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 p-3 max-md:p-2 max-md:px-3 rounded-xl max-md:rounded-lg mb-3 max-md:mb-2 outline-none focus:ring-2 focus:ring-blue-500 border border-slate-200/60 dark:border-white/10 text-slate-800 dark:text-slate-100 text-sm max-md:text-xs font-medium"
                    style={{
                      backgroundColor: bgSubcard,
                      borderColor: borderSubtle,
                      color: textColor,
                    }}
                  />
                  <div className="flex flex-wrap gap-2 max-md:gap-1.5">
                    {['Todos', ...categoriasPlatillos].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setCategoriaActiva(cat)}
                        className={`px-4 py-1.5 max-md:px-3 max-md:py-1 rounded-full text-sm max-md:text-xs font-medium shrink-0 transition-colors cursor-pointer ${
                          categoriaActiva === cat
                            ? 'bg-blue-800 text-white'
                            : 'bg-blue-50 text-blue-800 hover:bg-blue-100 dark:bg-slate-800 dark:text-blue-300'
                        }`}
                        style={{
                          background: categoriaActiva === cat
                            ? colorPrimario
                            : `color-mix(in srgb, ${colorPrimario} 14%, #ffffff)`,
                          color: categoriaActiva === cat
                            ? (primaryBtnText || '#ffffff')
                            : colorPrimario,
                          border: categoriaActiva === cat ? 'none' : `1px solid color-mix(in srgb, ${colorPrimario} 28%, #ffffff)`,
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. LISTA DE PLATILLOS (Área elástica con Scroll) */}
                <div className="flex-1 overflow-y-auto p-4 max-md:p-3 custom-scrollbar">
                  {platillosFiltrados.length === 0 ? (
                    <div className="p-8 max-md:p-4 text-center text-slate-400 text-sm max-md:text-xs">
                      No se encontraron platillos
                    </div>
                  ) : (
                    platillosFiltrados.map(platillo => (
                      <div
                        key={platillo.id}
                        onClick={() => !platillo.is_sold_out && abrirBottomSheet(platillo)}
                        className={`flex justify-between items-center py-3 max-md:py-2 border-b border-slate-50 dark:border-white/5 last:border-0 gap-3 transition-colors ${
                          platillo.is_sold_out ? 'opacity-50 select-none cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-800/40 rounded-lg px-2 -mx-2'
                        }`}
                        style={{ borderBottomColor: borderSubtle }}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 max-md:gap-1.5 mb-0.5">
                            <p className="font-bold text-slate-800 dark:text-slate-100 text-[15px] max-md:text-[13px] leading-tight" style={{ color: textColor }}>
                              {platillo.name}
                            </p>
                            {platillo.is_sold_out && (
                              <span className="text-[11px] max-md:text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 max-md:px-1 rounded uppercase tracking-wider">
                                Agotado
                              </span>
                            )}
                          </div>
                          <p className="text-xs max-md:text-[10px] text-slate-400 dark:text-slate-500 leading-tight" style={{ color: textMuted }}>
                            {platillo.category_name}
                          </p>
                          <p className="font-bold text-blue-800 dark:text-blue-400 mt-1 max-md:mt-0.5 text-sm max-md:text-xs" style={{ color: platillo.is_sold_out ? textMuted : colorPrimario }}>
                            ${platillo.price} MXN
                          </p>
                        </div>
                        {platillo.is_sold_out ? (
                          <span className="px-3 py-1.5 max-md:px-2 max-md:py-1 rounded-full bg-slate-100 text-slate-500 text-xs max-md:text-[10px] font-semibold border border-slate-200 cursor-not-allowed select-none">
                            Agotado
                          </span>
                        ) : (
                          <button
                            onClick={(e) => handleQuickAddDish(e, platillo)}
                            className="w-8 h-8 md:w-10 md:h-10 max-md:w-6 max-md:h-6 bg-blue-800 text-white rounded-full flex justify-center items-center font-bold shadow-sm hover:bg-blue-700 transition-colors shrink-0 cursor-pointer"
                            style={{
                              backgroundColor: colorPrimario,
                              color: primaryBtnText || '#ffffff'
                            }}
                            title="Agregar rápido a la orden"
                          >
                            +
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* 6. PIE DEL MODAL (Ver Orden) */}
                <div 
                  className="p-4 pb-6 md:p-5 max-md:p-3 max-md:pb-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-white/10 shrink-0 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors"
                  style={{
                    backgroundColor: bgSubcard,
                    borderTop: `1px solid ${borderSubtle}`,
                  }}
                >
                  <button
                    onClick={() => orderItems.length > 0 && setOrdenStep('resumen')}
                    disabled={orderItems.length === 0}
                    className={`w-full p-3.5 max-md:p-2.5 rounded-xl font-bold text-sm max-md:text-xs flex justify-between items-center transition-all ${
                      orderItems.length === 0
                        ? 'bg-slate-200/60 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20 active:scale-[0.99] cursor-pointer'
                    }`}
                  >
                    <span>Ver orden</span>
                    <span className={orderItems.length === 0 ? 'text-slate-400 font-bold max-md:text-xs' : 'bg-black/20 px-2.5 py-0.5 rounded-lg text-xs max-md:text-[10px]'}>
                      {orderItems.reduce((acc, curr) => acc + (curr.quantity || 1), 0)} items - ${totalOrden} MXN
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col flex-1 overflow-hidden">
                {/* 3. CABECERA (Azul) */}
                <div 
                  className="bg-blue-800 text-white p-4 max-md:p-3 shrink-0 flex items-center gap-3 max-md:gap-2"
                  style={{
                    backgroundColor: colorPrimario,
                    color: primaryBtnText || '#ffffff',
                  }}
                >
                  <button
                    onClick={regresarAlCatalogo}
                    className="w-8 h-8 max-md:w-6 max-md:h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white shrink-0 transition-colors active:scale-95 cursor-pointer"
                    title="Regresar"
                  >
                    <ChevronDown size={18} className="max-md:w-4 max-md:h-4" style={{ transform: 'rotate(90deg)' }} />
                  </button>
                  <div>
                    <h2 className="font-bold text-lg md:text-xl max-md:text-base text-white leading-none">
                      Mesa {selectedMesa?.numero}
                    </h2>
                    <span className="text-xs md:text-sm max-md:text-[10px] text-blue-200 mt-0.5 inline-block" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                      {orderItems.length} {orderItems.length === 1 ? 'platillo' : 'platillos'} en la orden
                    </span>
                  </div>
                </div>

                {/* 4. ÁREA DE SCROLL INTERNO (Lista de Platillos) */}
                <div className="flex-1 overflow-y-auto p-4 max-md:p-3 space-y-3 max-md:space-y-2 custom-scrollbar bg-slate-50 dark:bg-slate-900/50">
                  {orderItems.map((item) => (
                    <div
                      key={item.uid}
                      className="bg-white dark:bg-slate-800 p-3.5 md:p-4 max-md:p-2.5 rounded-xl border border-slate-200 dark:border-white/10 flex flex-col gap-3 max-md:gap-2 shadow-xs"
                      style={{
                        background: bgCard,
                        borderColor: borderSubtle,
                      }}
                    >
                      {/* Fila superior: nombre + precio + botón eliminar */}
                      <div className="flex justify-between items-center gap-2.5">
                        <span className="text-[15px] max-md:text-[13px] font-bold flex-1 leading-tight" style={{ color: textColor }}>
                          {item.nombre}
                        </span>
                        <div className="flex items-center gap-2 max-md:gap-1.5 shrink-0">
                          <span className="text-[15px] max-md:text-[13px] font-bold whitespace-nowrap" style={{ color: textColor }}>
                            ${(Number(item.precio || item.price || 0) + (item.selectedExtras?.reduce((s, e) => s + (Number(e.price || e.precio) || 0), 0) ?? 0)) * item.quantity} MXN
                          </span>
                          <button
                            onClick={() => setOrderItems(prev => prev.filter(i => i.uid !== item.uid))}
                            className="bg-red-100 dark:bg-red-950/40 text-red-500 border border-red-200 dark:border-red-800/40 rounded-lg w-7 h-7 max-md:w-6 max-md:h-6 flex items-center justify-center shrink-0 hover:bg-red-500 hover:text-white active:scale-95 transition-all cursor-pointer"
                            title="Eliminar platillo"
                          >
                            <X size={14} className="max-md:w-3 max-md:h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Fila de controles: cantidad + botón editar */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 max-md:gap-1.5">
                          <button
                            onClick={() => {
                              if (item.quantity === 1) {
                                setOrderItems(prev => prev.filter(i => i.uid !== item.uid))
                              } else {
                                setOrderItems(prev => prev.map(i =>
                                  i.uid === item.uid ? { ...i, quantity: i.quantity - 1 } : i
                                ))
                              }
                            }}
                            className="w-8 h-8 max-md:w-7 max-md:h-7 rounded-full border border-slate-200 dark:border-white/10 flex items-center justify-center text-lg max-md:text-base font-semibold hover:opacity-80 active:scale-95 transition-all cursor-pointer"
                            style={{
                              borderColor: borderSubtle,
                              background: bgSubcard,
                              color: textColor,
                            }}
                          >-</button>
                          <span className="text-base max-md:text-sm font-bold min-w-[20px] max-md:min-w-[16px] text-center" style={{ color: textColor }}>
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => setOrderItems(prev => prev.map(i =>
                              i.uid === item.uid ? { ...i, quantity: i.quantity + 1 } : i
                            ))}
                            className="w-8 h-8 max-md:w-7 max-md:h-7 rounded-full border-none flex items-center justify-center text-lg max-md:text-base font-semibold hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-xs"
                            style={{
                              background: colorPrimario,
                              color: primaryBtnText || '#ffffff',
                            }}
                          >+</button>
                        </div>

                        {/* Botón editar */}
                        <button
                          onClick={() => editarItem(item)}
                          className="flex items-center gap-1.5 px-3 py-1.5 max-md:px-2 max-md:py-1 rounded-lg text-xs max-md:text-[10px] font-semibold cursor-pointer hover:opacity-80 active:scale-95 transition-all"
                          style={{
                            border: `1px solid ${borderSubtle}`,
                            background: bgSubcard,
                            color: textMuted,
                          }}
                        >
                          <Pencil size={12} className="max-md:w-[10px] max-md:h-[10px]" />
                          Editar
                        </button>
                      </div>

                      {/* Extras y notas DEBAJO de los controles en Tono 1 (bgCard) */}
                      {(item.selectedExtras?.length > 0 || item.notes) && (
                        <div 
                          className="rounded-lg p-2.5 max-md:p-1.5 flex flex-col gap-1 max-md:gap-0 text-xs max-md:text-[10px]"
                          style={{
                            background: bgSubcard,
                            border: `1px solid ${borderSubtle}`,
                          }}
                        >
                          {item.selectedExtras?.length > 0 && (
                            <div className="font-semibold" style={{ color: colorPrimario }}>
                              + {item.selectedExtras.map(e => e.name || e.nombre).join(', ')}
                            </div>
                          )}
                          {item.notes && (
                            <div className="italic" style={{ color: textMuted }}>
                              📝 {item.notes}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* 5. PIE DEL MODAL (Total y Confirmar) */}
                <div 
                  className="bg-white dark:bg-slate-900 p-4 border-t border-slate-200 dark:border-white/10 shrink-0 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)]"
                  style={{
                    backgroundColor: bgCard,
                    borderColor: borderSubtle,
                  }}
                >
                  <div className="flex justify-between items-center mb-4 max-md:mb-2.5 font-bold text-lg md:text-xl max-md:text-base text-slate-800 dark:text-slate-100" style={{ color: textColor }}>
                    <span>TOTAL</span>
                    <span>${totalOrden} MXN</span>
                  </div>
                  <button
                    disabled={enviandoOrden || orderItems.length === 0}
                    onClick={handleConfirmOrder}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 md:py-4 max-md:py-2.5 rounded-xl transition-colors text-base md:text-lg max-md:text-sm cursor-pointer shadow-lg shadow-red-600/20 active:scale-[0.99] flex items-center justify-center gap-2 select-none"
                  >
                    {enviandoOrden ? (
                      <>
                        <Loader2 size={18} className="animate-spin max-md:w-4 max-md:h-4" />
                        <span>Enviando orden a cocina...</span>
                      </>
                    ) : (
                      <span>Confirmar orden</span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BOTTOM SHEET — Configurar platillo */}
      {(bottomSheetOpen || sheetClosing) && (
        <>
          {/* Overlay */}
          <div
            onClick={cerrarSheet}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              zIndex: 60,
              animation: sheetClosing
                ? 'fadeOut 0.32s ease forwards'
                : 'fadeIn 0.28s ease forwards',
            }}
          />

          {/* Sheet con mismo ancho que el modal */}
          <div style={sheetStyle} className="max-md:!w-[calc(100%-24px)] max-md:!bottom-0 max-md:!rounded-t-2xl max-md:!rounded-b-none max-md:!border-x max-md:!border-t max-md:!max-h-[75vh]">

            {/* Pastilla */}
            <div style={{
              width: '40px',
              height: '4px',
              background: borderSubtle,
              borderRadius: '999px',
              margin: '12px auto 20px',
            }} />

            {/* Nombre y precio */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                fontSize: '20px',
                fontWeight: 800,
                color: textColor,
              }}>
                {platilloSeleccionado?.name}
              </div>
              <div style={{
                fontSize: '16px',
                fontWeight: 700,
                color: colorPrimario,
                marginTop: '4px',
              }}>
                ${platilloSeleccionado?.price} MXN
              </div>
            </div>

            {/* Cantidad con validación estricta (Mín: 1, Máx: 50) */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                fontSize: '12px',
                fontWeight: 700,
                color: textMuted,
                marginBottom: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Cantidad
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button
                  type="button"
                  disabled={sheetCantidad <= 1}
                  onClick={() => setSheetCantidad(q => Math.max(1, q - 1))}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    border: `1px solid ${borderSubtle}`,
                    background: bgSubcard,
                    color: textColor,
                    fontSize: '22px',
                    fontWeight: 700,
                    cursor: sheetCantidad <= 1 ? 'not-allowed' : 'pointer',
                    opacity: sheetCantidad <= 1 ? 0.35 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: sheetCantidad <= 1 ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
                    userSelect: 'none'
                  }}
                  className={sheetCantidad > 1 ? "hover:brightness-105 active:scale-95 transition-all" : ""}
                >−</button>
                <span style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  color: textColor,
                  minWidth: '32px',
                  textAlign: 'center',
                  userSelect: 'none'
                }}>
                  {sheetCantidad}
                </span>
                <button
                  type="button"
                  disabled={sheetCantidad >= 50}
                  onClick={() => setSheetCantidad(q => Math.min(50, q + 1))}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    border: 'none',
                    background: colorPrimario,
                    color: primaryBtnText || '#ffffff',
                    fontSize: '22px',
                    fontWeight: 700,
                    cursor: sheetCantidad >= 50 ? 'not-allowed' : 'pointer',
                    opacity: sheetCantidad >= 50 ? 0.35 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: sheetCantidad >= 50 ? 'none' : '0 2px 8px rgba(0,0,0,0.15)',
                    userSelect: 'none'
                  }}
                  className={sheetCantidad < 50 ? "hover:brightness-110 active:scale-95 transition-all" : ""}
                >+</button>
              </div>
            </div>

            {/* Extras */}
            {platilloSeleccionado?.extras?.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  marginBottom: '10px',
                }}>
                  <span style={{
                    fontSize: '12px', fontWeight: 700,
                    color: textMuted,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    Extras
                  </span>
                  <span style={{
                    fontSize: '11px', fontWeight: 700,
                    background: `color-mix(in srgb, ${colorPrimario} 14%, #ffffff)`,
                    color: colorPrimario,
                    border: `1px solid color-mix(in srgb, ${colorPrimario} 28%, #ffffff)`,
                    borderRadius: '8px',
                    padding: '1px 7px',
                  }}>
                    {platilloSeleccionado?.extras?.length}
                  </span>
                </div>

                <div ref={extrasDropdownRef} style={{ position: 'relative' }}>
                  {/* Campo disparador del dropdown (Tono 2) */}
                  <div
                    onClick={() => setExtrasDropdownOpen(prev => !prev)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      borderRadius: extrasDropdownOpen ? '14px 14px 0 0' : '14px',
                      border: `1px solid ${borderSubtle}`,
                      background: bgSubcard,
                      color: textColor,
                      cursor: 'pointer',
                      userSelect: 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: 500, color: sheetExtras.length > 0 ? textColor : textMuted }}>
                      {sheetExtras.length === 0
                        ? 'Seleccionar extras...'
                        : sheetExtras.map(e => e.name).join(', ')
                      }
                    </span>
                    <ChevronDown
                      size={16}
                      style={{
                        color: textMuted,
                        transform: extrasDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.25s ease',
                        flexShrink: 0,
                      }}
                    />
                  </div>

                  {/* Lista desplegable pegada al campo con altura animada (Tono 1) */}
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: '100%',
                    zIndex: 20,
                    background: bgCard,
                    borderRadius: '0 0 14px 14px',
                    borderLeft: extrasDropdownOpen ? `1px solid ${borderSubtle}` : 'none',
                    borderRight: extrasDropdownOpen ? `1px solid ${borderSubtle}` : 'none',
                    borderBottom: extrasDropdownOpen ? `1px solid ${borderSubtle}` : 'none',
                    borderTop: extrasDropdownOpen ? `1px solid ${borderSubtle}` : 'none',
                    boxShadow: extrasDropdownOpen ? '0 12px 28px rgba(0,0,0,0.18)' : 'none',
                    overflow: 'hidden',
                    maxHeight: extrasDropdownOpen ? '300px' : '0px',
                    transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}>
                    {platilloSeleccionado.extras.map((extra, idx) => {
                      if (idx > 3) return null

                      const esElCuarto = idx === 3
                      const seleccionado = sheetExtras.some(e => e.id === extra.id)

                      return (
                        <div
                          key={extra.id}
                          onClick={() => {
                            if (esElCuarto) return
                            setSheetExtras(prev =>
                              seleccionado
                                ? prev.filter(e => e.id !== extra.id)
                                : [...prev, extra]
                            )
                          }}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '13px 16px',
                            borderTop: idx === 0 ? 'none' : `1px solid ${borderSubtle}`,
                            background: seleccionado
                              ? `color-mix(in srgb, ${colorPrimario} 12%, ${bgCard})`
                              : 'transparent',
                            cursor: esElCuarto ? 'default' : 'pointer',
                            transition: 'background 0.15s ease',
                            ...(esElCuarto ? {
                              opacity: 0.5,
                              maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
                              WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
                              pointerEvents: 'none',
                            } : {}),
                          }}
                          className={!esElCuarto && !seleccionado ? "hover:bg-black/5 dark:hover:bg-white/5" : ""}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {/* Checkbox visual */}
                            <div style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '5px',
                              border: seleccionado
                                ? `2px solid ${colorPrimario}`
                                : `2px solid ${borderSubtle}`,
                              background: seleccionado ? colorPrimario : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              transition: 'all 0.15s ease',
                            }}>
                              {seleccionado && (
                                <span style={{ color: primaryBtnText || '#ffffff', fontSize: '11px', fontWeight: 700 }}>✓</span>
                              )}
                            </div>
                            <span style={{
                              fontSize: '14px',
                              fontWeight: 600,
                              color: textColor,
                            }}>
                              {extra.name}
                            </span>
                          </div>
                          <span style={{
                            fontSize: '13px',
                            fontWeight: 700,
                            color: seleccionado ? colorPrimario : textMuted,
                          }}>
                            {extra.price > 0 ? `+$${extra.price}` : 'Sin costo'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Espacio reservado para extras seleccionados con altura fija para evitar saltos visuales */}
                <div style={{
                  minHeight: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '6px',
                  marginTop: '10px',
                  padding: '2px 0'
                }}>
                  {sheetExtras.length === 0 ? (
                    <span style={{ fontSize: '12px', color: textSubtle, fontStyle: 'italic' }}>
                      No has seleccionado ningún extra
                    </span>
                  ) : (
                    sheetExtras.map(extra => (
                      <span
                        key={extra.id}
                        onClick={() => setSheetExtras(prev => prev.filter(e => e.id !== extra.id))}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          background: `color-mix(in srgb, ${colorPrimario} 14%, #ffffff)`,
                          color: colorPrimario,
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: `1px solid color-mix(in srgb, ${colorPrimario} 28%, #ffffff)`,
                        }}
                        className="hover:opacity-80 transition-opacity"
                        title="Eliminar extra"
                      >
                        {extra.name}
                        <span style={{ fontSize: '14px', lineHeight: 1 }}>×</span>
                      </span>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Nota para cocina (Tono 2) con límite 150 caracteres y bloqueo Enter */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Nota para cocina
                </span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: sheetNota.length >= 140 ? '#ef4444' : textMuted,
                }}>
                  {sheetNota.length}/150
                </span>
              </div>
              <textarea
                placeholder="Ej: sin cebolla, término medio, alérgico a..."
                value={sheetNota}
                maxLength={150}
                onChange={e => setSheetNota(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                  }
                }}
                rows={3}
                className="input-subcard"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '14px',
                  border: `1px solid ${borderSubtle}`,
                  background: bgSubcard,
                  color: textColor,
                  fontSize: '14px',
                  fontWeight: 500,
                  resize: 'none',
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Botón agregar / guardar cambios con cálculo en tiempo real (Rojo) */}
            <button
              onClick={agregarDesdeSheet}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '14px',
                border: 'none',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)',
              }}
              className="hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer"
            >
              {editandoUid ? 'Guardar cambios' : 'Agregar'} · ${(Number(platilloSeleccionado?.price || platilloSeleccionado?.precio || 0) + sheetExtras.reduce((s, e) => s + (Number(e.price || e.precio) || 0), 0)) * sheetCantidad} MXN
            </button>
          </div>
        </>
      )}

      {/* MODAL DETALLE DE MESA OCUPADA & COBRO */}
      {mesaDetalleOpen && (
        <div 
          className="max-md:px-3 max-md:pb-0"
          style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
          zIndex: 50,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}>
          <div 
            className="max-md:!max-h-[75vh] max-md:!rounded-t-2xl max-md:!rounded-b-none"
            style={{
            background: 'var(--theme-surface)',
            borderRadius: '24px 24px 0 0',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
            animation: 'slideUp 0.38s cubic-bezier(0.32, 0.72, 0, 1) forwards',
          }}>

            {/* Pastilla */}
            <div style={{
              width: '40px', height: '4px',
              background: 'var(--theme-card)',
              borderRadius: '999px',
              margin: '12px auto 0', flexShrink: 0,
            }} />

            {/* Header */}
            <div 
              className="max-md:!p-3 max-md:!px-4"
              style={{
              padding: '12px 20px 12px',
              borderBottom: '1px solid var(--theme-card)',
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', flexShrink: 0,
            }}>
              <div>
                <div 
                  className="max-md:!text-base leading-tight"
                  style={{ fontSize: '18px', fontWeight: 700, color: 'var(--theme-text)' }}>
                  {cobroStep === 'cuenta' && `Mesa ${mesaDetalle?.numero} — Cuenta`}
                  {cobroStep === 'cobro-junto' && 'Cobrar todo junto'}
                  {cobroStep === 'cobro-separado' && 'Cobrar por separado'}
                </div>
                <div 
                  className="max-md:!text-[10px] leading-tight"
                  style={{ fontSize: '12px', color: 'var(--theme-text-muted)' }}>
                  {platillosUnificados.length} platillos · ${totalCuenta} MXN total
                </div>
              </div>
              <button
                onClick={() => {
                  setPlatillosCobrados([])
                  setPlatillosSeleccionados([])
                  setFormaPago(null)
                  setCobroStep('cuenta')
                  setMesaDetalleOpen(false)
                }}
                style={{
                  background: 'var(--theme-card)', border: 'none',
                  borderRadius: '50%', width: '36px', height: '36px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--theme-text-muted)',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* PASO: CUENTA */}
            {cobroStep === 'cuenta' && (
              <>
                {/* Lista de platillos */}
                <div 
                  className="max-md:!px-4 max-md:!py-2"
                  style={{ flex: 1, overflowY: 'auto', padding: '8px 20px' }}>
                  {platillosUnificados.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px', color: 'var(--theme-text-muted)' }}>
                      Cargando platillos...
                    </div>
                  ) : platillosUnificados.map(p => (
                    <div key={p.uid} 
                      className="max-md:!py-2"
                      style={{
                      padding: '12px 0',
                      borderBottom: '1px solid var(--theme-card)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--theme-text)' }}>
                          {p.name}
                        </div>
                        {p.extras?.length > 0 && (
                          <div style={{ fontSize: '12px', color: 'var(--theme-primary)' }}>
                            + {p.extras.map(e => e.name || e.nombre).join(', ')}
                          </div>
                        )}
                        {p.notes && (
                          <div style={{ fontSize: '12px', color: 'var(--theme-text-muted)', fontStyle: 'italic' }}>
                            📝 {p.notes}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                        <div style={{ fontSize: '13px', color: 'var(--theme-text-muted)' }}>
                          x{p.quantity}
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--theme-text)' }}>
                          ${p.price * p.quantity} MXN
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total y botones */}
                <div 
                  className="max-md:!p-3 max-md:!pb-5"
                  style={{ padding: '16px 20px 28px', borderTop: '1px solid var(--theme-card)', flexShrink: 0 }}>
                  <div 
                    className="max-md:!mb-2.5"
                    style={{
                    display: 'flex', justifyContent: 'space-between',
                    marginBottom: '16px',
                  }}>
                    <span style={{ fontSize: '16px', color: 'var(--theme-text-muted)' }}>Total</span>
                    <span 
                      className="max-md:!text-xl"
                      style={{ fontSize: '24px', fontWeight: 800, color: 'var(--theme-text)' }}>
                      ${totalCuenta} MXN
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => setCobroStep('cobro-separado')}
                      className="max-md:!p-2.5 max-md:!text-sm"
                      style={{
                        flex: 1, padding: '14px',
                        borderRadius: '14px',
                        border: '2px solid var(--theme-primary)',
                        background: 'transparent',
                        color: 'var(--theme-primary)',
                        fontSize: '15px', fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Por separado
                    </button>
                    <button
                      onClick={() => setCobroStep('cobro-junto')}
                      className="max-md:!p-2.5 max-md:!text-sm"
                      style={{
                        flex: 1, padding: '14px',
                        borderRadius: '14px', border: 'none',
                        background: 'var(--theme-primary)',
                        color: 'white',
                        fontSize: '15px', fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Cobrar todo
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setMesaDetalleOpen(false)
                      // Abrir modal de tomar orden para agregar más platillos
                      setSelectedMesa(mesaDetalle)
                      setOrderItems([])
                      setSearchTerm('')
                      setCategoriaActiva('Todos')
                      setOrdenStep('catalogo')
                      setModalClosing(false)
                      setEditandoUid(null)
                      setIsDrawerOpen(true)
                    }}
                    className="max-md:!p-2.5 max-md:!text-xs max-md:!mt-2"
                    style={{
                      width: '100%', marginTop: '10px',
                      padding: '12px', borderRadius: '14px',
                      border: '1px solid var(--theme-card)',
                      background: 'var(--theme-card)',
                      color: 'var(--theme-text-muted)',
                      fontSize: '14px', fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    + Agregar más platillos
                  </button>
                </div>
              </>
            )}

            {/* PASO: COBRAR TODO JUNTO */}
            {cobroStep === 'cobro-junto' && (
              <>
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                  <div style={{ fontSize: '14px', color: 'var(--theme-text-muted)', marginBottom: '16px' }}>
                    Selecciona la forma de pago
                  </div>
                  {formasPagoDisponibles.map(fp => (
                    <div
                      key={fp.id}
                      onClick={() => setFormaPago(fp.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '16px',
                        padding: '16px', borderRadius: '14px', marginBottom: '10px',
                        border: formaPago === fp.id
                          ? '2px solid var(--theme-primary)'
                          : '2px solid var(--theme-card)',
                        background: formaPago === fp.id
                          ? 'color-mix(in srgb, var(--theme-primary) 10%, var(--theme-surface))'
                          : 'var(--theme-card)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ fontSize: '28px' }}>{fp.emoji}</span>
                      <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--theme-text)' }}>
                        {fp.label}
                      </span>
                      {formaPago === fp.id && (
                        <span style={{
                          marginLeft: 'auto', color: 'var(--theme-primary)',
                          fontSize: '20px', fontWeight: 700,
                        }}>✓</span>
                      )}
                    </div>
                  ))}

                  {formaPago === 'card' && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      marginTop: '12px',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: '#fef3c7',
                      border: '1px solid #f59e0b',
                    }}>
                      <span style={{ fontSize: '18px', flexShrink: 0 }}>⚠️</span>
                      <div>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#92400e',
                          marginBottom: '2px',
                        }}>
                          Cobra en la terminal física primero
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#b45309',
                          lineHeight: '1.5',
                        }}>
                          Procesa el pago en la terminal antes de presionar
                          "Confirmar cobro". Solo confirma aquí cuando el
                          pago haya sido aprobado por la terminal.
                        </div>
                      </div>
                    </div>
                  )}

                  {formaPago === 'transfer' && (
                    <div style={{
                      marginTop: '12px',
                      padding: '16px',
                      borderRadius: '14px',
                      background: 'var(--theme-subcard-bg)',
                      border: '1px solid var(--theme-border-subtle)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '20px' }}>📲</span>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--theme-text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Datos de Transferencia (SPEI)
                          </span>
                        </div>
                        {metodosPagoConfig.clabe && (
                          <button
                            type="button"
                            onClick={() => handleCopyClabe(metodosPagoConfig.clabe)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '4px',
                              padding: '4px 8px', borderRadius: '8px',
                              fontSize: '11px', fontWeight: 600,
                              background: copiedClabe ? '#10b981' : 'var(--theme-card)',
                              color: copiedClabe ? '#ffffff' : 'var(--theme-text-muted)',
                              border: '1px solid var(--theme-border-subtle)',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {copiedClabe ? <Check size={12} /> : <Copy size={12} />}
                            {copiedClabe ? '¡Copiado!' : 'Copiar CLABE'}
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          background: 'var(--theme-surface)', padding: '8px 12px',
                          borderRadius: '10px', border: '1px solid var(--theme-border-subtle)'
                        }}>
                          <span style={{ fontSize: '11px', color: 'var(--theme-text-muted)', fontWeight: 600 }}>BANCO</span>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--theme-text)' }}>
                            {metodosPagoConfig.banco || 'No configurado'}
                          </span>
                        </div>

                        <div style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          background: 'var(--theme-surface)', padding: '8px 12px',
                          borderRadius: '10px', border: '1px solid var(--theme-border-subtle)'
                        }}>
                          <span style={{ fontSize: '11px', color: 'var(--theme-text-muted)', fontWeight: 600 }}>CLABE</span>
                          <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.08em', color: 'var(--theme-primary)' }}>
                            {metodosPagoConfig.clabe || 'No configurada'}
                          </span>
                        </div>

                        <div style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          background: 'var(--theme-surface)', padding: '8px 12px',
                          borderRadius: '10px', border: '1px solid var(--theme-border-subtle)'
                        }}>
                          <span style={{ fontSize: '11px', color: 'var(--theme-text-muted)', fontWeight: 600 }}>TITULAR</span>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--theme-text)' }}>
                            {metodosPagoConfig.titular || 'No configurado'}
                          </span>
                        </div>
                      </div>

                      <div style={{ fontSize: '11px', color: 'var(--theme-text-muted)', marginTop: '10px', textAlign: 'center', lineHeight: '1.4' }}>
                        Proporciona estos datos al cliente para que realice la transferencia y confirma al recibir el comprobante.
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ padding: '16px 20px 28px', borderTop: '1px solid var(--theme-card)', flexShrink: 0 }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', marginBottom: '16px',
                  }}>
                    <span style={{ fontSize: '16px', color: 'var(--theme-text-muted)' }}>Total a cobrar</span>
                    <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--theme-text)' }}>
                      ${totalCuenta} MXN
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => setCobroStep('cuenta')}
                      style={{
                        padding: '14px 20px', borderRadius: '14px',
                        border: '1px solid var(--theme-card)',
                        background: 'var(--theme-card)',
                        color: 'var(--theme-text-muted)',
                        fontSize: '15px', fontWeight: 500, cursor: 'pointer',
                      }}
                    >← Atrás</button>
                    <button
                      onClick={cobrarTodo}
                      disabled={!formaPago || cargandoCobro}
                      style={{
                        flex: 1, padding: '14px', borderRadius: '14px', border: 'none',
                        background: !formaPago ? 'var(--theme-card)' : '#10b981',
                        color: !formaPago ? 'var(--theme-text-muted)' : 'white',
                        fontSize: '15px', fontWeight: 700,
                        cursor: !formaPago ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {cargandoCobro ? 'Procesando...' : `Confirmar cobro · $${totalCuenta} MXN`}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* PASO: COBRAR POR SEPARADO */}
            {cobroStep === 'cobro-separado' && (
              <>
                <div style={{ padding: '12px 20px 4px', flexShrink: 0 }}>
                  <div style={{ fontSize: '13px', color: 'var(--theme-text-muted)' }}>
                    Selecciona los platillos que va a pagar este cliente
                  </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px' }}>
                  {[
                    ...platillosUnificados.filter(p => !platillosCobrados.includes(p.uid)),
                    ...platillosUnificados.filter(p => platillosCobrados.includes(p.uid)),
                  ].map(p => {
                    const cobrado = platillosCobrados.includes(p.uid)
                    const seleccionado = platillosSeleccionados.includes(p.uid)
                    return (
                      <div
                        key={p.uid}
                        onClick={() => {
                          if (cobrado) return  // no seleccionable si ya fue cobrado
                          setPlatillosSeleccionados(prev =>
                            seleccionado
                              ? prev.filter(id => id !== p.uid)
                              : [...prev, p.uid]
                          )
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '14px',
                          padding: '14px 0',
                          borderBottom: '1px solid var(--theme-card)',
                          cursor: cobrado ? 'default' : 'pointer',
                          opacity: cobrado ? 0.35 : 1,
                          transition: 'opacity 0.2s ease',
                        }}
                      >
                        {/* Checkbox */}
                        <div style={{
                          width: '22px', height: '22px', borderRadius: '6px',
                          border: cobrado
                            ? '2px solid var(--theme-card)'
                            : seleccionado
                              ? '2px solid var(--theme-primary)'
                              : '2px solid var(--theme-card)',
                          background: cobrado
                            ? 'var(--theme-card)'
                            : seleccionado
                              ? 'var(--theme-primary)'
                              : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, transition: 'all 0.15s ease',
                        }}>
                          {cobrado && (
                            <span style={{ color: 'var(--theme-text-muted)', fontSize: '13px' }}>✓</span>
                          )}
                          {!cobrado && seleccionado && (
                            <span style={{ color: 'white', fontSize: '13px', fontWeight: 700 }}>✓</span>
                          )}
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--theme-text)' }}>
                            {p.name}
                            {cobrado && (
                              <span style={{
                                marginLeft: '8px', fontSize: '11px', fontWeight: 600,
                                background: 'var(--theme-card)',
                                color: 'var(--theme-text-muted)',
                                borderRadius: '999px', padding: '2px 8px',
                              }}>
                                Pagado
                              </span>
                            )}
                          </div>
                          {p.extras?.length > 0 && (
                            <div style={{ fontSize: '12px', color: 'var(--theme-primary)' }}>
                              + {p.extras.map(e => e.name || e.nombre).join(', ')}
                            </div>
                          )}
                        </div>

                        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--theme-text)', flexShrink: 0 }}>
                          ${p.price * p.quantity} MXN
                        </div>
                      </div>
                    )
                  })}
                </div>
                {/* Forma de pago + confirmar */}
                <div style={{ padding: '12px 20px 28px', borderTop: '1px solid var(--theme-card)', flexShrink: 0 }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                    {formasPagoDisponibles.map(fp => (
                      <button
                        key={fp.id}
                        onClick={() => setFormaPago(fp.id)}
                        style={{
                          flex: 1, padding: '10px 6px', borderRadius: '12px',
                          border: formaPago === fp.id
                            ? '2px solid var(--theme-primary)'
                            : '2px solid var(--theme-card)',
                          background: formaPago === fp.id
                            ? 'color-mix(in srgb, var(--theme-primary) 10%, var(--theme-surface))'
                            : 'var(--theme-card)',
                          color: formaPago === fp.id ? 'var(--theme-primary)' : 'var(--theme-text-muted)',
                          fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', gap: '4px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span style={{ fontSize: '20px' }}>{fp.emoji}</span>
                        {fp.label}
                      </button>
                    ))}
                  </div>

                  {formaPago === 'card' && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      marginBottom: '14px',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: '#fef3c7',
                      border: '1px solid #f59e0b',
                    }}>
                      <span style={{ fontSize: '18px', flexShrink: 0 }}>⚠️</span>
                      <div>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#92400e',
                          marginBottom: '2px',
                        }}>
                          Cobra en la terminal física primero
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#b45309',
                          lineHeight: '1.5',
                        }}>
                          Procesa el pago en la terminal antes de presionar
                          "Confirmar cobro". Solo confirma aquí cuando el
                          pago haya sido aprobado por la terminal.
                        </div>
                      </div>
                    </div>
                  )}

                  {formaPago === 'transfer' && (
                    <div style={{
                      marginBottom: '14px',
                      padding: '14px',
                      borderRadius: '12px',
                      background: 'var(--theme-subcard-bg)',
                      border: '1px solid var(--theme-border-subtle)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '18px' }}>📲</span>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--theme-text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Datos de Transferencia (SPEI)
                          </span>
                        </div>
                        {metodosPagoConfig.clabe && (
                          <button
                            type="button"
                            onClick={() => handleCopyClabe(metodosPagoConfig.clabe)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '4px',
                              padding: '3px 7px', borderRadius: '6px',
                              fontSize: '10px', fontWeight: 600,
                              background: copiedClabe ? '#10b981' : 'var(--theme-card)',
                              color: copiedClabe ? '#ffffff' : 'var(--theme-text-muted)',
                              border: '1px solid var(--theme-border-subtle)',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {copiedClabe ? <Check size={11} /> : <Copy size={11} />}
                            {copiedClabe ? '¡Copiado!' : 'Copiar CLABE'}
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          background: 'var(--theme-surface)', padding: '6px 10px',
                          borderRadius: '8px', border: '1px solid var(--theme-border-subtle)'
                        }}>
                          <span style={{ fontSize: '10px', color: 'var(--theme-text-muted)', fontWeight: 600 }}>BANCO</span>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--theme-text)' }}>
                            {metodosPagoConfig.banco || 'No configurado'}
                          </span>
                        </div>

                        <div style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          background: 'var(--theme-surface)', padding: '6px 10px',
                          borderRadius: '8px', border: '1px solid var(--theme-border-subtle)'
                        }}>
                          <span style={{ fontSize: '10px', color: 'var(--theme-text-muted)', fontWeight: 600 }}>CLABE</span>
                          <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--theme-primary)' }}>
                            {metodosPagoConfig.clabe || 'No configurada'}
                          </span>
                        </div>

                        <div style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          background: 'var(--theme-surface)', padding: '6px 10px',
                          borderRadius: '8px', border: '1px solid var(--theme-border-subtle)'
                        }}>
                          <span style={{ fontSize: '10px', color: 'var(--theme-text-muted)', fontWeight: 600 }}>TITULAR</span>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--theme-text)' }}>
                            {metodosPagoConfig.titular || 'No configurado'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', marginBottom: '14px',
                  }}>
                    <span style={{ fontSize: '14px', color: 'var(--theme-text-muted)' }}>
                      Seleccionado
                    </span>
                    <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--theme-primary)' }}>
                      ${totalSeleccionado} MXN
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => setCobroStep('cuenta')}
                      style={{
                        padding: '14px 20px', borderRadius: '14px',
                        border: '1px solid var(--theme-card)',
                        background: 'var(--theme-card)',
                        color: 'var(--theme-text-muted)',
                        fontSize: '15px', fontWeight: 500, cursor: 'pointer',
                      }}
                    >← Atrás</button>
                    <button
                      disabled={platillosSeleccionados.length === 0 || !formaPago || cargandoCobro}
                      onClick={async () => {
                        if (!formaPago || platillosSeleccionados.length === 0) return
                        setCargandoCobro(true)
                        try {
                          const todosLosPendientes = platillosUnificados
                            .filter(p => !platillosCobrados.includes(p.uid))
                            .map(p => p.uid)

                          const todosSeleccionados = platillosSeleccionados.length === todosLosPendientes.length &&
                            platillosSeleccionados.every(uid => todosLosPendientes.includes(uid))

                          if (todosSeleccionados) {
                            // Último pago — cobrar todo y liberar mesa
                            await cobrarTodo()
                            setPlatillosCobrados([])
                          } else {
                            // Pago parcial — marcar como cobrados y limpiar selección
                            setPlatillosCobrados(prev => [...prev, ...platillosSeleccionados])
                            setPlatillosSeleccionados([])
                            setFormaPago(null)
                            showToast(`✓ Cobrado $${totalSeleccionado} MXN`)
                          }
                        } finally {
                          setCargandoCobro(false)
                        }
                      }}
                      style={{
                        flex: 1, padding: '14px', borderRadius: '14px', border: 'none',
                        background: platillosSeleccionados.length === 0 || !formaPago
                          ? 'var(--theme-card)'
                          : '#10b981',
                        color: platillosSeleccionados.length === 0 || !formaPago
                          ? 'var(--theme-text-muted)' : 'white',
                        fontSize: '15px', fontWeight: 700,
                        cursor: platillosSeleccionados.length === 0 || !formaPago
                          ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {cargandoCobro
                        ? 'Procesando...'
                        : `Cobrar $${totalSeleccionado} MXN`}
                    </button>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* 6. MODAL VER ORDEN ACTIVA / DETALLE */}
      {activeOrderView && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(3px)',
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            style={{
              background: 'var(--theme-card)',
              border: '1px solid var(--theme-input)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--theme-primary)', textTransform: 'uppercase' }}>
                  Detalle de Mesa
                </span>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--theme-text)', marginTop: '2px', margin: 0 }}>
                  Mesa {activeOrderView.numero}
                </h3>
              </div>
              <button
                onClick={() => setActiveOrderView(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--theme-text-muted)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--theme-text-muted)' }}>Área:</span>
                <span style={{ color: 'var(--theme-text)', fontWeight: 600 }}>{activeOrderView.area || 'General'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--theme-text-muted)' }}>Estado:</span>
                <span style={{ color: 'var(--theme-text)', fontWeight: 600, textTransform: 'uppercase' }}>{activeOrderView.estado}</span>
              </div>
              {activeOrderView.tiempoMin > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--theme-text-muted)' }}>Tiempo transcurrido:</span>
                  <span style={{ color: 'var(--theme-text)', fontWeight: 600 }}>{activeOrderView.tiempoMin} min</span>
                </div>
              )}
              {activeOrderView.total > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--theme-input)', paddingTop: '8px', marginTop: '4px' }}>
                  <span style={{ color: 'var(--theme-text)', fontWeight: 600 }}>Total comanda:</span>
                  <span style={{ color: 'var(--theme-primary)', fontWeight: 700, fontSize: '15px' }}>${activeOrderView.total} MXN</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              {(activeOrderView.estado === 'lista_cobrar' || activeOrderView.estado === 'por_cobrar') && (
                <button
                  onClick={() => {
                    handleMarkPaid(activeOrderView)
                    setActiveOrderView(null)
                  }}
                  style={{
                    flex: 1,
                    background: '#10b981',
                    color: 'white',
                    fontWeight: 600,
                    borderRadius: '8px',
                    padding: '10px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  Marcar cobrada
                </button>
              )}
              <button
                onClick={() => setActiveOrderView(null)}
                style={{
                  flex: 1,
                  background: 'var(--theme-input)',
                  color: 'var(--theme-text)',
                  fontWeight: 600,
                  borderRadius: '8px',
                  padding: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. NOTIFICACIÓN TOAST */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            right: '16px',
            zIndex: 60,
            background: '#10b981',
            color: 'white',
            borderRadius: '12px',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: 500,
            boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'slideIn 0.2s ease-out'
          }}
        >
          <Sparkles size={16} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
