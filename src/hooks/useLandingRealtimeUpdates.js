import { useEffect, useRef } from 'react'
import echo from '../echo'

/**
 * Custom Hook para escuchar actualizaciones en tiempo real de la Landing Page.
 * Se suscribe al canal público 'public-landing' de Laravel Echo / Reverb,
 * disparando la función de refetch/actualización cuando el servidor emite .LandingUpdated.
 *
 * @param {Function} onUpdate Función que se ejecuta al recibir un evento de actualización.
 */
export const useLandingRealtimeUpdates = (onUpdate) => {
  const onUpdateRef = useRef(onUpdate)

  useEffect(() => {
    onUpdateRef.current = onUpdate
  }, [onUpdate])

  useEffect(() => {
    const handleUpdate = (data) => {
      if (typeof onUpdateRef.current === 'function') {
        onUpdateRef.current(data)
      }
    }

    // 1. Instancia de Laravel Echo
    const echoInstance = (typeof window !== 'undefined' && window.Echo) ? window.Echo : echo
    let channel = null

    if (echoInstance && typeof echoInstance.channel === 'function') {
      try {
        channel = echoInstance.channel('public-landing')
        channel.listen('.LandingUpdated', handleUpdate)
        channel.listen('LandingUpdated', handleUpdate)
        channel.listen('.landing_updated', handleUpdate)
        channel.listen('landing_updated', handleUpdate)
        channel.listen('.landing_settings_updated', handleUpdate)
        channel.listen('landing_settings_updated', handleUpdate)
        channel.listen('.SettingsUpdated', handleUpdate)
        channel.listen('SettingsUpdated', handleUpdate)
      } catch (e) {
        // Manejo silencioso si el socket no está disponible
      }
    }

    // 2. Soporte para eventos de ventana y multi-pestaña (CustomEvent y Storage)
    const handleCustomEvent = (e) => {
      handleUpdate(e.detail)
    }

    const handleStorageEvent = (e) => {
      if (e.key === 'landing_last_update') {
        handleUpdate(null)
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('landing_settings_updated', handleCustomEvent)
      window.addEventListener('landing_updated', handleCustomEvent)
      window.addEventListener('LandingUpdated', handleCustomEvent)
      window.addEventListener('storage', handleStorageEvent)
    }

    // 3. Limpieza al desmontar
    return () => {
      if (echoInstance) {
        try {
          if (channel) {
            channel.stopListening('.LandingUpdated')
            channel.stopListening('LandingUpdated')
            channel.stopListening('.landing_updated')
            channel.stopListening('landing_updated')
            channel.stopListening('.landing_settings_updated')
            channel.stopListening('landing_settings_updated')
            channel.stopListening('.SettingsUpdated')
            channel.stopListening('SettingsUpdated')
          }
          if (typeof echoInstance.leaveChannel === 'function') {
            echoInstance.leaveChannel('public-landing')
          } else if (typeof echoInstance.leave === 'function') {
            echoInstance.leave('public-landing')
          }
        } catch (e) {
          // Ignorar
        }
      }

      if (typeof window !== 'undefined') {
        window.removeEventListener('landing_settings_updated', handleCustomEvent)
        window.removeEventListener('landing_updated', handleCustomEvent)
        window.removeEventListener('LandingUpdated', handleCustomEvent)
        window.removeEventListener('storage', handleStorageEvent)
      }
    }
  }, [])
}

export default useLandingRealtimeUpdates
