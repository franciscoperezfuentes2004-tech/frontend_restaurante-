import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, ChefHat, LogOut, Calendar, AlertTriangle, FileText, ShoppingBag, Loader2, Banknote } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { logout } from '../../api/auth'
import { 
  getNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  clearAllNotifications 
} from '../../api/notifications'
import ScrollHint from '../ui/ScrollHint'
import { useCalendar } from '../../context/CalendarContext'

export default function Topbar({ onToggleSidebar }) {
  const navigate = useNavigate()
  const { user, logoutUser } = useAuth()
  const { bgCard, bgDropdown, bgInput, textColor, textMuted, textSubtle, colorPrimario, primaryBtnText, borderSubtle, topbarShadow, dropdownShadow, isLight, restaurantName, logoUrl } = useTheme()
  const { isCalendarOpen } = useCalendar()

  // Real notifications state initialized empty
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isLogoutHovered, setIsLogoutHovered] = useState(false)
  
  const dropdownRef = useRef(null)

  // Fetch notifications from server
  const fetchNotificationsData = useCallback(async () => {
    try {
      const res = await getNotifications()
      const data = res.data || {}
      setNotifications(Array.isArray(data.notificaciones) ? data.notificaciones : [])
      setUnreadCount(typeof data.total_no_leidas === 'number' ? data.total_no_leidas : 0)
    } catch (err) {
      console.warn("Notifications fetch error:", err)
    }
  }, [])

  // Auto-refresh notifications every 30s
  useEffect(() => {
    fetchNotificationsData()

    const interval = setInterval(() => {
      fetchNotificationsData()
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchNotificationsData])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Secure Logout Handler
  const handleLogout = async () => {
    if (isLoggingOut) return
    const confirmar = window.confirm("¿Estás seguro de que deseas cerrar sesión? Cualquier cambio no guardado se perderá.")
    if (!confirmar) return

    setIsLoggingOut(true)

    try {
      // 1. Destruimos el token en el servidor (Laravel)
      await logout()
    } catch (err) {
      console.error("Error al notificar al servidor", err)
    } finally {
      // 2. Limpiamos frontend de forma segura
      if (typeof logoutUser === 'function') {
        try { logoutUser() } catch (e) {}
      }
      localStorage.removeItem('token')
      localStorage.clear()
      sessionStorage.clear()
      window.location.href = '/login' // Forzamos recarga limpia
    }
  }

  // Mark single notification as read
  const handleMarkAsRead = async (id) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, leida: true } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
    try {
      await markNotificationAsRead(id)
    } catch (err) {
      console.warn("Error marking notification as read:", err)
    }
  }

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, leida: true })))
    setUnreadCount(0)
    try {
      await markAllNotificationsAsRead()
    } catch (err) {
      console.warn("Error marking all notifications as read:", err)
    }
  }

  // Clear all notifications
  const handleClearAll = async () => {
    setNotifications([])
    setUnreadCount(0)
    try {
      await clearAllNotifications()
    } catch (err) {
      console.warn("Error clearing notifications:", err)
    }
  }

  const getNotificationRoute = (n) => {
    const type = typeof n === 'object' ? n.tipo : n
    const data = typeof n === 'object' ? n.data : null
    const cutId = data?.cash_cut_id || data?.id

    switch (type) {
      case 'corte_repartidor':
        return cutId ? `/admin/cortes?id=${cutId}` : '/admin/cortes'
      case 'nueva_reservacion':
      case 'reservacion_actualizada':
      case 'reserva':
        return '/admin/reservations'
      case 'stock_critico':
      case 'inventario':
        return '/admin/stock'
      case 'reporte':
        return '/admin/finances/reports'
      case 'pedido_nuevo':
      case 'pedido':
        return '/admin/orders'
      default:
        return '/admin/dashboard'
    }
  }

  const handleDetailClick = async (e, n) => {
    e.stopPropagation()
    if (!n.leida) {
      await handleMarkAsRead(n.id)
    }
    const route = getNotificationRoute(n)
    const cutId = n.data?.cash_cut_id || n.data?.id
    navigate(route, { state: cutId ? { cashCutId: cutId } : undefined })
    setShowNotifications(false)
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'corte_repartidor':
        return <Banknote size={13} className="text-amber-400" />
      case 'nueva_reservacion':
      case 'reservacion_actualizada':
      case 'reserva':
        return <Calendar size={13} className="text-blue-400" />
      case 'stock_critico':
      case 'inventario':
        return <AlertTriangle size={13} className="text-amber-400" />
      case 'reporte':
        return <FileText size={13} style={{ color: colorPrimario }} />
      case 'pedido_nuevo':
      case 'pedido':
        return <ShoppingBag size={13} className="text-emerald-400" />
      default:
        return <Bell size={13} style={{ color: textSubtle }} />
    }
  }

  const getNotificationBg = (type) => {
    switch (type) {
      case 'corte_repartidor':
        return 'bg-amber-500/10 border-amber-500/20'
      case 'nueva_reservacion':
      case 'reservacion_actualizada':
      case 'reserva':
        return 'bg-blue-500/10 border-blue-500/20'
      case 'stock_critico':
      case 'inventario':
        return 'bg-amber-500/10 border-amber-500/20'
      case 'reporte':
        return 'bg-brand-500/10 border-brand-500/20'
      case 'pedido_nuevo':
      case 'pedido':
        return 'bg-emerald-500/10 border-emerald-500/20'
      default:
        return 'bg-theme-input border-theme-border-subtle'
    }
  }

  return (
    <header 
      className="admin-topbar h-16 flex items-center justify-between px-6 max-md:px-3 shrink-0 sticky top-0 z-40 transition-all duration-200"
      style={{
        backgroundColor: 'var(--theme-primary, #1e40af)',
        color: 'var(--theme-primary-contrast, #ffffff)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: topbarShadow,
        filter: isCalendarOpen ? 'blur(3px) brightness(0.8)' : 'none',
        pointerEvents: isCalendarOpen ? 'none' : 'auto',
        transition: 'filter 0.2s ease, opacity 0.2s ease'
      }}
    >
      <div className="flex items-center gap-2.5 max-md:gap-1.5">
        {/* Botón de Menú: Visible SOLO en Tablet/Móvil (hasta 1280px / max-xl) */}
        <button 
          type="button"
          className="hidden max-xl:block p-2 max-md:p-1.5 -ml-2 rounded-lg hover:bg-white/10 active:scale-95 transition-colors cursor-pointer"
          style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}
          onClick={onToggleSidebar}
          aria-label="Abrir menú"
          title="Abrir menú"
        >
          <svg className="w-6 h-6 max-md:w-5 max-md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </button>

        {/* Logotipo y Nombre del Establecimiento */}
        <div 
          className="flex items-center gap-2.5 max-md:gap-1.5 px-3 max-md:px-2 py-1.5 rounded-xl shrink-0 max-w-[55vw] sm:max-w-[65vw] shadow-xs"
          style={{
            backgroundColor: bgCard,
            border: `1px solid ${borderSubtle}`,
          }}
        >
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-7 h-7 max-md:w-5 max-md:h-5 object-contain rounded-lg shrink-0" />
          ) : (
            <div 
              className="w-7 h-7 max-md:w-5 max-md:h-5 rounded-lg flex items-center justify-center text-xs max-md:text-[10px] font-black shadow-xs shrink-0"
              style={{
                backgroundColor: colorPrimario,
                color: primaryBtnText
              }}
            >
              <span className="font-bold">
                {(restaurantName || 'A')[0].toUpperCase()}
              </span>
            </div>
          )}
          <span 
            className="font-bold tracking-wider uppercase text-xs sm:text-sm max-md:text-[10px] truncate" 
            style={{ color: textColor }}
            title={restaurantName || 'AURUM'}
          >
            {restaurantName || 'AURUM'}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3 max-md:gap-1.5">
        {/* Vista Cocina Button */}
        <Link
          to="/cocina"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-xl px-3.5 max-md:px-2 py-2 text-xs font-bold transition-all duration-200 hover:opacity-90 cursor-pointer shadow-xs"
          style={{ 
            backgroundColor: bgCard,
            border: `1px solid ${borderSubtle}`,
            color: textColor
          }}
        >
          <ChefHat size={14} className="text-amber-500 shrink-0" />
          <span className="tracking-wide max-md:hidden">Vista cocina</span>
        </Link>

        {/* Notifications Bell */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => {
              const nextState = !showNotifications
              setShowNotifications(nextState)
              if (nextState) fetchNotificationsData()
            }}
            className="relative p-2.5 max-md:p-2 rounded-xl transition-all duration-200 hover:opacity-90 cursor-pointer shadow-xs flex items-center justify-center"
            style={{
              backgroundColor: bgCard,
              border: `1px solid ${borderSubtle}`,
              color: textColor
            }}
            aria-label="Notificaciones"
          >
            <Bell size={18} className="max-md:w-4 max-md:h-4" style={{ color: textColor }} />
            {/* Count badge for unread notifications */}
            {unreadCount > 0 && (
              <span 
                className="absolute -top-1.5 -right-1.5 min-w-[18px] h-4.5 px-1 rounded-full text-[10px] font-black flex items-center justify-center shadow-md animate-fadeIn bg-rose-600 text-white"
                style={{
                  border: `2px solid ${bgCard}`
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div 
              className="absolute right-0 mt-2.5 w-96 max-md:fixed max-md:top-14 max-md:right-2 max-md:w-[calc(100vw-1rem)] max-md:max-w-[340px] rounded-2xl z-50 overflow-hidden origin-top-right transform transition-all duration-200 animate-fadeIn"
              style={{ backgroundColor: bgDropdown, border: `1px solid ${borderSubtle}`, boxShadow: dropdownShadow }}
            >
              {/* Header */}
              <div
                className="px-5 py-3.5 flex items-center justify-between"
                style={{ borderBottom: `1px solid ${borderSubtle}` }}
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm" style={{ color: textColor }}>Notificaciones</span>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: bgInput, color: textMuted }}
                  >
                    {notifications.length}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-xs max-md:text-[10px] font-bold cursor-pointer transition-colors"
                      style={{ color: colorPrimario }}
                    >
                      Todo leído
                    </button>
                  )}
                  {unreadCount > 0 && notifications.length > 0 && (
                    <span className="w-px h-3" style={{ backgroundColor: borderSubtle }} />
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={handleClearAll}
                      className="text-xs max-md:text-[10px] font-bold cursor-pointer transition-colors"
                      style={{ color: textMuted }}
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>

              {/* List */}
              <div className="max-h-[350px] max-md:max-h-[60vh] overflow-y-auto scrollbar-thin">
                {notifications.length === 0 ? (
                  <div className="py-10 px-4 text-center text-xs" style={{ color: textSubtle }}>
                    Sin notificaciones nuevas
                  </div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id} 
                      onClick={() => handleMarkAsRead(n.id)}
                      className="px-5 max-md:px-4 py-3.5 max-md:py-3 flex gap-3.5 max-md:gap-2.5 cursor-pointer hover:opacity-90 transition-colors relative group"
                      style={{ borderBottom: `1px solid ${borderSubtle}22` }}
                    >
                      <div className={`w-8 h-8 max-md:w-7 max-md:h-7 rounded-xl max-md:rounded-lg border flex items-center justify-center shrink-0 ${getNotificationBg(n.tipo)}`}>
                        {getNotificationIcon(n.tipo)}
                      </div>
                      <div className="flex-1 min-w-0 pr-4 text-left">
                        <p
                          className="text-xs max-md:text-[11px] leading-relaxed"
                          style={{
                            color: !n.leida ? textColor : textMuted,
                            fontWeight: !n.leida ? 600 : 400
                          }}
                        >
                          {n.mensaje}
                        </p>
                        <div className="flex items-center justify-between mt-2.5 max-md:mt-1.5">
                          <p className="text-[10px] max-md:text-[9px]" style={{ color: textSubtle }}>
                            {n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </p>
                          <button
                            onClick={(e) => handleDetailClick(e, n)}
                            className="text-[10px] max-md:text-[9px] font-bold cursor-pointer transition-colors"
                            style={{ color: colorPrimario }}
                          >
                            Ver más detalles
                          </button>
                        </div>
                      </div>
                      {!n.leida && (
                        <div 
                          className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full" 
                          style={{ backgroundColor: colorPrimario }}
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
              <ScrollHint text="Desplázate para ver más" />
            </div>
          )}
        </div>

        {/* User Info & Avatar Container */}
        <div 
          className="flex items-center gap-2.5 px-3 max-md:px-2 py-1.5 max-md:py-1 rounded-xl transition-all duration-200 shadow-xs max-md:hidden"
          style={{
            backgroundColor: bgCard,
            border: `1px solid ${borderSubtle}`,
          }}
        >
          <div 
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shadow-xs shrink-0"
            style={{
              backgroundColor: colorPrimario,
              color: primaryBtnText
            }}
          >
            {user?.role === 'super_admin' ? 'S' : (user?.role === 'gerente' ? 'G' : 'A')}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span 
              className="text-[11px] font-bold leading-tight tracking-wide"
              style={{ color: textColor }}
            >
              {user?.name || user?.nombre || user?.username || 'Usuario'}
            </span>
            <span 
              className="text-[8px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded inline-block text-center w-fit mt-0.5 leading-none shadow-2xs"
              style={{
                backgroundColor: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)',
                color: textMuted,
                border: `1px solid ${borderSubtle}`
              }}
            >
              {user?.role === 'super_admin' ? 'SUPER ADMIN' : (user?.role === 'gerente' ? 'GERENTE' : 'ADMIN')}
            </span>
          </div>
        </div>
        
        {/* Logout Button */}
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          onMouseEnter={() => setIsLogoutHovered(true)}
          onMouseLeave={() => setIsLogoutHovered(false)}
          style={{ 
            backgroundColor: isLogoutHovered ? '#e11d48' : bgCard,
            border: isLogoutHovered ? '1px solid #e11d48' : `1px solid ${borderSubtle}`,
            boxShadow: isLogoutHovered ? '0 4px 12px rgba(225, 29, 72, 0.3)' : undefined,
            color: isLogoutHovered ? '#FFFFFF' : textColor
          }}
          className="flex items-center gap-1.5 text-xs font-bold transition-all duration-200 cursor-pointer py-2 px-3.5 max-md:px-2.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
        >
          {isLoggingOut ? (
            <Loader2 size={13} className="animate-spin text-white max-md:w-3 max-md:h-3" />
          ) : (
            <LogOut size={13} className={`${isLogoutHovered ? 'text-white' : 'text-rose-500'} max-md:w-3 max-md:h-3`} />
          )}
          <span className="max-md:hidden">{isLoggingOut ? 'Cerrando...' : 'Salir'}</span>
        </button>
      </div>
    </header>
  )
}
