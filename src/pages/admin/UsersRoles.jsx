import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { 
  Search, UserPlus, Phone, ShieldAlert, Check, X, Edit, Trash2, 
  Users, User, Lock, UserX, Mail, Eye, EyeOff, KeyRound, Power,
  ChevronLeft, ChevronRight, RefreshCw, Download, FileText
} from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Toast from '../../components/ui/Toast'
import EmptyState from '../../components/ui/EmptyState'
import Dropdown from '../../components/ui/Dropdown'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import StatCard from '../../components/ui/StatCard'
import MetricCardsLayout from '../../components/ui/MetricCardsLayout'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import {
  adminGetUsersStats,
  adminGetUsers,
  adminCreateUser,
  adminUpdateUser,
  adminDeleteUser,
  adminToggleUserStatus,
  adminResetUserPassword
} from '../../api/users'
import { validateUser } from '../../validators/userValidator'

const roleFilterOptions = [
  { value: 'all', label: 'Todos los Roles' },
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'gerente', label: 'Gerente' },
  { value: 'cajero', label: 'Cajero' },
  { value: 'mesero', label: 'Mesero' },
  { value: 'cocina', label: 'Cocina' },
  { value: 'repartidor', label: 'Repartidor' }
]
const ROLE_FILTER_OPTIONS = roleFilterOptions

const ROLE_BADGES = {
  super_admin: { label: 'SUPER ADMIN' },
  superadmin:  { label: 'SUPER ADMIN' },
  admin:       { label: 'ADMIN' },
  administrador: { label: 'ADMIN' },
  gerente:     { label: 'GERENTE' },
  mesero:      { label: 'MESERO' },
  cajero:      { label: 'CAJERO' },
  cocina:      { label: 'COCINA' },
  chef:        { label: 'COCINA' },
  repartidor:  { label: 'REPARTIDOR' },
  delivery:    { label: 'REPARTIDOR' },
}

const getRoleBadge = (roleKey) => {
  const norm = (roleKey || 'mesero').toString().toLowerCase().trim().replace('-', '_')
  const cfg = ROLE_BADGES[norm]
  if (cfg) return cfg
  return { label: (roleKey || 'Usuario').toString().toUpperCase() }
}

export default function UsersRoles() {
  const { bgCard, bgSubcard, bgTable, borderSubtle, cardShadow, textColor } = useTheme()
  const { user: authUser } = useAuth()
  const authRole = (authUser?.role || authUser?.role_name || authUser?.roleId || '').toLowerCase().replace('-', '_')
  const canResetPassword = authRole === 'admin' || authRole === 'administrador' || authRole === 'super_admin' || authRole === 'superadmin'

  // Metric Stats
  const [statsData, setStatsData] = useState({
    total_cuentas: 0,
    activos: 0,
    inactivos: 0
  })

  // Table Data & Pagination
  const [usersList, setUsersList] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    currentPage: 1,
    lastPage: 1,
    total: 0
  })

  // UI Feedback
  const [toast, setToast] = useState(null)
  const [usersScrolled, setUsersScrolled] = useState(false)
  const usersScrollRef = useRef(null)

  // Form / Modal states
  const [userName, setUserName] = useState('')
  const [nameTouched, setNameTouched] = useState(false)
  const [userPhone, setUserPhone] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userRole, setUserRole] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState('')
  const [editingUser, setEditingUser] = useState(null)
  const [showFormModal, setShowFormModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)

  // Creation roles hierarchy based on authenticated user's role
  const creationRoleOptions = useMemo(() => {
    if (authRole === 'super_admin' || authRole === 'superadmin') {
      return [
        { value: 'admin', label: 'Admin' },
        { value: 'gerente', label: 'Gerente' },
        { value: 'mesero', label: 'Mesero' },
        { value: 'cocina', label: 'Cocina' },
        { value: 'repartidor', label: 'Repartidor' }
      ]
    }
    if (authRole === 'admin' || authRole === 'administrador') {
      return [
        { value: 'gerente', label: 'Gerente' },
        { value: 'mesero', label: 'Mesero' },
        { value: 'cocina', label: 'Cocina' },
        { value: 'repartidor', label: 'Repartidor' }
      ]
    }
    if (authRole === 'gerente') {
      return [
        { value: 'mesero', label: 'Mesero' },
        { value: 'cocina', label: 'Cocina' },
        { value: 'repartidor', label: 'Repartidor' }
      ]
    }
    return [
      { value: 'mesero', label: 'Mesero' },
      { value: 'cocina', label: 'Cocina' },
      { value: 'repartidor', label: 'Repartidor' }
    ]
  }, [authRole])

  // Debounce search input (400ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(handler)
  }, [search])

  // Reset page when role filter changes
  useEffect(() => {
    setPage(1)
  }, [roleFilter])

  // Fetch metric stats from GET /api/admin/usuarios/stats
  const fetchStats = async () => {
    try {
      const res = await adminGetUsersStats()
      const data = res?.data
      if (data) {
        setStatsData({
          total_cuentas: data.total_cuentas ?? data.total ?? data.total_users ?? 0,
          activos: data.activos ?? data.usuarios_activos ?? data.active_users ?? data.active ?? 0,
          inactivos: data.inactivos ?? data.cuentas_inactivas ?? data.inactive_users ?? data.inactive ?? 0
        })
      }
    } catch (err) {
      console.error("Error al cargar stats de usuarios:", err)
    }
  }

  const ITEMS_PER_PAGE = 8

  // Fetch paginated users from GET /api/admin/usuarios
  const fetchUsersData = useCallback(async () => {
    try {
      setLoading(true)
      const params = { page, per_page: ITEMS_PER_PAGE }
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim()
      if (roleFilter !== 'all') {
        params.role = roleFilter
      }

      const res = await adminGetUsers(params)
      const data = res?.data

      if (data) {
        const rawUsers = Array.isArray(data.data)
          ? data.data
          : Array.isArray(data.users?.data)
          ? data.users.data
          : Array.isArray(data.users)
          ? data.users
          : Array.isArray(data)
          ? data
          : []

        setUsersList(rawUsers)

        setPagination({
          currentPage: data.current_page ?? data.users?.current_page ?? page,
          lastPage: data.last_page ?? data.users?.last_page ?? (Math.ceil(rawUsers.length / ITEMS_PER_PAGE) || 1),
          total: data.total ?? data.users?.total ?? rawUsers.length
        })
      } else {
        setUsersList([])
      }
    } catch (err) {
      console.error("Error al cargar la lista de usuarios:", err)
      setUsersList([])
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, roleFilter, page])

  useEffect(() => {
    fetchUsersData()
  }, [fetchUsersData])

  useEffect(() => {
    fetchStats()
  }, [])

  // Name validation in real-time
  const nameValidationError = useMemo(() => {
    const trimmed = userName.trim()
    if (!trimmed) {
      return 'El nombre completo es obligatorio.'
    }
    if (trimmed.length < 3) {
      return 'El nombre debe contener al menos 3 caracteres.'
    }
    if (trimmed.length > 100) {
      return 'El nombre es demasiado largo (máximo 100 caracteres).'
    }
    return ''
  }, [userName])

  const nameError = (nameTouched || Boolean(formError)) ? nameValidationError : ''

  // Password security parameters (6 mandatory rules in real-time)
  const passwordRules = useMemo(() => {
    return [
      { id: 'lowercase', label: 'Letra minúscula', valid: /(?=.*[a-z])/.test(password) },
      { id: 'uppercase', label: 'Letra mayúscula', valid: /(?=.*[A-Z])/.test(password) },
      { id: 'number', label: 'Número', valid: /(?=.*\d)/.test(password) },
      { id: 'symbol', label: 'Símbolo', valid: /(?=.*[@$!%*?&._-])/.test(password) },
      { id: 'noSpaces', label: 'Sin espacios', valid: password.length > 0 && /^\S+$/.test(password) },
      { id: 'minChar', label: 'Mínimo 8 caracteres', valid: password.length >= 8 },
    ]
  }, [password])

  const isPasswordValid = useMemo(() => {
    return passwordRules.every(r => r.valid)
  }, [passwordRules])

  // Helper to extract user display name from multiple possible backend field names
  const getUserDisplayName = (userItem) => {
    if (!userItem) return 'Usuario'
    return (
      userItem.name ||
      userItem.nombre ||
      userItem.username ||
      userItem.usuario ||
      userItem.user_name ||
      userItem.user ||
      (userItem.email ? userItem.email.split('@')[0] : 'Usuario')
    )
  }

  // Get Initials for Avatar
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

  // Format last login to absolute localized date (DD/MM/YYYY - HH:mm hrs) or "Nunca"
  const formatLastLogin = (rawDate) => {
    if (!rawDate) return 'Nunca'
    if (typeof rawDate === 'string') {
      const lower = rawDate.trim().toLowerCase()
      if (lower === 'nunca' || lower === 'never' || lower === 'null' || lower === 'undefined' || lower === '') {
        return 'Nunca'
      }
    }

    try {
      const date = new Date(rawDate)
      if (isNaN(date.getTime())) {
        return rawDate
      }

      const pad = (n) => String(n).padStart(2, '0')
      const day = pad(date.getDate())
      const month = pad(date.getMonth() + 1)
      const year = date.getFullYear()
      const hours = pad(date.getHours())
      const minutes = pad(date.getMinutes())

      return `${day}/${month}/${year} - ${hours}:${minutes} hrs`
    } catch {
      return 'Nunca'
    }
  }

  // Handle Add/Edit User Submit
  const handleSaveUser = async (e) => {
    e.preventDefault()
    setFormError('')
    setNameTouched(true)

    if (nameValidationError) {
      setFormError(nameValidationError)
      return
    }

    const selectedRole = userRole || creationRoleOptions[0]?.value || ''

    // Validación estricta Zod de los 4 campos del formulario
    const validation = validateUser({
      name: userName,
      phone: userPhone,
      email: userEmail,
      role: selectedRole
    })

    if (!validation.isValid) {
      setFormError(validation.firstError || 'Por favor revise los datos ingresados.')
      return
    }

    const { name: cleanName, phone: cleanPhone, email: cleanEmail, role: cleanRole } = validation.data

    // 5. Validación de Contraseña
    if (!editingUser) {
      if (!password.trim()) {
        setFormError('Ingrese una contraseña para la cuenta.')
        return
      }
      if (!isPasswordValid) {
        setFormError('La contraseña debe cumplir con todos los parámetros de seguridad obligatorios.')
        return
      }
    } else {
      if (password.trim() && !isPasswordValid) {
        setFormError('La nueva contraseña ingresada debe cumplir con todos los parámetros de seguridad.')
        return
      }
    }

    try {
      setSubmitting(true)
      if (editingUser) {
        // Edit User
        const payload = {
          name: cleanName,
          phone: cleanPhone,
          email: cleanEmail,
          role: cleanRole
        }
        if (password.trim()) {
          payload.password = password
        }

        await adminUpdateUser(editingUser.id, payload)
        setToast({ message: `Usuario "${cleanName}" actualizado con éxito.`, type: 'success' })
      } else {
        // Create User (POST /api/admin/usuarios)
        const payload = {
          name: cleanName,
          phone: cleanPhone,
          email: cleanEmail,
          role: cleanRole,
          password: password
        }

        await adminCreateUser(payload)
        setToast({ message: `Usuario "${cleanName}" registrado con éxito en la plataforma.`, type: 'success' })
      }

      handleClearForm()
      fetchUsersData()
      fetchStats()
    } catch (err) {
      console.error("Error al guardar usuario:", err)
      const serverMsg = err.response?.data?.message
      const validationErrs = err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(', ') : null
      setFormError(serverMsg || validationErrs || 'Error al procesar la solicitud del usuario.')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Password Reset in Edit Modal
  const handleResetPasswordInModal = async () => {
    if (!editingUser) return
    if (!password.trim()) {
      setFormError('Ingrese la nueva contraseña en el campo correspondiente antes de restablecer.')
      return
    }
    if (!isPasswordValid) {
      setFormError('La nueva contraseña debe cumplir con los 6 parámetros de seguridad obligatorios.')
      return
    }

    try {
      setResettingPassword(true)
      setFormError('')
      const payload = { password: password.trim() }
      const res = await adminResetUserPassword(editingUser.id, payload)
      const msg = res.data?.message || `Contraseña de "${editingUser.name}" restablecida correctamente.`
      setToast({ message: msg, type: 'success' })
      setPassword('')
      setShowPassword(false)
    } catch (err) {
      console.error("Error al restablecer contraseña:", err)
      const serverMsg = err.response?.data?.message
      const validationErrs = err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(', ') : null
      setFormError(serverMsg || validationErrs || 'Error al restablecer la contraseña.')
      setToast({ message: serverMsg || validationErrs || 'Error al restablecer la contraseña', type: 'error' })
    } finally {
      setResettingPassword(false)
    }
  }

  // Open Edit Modal on Row Click
  const handleOpenEdit = (userItem) => {
    setEditingUser(userItem)
    setUserName(userItem.name || '')
    setNameTouched(false)
    setUserPhone(userItem.phone || '')
    setUserEmail(userItem.email || '')
    setUserRole(userItem.role || userItem.roleId || creationRoleOptions[0]?.value || 'mesero')
    setPassword('')
    setShowPassword(false)
    setFormError('')
    setShowFormModal(true)
  }

  // Open Create Modal
  const handleOpenCreate = () => {
    handleClearForm()
    setUserRole(creationRoleOptions[0]?.value || 'mesero')
    setShowFormModal(true)
  }

  // Toggle Active/Inactive Status (Optimistic Update for instant UI feedback)
  const handleToggleStatus = async (userItem) => {
    const isCurrentlyActive = userItem.status === 'activo' || userItem.is_active === 1 || userItem.active === true
    const nextActive = !isCurrentlyActive
    const nextStatusStr = nextActive ? 'activo' : 'inactivo'

    // 1. Optimistically update local users list immediately
    setUsersList(prev => prev.map(u => {
      if (u.id === userItem.id) {
        return {
          ...u,
          is_active: nextActive,
          active: nextActive,
          status: nextStatusStr
        }
      }
      return u
    }))

    // 2. Optimistically update stats metrics cards immediately
    setStatsData(prev => ({
      ...prev,
      activos: nextActive ? (prev.activos || 0) + 1 : Math.max(0, (prev.activos || 0) - 1),
      inactivos: nextActive ? Math.max(0, (prev.inactivos || 0) - 1) : (prev.inactivos || 0) + 1
    }))

    setToast({ message: `Estado de "${userItem.name || 'usuario'}" actualizado a ${nextStatusStr.toUpperCase()}.`, type: 'success' })

    // 3. Perform background API call
    try {
      await adminToggleUserStatus(userItem.id, nextStatusStr)
    } catch (err) {
      console.error("Error al alternar estado en el servidor:", err)

      // Revert optimistic state on failure
      setUsersList(prev => prev.map(u => {
        if (u.id === userItem.id) {
          return {
            ...u,
            is_active: isCurrentlyActive,
            active: isCurrentlyActive,
            status: isCurrentlyActive ? 'activo' : 'inactivo'
          }
        }
        return u
      }))

      setStatsData(prev => ({
        ...prev,
        activos: isCurrentlyActive ? (prev.activos || 0) + 1 : Math.max(0, (prev.activos || 0) - 1),
        inactivos: isCurrentlyActive ? Math.max(0, (prev.inactivos || 0) - 1) : (prev.inactivos || 0) + 1
      }))

      const msg = err.response?.data?.message || 'Error al cambiar estado del usuario'
      setToast({ message: msg, type: 'error' })
    }
  }

  // Delete User with Confirmation Modal
  const handleDeleteUser = (userItem) => {
    setUserToDelete(userItem)
  }

  const handleClearForm = () => {
    setUserName('')
    setNameTouched(false)
    setUserPhone('')
    setUserEmail('')
    setUserRole(creationRoleOptions[0]?.value || 'mesero')
    setPassword('')
    setShowPassword(false)
    setFormError('')
    setEditingUser(null)
    setShowFormModal(false)
  }

  const isServerPaginated = pagination.total > 0 && pagination.lastPage !== undefined && (pagination.lastPage > 1 || usersList.length <= ITEMS_PER_PAGE)
  const displayedUsers = isServerPaginated && usersList.length <= ITEMS_PER_PAGE
    ? usersList
    : usersList.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
  const totalRecords = pagination.total || usersList.length
  const totalPages = Math.max(1, pagination.lastPage || Math.ceil(totalRecords / ITEMS_PER_PAGE) || 1)

  return (
    <div className="space-y-6 pb-12 animate-fadeIn p-4 md:p-6 lg:p-8 font-sans text-left">
      
      {/* Page Header */}
      <PageHeader 
        title="Usuarios y Roles" 
        description="Administración de cuentas de empleados, niveles de permisos y bitácoras de accesos."
        action={
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-theme-text rounded-xl px-4 py-2.5 text-xs font-bold transition-all shadow-md shadow-brand-600/20 cursor-pointer"
          >
            <UserPlus size={14} />
            Nuevo Usuario
          </button>
        }
      />

      {/* KPI Summary Cards con Contenedor de Fondo Nivel 1 */}
      <div className="rounded-2xl p-6 max-md:p-3 transition-colors duration-200 overflow-hidden" style={{ backgroundColor: bgCard, border: `1px solid ${borderSubtle}`, boxShadow: cardShadow }}>
        <MetricCardsLayout cols={3}>
          {loading ? (
            <>
              <div className="animate-shimmer rounded-xl h-24 w-full" />
              <div className="animate-shimmer rounded-xl h-24 w-full" />
              <div className="animate-shimmer rounded-xl h-24 w-full" />
            </>
          ) : (
            <>
              <StatCard
                title="Total Cuentas"
                value={statsData.total_cuentas}
                subtitle="Registradas en el sistema"
                icon={Users}
                color="blue"
                delay="delay-1"
              />
              <StatCard
                title="Activos"
                value={statsData.activos}
                subtitle="Con acceso a la plataforma"
                icon={Check}
                color="green"
                delay="delay-2"
              />
              <StatCard
                title="Inactivos"
                value={statsData.inactivos}
                subtitle="Acceso suspendido o baja"
                icon={X}
                color="red"
                delay="delay-3"
              />
            </>
          )}
        </MetricCardsLayout>
      </div>

      {/* Contenedor Principal Unificado Nivel 1 (Filtros + Tabla) */}
      <div className="rounded-2xl p-6 max-md:p-3 transition-colors duration-200 animate-fadeInUp space-y-5 max-md:space-y-3" style={{ backgroundColor: bgCard, border: `1px solid ${borderSubtle}`, boxShadow: cardShadow }}>
        
        {/* Encabezado de Sección */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-md:gap-2">
          <div>
            <h2 className="text-sm font-extrabold text-theme-text tracking-wide uppercase">Registro de Usuarios</h2>
            <p className="text-theme-text-muted text-[10px] mt-0.5 font-bold uppercase tracking-wider">Historial y control de cuentas activas en la plataforma</p>
          </div>
        </div>

        {/* Contenedor de Controles: Barra de Búsqueda, Selector de Roles y Exportación */}
        <div className="flex justify-between items-center max-md:flex-col max-md:items-start gap-4 mb-6 w-full print:hidden">
          
          {/* Bloque Izquierdo: Buscador y Dropdown unidos */}
          <div className="flex flex-wrap items-center gap-3 w-full">
            
            {/* 1. Barra de búsqueda (Ocupa el espacio necesario) */}
            <div className="relative flex-1 min-w-[250px]">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-text-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por nombre o correo..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-slate-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl pl-9.5 pr-9 py-2.5 text-xs text-theme-text placeholder:text-theme-text-muted focus:outline-none focus:border-brand-500 transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text-muted hover:text-theme-text transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* 2. NUEVO FILTRO OPTIMIZADO: Dropdown selector de roles */}
            <Dropdown
              options={roleFilterOptions}
              value={roleFilter}
              onChange={setRoleFilter}
              className="w-full md:w-48 text-xs"
            />
            
          </div>

          {/* Bloque Derecho: Botones de Exportación (Excel, CSV, PDF) */}
          {/* shrink-0 evita que los botones se aplasten si el buscador crece */}
          <div className="flex items-center gap-2 max-md:flex-wrap max-md:w-full shrink-0">
            <button
              onClick={() => handleExport('Excel')}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 max-md:px-3 py-2.5 max-md:py-1.5 rounded-2xl max-md:rounded-xl shadow-md transition-all duration-200 cursor-pointer flex items-center gap-1.5 text-xs opacity-100"
            >
              <Download size={14} /> <span className="max-md:hidden">Excel</span><span className="md:hidden">XLS</span>
            </button>
            <button
              onClick={() => handleExport('CSV')}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 max-md:px-3 py-2.5 max-md:py-1.5 rounded-2xl max-md:rounded-xl shadow-md transition-all duration-200 cursor-pointer flex items-center gap-1.5 text-xs opacity-100"
            >
              <Download size={14} /> CSV
            </button>
            <button
              onClick={() => handleExport('PDF')}
              className="bg-red-500 hover:bg-red-600 text-white font-bold px-4 max-md:px-3 py-2.5 max-md:py-1.5 rounded-2xl max-md:rounded-xl shadow-md transition-all duration-200 cursor-pointer flex items-center gap-1.5 text-xs opacity-100"
            >
              <FileText size={14} /> PDF
            </button>
          </div>
        </div>

        <div className="space-y-4 mt-4">
          {loading ? (
            <div className="space-y-2.5">
              <div className="animate-shimmer rounded-lg h-12 w-full" />
              <div className="animate-shimmer rounded-lg h-12 w-full" />
              <div className="animate-shimmer rounded-lg h-12 w-full" />
            </div>
          ) : (
            <div className="overflow-x-auto w-full shadow-sm rounded-xl border border-slate-200">
            <Table className="min-w-[900px]" shadow="shadow-none" headers={[ 
                'Usuario',
                'Correo Electrónico',
                'Teléfono',
                'Nivel de Acceso',
                { label: 'Estado', align: 'center' },
                'Último Ingreso',
                { label: 'Acciones', align: 'center' }
              ]}
            >
              {displayedUsers.length === 0 ? (
              <tr className="bg-white dark:bg-[var(--theme-surface)]" style={{ backgroundColor: 'var(--theme-surface)' }}>
                <td colSpan="7" className="p-0 border-none text-center py-12 relative">
                  <div className="sticky left-0 w-full flex flex-col justify-center items-center">
                    <EmptyState
                      title="No se encontraron usuarios"
                      description="Prueba ajustando el filtro de rol o el texto en la barra de búsqueda."
                      icon={UserX}
                    />
                  </div>
                </td>
              </tr>
            ) : (
              displayedUsers.map(userItem => {
                const roleBadge = getRoleBadge(userItem.role || userItem.roleId || userItem.rol)
                const isActive = userItem.status === 'activo' || userItem.is_active === 1 || userItem.active === true
                const displayName = getUserDisplayName(userItem)

                return (
                  <tr 
                    key={userItem.id} 
                    className="h-16 border-b transition-colors duration-150 bg-white dark:bg-[var(--theme-surface)] hover:bg-gray-50/50 dark:hover:bg-gray-800/50 border-gray-100 dark:border-gray-800/60"
                    style={{ backgroundColor: 'var(--theme-surface)', borderColor: borderSubtle }}
                  >
                    {/* Usuario */}
                    <td className="px-5 py-3.5 text-left whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/20 text-[var(--theme-primary)] text-xs font-bold flex items-center justify-center shrink-0">
                          {getInitials(displayName)}
                        </div>
                        <span className="text-sm font-medium" style={{ color: textColor || 'var(--theme-text)' }}>
                          {displayName}
                        </span>
                      </div>
                    </td>

                    {/* Correo Electrónico */}
                    <td className="px-5 py-3.5 text-left text-sm font-medium whitespace-nowrap" style={{ color: textColor || 'var(--theme-text)' }}>
                      {userItem.email || userItem.correo || '—'}
                    </td>

                    {/* Teléfono */}
                    <td className="px-5 py-3.5 text-left text-sm font-medium whitespace-nowrap" style={{ color: textColor || 'var(--theme-text)' }}>
                      {userItem.phone || userItem.telefono || '—'}
                    </td>

                    {/* Nivel de Acceso (Texto negro igual que las demás) */}
                    <td className="px-5 py-3.5 text-left whitespace-nowrap">
                      <span className="text-sm font-medium uppercase" style={{ color: textColor || 'var(--theme-text)' }}>
                        {roleBadge.label}
                      </span>
                    </td>

                    {/* Toggle Estado Activo/Inactivo */}
                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleStatus(userItem)
                          }}
                          className={`relative w-9 h-5 rounded-full transition-all duration-300 cursor-pointer shrink-0 ${
                            isActive ? 'shadow-sm' : 'bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600'
                          }`}
                          style={{
                            backgroundColor: isActive ? 'var(--theme-primary)' : undefined
                          }}
                          title={isActive ? 'Suspender acceso' : 'Activar acceso'}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    </td>

                    {/* Último Ingreso */}
                    <td className="px-5 py-3.5 text-left text-sm font-medium whitespace-nowrap" style={{ color: textColor || 'var(--theme-text)' }}>
                      {formatLastLogin(userItem.last_login_at || userItem.last_login || userItem.lastLogin || userItem.ultimo_ingreso || userItem.ultimo_acceso)}
                    </td>

                    {/* Acciones */}
                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(userItem)}
                          className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-[var(--theme-primary)] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer flex items-center justify-center"
                          title="Editar Usuario"
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(userItem)}
                          title="Eliminar Usuario"
                          className="p-1.5 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer flex items-center justify-center"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
            {!loading && displayedUsers.length > 0 && Array.from({ length: Math.max(0, ITEMS_PER_PAGE - displayedUsers.length) }).map((_, i) => (
              <tr key={`empty-user-${i}`} className="h-16 border-b border-transparent bg-white dark:bg-[var(--theme-surface)]" style={{ backgroundColor: 'var(--theme-surface)' }}>
                <td colSpan="7"></td>
              </tr>
            ))}
          </Table>
          </div>
        )}

          {/* Componente de Paginación Fijo (Siempre Visible) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 print:hidden" style={{ borderColor: borderSubtle }}>
            <div className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>
              Mostrando {totalRecords === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1} a {Math.min(page * ITEMS_PER_PAGE, totalRecords)} de {totalRecords} usuarios
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || totalRecords === 0 || loading}
                style={page > 1 && totalRecords > 0 && !loading ? {
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
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5"
              >
                <ChevronLeft size={14} /> Anterior
              </button>

              <span className="text-xs font-mono font-bold px-2" style={{ color: 'var(--theme-text)' }}>
                {totalRecords === 0 ? 1 : page} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || totalRecords === 0 || loading}
                style={page < totalPages && totalRecords > 0 && !loading ? {
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
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shadow-xs"
              >
                Siguiente <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Modal Registrar / Editar Usuario */}
      {showFormModal && (
        <Modal
          title={editingUser ? 'Editar Cuenta de Usuario' : 'Registrar Nuevo Usuario'}
          onClose={handleClearForm}
        >
          {formError && (
            <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-xs text-red-400 animate-fadeIn">
              <ShieldAlert size={14} className="shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSaveUser} noValidate className="space-y-4">
            <div className="space-y-4">
              
              {/* Nombre Completo */}
              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">
                  Nombre Completo <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => {
                      setUserName(e.target.value)
                      if (!nameTouched) setNameTouched(true)
                    }}
                    onBlur={() => {
                      setNameTouched(true)
                      setUserName(prev => prev.trim())
                    }}
                    placeholder="Ej. Pedro Gómez"
                    className={`w-full input-subcard bg-slate-100 dark:bg-white/5 border ${
                      nameError
                        ? 'border-red-500/60 focus:border-red-500'
                        : 'border-gray-200 dark:border-white/10 hover:border-brand-500/30 focus:border-brand-500/50'
                    } rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-theme-text placeholder-theme-text-muted outline-none transition-all`}
                  />
                </div>
                {nameError && (
                  <p className="text-[11px] font-medium text-red-500 animate-fadeIn">
                    {nameError}
                  </p>
                )}
              </div>

              {/* Teléfono */}
              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">
                  Número de Teléfono <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={userPhone}
                    onChange={(e) => {
                      const onlyNums = e.target.value.replace(/\D/g, '')
                      setUserPhone(onlyNums)
                    }}
                    maxLength={10}
                    placeholder="Ej. 5512345678"
                    className="w-full input-subcard bg-slate-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-brand-500/30 focus:border-brand-500/50 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-theme-text placeholder-theme-text-muted outline-none transition-all"
                  />
                </div>
              </div>

              {/* Correo Electrónico */}
              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">
                  Correo Electrónico <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    onBlur={() => setUserEmail(prev => prev.trim().toLowerCase())}
                    placeholder="ejemplo@restaurante.com"
                    className="w-full input-subcard bg-slate-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-brand-500/30 focus:border-brand-500/50 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-theme-text placeholder-theme-text-muted outline-none transition-all"
                  />
                </div>
              </div>

              {/* Rol / Nivel de Acceso (Filtrado según rol del usuario autenticado) */}
              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">
                  Rol / Nivel de Acceso <span className="text-red-500">*</span>
                </label>
                <Dropdown
                  options={creationRoleOptions}
                  value={userRole}
                  onChange={(val) => {
                    if (val) setUserRole(val)
                  }}
                  className="w-full text-xs"
                />
              </div>

              {/* Security Warning Banner */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-left animate-fadeIn">
                <ShieldAlert size={18} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Aviso de Seguridad</p>
                  <p className="text-xs text-theme-text leading-relaxed">
                    Las credenciales permitirán al empleado acceder al sistema utilizando su correo electrónico o teléfono y su contraseña.
                  </p>
                </div>
              </div>

              {/* Usuario de Acceso (Indicador Aclaratorio) */}
              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">Usuario de acceso</label>
                <div className="input-subcard bg-slate-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-xs text-theme-text-muted space-y-1">
                  <div className="flex items-center gap-2 text-theme-text font-semibold">
                    <User size={13} className="text-brand-400 shrink-0" />
                    <span>Correo electrónico o número de teléfono</span>
                  </div>
                  <p className="text-[11px] text-theme-text-muted leading-normal">
                    El usuario podrá iniciar sesión ingresando su correo (<span className="text-theme-text font-mono">{userEmail || 'no ingresado'}</span>) o teléfono (<span className="text-theme-text font-mono">{userPhone || 'no ingresado'}</span>).
                  </p>
                </div>
              </div>

              {/* Contraseña con toggle Eye/EyeOff */}
              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">
                  {editingUser ? 'Nueva Contraseña (Opcional)' : <>Contraseña <span className="text-red-500">*</span></>}
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={editingUser ? "Dejar en blanco para conservar actual" : "••••••••"}
                    className="w-full input-subcard bg-slate-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-brand-500/30 focus:border-brand-500/50 rounded-xl pl-10 pr-10 py-2.5 text-xs text-theme-text placeholder-theme-text-muted outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer z-10 p-1"
                    title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>

                {/* Parámetros de Seguridad Obligatorios */}
                {(password.length > 0 || !editingUser) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-[11px] font-medium pt-2">
                    {passwordRules.map((rule) => {
                      const isValid = rule.valid
                      return (
                        <div key={rule.id} className="flex items-center gap-1.5 transition-colors duration-150">
                          {isValid ? (
                            <Check size={13} className="text-green-500 shrink-0 stroke-[2.5]" />
                          ) : (
                            <X size={13} className="text-red-500 shrink-0 stroke-[2.5]" />
                          )}
                          <span className={isValid ? "text-green-500 font-semibold" : "text-red-500 font-medium"}>
                            {rule.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}

                <p className="text-[11px] text-theme-text-muted mt-1">
                  El empleado podrá iniciar sesión con su correo electrónico o número de teléfono.
                </p>
              </div>

              {/* Botón Reset Contraseña en Edición (Visible solo para admin/super_admin) */}
              {editingUser && canResetPassword && (
                <div className="pt-2 border-t border-theme-border-subtle flex items-center justify-between">
                  <span className="text-xs text-theme-text-muted font-medium">Acción Administrador</span>
                  <button
                    type="button"
                    onClick={handleResetPasswordInModal}
                    disabled={resettingPassword}
                    className="flex items-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                  >
                    <KeyRound size={13} />
                    {resettingPassword ? 'Restableciendo...' : 'Restablecer Contraseña'}
                  </button>
                </div>
              )}

            </div>

            <div className="flex items-center gap-3 pt-4 mt-6 pb-2">
              <button
                type="button"
                onClick={handleClearForm}
                className="w-1/2 bg-slate-100 dark:bg-white/5 hover:opacity-80 border border-gray-200 dark:border-white/10 text-theme-text-muted hover:text-theme-text rounded-xl py-2.5 text-xs font-bold transition-all cursor-pointer text-center h-10"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || (!editingUser ? !isPasswordValid : (password.trim().length > 0 && !isPasswordValid))}
                className="w-1/2 bg-brand-600 hover:bg-brand-500 text-theme-text rounded-xl py-2.5 text-xs font-bold transition-all shadow-md shadow-brand-600/20 cursor-pointer text-center h-10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  editingUser ? 'Guardar Cambios' : 'Registrar Usuario'
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Confirmar Eliminar Usuario */}
      {userToDelete && createPortal(
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-fadeIn">
          {/* Backdrop Click Area */}
          <div className="fixed inset-0" onClick={() => setUserToDelete(null)} />

          {/* Modal Container */}
          <div className="relative bg-theme-card border border-red-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-scaleUp z-10 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-theme-text">Eliminar Usuario</h3>
                <p className="text-xs text-red-300/70 font-medium">Esta acción no se puede deshacer</p>
              </div>
            </div>

            <p className="text-xs text-theme-text-muted leading-relaxed bg-theme-input p-3.5 rounded-xl border border-theme-border-subtle">
              ¿Está seguro que desea eliminar permanentemente la cuenta de <strong className="text-theme-text font-bold">{userToDelete.name}</strong> (<span className="font-mono text-theme-text">{userToDelete.email || 'sin correo'}</span>) de la plataforma?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-theme-text-muted hover:text-theme-text bg-theme-input hover:opacity-80 transition-all cursor-pointer border border-theme-border-subtle"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const item = userToDelete
                  setUserToDelete(null)
                  try {
                    await adminDeleteUser(item.id)
                    setToast({ message: `Usuario "${item.name}" eliminado de la plataforma.`, type: 'success' })
                    if (editingUser && editingUser.id === item.id) {
                      handleClearForm()
                    }
                    fetchUsersData()
                    fetchStats()
                  } catch (err) {
                    console.error("Error al eliminar usuario:", err)
                    const msg = err.response?.data?.message || 'No se pudo eliminar el usuario'
                    setToast({ message: msg, type: 'error' })
                  }
                }}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-theme-text bg-red-600 hover:bg-red-500 transition-all shadow-md shadow-red-600/30 cursor-pointer"
              >
                <Trash2 size={14} /> Confirmar Eliminación
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  )
}


