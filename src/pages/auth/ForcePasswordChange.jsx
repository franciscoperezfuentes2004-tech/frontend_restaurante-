import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, KeyRound, ShieldAlert, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, LogOut, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import client from '../../api/client'

export default function ForcePasswordChange() {
  const navigate = useNavigate()
  const { user, loginUser, logoutUser, loading: authLoading } = useAuth()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [brandColor, setBrandColor] = useState('#7c3aed')
  const [logoUrl, setLogoUrl] = useState(null)
  const [restaurantName, setRestaurantName] = useState('Restaurante')
  const [newPasswordFocused, setNewPasswordFocused] = useState(false)
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false)

  // Cargar configuración de marca
  useEffect(() => {
    client.get('/settings')
      .then(res => {
        const d = res.data?.data || res.data || {}
        if (d.brand_color || d.color_primario) setBrandColor(d.brand_color || d.color_primario)
        if (d.logo_url) setLogoUrl(d.logo_url)
        if (d.restaurant_name || d.nombre) setRestaurantName(d.restaurant_name || d.nombre)
      })
      .catch(() => {})
  }, [])

  // Si no está autenticado o ya no requiere cambiar contraseña, redirigir
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/login', { replace: true })
      } else if (!user.must_change_password) {
        const roleRedirects = {
          super_admin: '/admin/dashboard',
          admin:       '/admin/dashboard',
          gerente:     '/admin/dashboard',
          cajero:      '/admin/dashboard',
          mesero:      '/mesero',
          cocina:      '/cocina',
          repartidor:  '/repartidor',
        }
        const dest = roleRedirects[user.role] || '/admin/dashboard'
        navigate(dest, { replace: true })
      }
    }
  }, [user, authLoading, navigate])

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    setError('')

    const cleanNew = (newPassword || '').trim()
    const cleanConfirm = (confirmPassword || '').trim()

    // Validaciones en cliente
    if (!cleanNew || !cleanConfirm) {
      setError('Por favor, completa ambos campos de contraseña.')
      return
    }

    if (cleanNew.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }

    if (cleanNew !== cleanConfirm) {
      setError('Las contraseñas no coinciden. Por favor, verifícalas.')
      return
    }

    setLoading(true)
    try {
      const response = await client.post('/password/force-change', {
        new_password: cleanNew,
        new_password_confirmation: cleanConfirm
      })

      // Actualizar estado del usuario en AuthContext y localStorage
      const updatedUser = { ...(user || {}), must_change_password: false }
      loginUser(updatedUser)

      // Redireccionar al panel correspondiente
      const roleRedirects = {
        super_admin: '/admin/dashboard',
        admin:       '/admin/dashboard',
        gerente:     '/admin/dashboard',
        cajero:      '/admin/dashboard',
        mesero:      '/mesero',
        cocina:      '/cocina',
        repartidor:  '/repartidor',
      }
      const dest = roleRedirects[updatedUser?.role] || '/admin/dashboard'
      navigate(dest, { replace: true })
    } catch (err) {
      const apiMsg = err.response?.data?.message 
        || err.response?.data?.errors?.new_password?.[0]
        || err.response?.data?.errors?.new_password_confirmation?.[0]
        || err.response?.data?.error
        || 'Ocurrió un error al actualizar la contraseña.'
      setError(apiMsg)
    } finally {
      setLoading(false)
    }
  }

  const isMinLength = newPassword.length >= 8
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword

  return (
    <div style={{
      minHeight: '100vh',
      background: `radial-gradient(ellipse at 80% 20%, ${brandColor}25 0%, transparent 50%), radial-gradient(ellipse at 20% 80%, ${brandColor}15 0%, transparent 50%), #0a0a0a`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden'
    }}>

      {/* Círculos decorativos de fondo */}
      <div style={{
        position: 'absolute', top: '-20%', right: '-10%',
        width: '500px', height: '500px', borderRadius: '50%',
        background: `radial-gradient(circle, ${brandColor}60 0%, transparent 70%)`,
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '-20%', left: '-10%',
        width: '400px', height: '400px', borderRadius: '50%',
        background: `radial-gradient(circle, ${brandColor}40 0%, transparent 70%)`,
        pointerEvents: 'none'
      }} />

      {/* Tarjeta principal */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: 'rgba(15,15,15,0.88)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        border: `1px solid ${brandColor}40`,
        boxShadow: `0 32px 64px rgba(0,0,0,0.6), 0 0 40px ${brandColor}25`,
        borderRadius: '1.5rem',
        padding: '0 0 2.5rem 0',
        width: '100%',
        maxWidth: '430px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflow: 'hidden'
      }}>

        {/* Barra superior con gradiente de marca */}
        <div style={{
          width: '100%',
          height: '4px',
          background: `linear-gradient(90deg, transparent, ${brandColor}, ${brandColor}cc, transparent)`,
          marginBottom: '2rem'
        }} />

        {/* Ícono distintivo de seguridad */}
        <div style={{
          width: '4.25rem', height: '4.25rem', borderRadius: '1.25rem',
          background: `linear-gradient(135deg, ${brandColor}20, ${brandColor}40)`,
          border: `1px solid ${brandColor}60`,
          color: brandColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '1rem',
          boxShadow: `0 8px 24px ${brandColor}30`
        }}>
          <KeyRound className="w-8 h-8" style={{ color: '#fff' }} />
        </div>

        <h1 style={{ 
          color: '#ffffff', 
          fontWeight: '800', 
          fontSize: '1.35rem', 
          letterSpacing: '0.05em', 
          marginBottom: '0.25rem',
          textShadow: `0 0 20px ${brandColor}80`
        }}>
          Actualización obligatoria
        </h1>

        <p className="text-xs text-white/50 text-center px-6 mb-6 leading-relaxed max-w-xs">
          Por motivos de seguridad, debes cambiar tu contraseña temporal antes de acceder a la plataforma.
        </p>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="w-full space-y-4 px-6 sm:px-8">

          {/* Mensaje de error si existe */}
          {error && (
            <div className="bg-red-500/10 text-red-400 border border-red-500/20 text-xs p-3 rounded-xl flex items-start gap-2.5 font-medium animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* Campo: Nueva contraseña */}
          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1.5">
              Nueva contraseña <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showNewPassword ? 'text' : 'password'}
                name="new_password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value)
                  if (error) setError('')
                }}
                onFocus={() => setNewPasswordFocused(true)}
                onBlur={() => setNewPasswordFocused(false)}
                placeholder="Mínimo 8 caracteres"
                className="w-full pl-10 pr-10 py-2.5 bg-white/5 border rounded-xl text-sm text-white placeholder-white/25 outline-none transition-all"
                style={{
                  borderColor: newPasswordFocused ? brandColor : 'rgba(255,255,255,0.12)',
                  boxShadow: newPasswordFocused ? `0 0 0 3px ${brandColor}30` : 'none'
                }}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-white/40 hover:text-white/80 transition-colors cursor-pointer"
                aria-label={showNewPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Campo: Confirmar contraseña */}
          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1.5">
              Confirmar contraseña <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="new_password_confirmation"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  if (error) setError('')
                }}
                onFocus={() => setConfirmPasswordFocused(true)}
                onBlur={() => setConfirmPasswordFocused(false)}
                placeholder="Repite tu nueva contraseña"
                className="w-full pl-10 pr-10 py-2.5 bg-white/5 border rounded-xl text-sm text-white placeholder-white/25 outline-none transition-all"
                style={{
                  borderColor: confirmPasswordFocused ? brandColor : 'rgba(255,255,255,0.12)',
                  boxShadow: confirmPasswordFocused ? `0 0 0 3px ${brandColor}30` : 'none'
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-white/40 hover:text-white/80 transition-colors cursor-pointer"
                aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Requisitos visuales */}
          <div className="pt-1 pb-1 space-y-1.5">
            <div className={`text-[11px] flex items-center gap-1.5 transition-colors ${
              isMinLength ? 'text-emerald-400 font-medium' : 'text-white/40'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isMinLength ? 'bg-emerald-400' : 'bg-white/30'}`} />
              <span>Mínimo 8 caracteres</span>
            </div>
            <div className={`text-[11px] flex items-center gap-1.5 transition-colors ${
              passwordsMatch ? 'text-emerald-400 font-medium' : 'text-white/40'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${passwordsMatch ? 'bg-emerald-400' : 'bg-white/30'}`} />
              <span>Las contraseñas coinciden</span>
            </div>
          </div>

          {/* Botón de envío */}
          <button
            type="submit"
            disabled={loading}
            style={{
              background: brandColor,
              color: '#ffffff',
              boxShadow: `0 8px 24px ${brandColor}50`
            }}
            className="w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Actualizando contraseña...</span>
              </>
            ) : (
              <>
                <span>Guardar contraseña y continuar</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Opción de cerrar sesión */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={logoutUser}
              className="text-xs text-white/40 hover:text-white/80 transition-colors inline-flex items-center gap-1.5 cursor-pointer py-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar sesión e intentar más tarde</span>
            </button>
          </div>

        </form>

      </div>

    </div>
  )
}
