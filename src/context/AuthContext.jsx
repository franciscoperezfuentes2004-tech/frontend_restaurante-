import { createContext, useContext, useState, useEffect } from 'react'
import { me } from '../api/auth'
import { getUser, logout as serviceLogout, hasPermission, hasRole } from '../services/auth'

const AuthContext = createContext(null)

const normalizeUserData = (data) => {
  if (!data || typeof data !== 'object') return data
  const normalized = { ...data }
  if (normalized.roles) {
    normalized.roles = (typeof normalized.roles === 'string' ? normalized.roles.split(',') : normalized.roles) || []
    if (Array.isArray(normalized.roles)) {
      normalized.roles = normalized.roles.map(r => typeof r === 'string' ? r.trim() : r).filter(Boolean)
    }
  }
  if (normalized.permissions) {
    normalized.permissions = (typeof normalized.permissions === 'string' ? normalized.permissions.split(',') : normalized.permissions) || []
    if (Array.isArray(normalized.permissions)) {
      normalized.permissions = normalized.permissions.map(p => typeof p === 'string' ? p.trim() : p).filter(Boolean)
    }
  }
  if (Array.isArray(normalized.role) && normalized.role.length > 0) {
    normalized.role = normalized.role[0]
  }
  return normalized
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(() => normalizeUserData(getUser()))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedUser = getUser()
    if (savedUser) {
      me()
        .then(res => {
          const cleanUser = normalizeUserData(res.data)
          setUser(cleanUser)
          localStorage.setItem('aurum_user', JSON.stringify(cleanUser))
          const sucursalId = cleanUser.sucursal_id || cleanUser.branch_id || 1
          localStorage.setItem('sucursal_activa_id', String(sucursalId))
        })
        .catch(() => {
          setUser(null)
          localStorage.removeItem('auth_token')
          localStorage.removeItem('aurum_user')
          localStorage.removeItem('sucursal_activa_id')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const loginUser = (userData) => {
    if (userData) {
      const cleanUser = normalizeUserData(userData)
      localStorage.setItem('aurum_user', JSON.stringify(cleanUser))
      const sucursalId = cleanUser.sucursal_id || cleanUser.branch_id || 1
      localStorage.setItem('sucursal_activa_id', String(sucursalId))
      setUser(cleanUser)
    }
  }

  const logoutUser = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('aurum_user')
    localStorage.removeItem('sucursal_activa_id')
    setUser(null)
    serviceLogout()
  }

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, logoutUser, hasPermission, hasRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
