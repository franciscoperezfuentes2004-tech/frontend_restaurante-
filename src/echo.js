import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import client from './api/client'

window.Pusher = Pusher

// Obtener el token de autenticación del usuario / mesero desde el almacenamiento local
const getToken = () => {
  try {
    let token = localStorage.getItem('token')
      || localStorage.getItem('aurum_token')
      || sessionStorage.getItem('token')
      || sessionStorage.getItem('aurum_token')

    if (!token) {
      const userStr = localStorage.getItem('aurum_user')
      if (userStr) {
        const userObj = JSON.parse(userStr)
        token = userObj?.token || userObj?.access_token || userObj?.api_token || null
      }
    }
    return token
  } catch (e) {
    return null
  }
}

const wsHost = import.meta.env.VITE_REVERB_HOST || (typeof window !== 'undefined' ? window.location.hostname : 'localhost')
const wsPort = import.meta.env.VITE_REVERB_PORT ? Number(import.meta.env.VITE_REVERB_PORT) : 8080
const wsScheme = import.meta.env.VITE_REVERB_SCHEME || 'http'
const isTls = wsScheme === 'https' || (typeof window !== 'undefined' && window.location.protocol === 'https:')
const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
const authUrl = apiBase.endsWith('/') ? `${apiBase}broadcasting/auth` : `${apiBase}/broadcasting/auth`

const echo = new Echo({
  broadcaster: 'reverb',
  key: import.meta.env.VITE_REVERB_APP_KEY || import.meta.env.VITE_PUSHER_APP_KEY || 'aurum_key_local',
  wsHost: wsHost,
  wsPort: wsPort,
  wssPort: wsPort,
  forceTLS: isTls,
  enabledTransports: ['ws', 'wss'],
  disableStats: true,
  authEndpoint: authUrl,
  auth: {
    headers: {
      get Authorization() {
        const token = getToken()
        return token ? `Bearer ${token}` : ''
      }
    }
  },
  authorizer: (channel, options) => {
    return {
      authorize: (socketId, callback) => {
        const token = getToken()
        client.post('/broadcasting/auth', {
          socket_id: socketId,
          channel_name: channel.name,
        }, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
          .then(response => {
            callback(false, response.data)
          })
          .catch(error => {
            callback(true, error)
          })
      },
    }
  },
})

try {
  if (echo && echo.connector && echo.connector.pusher) {
    echo.connector.pusher.connection.bind('error', () => {
      // Manejo silencioso de desconexión si el servidor de websockets no está disponible
    })
  }
} catch (e) {
  // Ignorar
}

if (typeof window !== 'undefined') {
  window.Echo = echo
}

export default echo
