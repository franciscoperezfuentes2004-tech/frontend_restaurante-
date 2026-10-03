import axios from 'axios'

axios.defaults.withCredentials = true;

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  withXSRFToken: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
})

// Interceptor de solicitud: Inyecta el token Bearer en Authorization si existe (excepto en endpoints públicos)
client.interceptors.request.use(
  config => {
    try {
      const isPublicEndpoint = config.skipAuth || config.url?.startsWith('/public') || config.url?.startsWith('public')
      if (isPublicEndpoint) {
        if (config.headers && config.headers.Authorization) {
          delete config.headers.Authorization
        }
        return config
      }

      let token = localStorage.getItem('aurum_token') 
        || localStorage.getItem('token')
        || sessionStorage.getItem('aurum_token')
        || sessionStorage.getItem('token')

      if (!token) {
        const userStr = localStorage.getItem('aurum_user')
        if (userStr) {
          const userObj = JSON.parse(userStr)
          token = userObj?.token || userObj?.access_token || userObj?.api_token || null
        }
      }

      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch (e) {
      // Ignorar error al leer token
    }
    return config
  },
  error => Promise.reject(error)
)

// Interceptor de respuesta: al recibir 401, limpia aurum_user y redirige al login (excepto en websockets y endpoints opcionales)
client.interceptors.response.use(
  response => response,
  error => {
    const isBroadcasting = error.config?.url?.includes('broadcasting/auth')
    
    // Manejo de Rate Limiting (HTTP 429 Too Many Requests)
    if (error.response?.status === 429) {
      if (!error.response.data || typeof error.response.data !== 'object') {
        error.response.data = {}
      }
      error.response.data.message = 'Has intentado demasiadas veces. Por favor, espera un minuto antes de volver a intentarlo.'
    }

    if (error.response?.status === 401 && !isBroadcasting) {
      localStorage.removeItem('aurum_user')
      // Rutas públicas — no redirigir al login
      const publicPaths = ['/', '/menu', '/login']
      const isPublic = publicPaths.some(path =>
        window.location.pathname === path ||
        window.location.pathname.startsWith('/menu')
      )
      if (!isPublic) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default client
