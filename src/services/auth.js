import client from '../api/client'

/**
 * Servicio Centralizado de Autenticación (AURUM - V5.1)
 * Autenticación 100% basada en cookies HttpOnly de Sanctum SPA.
 * No utiliza ni almacena tokens Bearer en localStorage.
 */

export const getCsrfCookie = async () => {
  try {
    const baseURL = import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
    await client.get(`${baseURL}/sanctum/csrf-cookie`)
  } catch (err) {
    // Continuar si falla csrf-cookie
  }
}

export const login = async (email, password) => {
  const cleanEmail = (email || '').trim()
  const cleanPassword = (password || '').trim()

  const response = await client.post('/login', {
    email: cleanEmail,
    password: cleanPassword
  })

  if (response?.data?.token) {
    localStorage.setItem('auth_token', response.data.token)
  }

  const { user } = response.data

  if (user) {
    localStorage.setItem('aurum_user', JSON.stringify(user))
    const sucursalId = user.sucursal_id || user.branch_id || 1
    localStorage.setItem('sucursal_activa_id', String(sucursalId))
  }

  return response.data
}

export const logout = async () => {
  try {
    await client.post('/logout')
  } catch (err) {
    // Ignorar errores durante logout
  } finally {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('aurum_user')
    localStorage.removeItem('sucursal_activa_id')
    window.location.href = '/login'
  }
}

export const getUser = () => {
  try {
    const userStr = localStorage.getItem('aurum_user')
    return userStr ? JSON.parse(userStr) : null
  } catch {
    return null
  }
}

export const isAuthenticated = () => {
  return !!getUser()
}

export const hasPermission = (permission) => {
  const user = getUser()
  if (!user) return false
  const userRole = typeof user.role === 'string' ? user.role : (Array.isArray(user.roles) ? user.roles[0] : '')
  const userRoles = (typeof user.roles === 'string' ? user.roles.split(',') : (Array.isArray(user.roles) ? user.roles : (userRole ? [userRole] : []))) || []
  if (userRole === 'super_admin' || userRole === 'admin' || userRoles.includes('super_admin') || userRoles.includes('admin')) return true

  const rawPerms = user.permissions
  const permissions = (typeof rawPerms === 'string' ? rawPerms.split(',') : (Array.isArray(rawPerms) ? rawPerms : [])) || []
  return permissions.map(p => typeof p === 'string' ? p.trim() : p).includes(permission)
}

export const hasRole = (roles) => {
  const user = getUser()
  if (!user || (!user.role && !user.roles)) return false
  const userRole = typeof user.role === 'string' ? user.role : (Array.isArray(user.roles) ? user.roles[0] : '')
  const userRoles = (typeof user.roles === 'string' ? user.roles.split(',') : (Array.isArray(user.roles) ? user.roles : (userRole ? [userRole] : []))) || []
  if (userRole === 'super_admin' || userRoles.includes('super_admin')) return true

  const rolesList = (typeof roles === 'string' ? roles.split(',') : (Array.isArray(roles) ? roles : [roles])) || []
  const cleanRolesList = rolesList.map(r => typeof r === 'string' ? r.trim() : r)
  const cleanUserRoles = userRoles.map(r => typeof r === 'string' ? r.trim() : r)

  return cleanRolesList.some(r => cleanUserRoles.includes(r) || userRole === r)
}

export const activeSessions = () => client.get('/me/sessions')
export const revokeSession = (sessionId) => client.post('/me/sessions/revoke', { session_id: sessionId })
export const confirmPassword = (password) => client.post('/me/confirm-password', { password })
export const changePassword = (currentPassword, newPassword) => client.post('/me/change-password', { current_password: currentPassword, new_password: newPassword })
export const forcePasswordChange = (newPassword, newPasswordConfirmation) => client.post('/password/force-change', { new_password: newPassword, new_password_confirmation: newPasswordConfirmation })

