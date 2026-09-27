import { useState, useEffect, useCallback } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Tag, UtensilsCrossed, Puzzle,
  ShoppingBag, CalendarDays, Building2, Settings,
  Truck, Percent, Star, Leaf, Boxes, Users,
  History, ShieldCheck, Key, TrendingUp, CreditCard,
  BarChart3, PiggyBank, Palette, Banknote, X
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { hasPermission } from '../../services/auth'
import { useCalendar } from '../../context/CalendarContext'
import { getConfiguracion } from '../../api/settings'
import client from '../../api/client'
import echo from '../../echo'

/**
 * NOTA DE ARQUITECTURA:
 * El ocultamiento de enlaces en el Sidebar es EXCLUSIVAMENTE una mejora de experiencia de usuario (UX).
 * NUNCA debe considerarse un mecanismo de seguridad o autorización.
 * Toda autorización continúa siendo responsabilidad exclusiva del backend mediante Middleware, Policies y Permisos.
 */

const groups = [
  {
    label: 'GENERAL',
    links: [
      { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ]
  },
  {
    label: 'MENÚ',
    permission: 'menu.manage',
    links: [
      { to: '/admin/categories', icon: Tag,             label: 'Categorías' },
      { to: '/admin/dishes',     icon: UtensilsCrossed, label: 'Platillos' },
      { to: '/admin/extras',     icon: Puzzle,          label: 'Extras' },
    ]
  },
  {
    label: 'OPERACIONES',
    links: [
      { to: '/admin/orders',       icon: ShoppingBag,     label: 'Pedidos',       permission: 'orders.view' },
      { to: '/admin/reservations', icon: CalendarDays,    label: 'Reservaciones', permission: 'reservations.manage' },
      { to: '/admin/delivery',     icon: Truck,           label: 'Delivery',      permission: 'delivery.view' },
      { to: '/admin/cortes',       icon: Banknote,        label: 'Cortes',        permission: 'delivery.view' },
    ]
  },
  {
    label: 'MARKETING',
    links: [
      { to: '/admin/promotions', icon: Percent, label: 'Promociones', permission: 'promotions.manage' },
      { to: '/admin/reviews',    icon: Star,    label: 'Reseñas',     permission: 'reviews.reply' },
    ]
  },
  {
    label: 'INVENTARIO',
    permission: 'reports.view',
    links: [
      { to: '/admin/ingredients', icon: Leaf,  label: 'Ingredientes' },
      { to: '/admin/stock',       icon: Boxes, label: 'Stock' },
      { to: '/admin/suppliers',   icon: Users, label: 'Proveedores' },
    ]
  },
  {
    label: 'FINANZAS',
    permission: 'reports.view',
    links: [
      { to: '/admin/finances/sales',    icon: TrendingUp, label: 'Ventas' },
      { to: '/admin/finances/payments', icon: CreditCard, label: 'Pagos' },
      { to: '/admin/finances/reports',  icon: BarChart3,  label: 'Reportes' },
      { to: '/admin/finances/costs',    icon: PiggyBank,  label: 'Costos' },
    ]
  },
  {
    label: 'ADMINISTRACIÓN',
    permission: 'audit.view',
    links: [
      { to: '/admin/audit',       icon: History,     label: 'Bitácora',         permission: 'audit.view' },
      { to: '/admin/users-roles', icon: ShieldCheck, label: 'Usuarios y roles', permission: 'users.manage' },
      { to: '/admin/permissions', icon: Key,         label: 'Permisos',         permission: 'users.manage' },
    ]
  },
  {
    label: 'CONFIGURACIÓN',
    permission: 'config.view',
    links: [
      { to: '/admin/areas',    icon: Building2, label: 'Áreas del local', permission: 'config.manage' },
      { to: '/admin/settings', icon: Settings,  label: 'Configuración General', permission: 'config.manage' },
      { to: '/admin/landing',  icon: Palette,   label: 'Personalizar Landing', permission: 'config.manage' },
    ]
  }
]

export default function Sidebar({ isOpen = false, onClose }) {
  const { user } = useAuth()
  const { bgSidebar, bgInput, textColor, textMuted, textSubtle, colorPrimario, borderSubtle, sidebarShadow, isLight, restaurantName } = useTheme()
  const { isCalendarOpen } = useCalendar()
  const [pendingCutsCount, setPendingCutsCount] = useState(0)

  // Cargar conteo de cortes pendientes
  const fetchPendingCutsCount = useCallback(async () => {
    try {
      const res = await client.get('/admin/cash-cuts', { params: { status: 'pendiente' } })
      const list = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.cash_cuts || [])
      const total = res.data?.total !== undefined ? res.data.total : list.length
      setPendingCutsCount(total)
    } catch (e) {}
  }, [])

  useEffect(() => {
    fetchPendingCutsCount()

    const handleCutUpdate = () => {
      fetchPendingCutsCount()
    }
    window.addEventListener('cash-cut-updated', handleCutUpdate)

    let channel = null
    try {
      channel = echo.channel('delivery.cuts')
      channel.listen('.delivery.cut.notified', () => fetchPendingCutsCount())
      channel.listen('delivery.cut.notified', () => fetchPendingCutsCount())
      channel.listen('DeliveryCutNotified', () => fetchPendingCutsCount())
    } catch (e) {}

    return () => {
      window.removeEventListener('cash-cut-updated', handleCutUpdate)
      if (channel) {
        try { echo.leaveChannel('delivery.cuts') } catch (e) {}
      }
    }
  }, [fetchPendingCutsCount])

  return (
    <aside 
      className={`admin-sidebar w-64 flex flex-col shrink-0 z-10 border-r transition-transform duration-300
        max-xl:fixed max-xl:top-0 max-xl:left-0 max-xl:h-full max-xl:z-50 max-xl:shadow-2xl
        ${isOpen ? 'max-xl:translate-x-0' : 'max-xl:-translate-x-full'}
      `}
      style={{
        backgroundColor: isLight ? '#FFFFFF' : 'var(--theme-surface)',
        borderColor: isLight ? 'rgba(0, 0, 0, 0.06)' : 'var(--theme-border-subtle)',
        boxShadow: sidebarShadow,
        filter: isCalendarOpen ? 'blur(3px) brightness(0.8)' : 'none',
        pointerEvents: isCalendarOpen ? 'none' : 'auto',
      }}
    >
      {/* Encabezado visible únicamente en tablet/móvil al estar flotante */}
      <div 
        className="hidden max-xl:flex items-center justify-between px-4 py-3.5 border-b shrink-0"
        style={{ borderColor: isLight ? 'rgba(0, 0, 0, 0.06)' : 'var(--theme-border-subtle)' }}
      >
        <span className="font-bold text-xs uppercase tracking-wider truncate" style={{ color: textColor }}>
          {restaurantName || 'AURUM'}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          style={{ color: textMuted }}
          title="Cerrar menú"
          aria-label="Cerrar menú"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-5 px-3.5 space-y-4 scrollbar-none">
        {groups.map((group, index) => {
          const visibleLinks = group.links.filter(link => {
            const perm = link.permission || group.permission
            if (!perm) return true
            return hasPermission(perm)
          })

          if (visibleLinks.length === 0) return null

          return (
            <div
              key={group.label}
              className={`space-y-1 ${index > 0 ? 'pt-3' : ''}`}
              style={index > 0 ? { borderTop: `1px solid ${colorPrimario}30` } : undefined}
            >
              <p
                className="text-[10px] font-extrabold tracking-[0.15em] mb-1.5 px-3 uppercase"
                style={{ color: colorPrimario }}
              >
                {group.label}
              </p>
              {visibleLinks.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => {
                    if (typeof onClose === 'function') onClose()
                  }}
                  style={({ isActive }) =>
                    isActive
                      ? {
                          backgroundColor: 'var(--theme-primary)',
                          color: 'var(--theme-primary-contrast, #ffffff)',
                          fontWeight: 700,
                        }
                      : { color: isLight ? '#0F172A' : textMuted, fontWeight: 500 }
                  }
                  className={({ isActive }) =>
                    isActive
                      ? "sidebar-nav-link flex items-center justify-between gap-2 px-3 py-2 max-md:py-2.5 rounded-xl text-xs sm:text-sm mb-0.5 max-md:mb-1 shadow-sm transition-all duration-200"
                      : "sidebar-nav-link flex items-center justify-between gap-2 px-3 py-2 max-md:py-2.5 rounded-xl text-xs sm:text-sm mb-0.5 max-md:mb-1 transition-all duration-200"
                  }
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon size={16} className="shrink-0" />
                    <span className="font-semibold truncate">{label}</span>
                  </div>
                  {to === '/admin/cortes' && pendingCutsCount > 0 && (
                    <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs shrink-0">
                      {pendingCutsCount}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          )
        })}
      </nav>

      {/* Footer System Version */}
      <div
        className="px-5 py-3.5 flex items-center justify-between"
        style={{ borderTop: '1px solid var(--theme-border-subtle)', backgroundColor: isLight ? '#FFFFFF' : bgInput }}
      >
        <span className="text-[10px] font-extrabold uppercase tracking-widest truncate" style={{ color: isLight ? '#1E293B' : textSubtle }}>{restaurantName} Admin</span>
        <span className="text-[10px] font-mono font-bold shrink-0 ml-1" style={{ color: isLight ? '#1E293B' : textSubtle }}>v1.0.0</span>
      </div>
    </aside>
  )
}
