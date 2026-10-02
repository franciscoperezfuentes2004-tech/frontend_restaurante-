import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import LoaderGlobal from '../ui/LoaderGlobal'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoaderGlobal texto="CARGANDO EXPERIENCIA..." />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (Boolean(user.must_change_password)) {
    return <Navigate to="/cambiar-password-obligatorio" replace />
  }

  return children
}
