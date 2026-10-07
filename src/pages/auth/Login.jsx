import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, User, ShieldAlert, Eye, EyeOff, Mail, KeyRound, ArrowLeft, RotateCcw, Clock, CheckCircle2 } from 'lucide-react'
import { login } from '../../services/auth'
import { forgotPassword, resetPassword } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'

export default function Login() {
  const navigate      = useNavigate()
  const { loginUser } = useAuth()

  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]             = useState('')
  const [loading, setLoading]         = useState(false)

  // Recovery Mode: 'login' | 'forgot_step1' | 'forgot_step2'
  const [authView, setAuthView]       = useState('login')
  const [forgotEmail, setForgotEmail] = useState('')
  const [websiteUrl, setWebsiteUrl]   = useState('') // Honeypot trap
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState('')
  const [forgotSuccess, setForgotSuccess] = useState('')
  const [cooldownMessage, setCooldownMessage] = useState('')
  const [cooldownLocked, setCooldownLocked] = useState(false)

  const [otpCode, setOtpCode]         = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError]   = useState('')
  const [resetSuccess, setResetSuccess] = useState('')

  // Timer: 120s (02:00)
  const [otpTimer, setOtpTimer]       = useState(0)
  const [resendingOtp, setResendingOtp] = useState(false)

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
      const userRole = typeof res.user?.role === 'string' 
        ? res.user.role 
        : (Array.isArray(res.user?.roles) ? res.user.roles[0] : (Array.isArray(res.user?.role) ? res.user.role[0] : ''))
      const dest = roleRedirects[userRole] || '/login'
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

  // OTP Countdown timer (02:00 -> 00:00)
  useEffect(() => {
    if (otpTimer <= 0) return
    const interval = setInterval(() => {
      setOtpTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [otpTimer])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // Paso 1: Solicitar código OTP vía /api/password/forgot
  const handleForgotStep1Submit = async (e) => {
    if (e) e.preventDefault()
    setForgotError('')
    setForgotSuccess('')
    setCooldownMessage('')

    // 1. Trampa Honeypot: si un bot llenó website_url, abortar silenciosamente
    if (websiteUrl && websiteUrl.trim().length > 0) {
      return
    }

    // 2. Sanitización de Input: .trim().toLowerCase()
    const cleanEmail = forgotEmail.trim().toLowerCase()
    if (!cleanEmail) {
      setForgotError('Por favor ingresa tu correo electrónico.')
      return
    }

    // 3. Validación Regex de formato de correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(cleanEmail)) {
      setForgotError('Ingresa un formato de correo electrónico válido.')
      return
    }

    if (cooldownLocked) return

    setForgotLoading(true)
    try {
      const response = await forgotPassword(cleanEmail)
      // Transición Exitosa: Únicamente si Axios retorna 200 OK
      if (response && (response.status === 200 || response.status === 201 || !response.status)) {
        setOtpCode('')
        setNewPassword('')
        setConfirmPassword('')
        setResetError('')
        setResetSuccess('')
        setCooldownMessage('')
        setOtpTimer(120) // Inicia en 02:00
        setAuthView('forgot_step2')
      }
    } catch (err) {
      console.error('Error al solicitar recuperación:', err)
      if (err.response?.status === 429) {
        const msg = err.response?.data?.message || 'Ya enviamos un código a este correo. Por favor, espera 2 minutos antes de solicitar otro.'
        setCooldownMessage(msg)
        setCooldownLocked(true)
        setTimeout(() => setCooldownLocked(false), 10000)
      } else {
        const msg = err.response?.data?.message || 'Error al procesar la solicitud. Intente más tarde.'
        setForgotError(msg)
      }
      // Bloquea el acceso; el componente NO cambia al "Paso 2"
    } finally {
      setForgotLoading(false)
    }
  }

  // Reenviar código OTP (habilitado cuando el contador llega a 00:00)
  const handleResendOtp = async () => {
    if (otpTimer > 0 || resendingOtp) return
    setResendingOtp(true)
    setResetError('')
    setResetSuccess('')

    try {
      const cleanEmail = forgotEmail.trim().toLowerCase()
      await forgotPassword(cleanEmail)
      setOtpTimer(120) // Reinicia el timer a 02:00
      setResetSuccess('Se ha enviado un nuevo código de 6 dígitos a tu correo.')
    } catch (err) {
      console.error('Error al reenviar código:', err)
      const msg = err.response?.data?.message || 'No se pudo reenviar el código. Intente de nuevo.'
      setResetError(msg)
    } finally {
      setResendingOtp(false)
    }
  }

  // Paso 2: Verificar código y restablecer contraseña vía /api/password/reset
  const handleForgotStep2Submit = async (e) => {
    if (e) e.preventDefault()
    setResetError('')
    setResetSuccess('')

    const cleanCode = otpCode.trim()
    if (!cleanCode || cleanCode.length !== 6) {
      setResetError('Por favor ingresa el código de 6 dígitos.')
      return
    }

    if (newPassword.length < 8) {
      setResetError('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }

    if (newPassword !== confirmPassword) {
      setResetError('Las contraseñas ingresadas no coinciden.')
      return
    }

    setResetLoading(true)
    try {
      const res = await resetPassword({
        email: forgotEmail.trim().toLowerCase(),
        code: cleanCode,
        new_password: newPassword,
        new_password_confirmation: confirmPassword
      })

      const msg = res.data?.message || 'Contraseña actualizada con éxito. Ya puedes iniciar sesión.'
      setAuthView('login')
      setEmail(forgotEmail.trim().toLowerCase())
      setPassword('')
      setForgotSuccess(msg)
      setError('')
      setOtpCode('')
      setNewPassword('')
      setConfirmPassword('')
      setOtpTimer(0)
    } catch (err) {
      console.error('Error al restablecer contraseña:', err)
      const msg = err.response?.data?.message || 'Error al restablecer la contraseña. Verifique el código.'
      setResetError(msg)
    } finally {
      setResetLoading(false)
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

        {/* Formulario y mensajes según authView */}
        <div className="w-full space-y-6 px-8 sm:px-10">

          {/* ======================================================== */}
          {/* VISTA 1: INICIO DE SESIÓN HABITUAL                       */}
          {/* ======================================================== */}
          {authView === 'login' && (
            <>
              <div className="text-center">
                <h2 style={{ color: '#fff', fontWeight: '700', fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                  Acceso al panel
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
                  Ingresa tus credenciales para continuar.
                </p>
              </div>

              {forgotSuccess && (
                <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs p-3.5 rounded-xl text-center font-medium space-y-1">
                  <div className="flex items-center justify-center gap-1.5">
                    <CheckCircle2 size={15} />
                    <span>{forgotSuccess}</span>
                  </div>
                </div>
              )}

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

              <form onSubmit={handleSubmit} className="space-y-4">

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
                  <div className="flex items-center justify-between">
                    <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', letterSpacing: '0.1em', fontWeight: '600' }} className="block uppercase">
                      Contraseña
                    </label>
                    {/* Enlace ¿Olvidaste tu contraseña? */}
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(email || '')
                        setForgotError('')
                        setForgotSuccess('')
                        setAuthView('forgot_step1')
                      }}
                      className="text-[11px] font-semibold text-white/50 hover:text-white transition-colors cursor-pointer hover:underline"
                      style={{ color: brandColor ? `${brandColor}` : undefined }}
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
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
            </>
          )}

          {/* ======================================================== */}
          {/* VISTA PASO 1: RECUPERACIÓN - INGRESO DE CORREO            */}
          {/* ======================================================== */}
          {authView === 'forgot_step1' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="text-center">
                <h2 style={{ color: '#fff', fontWeight: '700', fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                  Recuperar Contraseña
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
                  Ingresa tu correo electrónico y te enviaremos un código de seguridad de 6 dígitos.
                </p>
              </div>

              {cooldownMessage && (
                <div className="bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs p-3.5 rounded-xl text-center font-medium animate-fadeIn flex items-center justify-center gap-2">
                  <Clock size={16} className="text-amber-400 shrink-0 animate-pulse" />
                  <span>{cooldownMessage}</span>
                </div>
              )}

              {forgotError && (
                <div className="bg-red-500/10 text-red-400 border border-red-500/20 text-xs p-3.5 rounded-xl text-center font-medium animate-fadeIn">
                  {forgotError}
                </div>
              )}

              <form onSubmit={handleForgotStep1Submit} className="space-y-4">
                {/* Honeypot field (oculto completamente con CSS, sin etiquetas aria) */}
                <div style={{ display: 'none', opacity: 0, position: 'absolute', left: '-9999px', pointerEvents: 'none' }} tabIndex={-1}>
                  <input
                    type="text"
                    name="website_url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    autoComplete="off"
                    tabIndex={-1}
                  />
                </div>

                <div className="space-y-1.5">
                  <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', letterSpacing: '0.1em', fontWeight: '600' }} className="block uppercase">
                    Correo Electrónico
                  </label>
                  <div style={{
                    border: forgotError
                      ? '1px solid rgba(239, 68, 68, 0.6)'
                      : cooldownMessage
                        ? '1px solid rgba(245, 158, 11, 0.6)'
                        : emailFocused 
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
                    <Mail size={15} className={forgotError ? "text-red-400 shrink-0" : cooldownMessage ? "text-amber-400 shrink-0" : "text-white/30 shrink-0"} />
                    <input
                      type="email"
                      required
                      disabled={forgotLoading || cooldownLocked}
                      placeholder="ejemplo@restaurante.com"
                      value={forgotEmail}
                      onChange={(e) => {
                        setForgotEmail(e.target.value)
                        if (forgotError) setForgotError('')
                        if (cooldownMessage) setCooldownMessage('')
                      }}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      style={{ color: '#fff' }}
                      className="w-full text-sm focus:outline-none placeholder-white/20 bg-transparent disabled:opacity-50"
                    />
                  </div>
                  {forgotError && (
                    <p className="text-[11px] text-red-400 font-medium pl-1 animate-fadeIn">
                      {forgotError}
                    </p>
                  )}
                  {cooldownMessage && (
                    <p className="text-[11px] text-amber-400 font-medium pl-1 animate-fadeIn">
                      {cooldownMessage}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading || cooldownLocked}
                  style={{ 
                    background: cooldownLocked ? '#475569' : brandColor, 
                    color: '#fff',
                    width: '100%',
                    boxShadow: cooldownLocked ? 'none' : `0 8px 24px ${brandColor}50`
                  }}
                  className="relative text-sm font-semibold py-3.5 rounded-xl transition-all duration-300 shadow-xl active:scale-[0.98] disabled:opacity-50 mt-4 cursor-pointer flex items-center justify-center gap-2 overflow-hidden"
                >
                  {forgotLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Buscando...</span>
                    </>
                  ) : cooldownLocked ? (
                    <span>Espera un momento...</span>
                  ) : (
                    <span>Enviar código de recuperación</span>
                  )}
                </button>
              </form>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthView('login')
                    setForgotError('')
                  }}
                  className="text-xs text-white/50 hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <ArrowLeft size={13} />
                  Volver al inicio de sesión
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VISTA PASO 2: VERIFICACIÓN OTP Y NUEVA CONTRASEÑA         */}
          {/* ======================================================== */}
          {authView === 'forgot_step2' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="text-center">
                <h2 style={{ color: '#fff', fontWeight: '700', fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                  Verificar Código
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
                  Ingresa el código enviado a <span className="text-white font-medium">{forgotEmail}</span> y tu nueva contraseña.
                </p>
              </div>

              {resetError && (
                <div className="bg-red-500/10 text-red-400 border border-red-500/20 text-xs p-3.5 rounded-xl text-center font-medium">
                  {resetError}
                </div>
              )}

              {resetSuccess && (
                <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs p-3.5 rounded-xl text-center font-medium">
                  {resetSuccess}
                </div>
              )}

              {/* El Contador y Botón de Reenvío */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 text-xs">
                <div className="flex items-center gap-2 text-white/70">
                  <Clock size={15} className={otpTimer > 0 ? "text-amber-400 animate-pulse" : "text-red-400"} />
                  <span>
                    {otpTimer > 0 ? (
                      <>Expira en: <strong className="text-amber-300 font-mono font-bold">{formatTime(otpTimer)}</strong></>
                    ) : (
                      <span className="text-red-400 font-semibold">Código expirado</span>
                    )}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={otpTimer > 0 || resendingOtp}
                  onClick={handleResendOtp}
                  className={`flex items-center gap-1 text-xs font-bold transition-all ${
                    otpTimer > 0 
                      ? 'text-white/20 cursor-not-allowed opacity-50' 
                      : 'text-amber-400 hover:text-amber-300 cursor-pointer underline'
                  }`}
                >
                  <RotateCcw size={12} className={resendingOtp ? "animate-spin" : ""} />
                  {resendingOtp ? 'Reenviando...' : 'Reenviar código'}
                </button>
              </div>

              <form onSubmit={handleForgotStep2Submit} className="space-y-4">
                {/* Código de 6 dígitos */}
                <div className="space-y-1.5">
                  <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', letterSpacing: '0.1em', fontWeight: '600' }} className="block uppercase">
                    Código de 6 Dígitos
                  </label>
                  <div style={{
                    borderRadius: '0.75rem',
                    border: '1px solid rgba(255,255,255,0.15)',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <KeyRound size={15} className="text-white/30 shrink-0" />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      disabled={resetLoading}
                      placeholder="123456"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                      style={{ color: '#fff', letterSpacing: '0.25em' }}
                      className="w-full text-center font-mono font-bold text-base focus:outline-none placeholder-white/20 bg-transparent placeholder:tracking-normal"
                    />
                  </div>
                </div>

                {/* Nueva Contraseña */}
                <div className="space-y-1.5">
                  <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', letterSpacing: '0.1em', fontWeight: '600' }} className="block uppercase">
                    Nueva Contraseña
                  </label>
                  <div style={{
                    borderRadius: '0.75rem',
                    border: '1px solid rgba(255,255,255,0.15)',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <Lock size={15} className="text-white/30 shrink-0" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      disabled={resetLoading}
                      placeholder="Mínimo 8 caracteres"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      style={{ color: '#fff' }}
                      className="w-full text-sm focus:outline-none placeholder-white/20 bg-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="text-white/30 hover:text-white transition-colors cursor-pointer shrink-0"
                    >
                      {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Confirmar Contraseña */}
                <div className="space-y-1.5">
                  <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', letterSpacing: '0.1em', fontWeight: '600' }} className="block uppercase">
                    Confirmar Contraseña
                  </label>
                  <div style={{
                    borderRadius: '0.75rem',
                    border: '1px solid rgba(255,255,255,0.15)',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <Lock size={15} className="text-white/30 shrink-0" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      disabled={resetLoading}
                      placeholder="Repite la contraseña"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      style={{ color: '#fff' }}
                      className="w-full text-sm focus:outline-none placeholder-white/20 bg-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-white/30 hover:text-white transition-colors cursor-pointer shrink-0"
                    >
                      {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={resetLoading}
                  style={{ 
                    background: brandColor, 
                    color: '#fff',
                    width: '100%',
                    boxShadow: `0 8px 24px ${brandColor}50`
                  }}
                  className="relative text-sm font-semibold py-3.5 rounded-xl transition-all duration-300 shadow-xl active:scale-[0.98] disabled:opacity-50 mt-4 cursor-pointer flex items-center justify-center gap-2 overflow-hidden"
                >
                  {resetLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Restableciendo...</span>
                    </>
                  ) : (
                    <span>Restablecer Contraseña</span>
                  )}
                </button>
              </form>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthView('login')
                    setResetError('')
                  }}
                  className="text-xs text-white/50 hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <ArrowLeft size={13} />
                  Cancelar y volver al login
                </button>
              </div>
            </div>
          )}

          {/* Footer Note */}
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.65rem', letterSpacing: '0.15em' }} className="text-center font-bold uppercase pt-2">
            Solo personal autorizado
          </p>
        </div>
      </div>
    </div>
  )
}
