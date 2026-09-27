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

  await getCsrfCookie()

  const response = await client.post('/login', {
    email: cleanEmail,
    password: cleanPassword
  })

  const { user } = response.data

  if (user) {
    localStorage.setItem('aurum_user', JSON.stringify(user))
  }

  return response.data
}

export const logout = async () => {
  try {
    await client.post('/logout')
  } catch (err) {
    // Ignorar errores durante logout
  } finally {
    localStorage.removeItem('aurum_user')
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
  if (user.role === 'super_admin' || user.role === 'admin') return true
  const permissions = user.permissions || []
  return permissions.includes(permission)
}

export const hasRole = (roles) => {
  const user = getUser()
  if (!user || !user.role) return false
  if (user.role === 'super_admin') return true
  if (Array.isArray(roles)) {
    return roles.includes(user.role)
  }
  return user.role === roles
}

export const activeSessions = () => client.get('/me/sessions')
export const revokeSession = (sessionId) => client.post('/me/sessions/revoke', { session_id: sessionId })
export const confirmPassword = (password) => client.post('/me/confirm-password', { password })
export const changePassword = (currentPassword, newPassword) => client.post('/me/change-password', { current_password: currentPassword, new_password: newPassword })
