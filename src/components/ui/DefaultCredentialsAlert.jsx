import { useState, useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useNavigate } from 'react-router-dom'
import client from '../../api/client'

export default function DefaultCredentialsAlert() {
  const [show, setShow] = useState(false)
  const { colorPrimario, isLight } = useTheme()
  const navigate = useNavigate()

  useEffect(() => {
    client.get('/me/using-default-credentials')
      .then(res => {
        if (res.data.using_default_credentials) {
          setShow(true)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const hide = () => setShow(false)
    window.addEventListener('credentials-updated', hide)
    return () => window.removeEventListener('credentials-updated', hide)
  }, [])

  if (!show) return null

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-sm w-full shadow-xl rounded-xl border border-red-400 bg-red-50 text-red-800 p-4 flex flex-col gap-3 animate-fadeIn">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm font-bold">
            ⚠️ Estás usando credenciales por defecto
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShow(false)}
          className="text-red-400 hover:text-red-600 shrink-0 cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>
      <p className="text-xs leading-relaxed">
        Por seguridad, actualiza tu correo y contraseña antes de continuar usando el sistema. Mientras uses las credenciales por defecto, este aviso aparecerá cada vez que inicies sesión.
      </p>
      <button
        type="button"
        onClick={() => {
          setShow(false)
          navigate('/admin/settings#credenciales')
        }}
        className="w-full py-2 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer"
      >
        Actualizar credenciales ahora
      </button>
    </div>
  )
}
