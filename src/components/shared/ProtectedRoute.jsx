import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import LoaderGlobal from '../ui/LoaderGlobal'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoaderGlobal texto="CARGANDO EXPERIENCIA..." />
  }

  return user ? children : <Navigate to="/login" replace />
}
