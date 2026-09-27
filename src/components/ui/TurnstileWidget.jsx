import React, { useEffect, useRef } from 'react'

const TURNSTILE_SCRIPT_ID = 'cf-turnstile-script'
const DEFAULT_SITE_KEY = '1x00000000000000000000AA' // Cloudflare Official Always-Pass Test Key

export default function TurnstileWidget({
  onVerify,
  onError,
  onExpire,
  theme = 'auto',
  size = 'flexible',
  className = '',
  widgetRef = null,
}) {
  const containerRef = useRef(null)
  const widgetIdRef = useRef(null)
  const siteKey = import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY || DEFAULT_SITE_KEY

  useEffect(() => {
    let isMounted = true

    const renderWidget = () => {
      if (!isMounted || !containerRef.current || !window.turnstile) return

      // Si ya está renderizado, limpiar previo
      if (widgetIdRef.current !== null) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {
          // Noop
        }
        widgetIdRef.current = null
      }

      try {
        const id = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: theme,
          size: size,
          callback: (token) => {
            if (isMounted && onVerify) {
              onVerify(token)
            }
          },
          'error-callback': () => {
            if (isMounted && onError) {
              onError()
            }
          },
          'expired-callback': () => {
            if (isMounted && onExpire) {
              onExpire()
            }
          },
        })
        widgetIdRef.current = id

        if (widgetRef) {
          widgetRef.current = {
            reset: () => {
              if (window.turnstile && widgetIdRef.current !== null) {
                window.turnstile.reset(widgetIdRef.current)
              }
            },
          }
        }
      } catch (err) {
        console.warn('Error al renderizar Cloudflare Turnstile:', err)
      }
    }

    // Verificar si el script ya está cargado
    if (window.turnstile) {
      renderWidget()
    } else {
      let script = document.getElementById(TURNSTILE_SCRIPT_ID)
      if (!script) {
        script = document.createElement('script')
        script.id = TURNSTILE_SCRIPT_ID
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
        script.async = true
        script.defer = true
        document.head.appendChild(script)
      }

      const checkInterval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(checkInterval)
          renderWidget()
        }
      }, 50)

      const timeout = setTimeout(() => {
        clearInterval(checkInterval)
        // Fallback: si Cloudflare está bloqueado por red o adblocker en local, generar token de desarrollo para no romper la UX
        if (isMounted && !widgetIdRef.current && (siteKey === DEFAULT_SITE_KEY || import.meta.env.DEV)) {
          console.info('Cloudflare Turnstile local fallback activado.')
          onVerify?.('1x00000000000000000000AA')
        }
      }, 3500)

      return () => {
        isMounted = false
        clearInterval(checkInterval)
        clearTimeout(timeout)
        if (widgetIdRef.current !== null && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current)
          } catch {
            // Noop
          }
        }
      }
    }

    return () => {
      isMounted = false
      if (widgetIdRef.current !== null && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {
          // Noop
        }
      }
    }
  }, [siteKey, theme, size])

  return (
    <div className={`cloudflare-turnstile-wrapper flex justify-center my-2 ${className}`}>
      <div ref={containerRef} />
    </div>
  )
}