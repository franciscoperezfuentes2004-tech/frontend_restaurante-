import { createContext, useContext, useState, useEffect } from 'react'
import { me } from '../api/auth'
import { getUser, logout as serviceLogout, hasPermission, hasRole } from '../services/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(() => getUser())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedUser = getUser()
    if (savedUser) {
      me()
        .then(res => {
          setUser(res.data)
          localStorage.setItem('aurum_user', JSON.stringify(res.data))
        })
        .catch(() => {
          setUser(null)
          localStorage.removeItem('auth_token')
          localStorage.removeItem('aurum_user')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const loginUser = (userData) => {
    if (userData) {
      localStorage.setItem('aurum_user', JSON.stringify(userData))
      setUser(userData)
    }
  }

  const logoutUser = () => {
    localStorage.removeItem('auth_token')
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
