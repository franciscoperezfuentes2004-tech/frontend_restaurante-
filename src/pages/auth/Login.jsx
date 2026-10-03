import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, User, ShieldAlert, Eye, EyeOff } from 'lucide-react'
import { login } from '../../services/auth'
import { useAuth } from '../../context/AuthContext'

export default function Login() {
  const navigate      = useNavigate()
  const { loginUser } = useAuth()

  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]             = useState('')
  const [loading, setLoading]         = useState(false)

  // Tracking failed attempts & captcha
  const [failedCount, setFailedCount] = useState(0)
  const [captchaNum1, setCaptchaNum1] = useState(0)
  const [captchaNum2, setCaptchaNum2] = useState(0)
  const [captchaInput, setCaptchaInput] = useState('')
  const [captchaError, setCaptchaError] = useState('')

  // Rate limit countdown
  const [lockoutTimer, setLockoutTimer] = useState(0)
  const [attemptsLeft, setAttemptsLeft] = useState(null)

  const [brandColor, setBrandColor] = useState('#7c3aed')
  const [bgColor, setBgColor] = useState('#0a0914')
  const [logoUrl, setLogoUrl] = useState(null)
  const [restaurantName, setRestaurantName] = useState('Restaurante')
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)

  useEffect(() => {
    const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')
    fetch(`${apiUrl}/settings`, { 
      credentials: 'include' 
    })
      .then(r => r.json())
      .then(d => {
        if (d.brand_color) setBrandColor(d.brand_color)
        if (d.fondo_sistema) setBgColor(d.fondo_sistema)
        if (d.logo_url) setLogoUrl(d.logo_url)
        if (d.restaurant_name || d.nombre) 
          setRestaurantName(d.restaurant_name || d.nombre)
      })
      .catch(() => {})
  }, [])

  // Generate simple math question
  const generateCaptcha = () => {
    const n1 = Math.floor(Math.random() * 9) + 1
    const n2 = Math.floor(Math.random() * 9) + 1
    setCaptchaNum1(n1)
    setCaptchaNum2(n2)
    setCaptchaInput('')
    setCaptchaError('')
  }

  useEffect(() => {
    if (failedCount >= 3) {
      generateCaptcha()
    }
  }, [failedCount])

  // Countdown timer interval for 429 rate limit
  useEffect(() => {
    if (lockoutTimer <= 0) return
    const interval = setInterval(() => {
      setLockoutTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [lockoutTimer])

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    setError('')
    setCaptchaError('')

    if (lockoutTimer > 0) return

    // Captcha validation if >= 3 failed attempts
    if (failedCount >= 3) {
      const expected = captchaNum1 + captchaNum2
      if (parseInt(captchaInput, 10) !== expected) {
        setCaptchaError('Respuesta de verificación incorrecta.')
        generateCaptcha()
        return
      }
    }

    setLoading(true)
    try {
      const res = await login(email, password)
      if (res?.token) {
        localStorage.setItem('auth_token', res.token)
      }
      loginUser(res.user)

      // Evaluar si se requiere cambio forzado de contraseña temporal
      if (Boolean(res.user?.must_change_password || res.data?.user?.must_change_password)) {
        navigate('/cambiar-password-obligatorio')
        return
      }

      const roleRedirects = {
        super_admin: '/admin/dashboard',
        admin:       '/admin/dashboard',
        gerente:     '/admin/dashboard',
        cajero:      '/admin/dashboard',
        mesero:      '/mesero',
        cocina:      '/cocina',
        repartidor:  '/repartidor',
      }
      const dest = roleRedirects[res.user.role] || '/login'
      navigate(dest)
    } catch (err) {
      setFailedCount(prev => prev + 1)

      if (err.response?.status === 429) {
        const retryAfter = err.response?.data?.retry_after || 60
        setLockoutTimer(retryAfter)
        setError(err.response?.data?.message || 'Has intentado demasiadas veces. Por favor, espera un minuto antes de volver a intentarlo.')
      } else {
        setError('Credenciales incorrectas.')
        if (err.response?.data?.attempts_left !== undefined) {
          setAttemptsLeft(err.response.data.attempts_left)
        }
      }

    } finally {
      setLoading(false)
    }
  }

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
        background: 'rgba(15,15,15,0.85)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        border: `1px solid ${brandColor}`,
        boxShadow: `0 32px 64px rgba(0,0,0,0.6), 0 0 40px ${brandColor}30`,
        borderRadius: '1.5rem',
        padding: '0 0 2.5rem 0',
        width: '100%',
        maxWidth: '400px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflow: 'hidden'
      }}>

        <div style={{
          width: '100%',
          height: '4px',
          background: `linear-gradient(90deg, transparent, ${brandColor}, ${brandColor}cc, transparent)`,
          marginBottom: '2.5rem'
        }} />

        {/* Logo */}
        {logoUrl
          ? <img src={logoUrl} alt={restaurantName}
              style={{ height: '4rem', objectFit: 'contain', borderRadius: '0.75rem', marginBottom: '1rem' }} />
          : <div style={{
              width: '4rem', height: '4rem', borderRadius: '1rem',
              background: brandColor, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', fontWeight: '800', marginBottom: '1rem',
              boxShadow: `0 8px 24px ${brandColor}60`
            }}>{restaurantName[0]}</div>
        }

        <h1 style={{ 
          color: '#ffffff', 
          fontWeight: '800', 
          fontSize: '1.5rem', 
          letterSpacing: '0.12em', 
          marginBottom: '2rem',
          textShadow: `0 0 20px ${brandColor}80`
        }}>
          {restaurantName}
        </h1>

        {/* Formulario y mensajes */}
        <div className="w-full space-y-6 px-8 sm:px-10">
          <div className="text-center">
            <h2 style={{ color: '#fff', fontWeight: '700', fontSize: '1.1rem', marginBottom: '0.25rem' }}>
              Acceso al panel
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
              Ingresa tus credenciales para continuar.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 text-red-400 border border-red-500/20 text-xs p-3.5 rounded-xl text-center font-medium space-y-1">
              <div>{error}</div>
              {attemptsLeft !== null && lockoutTimer <= 0 && (
                <div className="text-[11px] text-red-300/70 font-normal">
                  Intentos restantes antes del bloqueo: {attemptsLeft}
                </div>
              )}
            </div>
          )}

          {lockoutTimer > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs p-4 rounded-xl text-center font-medium space-y-2">
              <div className="flex items-center justify-center gap-2">
                <ShieldAlert size={16} />
                <span>Acceso bloqueado temporalmente</span>
              </div>
              <p className="text-[11px] text-amber-200/60 font-normal">
                Podrás reintentar en: <strong className="text-amber-300 font-bold">{lockoutTimer}s</strong>
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email Field */}
            <div className="space-y-1.5">
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', letterSpacing: '0.1em', fontWeight: '600' }} className="block uppercase">
                Correo o Teléfono
              </label>
              <div style={{
                border: emailFocused 
                  ? `1px solid ${brandColor}` 
                  : '1px solid rgba(255,255,255,0.15)',
                boxShadow: emailFocused 
                  ? `0 0 12px ${brandColor}50` 
                  : 'none',
                borderRadius: '0.75rem',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s',
                transform: emailFocused ? 'scale(1.02)' : 'scale(1)'
              }}>
                <User size={15} className="text-white/30 shrink-0" />
                <input
                  type="text"
                  required
                  disabled={loading || lockoutTimer > 0}
                  placeholder="Correo electrónico o número"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  style={{ color: '#fff' }}
                  className="w-full text-sm focus:outline-none placeholder-white/20 bg-transparent disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', letterSpacing: '0.1em', fontWeight: '600' }} className="block uppercase">
                Contraseña
              </label>
              <div style={{
                border: passwordFocused 
                  ? `1px solid ${brandColor}` 
                  : '1px solid rgba(255,255,255,0.15)',
                boxShadow: passwordFocused 
                  ? `0 0 12px ${brandColor}50` 
                  : 'none',
                borderRadius: '0.75rem',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s',
                transform: passwordFocused ? 'scale(1.02)' : 'scale(1)'
              }}>
                <Lock size={15} className="text-white/30 shrink-0 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={loading || lockoutTimer > 0}
                  placeholder="••••••••"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  style={{ color: '#fff' }}
                  className="w-full text-sm focus:outline-none placeholder-white/20 bg-transparent disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-white/30 hover:text-white transition-colors cursor-pointer shrink-0"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Captcha Challenge (after 3 failed attempts) */}
            {failedCount >= 3 && (
              <div className="space-y-2 bg-white/5 border border-white/10 p-3.5 rounded-xl animate-fadeIn">
                <label className="block text-[11px] font-medium text-white/80">
                  Verificación de seguridad: ¿Cuánto es <strong className="text-white font-bold">{captchaNum1} + {captchaNum2}</strong>?
                </label>
                <input
                  type="number"
                  required
                  disabled={loading || lockoutTimer > 0}
                  placeholder="Respuesta"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  style={{ 
                    background: 'rgba(255,255,255,0.07)', 
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#fff',
                    borderRadius: '0.75rem'
                  }}
                  className="px-3 py-2 text-sm focus:outline-none w-full"
                />
                {captchaError && (
                  <p className="text-[10px] text-red-400">{captchaError}</p>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || lockoutTimer > 0}
              style={{ 
                background: brandColor, 
                color: '#fff',
                width: '100%',
                boxShadow: `0 8px 24px ${brandColor}50`
              }}
              className="relative text-sm font-semibold py-3.5 rounded-xl transition-all duration-300 shadow-xl active:scale-[0.98] disabled:opacity-50 mt-6 cursor-pointer flex items-center justify-center gap-2 overflow-hidden group"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verificando credenciales...</span>
                </>
              ) : lockoutTimer > 0 ? (
                <span>Bloqueado ({lockoutTimer}s)</span>
              ) : (
                <span>Ingresar al panel</span>
              )}
            </button>
          </form>

          {/* Footer Note */}
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.65rem', letterSpacing: '0.15em' }} className="text-center font-bold uppercase pt-2">
            Solo personal autorizado
          </p>
        </div>
      </div>
    </div>
  )
}
