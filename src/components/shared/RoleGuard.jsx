import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { hasPermission } from '../../services/auth'
import LoaderGlobal from '../ui/LoaderGlobal'

export default function RoleGuard({ allowedRoles, requiredPermission, children }) {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  if (loading) {
    return <LoaderGlobal texto="VERIFICANDO PERMISOS..." />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const userRole = typeof user.role === 'string' ? user.role : (Array.isArray(user.roles) ? user.roles[0] : '')
  const userRoles = (typeof user.roles === 'string' ? user.roles.split(',') : (Array.isArray(user.roles) ? user.roles : (userRole ? [userRole] : []))) || []

  if (userRole === 'super_admin' || userRole === 'admin' || userRoles.includes('super_admin') || userRoles.includes('admin')) {
    return children
  }

  const roles = (typeof allowedRoles === 'string' ? allowedRoles.split(',') : (Array.isArray(allowedRoles) ? allowedRoles : [])) || []
  const cleanRoles = roles.map(r => typeof r === 'string' ? r.trim() : r)
  const isRoleAllowed = cleanRoles.length > 0 ? cleanRoles.some(r => userRoles.includes(r) || userRole === r) : true
  const isPermissionAllowed = requiredPermission ? hasPermission(requiredPermission) : true

  if (!isRoleAllowed || !isPermissionAllowed) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-theme-surface/20 border border-theme-border-subtle rounded-2xl max-w-lg mx-auto text-center space-y-4 my-12 animate-fadeIn">
        <div className="text-4xl">🔒</div>
        <h2 className="text-xl font-bold text-theme-text">Acceso restringido</h2>
        <p className="text-xs text-theme-text-muted leading-relaxed max-w-sm">
          No tienes los permisos requeridos para acceder a esta sección. Si consideras que esto es un error, contacta al administrador del sistema.
        </p>
        <button
          onClick={() => {
            if (['mesero'].includes(user?.role)) navigate('/mesero')
            else if (['cocina'].includes(user?.role)) navigate('/cocina')
            else if (['repartidor'].includes(user?.role)) navigate('/repartidor')
            else navigate('/admin/dashboard')
          }}
          className="bg-brand-600 hover:bg-brand-500 text-theme-text font-semibold px-4 py-2 rounded-xl text-xs transition-all duration-200 mt-2 cursor-pointer"
        >
          ← Volver al inicio
        </button>
      </div>
    )
  }

  return children
}
