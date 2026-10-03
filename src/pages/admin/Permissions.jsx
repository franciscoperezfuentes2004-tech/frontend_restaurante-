import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import ScrollHint from '../../components/ui/ScrollHint'
import Toast from '../../components/ui/Toast'
import {
  Shield, UtensilsCrossed, ShoppingBag, TrendingUp,
  Package, Check, Lock, ChevronDown, Sliders, X,
  Sparkles, UserCheck, Users, Loader2
} from 'lucide-react'
import {
  getRolePermissions,
  updateRolePermissions,
  getUserExtraPermissions,
  updateUserExtraPermissions
} from '../../api/permissions'
import { adminGetUsers } from '../../api/users'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

/* ─── Roles reales del sistema ────────────────────────────────────────── */

const SYSTEM_ROLES = [
  {
    id: 'admin',
    name: 'Administrador',
    description: 'Acceso total al sistema. Configuración y permisos globales no modificables.',
    system: true,
    color: 'brand',
  },
  {
    id: 'gerente',
    name: 'Gerente',
    description: 'Acceso amplio a operaciones diarias, mesas, reportes y supervisión general.',
    system: false,
    color: 'blue',
  },
  {
    id: 'mesero',
    name: 'Mesero',
    description: 'Toma de pedidos en mesas, cobros en caja, reservaciones y catálogo del menú.',
    system: false,
    color: 'emerald',
  },
  {
    id: 'cocina',
    name: 'Cocina',
    description: 'Visualización de pedidos en preparación y gestión de comandas en cocina.',
    system: false,
    color: 'amber',
  },
  {
    id: 'repartidor',
    name: 'Repartidor',
    description: 'Acceso exclusivo al panel de entregas y seguimiento de pedidos delivery.',
    system: false,
    color: 'purple',
  },
]

const PERMISSION_GROUPS = [
  {
    group: 'Menú',
    icon: 'UtensilsCrossed',
    permissions: [
      { id: 'view_categories',   label: 'Ver Categorías',          desc: 'Acceso a la lista de categorías del menú' },
      { id: 'manage_categories', label: 'Gestionar Categorías',    desc: 'Crear, editar y eliminar categorías' },
      { id: 'view_dishes',       label: 'Ver Platillos',           desc: 'Acceso al catálogo de platillos' },
      { id: 'manage_dishes',     label: 'Gestionar Platillos',     desc: 'Crear, editar y eliminar platillos' },
      { id: 'manage_extras',     label: 'Gestionar Extras',        desc: 'Crear y editar extras del menú' },
    ],
  },
  {
    group: 'Operaciones',
    icon: 'ShoppingBag',
    permissions: [
      { id: 'view_orders',         label: 'Ver Pedidos',             desc: 'Acceso al historial de pedidos' },
      { id: 'view_reservations',   label: 'Ver Reservaciones',       desc: 'Acceso a la lista de reservaciones' },
      { id: 'manage_reservations', label: 'Gestionar Reservaciones', desc: 'Confirmar y cancelar reservaciones' },
      { id: 'view_delivery',       label: 'Ver Delivery',            desc: 'Acceso a supervisión de entregas' },
    ],
  },
  {
    group: 'Marketing',
    icon: 'TrendingUp',
    permissions: [
      { id: 'manage_promotions', label: 'Gestionar Promociones', desc: 'Crear y editar promociones' },
      { id: 'view_reviews',      label: 'Ver Reseñas',           desc: 'Acceso a reseñas de clientes' },
      { id: 'respond_reviews',   label: 'Responder Reseñas',     desc: 'Publicar respuestas a reseñas' },
    ],
  },
  {
    group: 'Inventario',
    icon: 'Package',
    permissions: [
      { id: 'view_inventory',   label: 'Ver Inventario',        desc: 'Ver ingredientes, stock y proveedores' },
      { id: 'manage_inventory', label: 'Gestionar Inventario',  desc: 'Editar stock e ingredientes' },
      { id: 'manage_suppliers', label: 'Gestionar Proveedores', desc: 'Crear y editar proveedores' },
    ],
  },
  {
    group: 'Administración',
    icon: 'Shield',
    permissions: [
      { id: 'view_dashboard',  label: 'Ver Dashboard', desc: 'Acceso al panel de métricas generales' },
      { id: 'view_reports',    label: 'Ver Reportes',  desc: 'Exportar reportes de ventas' },
      { id: 'view_logs',       label: 'Ver Bitácora',  desc: 'Acceso al historial de actividad' },
      { id: 'manage_settings', label: 'Configuración', desc: 'Modificar datos y ajustes del restaurante' },
    ],
  },
]

const KEY_ALIAS = {
  view_categories: 'ver_categorias',
  manage_categories: 'gestionar_categorias',
  view_dishes: 'ver_platillos',
  manage_dishes: 'gestionar_platillos',
  manage_extras: 'gestionar_extras',
  view_orders: 'ver_pedidos',
  view_reservations: 'ver_reservaciones',
  manage_reservations: 'gestionar_reservaciones',
  view_delivery: 'ver_delivery',
  manage_promotions: 'gestionar_promociones',
  view_reviews: 'ver_resenas',
  respond_reviews: 'responder_resenas',
  view_inventory: 'ver_inventario',
  manage_inventory: 'gestionar_inventario',
  manage_suppliers: 'gestionar_proveedores',
  view_dashboard: 'ver_dashboard',
  view_reports: 'ver_reportes',
  view_logs: 'ver_bitacora',
  manage_settings: 'configuracion'
}

const roleColors = {
  brand:   { dot: 'bg-brand-400',   text: 'text-brand-300',   activeBadge: 'bg-brand-600/15 border-brand-500/25 text-brand-300'     },
  blue:    { dot: 'bg-blue-400',    text: 'text-blue-300',    activeBadge: 'bg-blue-600/15 border-blue-500/25 text-blue-300'        },
  amber:   { dot: 'bg-amber-400',   text: 'text-amber-300',   activeBadge: 'bg-amber-600/15 border-amber-500/25 text-amber-300'     },
  emerald: { dot: 'bg-emerald-400', text: 'text-emerald-300', activeBadge: 'bg-emerald-600/15 border-emerald-500/25 text-emerald-300' },
  purple:  { dot: 'bg-purple-400',  text: 'text-purple-300',  activeBadge: 'bg-purple-600/15 border-purple-500/25 text-purple-300' },
}

const groupIcons = { UtensilsCrossed, ShoppingBag, TrendingUp, Package, Shield }
const totalPerms = PERMISSION_GROUPS.reduce((s, g) => s + g.permissions.length, 0)

/* ─── Dropdown de roles ─────────────────────────────────────────── */

function RoleDropdown({ selectedRole, onSelect, availableRoles = SYSTEM_ROLES }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const current = availableRoles.find(r => r.id === selectedRole) || availableRoles[0] || SYSTEM_ROLES[1]
  const colors  = roleColors[current?.color]

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative z-50">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-3 bg-theme-input border
                   hover:border-brand-500/30 rounded-xl px-4 py-2.5 text-sm
                   transition-all duration-200 cursor-pointer min-w-[210px]
                   ${open ? 'border-brand-500/50 shadow-lg' : 'border-theme-border-subtle'}`}
      >
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${colors?.dot}`} />
        <span className={`font-semibold flex-1 text-left ${colors?.text}`}>
          {current?.name}
        </span>
        {current?.system && (
          <span className="text-[9px] bg-theme-surface text-theme-text-muted px-1.5 py-0.5
                           rounded font-medium uppercase tracking-wider">
            Sistema
          </span>
        )}
        <ChevronDown
          size={14}
          className={`text-theme-text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-full min-w-[260px] z-50
                        bg-theme-card border border-theme-border-subtle rounded-xl shadow-2xl
                        shadow-black/40 overflow-hidden animate-fadeIn">
          {availableRoles.map(role => {
            const c = roleColors[role.color]
            const isSelected = role.id === selectedRole
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => { onSelect(role.id); setOpen(false) }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left
                           transition-colors duration-150 cursor-pointer
                           ${isSelected ? 'bg-theme-input' : 'hover:bg-theme-input/50'}`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${isSelected ? c.text : 'text-theme-text'}`}>
                    {role.name}
                  </p>
                  <p className="text-[11px] text-theme-text-muted truncate">{role.description}</p>
                </div>
                {isSelected && <Check size={13} className={c.text} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─── Toggle Switch Estándar ─────────────────────────────────────── */

function Toggle({ active, disabled, onToggle, label }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-label={`Toggle ${label}`}
      className={`relative shrink-0 rounded-full transition-all duration-300 outline-none
                 ${active
                   ? 'shadow-sm'
                   : 'bg-theme-input border border-theme-border-subtle'}
                 ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
      style={{
        width: 40,
        height: 22,
        backgroundColor: active ? 'var(--theme-primary)' : undefined
      }}
    >
      <span
        className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm
                   transition-all duration-300
                   ${active ? 'left-[20px]' : 'left-[3px]'}`}
      />
    </button>
  )
}

/* ─── Vista Principal ───────────────────────────────────────────── */

export default function Permissions() {
  const { bgCard, bgSubcard, bgTable, borderSubtle, cardShadow, textColor, textMuted, colorPrimario } = useTheme()
  const { user: authUser } = useAuth()
  const authRole = (authUser?.role || authUser?.role_name || authUser?.roleId || '').toLowerCase().replace('-', '_')

  // Super Admin ve Admin y Gerente; Admin solo ve Gerente
  const availableRoles = useMemo(() => {
    if (authRole === 'super_admin' || authRole === 'superadmin') {
      return SYSTEM_ROLES.filter(r => r.id === 'admin' || r.id === 'gerente')
    }
    if (authRole === 'admin' || authRole === 'administrador') {
      return SYSTEM_ROLES.filter(r => r.id === 'gerente')
    }
    return SYSTEM_ROLES.filter(r => r.id === 'gerente')
  }, [authRole])

  const initialRole = availableRoles[0]?.id || 'gerente'
  const [selectedRole, setSelectedRole] = useState(initialRole)
  const [activeTab, setActiveTab]       = useState('role') // 'role' | 'user'
  const [permissionsMap, setPermissionsMap] = useState({})
  const [roleUsersList, setRoleUsersList]   = useState([])
  const [userPage, setUserPage]         = useState(1)
  const [saved, setSaved]               = useState(false)
  const [toast, setToast]               = useState(null)

  // Solo Admin y Gerente admiten el tab "Por usuario" (permisos personalizados)
  const canHaveUserTab = selectedRole === 'admin' || selectedRole === 'gerente'

  // Asegurar que el rol seleccionado pertenezca a los roles disponibles para el usuario autenticado
  useEffect(() => {
    if (availableRoles.length > 0 && !availableRoles.some(r => r.id === selectedRole)) {
      setSelectedRole(availableRoles[0].id)
    }
  }, [availableRoles, selectedRole])

  // Si se cambia a un rol que no admite el tab "Por usuario", regresar a "Todo el rol"
  useEffect(() => {
    if (!canHaveUserTab && activeTab === 'user') {
      setActiveTab('role')
    }
  }, [selectedRole, canHaveUserTab, activeTab])

  // Loading API states
  const [loadingRolePerms, setLoadingRolePerms] = useState(false)
  const [savingRolePerms, setSavingRolePerms]   = useState(false)
  const [loadingUsers, setLoadingUsers]         = useState(false)
  const [loadingUserModal, setLoadingUserModal] = useState(false)
  const [savingUserPerms, setSavingUserPerms]   = useState(false)

  // Scroll Hints
  const [permsScrolled, setPermsScrolled] = useState(false)
  const permsScrollRef = useRef(null)

  // Modal para Permisos Extra por Usuario
  const [drawerUser, setDrawerUser]           = useState(null)
  const [draftExtraPerms, setDraftExtraPerms] = useState([])
  const [showBasePerms, setShowBasePerms]     = useState(false)

  // Modal de Confirmación de Seguridad al Activar Permiso Extra
  const [confirmPermModal, setConfirmPermModal] = useState(null)

  // Accordion state for module groups
  const [collapsedGroups, setCollapsedGroups] = useState({})

  const toggleGroupCollapse = (groupName) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }))
  }

  const currentRole = SYSTEM_ROLES.find(r => r.id === selectedRole) || SYSTEM_ROLES[1]
  const isSystem    = currentRole?.system
  const rolePerms   = permissionsMap[selectedRole] || []
  const isAll       = selectedRole === 'admin'
  const colors      = roleColors[currentRole?.color]

  const hasPermission = (id) => {
    if (isAll) return true
    const alias = KEY_ALIAS[id] || id
    return rolePerms.includes(id) || rolePerms.includes(alias)
  }

  /* 1. GET /api/admin/permisos/{rol} al cambiar de rol */
  const fetchRolePermissions = useCallback(async () => {
    setLoadingRolePerms(true)
    try {
      const res = await getRolePermissions(selectedRole)
      if (res.data) {
        const rawPerms = res.data.permisos || res.data.permissions || res.data.data?.permisos || res.data
        if (Array.isArray(rawPerms)) {
          const activeKeys = rawPerms
            .filter(p => typeof p === 'object' ? p.activo : true)
            .map(p => typeof p === 'object' ? p.clave : p)
          setPermissionsMap(prev => ({ ...prev, [selectedRole]: activeKeys }))
        }
      }
    } catch (err) {
      console.error('API /api/admin/permisos/' + selectedRole + ' error:', err)
    } finally {
      setLoadingRolePerms(false)
    }
  }, [selectedRole])

  useEffect(() => {
    fetchRolePermissions()
  }, [fetchRolePermissions])

  /* 2. GET /api/admin/usuarios?role={rol} al cambiar a tab "Por usuario" o cambiar rol */
  const fetchRoleUsers = useCallback(async () => {
    if (activeTab !== 'user') return
    setLoadingUsers(true)
    try {
      const res = await adminGetUsers({ role: selectedRole, per_page: 100 })
      const data = res?.data
      const usersList = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.users?.data)
        ? data.users.data
        : Array.isArray(data?.users)
        ? data.users
        : Array.isArray(data)
        ? data
        : []

      setRoleUsersList(usersList)
      setUserPage(1)
    } catch (err) {
      console.error("Error al obtener usuarios para el rol " + selectedRole + ":", err)
      setRoleUsersList([])
    } finally {
      setLoadingUsers(false)
    }
  }, [selectedRole, activeTab])

  useEffect(() => {
    fetchRoleUsers()
  }, [fetchRoleUsers])

  const togglePermission = (id) => {
    if (isSystem) return
    const alias = KEY_ALIAS[id] || id
    setPermissionsMap(prev => {
      const current = prev[selectedRole] || []
      const contains = current.includes(id) || current.includes(alias)
      const updated = contains
        ? current.filter(p => p !== id && p !== alias)
        : [...current, alias]
      return { ...prev, [selectedRole]: updated }
    })
    setSaved(false)
  }

  const activePermsCount = isAll ? totalPerms : rolePerms.length

  const handleRoleChange = (id) => {
    setSelectedRole(id)
    setSaved(false)
  }

  /* 3. PUT /api/admin/permisos/{rol} al guardar cambios del rol */
  const handleSaveRolePermissions = async () => {
    setSavingRolePerms(true)
    try {
      await updateRolePermissions(selectedRole, rolePerms)
      setSaved(true)
      setToast({ message: `Permisos del rol "${currentRole?.name}" guardados correctamente en base de datos.`, type: 'success' })
    } catch (err) {
      console.error('API error saving role permissions:', err)
      setToast({ message: 'Error al guardar los permisos del rol en el servidor.', type: 'error' })
    } finally {
      setSavingRolePerms(false)
    }
  }

  // 1. Permisos activos que posee el rol base (Solo Lectura)
  const activeGroupedPermissions = useMemo(() => {
    return PERMISSION_GROUPS.map(group => {
      const activeInGroup = group.permissions.filter(p => hasPermission(p.id))
      if (activeInGroup.length === 0) return null
      return {
        ...group,
        permissions: activeInGroup
      }
    }).filter(Boolean)
  }, [rolePerms, isAll])

  // Total de permisos heredados del rol base
  const totalBasePermsCount = useMemo(() => {
    return activeGroupedPermissions.reduce((s, g) => s + g.permissions.length, 0)
  }, [activeGroupedPermissions])

  // 2. Permisos inactivos en el rol base (Editables como Permisos Extra con Toggles)
  const inactiveGroupedPermissions = useMemo(() => {
    if (isAll) return []
    return PERMISSION_GROUPS.map(group => {
      const inactiveInGroup = group.permissions.filter(p => !hasPermission(p.id))
      if (inactiveInGroup.length === 0) return null
      return {
        ...group,
        permissions: inactiveInGroup
      }
    }).filter(Boolean)
  }, [rolePerms, isAll])

  /* 4. GET /api/admin/permisos/usuario/{id} al abrir modal de usuario */
  const handleOpenUserDrawer = async (user) => {
    setDrawerUser(user)
    setDraftExtraPerms([])
    setShowBasePerms(false)
    setLoadingUserModal(true)

    try {
      const res = await getUserExtraPermissions(user.id)
      const data = res?.data
      if (data && Array.isArray(data.permisos)) {
        const activeOverrides = data.permisos
          .filter(p => p.user_override === true || (p.activo && p.tiene_excepcion))
          .map(p => p.clave)
        setDraftExtraPerms(activeOverrides)
      }
    } catch (err) {
      console.error('API /api/admin/permisos/usuario/' + user.id + ' error:', err)
    } finally {
      setLoadingUserModal(false)
    }
  }

  /* 5. Alternar Permiso Extra en el Modal */
  const handleToggleExtraPerm = (perm) => {
    const alias = KEY_ALIAS[perm.id] || perm.id
    const isCurrentlyActive = draftExtraPerms.includes(perm.id) || draftExtraPerms.includes(alias)

    if (isCurrentlyActive) {
      setDraftExtraPerms(prev => prev.filter(id => id !== perm.id && id !== alias))
    } else {
      setConfirmPermModal({ perm, user: drawerUser })
    }
  }

  /* Confirmar activación del permiso especial */
  const handleConfirmActivatePerm = () => {
    if (confirmPermModal?.perm) {
      const permKey = KEY_ALIAS[confirmPermModal.perm.id] || confirmPermModal.perm.id
      setDraftExtraPerms(prev => [...prev, permKey])
    }
    setConfirmPermModal(null)
  }

  /* 6. PUT /api/admin/permisos/usuario/{id} al guardar modal de permisos extra */
  const handleSaveExtraPermissions = async () => {
    if (!drawerUser) return
    setSavingUserPerms(true)

    try {
      await updateUserExtraPermissions(drawerUser.id, draftExtraPerms)
      setToast({
        message: `Permisos especiales guardados para "${drawerUser.name || drawerUser.nombre}".`,
        type: 'success'
      })
      setDrawerUser(null)
      fetchRoleUsers()
    } catch (err) {
      console.error('API error saving user extra permissions:', err)
      setToast({ message: 'Error al guardar los permisos especiales en el servidor', type: 'error' })
    } finally {
      setSavingUserPerms(false)
    }
  }

  // Obtener Iniciales para Avatar
  const getInitials = (name) => {
    const displayName = typeof name === 'string' ? name : ''
    if (!displayName.trim()) return 'U'
    return displayName
      .trim()
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  // Paginación para usuarios
  const userItemsPerPage = 8
  const totalUserPages = Math.max(1, Math.ceil(roleUsersList.length / userItemsPerPage))
  const displayedUsers = roleUsersList.slice((userPage - 1) * userItemsPerPage, userPage * userItemsPerPage)

  return (
    <div className="space-y-6 pb-12 animate-fadeIn p-4 md:p-6 lg:p-8 font-sans text-left">

      {/* ── Encabezado ── */}
      <div className="flex items-center justify-between flex-wrap gap-3 max-md:flex-col max-md:items-start">
        <div>
          <h1 className="text-3xl font-bold text-theme-text max-md:text-2xl">Permisos</h1>
          <p className="text-theme-text-muted text-sm mt-1">
            Define qué puede hacer cada rol dentro del panel y asigna excepciones personales por usuario.
          </p>
        </div>
        <div className="flex items-center gap-3 max-md:w-full max-md:justify-between">
          {activeTab === 'role' && !isSystem && !saved && (
            <button
              onClick={handleSaveRolePermissions}
              disabled={savingRolePerms}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500
                         text-theme-text text-sm font-medium px-5 py-2.5 max-md:px-4 max-md:w-full max-md:justify-center rounded-xl
                         shadow-lg shadow-brand-600/30 transition-all duration-200
                         cursor-pointer animate-fadeIn disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingRolePerms ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              <span>Guardar cambios del rol</span>
            </button>
          )}
          {activeTab === 'role' && saved && (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20
                            text-emerald-300 text-sm px-4 py-2.5 max-md:w-full max-md:justify-center rounded-xl animate-fadeIn font-medium">
              <Check size={15} /> Cambios guardados
            </div>
          )}
        </div>
      </div>

      {/* ── Contenedor Principal Unificado Nivel 1 (Filtros + Lista de Permisos / Usuarios) ── */}
      <div className="rounded-2xl p-6 max-md:p-3 transition-colors duration-200 animate-fadeInUp space-y-5 relative" style={{ backgroundColor: bgCard, border: `1px solid ${borderSubtle}`, boxShadow: cardShadow }}>
        
        {/* ── Toolbar Superior: Selector de Rol y Tabs de Modo ── */}
        <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-theme-border-subtle max-md:pb-3 max-md:gap-3">
          <div className="flex items-center gap-4 flex-wrap max-md:w-full max-md:justify-between">
            <RoleDropdown selectedRole={selectedRole} onSelect={handleRoleChange} availableRoles={availableRoles} />

            {/* Selector de Modo: Todo el rol / Por usuario */}
            <div className="flex items-center gap-1 bg-theme-input p-1 rounded-xl border border-theme-border-subtle max-md:flex-1 max-md:justify-center">
              <button
                type="button"
                onClick={() => setActiveTab('role')}
                className={`flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer max-md:flex-1 ${
                  activeTab === 'role'
                    ? 'bg-brand-600 text-theme-text shadow-md shadow-brand-600/30'
                    : 'text-theme-text-muted hover:text-theme-text hover:bg-theme-card'
                }`}
              >
                <Shield size={13} />
                <span className="max-md:hidden">Todo el rol</span><span className="md:hidden">Rol</span>
              </button>
              <button
                type="button"
                onClick={() => canHaveUserTab && setActiveTab('user')}
                disabled={!canHaveUserTab}
                title={!canHaveUserTab ? 'Este rol no admite permisos personalizados' : 'Ver permisos por usuario'}
                className={`flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all max-md:flex-1 ${
                  !canHaveUserTab
                    ? 'opacity-40 cursor-not-allowed text-theme-text-muted'
                    : activeTab === 'user'
                    ? 'bg-brand-600 text-theme-text shadow-md shadow-brand-600/30 cursor-pointer'
                    : 'text-theme-text-muted hover:text-theme-text hover:bg-theme-card cursor-pointer'
                }`}
              >
                <Users size={13} />
                <span className="max-md:hidden">Por usuario</span><span className="md:hidden">Usuario</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isSystem && (
              <div className="flex items-center gap-1.5 bg-theme-input border border-theme-border-subtle rounded-lg px-3 py-1.5">
                <Lock size={11} className="text-theme-text-muted" />
                <span className="text-xs text-theme-text-muted font-medium">Solo lectura</span>
              </div>
            )}
            <div className="text-right">
              <p className={`text-xl font-bold tabular-nums ${colors?.text}`}>
                {activePermsCount}
                <span className="text-theme-text-muted font-normal">/{totalPerms}</span>
              </p>
              <p className="text-[10px] text-theme-text-muted text-right font-medium">permisos activos</p>
            </div>
          </div>
        </div>

        {/* ── Modo 1: "Todo el rol" ── */}
        {activeTab === 'role' && (
          <div className="space-y-5 relative">

            {/* Indicador de carga de permisos de rol */}
            {loadingRolePerms && (
              <div className="absolute inset-0 bg-theme-surface/60 backdrop-blur-xs z-20 flex items-center justify-center gap-2 text-theme-text text-xs font-medium rounded-2xl">
                <Loader2 size={16} className="animate-spin text-brand-400" />
                <span>Cargando permisos del rol desde el servidor...</span>
              </div>
            )}

            {/* Alertas explicativas de roles de sistema */}
            {selectedRole === 'admin' && (
              <div className="flex items-start gap-2.5 bg-brand-600/10 border border-brand-500/20 rounded-xl px-4 py-3">
                <Shield size={13} className="text-brand-400 shrink-0 mt-0.5" />
                <p className="text-brand-300/70 text-xs leading-relaxed">
                  El Administrador posee acceso total e irrestricto a todas las funciones. Sus permisos no pueden modificarse por seguridad.
                </p>
              </div>
            )}

            {/* Sub-Card Container Nivel 2 */}
            <div className="mt-4 space-y-4">
              {/* Lista de Permisos Base Agrupados (Contenedor Nivel 3) */}
              <div 
                className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden w-full transition-colors duration-200 shadow-xs" 
                style={{ borderColor: borderSubtle }}
              >
                {/* Grupos de permisos */}
                {PERMISSION_GROUPS.map((group) => {
                  const Icon = groupIcons[group.icon]
                  const groupActive = group.permissions.filter(p => hasPermission(p.id)).length
                  const isCollapsed = Boolean(collapsedGroups[group.group])

                  return (
                    <div key={group.group} className="border-b last:border-b-0 border-gray-200 dark:border-gray-700" style={{ borderColor: borderSubtle }}>

                      {/* Encabezado del Módulo (Nivel 2 - Tono 2 / Acordeón con Acentos en Color Primario) */}
                      <div 
                        onClick={() => toggleGroupCollapse(group.group)}
                        className="border-y first:border-t-0 px-5 py-3.5 font-semibold flex items-center justify-between cursor-pointer select-none transition-colors duration-150 hover:bg-gray-100/70 dark:hover:bg-gray-800/40"
                        style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: borderSubtle }}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs" 
                            style={{ 
                              backgroundColor: 'color-mix(in srgb, var(--theme-primary) 12%, transparent)', 
                              borderColor: 'color-mix(in srgb, var(--theme-primary) 25%, transparent)',
                              borderWidth: '1px',
                              borderStyle: 'solid',
                              color: 'var(--theme-primary)' 
                            }}
                          >
                            {Icon && <Icon size={15} style={{ color: 'var(--theme-primary)' }} />}
                          </div>
                          <span className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--theme-primary)' }}>
                            {group.group}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span 
                            className="text-xs font-bold tabular-nums px-2.5 py-0.5 rounded-full shadow-xs" 
                            style={{ 
                              backgroundColor: 'color-mix(in srgb, var(--theme-primary) 12%, transparent)', 
                              borderColor: 'color-mix(in srgb, var(--theme-primary) 25%, transparent)',
                              borderWidth: '1px',
                              borderStyle: 'solid',
                              color: 'var(--theme-primary)' 
                            }}
                          >
                            {groupActive}/{group.permissions.length}
                          </span>
                          <ChevronDown
                            size={16}
                            style={{ color: 'var(--theme-primary)' }}
                            className={`transition-transform duration-200 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}
                          />
                        </div>
                      </div>

                      {/* Filas de Permisos (Nivel 3 - Tono 1) */}
                      {!isCollapsed && (
                        <div 
                          className="divide-y" 
                          style={{ backgroundColor: 'var(--theme-surface)', borderColor: borderSubtle }}
                        >
                          {group.permissions.map((perm) => {
                            const active = hasPermission(perm.id)

                            return (
                              <div
                                key={perm.id}
                                onClick={() => !isSystem && togglePermission(perm.id)}
                                className={`relative flex items-center justify-between px-5 py-4 transition-colors duration-150 hover:bg-gray-50/60 dark:hover:bg-gray-800/50 ${!isSystem ? 'cursor-pointer' : 'cursor-default'}`}
                                style={{ backgroundColor: 'var(--theme-surface)', borderColor: borderSubtle }}
                              >
                                <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-6">
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0 transition-colors duration-200"
                                    style={{ backgroundColor: active ? 'var(--theme-primary)' : 'rgba(156, 163, 175, 0.4)' }}
                                  />
                                  <div className="min-w-0 text-left">
                                    <p className="text-sm font-semibold leading-snug" style={{ color: textColor || 'var(--theme-text)' }}>
                                      {perm.label}
                                    </p>
                                    <p className="text-xs mt-0.5 leading-relaxed" style={{ color: textMuted || 'var(--theme-text-muted)' }}>
                                      {perm.desc}
                                    </p>
                                  </div>
                                </div>

                                <div className="shrink-0" onClick={e => e.stopPropagation()}>
                                  <Toggle
                                    active={active}
                                    disabled={isSystem}
                                    label={perm.label}
                                    onToggle={() => togglePermission(perm.id)}
                                  />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Modo 2: "Por usuario" ── */}
        {activeTab === 'user' && (
          <div className="space-y-5 relative">
            {/* Indicador de carga de usuarios */}
            {loadingUsers && (
              <div className="absolute inset-0 bg-theme-surface/60 backdrop-blur-xs z-20 flex items-center justify-center gap-2 text-theme-text-muted text-xs font-medium rounded-2xl">
                <Loader2 size={16} className="animate-spin text-brand-400" />
                <span>Cargando usuarios del rol desde el servidor...</span>
              </div>
            )}

            <div className="flex items-center justify-between border-b border-theme-border-subtle pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-300 flex items-center justify-center">
                  <Users size={16} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-theme-text">Usuarios con el rol "{currentRole?.name}"</h2>
                  <p className="text-xs text-theme-text-muted mt-0.5">Configuración individual y asignación de excepciones personales por empleado.</p>
                </div>
              </div>
              <span className="text-xs text-theme-text-muted font-mono bg-theme-input border border-theme-border-subtle px-3 py-1 rounded-full">
                {roleUsersList.length} {roleUsersList.length === 1 ? 'usuario' : 'usuarios'}
              </span>
            </div>

            {/* Tabla Compacta de Usuarios */}
            <div className="overflow-x-auto w-full shadow-sm rounded-xl border transition-colors mt-4" style={{ borderColor: borderSubtle }}>
              <table className="w-full text-xs text-theme-text border-collapse min-w-[1000px]">
                  <thead className="text-theme-text-muted text-xs font-bold uppercase tracking-wider" style={{ backgroundColor: bgSubcard, borderBottom: `1.5px solid ${borderSubtle}` }}>
                    <tr>
                      <th className="px-5 py-3.5 text-left">Empleado</th>
                      <th className="px-5 py-3.5 text-left">Correo Electrónico</th>
                      <th className="px-5 py-3.5 text-left">Configuración de Acceso</th>
                      <th className="px-5 py-3.5 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody style={{ backgroundColor: bgTable }}>
                    {loadingUsers ? (
                      <tr>
                        <td colSpan="4" className="p-4">
                          <div className="space-y-2.5">
                            <div className="animate-shimmer rounded-lg h-12 w-full" />
                            <div className="animate-shimmer rounded-lg h-12 w-full" />
                            <div className="animate-shimmer rounded-lg h-12 w-full" />
                          </div>
                        </td>
                      </tr>
                    ) : roleUsersList.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="p-0 border-b border-theme-border-subtle h-32 relative" style={{ backgroundColor: bgTable }}>
                          <div className="sticky left-0 w-full flex flex-col justify-center items-center h-full py-8 text-center text-theme-text-muted font-medium">
                            No hay usuarios asignados al rol "{currentRole?.name}" actualmente.
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <>
                        {displayedUsers.map(user => {
                          const userName = user.name || user.nombre || 'Usuario'
                          const userEmail = user.email || user.correo || '—'
                          const hasCustomPerms = Boolean(user.has_custom_permissions || user.tiene_permisos_personalizados)

                          return (
                            <tr 
                              key={user.id} 
                              className="border-b transition-colors duration-150 hover:bg-[var(--theme-card)]"
                              style={{ backgroundColor: 'var(--theme-surface)', borderColor: borderSubtle }}
                            >
                              {/* Avatar + Nombre */}
                              <td className="px-5 py-3.5 h-[68px]">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-black flex items-center justify-center shrink-0">
                                    {getInitials(userName)}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-theme-text text-sm">{userName}</span>
                                    {hasCustomPerms && (
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                                        <Sparkles size={10} /> Permisos personalizados
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Correo */}
                              <td className="px-5 py-3.5 text-left text-theme-text-muted font-mono">
                                {userEmail}
                              </td>

                              {/* Estado Acceso */}
                              <td className="px-5 py-3.5 text-left">
                                {hasCustomPerms ? (
                                  <span className="text-[11px] text-purple-300 font-medium flex items-center gap-1.5">
                                    <UserCheck size={13} className="text-purple-400" />
                                    Permisos especiales activos
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-theme-text-muted font-medium">
                                    Estándar del rol ({activePermsCount} permisos)
                                  </span>
                                )}
                              </td>

                              {/* Acciones */}
                              <td className="px-5 py-3.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleOpenUserDrawer(user)}
                                  disabled={isAll}
                                  className={`flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer mx-auto ${
                                    isAll
                                      ? 'bg-theme-input text-theme-text-muted border border-theme-border-subtle cursor-not-allowed'
                                      : 'bg-brand-600/15 hover:bg-brand-600/25 border border-brand-500/30 text-brand-300 shadow-sm'
                                  }`}
                                  title={isAll ? 'El Administrador ya cuenta con todos los permisos' : 'Gestionar permisos especiales'}
                                >
                                  <Sliders size={13} />
                                  <span>Permisos extra</span>
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                        
                        {/* Empty Rows Fill */}
                        {displayedUsers.length > 0 && Array.from({ length: userItemsPerPage - displayedUsers.length }).map((_, idx) => (
                          <tr 
                            key={`empty-${idx}`} 
                            className="border-b border-transparent"
                            style={{ backgroundColor: 'var(--theme-surface)' }}
                          >
                            <td colSpan="4" className="px-5 py-3.5 h-[68px]"></td>
                          </tr>
                        ))}
                      </>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer de Paginación */}
              {roleUsersList.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
                  <div className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                    Mostrando <span className="font-semibold text-theme-text">{(userPage - 1) * userItemsPerPage + 1}</span> a <span className="font-semibold text-theme-text">{Math.min(userPage * userItemsPerPage, roleUsersList.length)}</span> de <span className="font-semibold text-theme-text">{roleUsersList.length}</span> usuarios
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setUserPage(prev => Math.max(prev - 1, 1))}
                      disabled={userPage === 1}
                      className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        userPage > 1 
                          ? 'bg-brand-600 border-brand-500 text-white cursor-pointer hover:bg-brand-500' 
                          : 'bg-theme-surface text-theme-text opacity-40 cursor-not-allowed'
                      }`}
                      style={userPage === 1 ? { borderColor: borderSubtle } : {}}
                    >
                      Anterior
                    </button>

                    <div className="px-3 py-1 text-xs font-bold font-mono rounded-xl bg-theme-input text-theme-text border border-theme-border-subtle">
                      {userPage} / {totalUserPages}
                    </div>

                    <button
                      onClick={() => setUserPage(prev => Math.min(prev + 1, totalUserPages))}
                      disabled={userPage === totalUserPages}
                      className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        userPage < totalUserPages 
                          ? 'bg-brand-600 border-brand-500 text-white cursor-pointer hover:bg-brand-500' 
                          : 'bg-theme-surface text-theme-text opacity-40 cursor-not-allowed'
                      }`}
                      style={userPage === totalUserPages ? { borderColor: borderSubtle } : {}}
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
          </div>
        )}

      </div>

      {/* ── Toast Notifications ── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* ── Modal Centrado: Permisos Extra por Usuario ── */}
      {drawerUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fadeIn">
          {/* Backdrop Click Area */}
          <div className="absolute inset-0" onClick={() => setDrawerUser(null)} />

          {/* Modal Centrado Container */}
          <div className="relative bg-theme-card rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10 animate-scaleUp text-left">
            
            {/* Encabezado Compacto */}
            <div 
              className="px-6 py-4 flex items-center justify-between shrink-0 transition-colors border-t border-x border-b"
              style={{ 
                backgroundColor: colorPrimario || 'var(--theme-primary)', 
                borderColor: colorPrimario || 'var(--theme-primary)',
                color: 'var(--theme-primary-contrast, #ffffff)' 
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-white/20 border border-white/30 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-md">
                  {getInitials(drawerUser.name || drawerUser.nombre)}
                </div>
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <h3 className="text-sm font-bold truncate" style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}>
                    {drawerUser.name || drawerUser.nombre}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-white/20 border border-white/30" style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}>
                    {currentRole?.name}
                  </span>
                  <span className="text-xs font-mono truncate hidden sm:inline opacity-80" style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}>
                    {drawerUser.email || drawerUser.correo}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerUser(null)}
                className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer shrink-0 ml-2"
                style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Cuerpo del Modal con Scroll Interno */}
            <div 
              className="p-6 overflow-y-auto flex-1 space-y-6 scrollbar-thin scrollbar-thumb-white/10 relative border-x border-b border-theme-border-subtle rounded-b-3xl"
              style={{ borderColor: borderSubtle }}
            >

              {loadingUserModal && (
                <div className="absolute inset-0 bg-theme-card/80 backdrop-blur-xs z-30 flex items-center justify-center gap-2 text-theme-text text-xs font-medium">
                  <Loader2 size={16} className="animate-spin text-purple-400" />
                  <span>Cargando permisos del usuario...</span>
                </div>
              )}

              {/* Sección Principal: Permisos extra */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-theme-border-subtle">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-purple-400" />
                    <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                      PERMISOS EXTRA (EXCEPCIONES)
                    </span>
                  </div>
                  <span className="text-[10px] text-purple-300 font-bold bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 rounded-full">
                    Editables
                  </span>
                </div>
                <p className="text-[11px] text-theme-text-muted leading-normal">
                  Activa individualmente permisos adicionales que su rol base NO posee. Se aplicarán como excepción personal.
                </p>

                {inactiveGroupedPermissions.length === 0 ? (
                  <div className="p-4 bg-theme-input rounded-xl text-center text-xs text-theme-text-muted">
                    Este rol ya cuenta con todos los permisos del sistema activos.
                  </div>
                ) : (
                  inactiveGroupedPermissions.map(group => {
                    const Icon = groupIcons[group.icon]
                    return (
                      <div key={group.group} className="space-y-2 pt-2">
                        <div className="flex items-center gap-2">
                          {Icon && <Icon size={12} className="text-purple-400/70" />}
                          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300/60">
                            {group.group}
                          </span>
                        </div>
                        <div className="space-y-1.5 pl-3 border-l border-theme-border-subtle">
                          {group.permissions.map(perm => {
                            const alias = KEY_ALIAS[perm.id] || perm.id
                            const isActive = draftExtraPerms.includes(perm.id) || draftExtraPerms.includes(alias)
                            return (
                              <div
                                key={perm.id}
                                className="flex items-center justify-between p-3 rounded-xl bg-theme-input border border-theme-border-subtle hover:bg-theme-surface transition-all"
                              >
                                <div>
                                  <p className="text-xs font-semibold text-theme-text">{perm.label}</p>
                                  <p className="text-[10px] text-theme-text-muted">{perm.desc}</p>
                                </div>
                                <Toggle
                                  active={isActive}
                                  label={perm.label}
                                  onToggle={() => handleToggleExtraPerm(perm)}
                                />
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Botón Acordeón de Permisos Heredados */}
              <div className="pt-2 border-t border-theme-border-subtle">
                <button
                  type="button"
                  onClick={() => setShowBasePerms(v => !v)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-theme-input hover:opacity-90 text-theme-text-muted text-xs font-semibold transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Shield size={13} className="text-theme-text-muted" />
                    <span>Permisos heredados del rol ({totalBasePermsCount})</span>
                  </div>
                  <ChevronDown size={14} className={`transition-transform duration-200 ${showBasePerms ? 'rotate-180' : ''}`} />
                </button>

                {showBasePerms && (
                  <div className="mt-3 space-y-3 p-3 bg-theme-surface rounded-xl border border-theme-border-subtle animate-fadeIn">
                    {activeGroupedPermissions.map(group => (
                      <div key={group.group} className="space-y-1">
                        <p className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">{group.group}</p>
                        {group.permissions.map(p => (
                          <div key={p.id} className="flex items-center justify-between text-xs py-1">
                            <span className="text-theme-text-muted">{p.label}</span>
                            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Activo por rol</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Footer Modal */}
            <div className="p-4 bg-theme-surface border-t border-theme-border-subtle flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setDrawerUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-theme-text-muted hover:text-theme-text bg-theme-input hover:opacity-80 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveExtraPermissions}
                disabled={savingUserPerms}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-theme-text bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {savingUserPerms ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                <span>Guardar permisos especiales</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal Confirmación de Seguridad */}
      {confirmPermModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-theme-card border border-amber-500/30 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-scaleUp text-left">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0">
                <Shield size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-theme-text">Confirmación de Seguridad</h4>
                <p className="text-[11px] text-amber-300/80 font-medium">Permiso especial de acceso</p>
              </div>
            </div>
            <p className="text-xs text-theme-text-muted leading-relaxed">
              ¿Desea otorgar el permiso especial <strong className="text-theme-text">"{confirmPermModal.perm?.label}"</strong> a <strong className="text-theme-text">{confirmPermModal.user?.name || confirmPermModal.user?.nombre}</strong>?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmPermModal(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-theme-text-muted hover:text-theme-text bg-theme-input transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmActivatePerm}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold text-theme-text bg-amber-600 hover:bg-amber-500 shadow-md shadow-amber-600/30 transition-all cursor-pointer"
              >
                Otorgar permiso
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
