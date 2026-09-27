import { useState, useEffect, useRef } from 'react'
import { me } from '../../api/auth'
import { logout, isAuthenticated } from '../../services/auth'

const INACTIVITY_TIMEOUT = 29 * 60 * 1000 // 29 minutes -> show warning
const WARNING_DURATION = 60 // 60 seconds countdown
const RENEWAL_INTERVAL = 20 * 60 * 1000 // 20 minutes silent ping

export default function InactivityHandler({ children }) {
  const [showWarning, setShowWarning] = useState(false)
  const [countdown, setCountdown] = useState(WARNING_DURATION)

  const inactivityTimerRef = useRef(null)
  const countdownIntervalRef = useRef(null)
  const lastRenewalRef = useRef(Date.now())

  const resetInactivityTimer = () => {
    if (showWarning) return

    // Renew session silently if 20 minutes have passed since last renewal
    const now = Date.now()
    if (now - lastRenewalRef.current > RENEWAL_INTERVAL && isAuthenticated()) {
      lastRenewalRef.current = now
      me().catch(() => {})
    }

    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
    }

    if (isAuthenticated()) {
      inactivityTimerRef.current = setTimeout(() => {
        triggerWarning()
      }, INACTIVITY_TIMEOUT)
    }
  }

  const triggerWarning = () => {
    setShowWarning(true)
    setCountdown(WARNING_DURATION)

    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current)
          handleForceLogout()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleKeepAlive = () => {
    setShowWarning(false)
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
    }
    lastRenewalRef.current = Date.now()
    me().catch(() => {})
    resetInactivityTimer()
  }

  const handleForceLogout = () => {
    setShowWarning(false)
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
    }
    logout()
  }

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    const handleUserActivity = () => resetInactivityTimer()

    events.forEach(event => window.addEventListener(event, handleUserActivity))
    resetInactivityTimer()

    return () => {
      events.forEach(event => window.removeEventListener(event, handleUserActivity))
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    }
  }, [])

  return (
    <>
      {children}

      {/* Inactivity Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-theme-surface border border-brand-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl text-center space-y-5 animate-scaleUp">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-2xl mx-auto">
              ⏳
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-theme-text tracking-wide">
                Sesión por expirar
              </h3>
              <p className="text-xs text-theme-text-muted leading-relaxed">
                Su sesión expirará en <strong className="text-amber-400 font-bold">{countdown} segundos</strong> debido a inactividad. ¿Desea continuar trabajando?
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleForceLogout}
                className="flex-1 bg-theme-input hover:bg-white/10 text-theme-text-muted hover:text-theme-text font-semibold py-2.5 rounded-xl text-xs transition-all duration-200 cursor-pointer"
              >
                Cerrar sesión
              </button>
              <button
                onClick={handleKeepAlive}
                className="flex-1 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-theme-text font-semibold py-2.5 rounded-xl text-xs shadow-lg shadow-brand-600/20 transition-all duration-200 cursor-pointer"
              >
                Continuar trabajando
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
