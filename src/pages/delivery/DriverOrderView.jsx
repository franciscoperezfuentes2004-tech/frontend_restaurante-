import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronLeft, MapPin, User, Phone, MessageSquare, Receipt,
  AlertCircle, Scooter, Navigation, ArrowRight
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import client from '../../api/client'

export default function DriverOrderView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    bgBody,
    bgCard,
    bgSubcard,
    isLight,
    colorPrimario,
    textColor,
    textMuted,
    textSubtle,
    borderSubtle
  } = useTheme()

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [accepting, setAccepting] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Cargar detalles de la orden
  useEffect(() => {
    let isMounted = true
    const fetchOrderDetails = async () => {
      setLoading(true)
      setError(null)
      const cleanId = String(id || '').toUpperCase().replace(/[-\s#]/g, '').trim()
      try {
        const res = await client.get(`/orders/${encodeURIComponent(cleanId)}`)
          .catch(() => client.get(`/admin/delivery/orders/${encodeURIComponent(cleanId)}`))
          .catch(() => client.get(`/admin/orders/${encodeURIComponent(cleanId)}`))

        if (!isMounted) return

        const data = res.data?.data || res.data?.order || res.data?.pedido || res.data
        if (!data || (!data.id && !data.folio)) {
          throw new Error('No se encontró información del pedido.')
        }
        setOrder(data)
      } catch (err) {
        console.error('Error fetching driver order details:', err)
        if (isMounted) {
          setError(err.response?.data?.message || err.message || 'No se pudo cargar la orden.')
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    if (id) {
      fetchOrderDetails()
    }

    return () => {
      isMounted = false
    }
  }, [id])

  // Helper de dirección estructurada
  const formatAddress = () => {
    if (!order) return ''
    const { calle, num_ext, num_int, colonia, cp, customer_address, address, direccion } = order

    if (calle || num_ext || colonia || cp) {
      const parts = []
      const streetAndNum = [calle, num_ext, num_int ? `Int ${num_int}` : ''].filter(Boolean).join(' ')
      if (streetAndNum) parts.push(streetAndNum)
      if (colonia) parts.push(`Col. ${colonia}`)
      if (cp) parts.push(`C.P. ${cp}`)
      parts.push('Acapulco, Guerrero')
      return parts.join(', ')
    }

    if (customer_address || address || direccion) {
      const raw = customer_address || address || direccion
      return raw.includes('Acapulco') ? raw : `${raw}, Acapulco, Guerrero`
    }

    return 'Sin dirección registrada'
  }

  const fullAddress = formatAddress()

  // Google Maps Directions API URL
  const googleMapsUrl = fullAddress && fullAddress !== 'Sin dirección registrada'
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent('Acapulco, Guerrero')}`

  // Aceptar y empezar entrega
  const handleAcceptOrder = async () => {
    if (!order) return
    setAccepting(true)
    try {
      const tokenParaAceptar = order.dispatch_token || String(id || '').toUpperCase().replace(/[-\s#]/g, '').trim() || order.folio || order.id

      // Única petición POST al endpoint definitivo del repartidor usando dispatch_token
      await client.post(`/driver/orders/${encodeURIComponent(tokenParaAceptar)}/accept`)

      showToast('✓ Pedido aceptado. Abriendo navegación...', 'success')

      // Lanzar ruta en la app nativa de Maps (_blank activa la app en móvil)
      if (googleMapsUrl) {
        window.open(googleMapsUrl, '_blank')
      }

      setTimeout(() => {
        navigate('/repartidor')
      }, 800)
    } catch (err) {
      console.error('Error accepting order:', err)
      const msg = err.response?.data?.message || 'No se pudo asignar el pedido.'
      showToast(`⚠️ ${msg}`, 'error')
      setAccepting(false)
    }
  }

  // Helper de teléfono limpio para WhatsApp y llamadas
  const rawPhone = order?.customer_phone || order?.telefono || order?.phone || ''
  const cleanPhone = rawPhone.replace(/\D/g, '')

  // Extraer referencias y notas
  const referencias = order?.customer_references || order?.referencias || order?.references || ''
  const notasGenerales = order?.notes || order?.notas || order?.special_notes || ''

  // Lista de platillos normalizada
  const items = Array.isArray(order?.items)
    ? order.items
    : Array.isArray(order?.platillos)
      ? order.platillos
      : []

  if (loading) {
    return (
      <div className="min-h-screen p-4 flex flex-col items-center justify-center font-sans select-none" style={{ backgroundColor: bgBody, color: textColor }}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 mb-4" style={{ borderColor: colorPrimario }} />
        <p className="text-sm font-medium animate-pulse" style={{ color: textMuted }}>Cargando datos del pedido...</p>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center text-center font-sans select-none" style={{ backgroundColor: bgBody, color: textColor }}>
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 text-red-400">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold mb-2">No se pudo cargar el pedido</h2>
        <p className="text-sm mb-6 max-w-xs" style={{ color: textMuted }}>{error || 'El identificador del pedido no es válido o ha expirado.'}</p>
        <button
          onClick={() => navigate('/repartidor')}
          style={{ backgroundColor: colorPrimario }}
          className="px-6 py-3 rounded-xl text-white text-sm font-bold shadow-lg transition-all cursor-pointer"
        >
          Volver al Panel de Repartidor
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-32 flex flex-col font-sans select-none" style={{ backgroundColor: bgBody, color: textColor }}>
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md text-sm font-semibold border flex items-center gap-2 animate-fadeInDown"
          style={{
            backgroundColor: toast.type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(16, 185, 129, 0.9)',
            borderColor: toast.type === 'error' ? '#ef4444' : '#10b981',
            color: '#ffffff'
          }}
        >
          {toast.message}
        </div>
      )}

      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 border-b backdrop-blur-md px-4 py-3 flex items-center justify-between"
        style={{
          backgroundColor: isLight ? 'rgba(255, 255, 255, 0.85)' : 'rgba(18, 18, 18, 0.85)',
          borderColor: borderSubtle
        }}
      >
        <button
          onClick={() => navigate('/repartidor')}
          className="p-2 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer"
          style={{ backgroundColor: bgSubcard, borderColor: borderSubtle, color: textColor }}
        >
          <ChevronLeft size={16} />
          <span>Volver</span>
        </button>

        <div className="text-center">
          <h1 className="text-sm font-bold tracking-tight" style={{ color: textColor }}>
            Pedido #{order.daily_number || order.id}
          </h1>
          {order.folio && (
            <p className="text-[10px] font-mono" style={{ color: textSubtle }}>
              {order.folio}
            </p>
          )}
        </div>

        <div className="px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0 uppercase tracking-wider"
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderColor: 'rgba(16, 185, 129, 0.3)',
            color: '#10b981'
          }}
        >
          {order.status === 'ready' || order.status === 'listo' ? 'Listo' : (order.status || 'Activo')}
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 space-y-4">

        {/* 1. Card Cliente */}
        <section className="rounded-2xl border p-4 space-y-3 shadow-xs" style={{ backgroundColor: bgCard, borderColor: borderSubtle }}>
          <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: borderSubtle }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)', color: colorPrimario }}>
              <User size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: textSubtle }}>Cliente</span>
              <h2 className="text-base font-bold leading-tight" style={{ color: textColor }}>
                {order.customer_name || order.cliente || order.customer || 'Cliente'}
              </h2>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <Phone size={16} style={{ color: textSubtle }} />
              <span className="text-sm font-mono font-medium" style={{ color: textColor }}>
                {rawPhone || 'Sin teléfono'}
              </span>
            </div>

            {cleanPhone && (
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${cleanPhone}`}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                >
                  <Phone size={13} />
                  <span>Llamar</span>
                </a>
                <a
                  href={`https://wa.me/52${cleanPhone}?text=Hola,%20soy%20el%20repartidor%20y%20voy%20en%20camino%20con%20tu%20pedido.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-green-700 hover:bg-green-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                >
                  <MessageSquare size={13} />
                  <span>WhatsApp</span>
                </a>
              </div>
            )}
          </div>
        </section>

        {/* 2. Card Dirección Desglosada */}
        <section className="rounded-2xl border p-4 space-y-3 shadow-xs" style={{ backgroundColor: bgCard, borderColor: borderSubtle }}>
          <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: borderSubtle }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/10 text-blue-400">
                <MapPin size={18} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: textSubtle }}>Dirección de Entrega</span>
                <span className="text-xs font-semibold" style={{ color: textColor }}>
                  {order.modality === 'pickup' ? 'Recolección en sucursal' : 'Entrega a domicilio'}
                </span>
              </div>
            </div>

            {fullAddress && fullAddress !== 'Sin dirección registrada' && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 rounded-xl border flex items-center gap-1 text-xs font-semibold hover:border-blue-400 transition-colors"
                style={{ backgroundColor: bgSubcard, borderColor: borderSubtle, color: '#38bdf8' }}
              >
                <Navigation size={13} />
                <span>Navegar</span>
              </a>
            )}
          </div>

          <div className="space-y-1 text-sm">
            <p className="font-semibold text-base leading-snug" style={{ color: textColor }}>
              {fullAddress}
            </p>
          </div>
        </section>

        {/* 3. Card Referencias y Notas Especiales */}
        {(referencias || notasGenerales) && (
          <section className="rounded-2xl border p-4 space-y-2.5 bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200 shadow-xs">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-extrabold">
              <AlertCircle size={18} className="shrink-0 text-amber-600 dark:text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Referencias y Notas Importantes</h3>
            </div>

            {referencias && (
              <div className="text-xs bg-amber-500/15 p-3 rounded-xl border border-amber-500/30 text-amber-950 dark:text-amber-100">
                <span className="font-extrabold block text-amber-900 dark:text-amber-300 mb-0.5">📍 Referencia del Domicilio:</span>
                <p className="leading-relaxed font-semibold">{referencias}</p>
              </div>
            )}

            {notasGenerales && (
              <div className="text-xs bg-amber-500/15 p-3 rounded-xl border border-amber-500/30 text-amber-950 dark:text-amber-100">
                <span className="font-extrabold block text-amber-900 dark:text-amber-300 mb-0.5">📝 Nota Especial:</span>
                <p className="leading-relaxed font-semibold">{notasGenerales}</p>
              </div>
            )}
          </section>
        )}

        {/* 4. Card Resumen del Pedido (Items) */}
        <section className="rounded-2xl border p-4 space-y-3 shadow-xs" style={{ backgroundColor: bgCard, borderColor: borderSubtle }}>
          <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: borderSubtle }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-500/10 text-purple-400">
              <Receipt size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: textSubtle }}>Contenido del Pedido</span>
              <span className="text-xs font-semibold" style={{ color: textColor }}>
                {items.length} {items.length === 1 ? 'producto' : 'productos'}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => {
              const name = item.dish_name || item.nombre || item.name || item.dish?.name || 'Platillo'
              const qty = item.quantity || item.cantidad || 1
              const price = Number(item.price || item.precio || 0)
              const itemNotes = item.notes || item.notas || item.nota || ''
              const extras = Array.isArray(item.extras) ? item.extras : []
              const extrasTotal = extras.reduce((sum, e) => sum + (typeof e === 'object' ? Number(e.price || e.precio || 0) : 0), 0)
              const subtotalPlatillo = (price + extrasTotal) * qty

              return (
                <div 
                  key={idx} 
                  className="rounded-xl p-3.5 border space-y-2.5 transition-all shadow-2xs"
                  style={{ 
                    backgroundColor: bgSubcard, 
                    borderColor: borderSubtle 
                  }}
                >
                  {/* Fila 1: Nombre del platillo y Cantidad */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm leading-tight" style={{ color: textColor }}>
                      {name}
                    </span>
                    <span 
                      className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-md border shrink-0"
                      style={{ 
                        backgroundColor: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)', 
                        borderColor: 'color-mix(in srgb, var(--theme-primary) 30%, transparent)', 
                        color: colorPrimario 
                      }}
                    >
                      x{qty}
                    </span>
                  </div>

                  {/* Fila 2: Modificadores o complementos */}
                  {extras.length > 0 && (
                    <div className="space-y-1 pl-1">
                      {extras.map((ex, eIdx) => {
                        const extraName = typeof ex === 'object' ? (ex.name || ex.nombre || ex.extra?.name || 'Extra') : String(ex)
                        const extraPrice = typeof ex === 'object' ? Number(ex.price || ex.precio || 0) : 0
                        return (
                          <div key={eIdx} className="text-xs flex items-center gap-1.5" style={{ color: textMuted }}>
                            <span style={{ color: textSubtle }}>•</span>
                            <span>+ {extraName}</span>
                            {extraPrice > 0 && (
                              <span className="font-mono text-[11px] opacity-75" style={{ color: textSubtle }}>
                                (+${extraPrice.toFixed(2)})
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Fila 3: Notas exclusivas del platillo */}
                  {itemNotes && (
                    <div className="text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 px-2.5 py-1.5 rounded-lg flex items-start gap-1.5 shadow-2xs">
                      <span className="shrink-0">📝</span>
                      <span className="leading-snug">{itemNotes}</span>
                    </div>
                  )}

                  {/* Fila 4: Subtotal del platillo */}
                  <div className="flex items-center justify-between pt-1 border-t text-xs" style={{ borderColor: borderSubtle }}>
                    <span style={{ color: textSubtle }}>
                      {price > 0 ? `Precio unitario: $${price.toFixed(2)}` : 'Subtotal'}
                    </span>
                    <span className="font-mono font-bold text-sm text-emerald-500">
                      ${subtotalPlatillo.toFixed(2)} MXN
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Totales y Método de Pago */}
          <div className="border-t pt-3 space-y-2 text-xs" style={{ borderColor: borderSubtle }}>
            <div className="flex justify-between items-center" style={{ color: textMuted }}>
              <span>Método de pago:</span>
              <span className="font-bold uppercase tracking-wider" style={{ color: textColor }}>
                {order.payment_method || order.metodo_pago || 'Efectivo'}
              </span>
            </div>

            {/* Alerta Visual de Cobro en Puerta */}
            {(() => {
              const metodo = (order.payment_method || order.metodo_pago || 'efectivo').toLowerCase()
              const isPaid = order.payment_status === 'paid' || order.estado_pago === 'pagado'
              if (isPaid) {
                return (
                  <div className="p-3 rounded-xl font-extrabold text-xs uppercase tracking-wider bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30 flex items-center gap-2 shadow-sm">
                    <span>✓</span>
                    <span>PAGADO ONLINE / VALIDADO</span>
                  </div>
                )
              }
              if (metodo === 'terminal' || metodo === 'tarjeta' || metodo === 'card') {
                return (
                  <div className="p-3 rounded-xl font-extrabold text-xs uppercase tracking-wider bg-orange-500/20 text-orange-950 dark:text-orange-200 border border-orange-500/40 flex items-center gap-2 shadow-sm animate-pulse">
                    <span>💳</span>
                    <span>POR COBRAR EN PUERTA — Llevar Terminal Física</span>
                  </div>
                )
              }
              if (metodo === 'transferencia' || metodo === 'transfer' || metodo === 'spei') {
                return (
                  <div className="p-3 rounded-xl font-extrabold text-xs uppercase tracking-wider bg-rose-500/20 text-rose-950 dark:text-rose-200 border border-rose-500/40 flex items-center gap-2 shadow-sm animate-pulse">
                    <span>📱</span>
                    <span>POR COBRAR EN PUERTA — Validar comprobante con el cliente</span>
                  </div>
                )
              }
              return (
                <div className="p-3 rounded-xl font-extrabold text-xs uppercase tracking-wider bg-amber-500/20 text-amber-950 dark:text-amber-200 border border-amber-500/40 flex items-center gap-2 shadow-sm animate-pulse">
                  <span>⚠️</span>
                  <span>POR COBRAR EN PUERTA — Llevar cambio</span>
                </div>
              )
            })()}

            <div className="flex justify-between items-center text-base pt-1 font-bold">
              <span style={{ color: textColor }}>Total a cobrar:</span>
              <span className="text-xl font-mono" style={{ color: colorPrimario }}>
                ${Number(order.total_amount || order.total || 0).toFixed(2)} MXN
              </span>
            </div>
          </div>
        </section>

      </main>

      {/* Fixed Bottom Action Bar */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 border-t backdrop-blur-lg z-40"
        style={{
          backgroundColor: isLight ? 'rgba(255, 255, 255, 0.9)' : 'rgba(18, 18, 18, 0.9)',
          borderColor: borderSubtle
        }}
      >
        <div className="max-w-lg mx-auto">
          <button
            disabled={accepting}
            onClick={handleAcceptOrder}
            style={{ backgroundColor: colorPrimario }}
            className="w-full py-4 px-6 rounded-2xl text-white font-bold text-base shadow-xl hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            {accepting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                <span>Asignando pedido...</span>
              </>
            ) : (
              <>
                <Scooter size={22} className="animate-bounce shrink-0" />
                <span>Aceptar y Empezar Entrega</span>
                <ArrowRight size={18} className="shrink-0" />
              </>
            )}
          </button>
        </div>
      </footer>

    </div>
  )
}
