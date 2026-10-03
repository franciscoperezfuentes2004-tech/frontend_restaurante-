/* eslint-disable react-refresh/only-export-components, no-unused-vars, no-useless-assignment */
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { getConfiguracion } from '../api/settings'
import { updateDocumentTitle, updateFavicon } from '../utils/tabManager'

const ThemeContext = createContext(null)

function darkenHex(hex, percent = 0.14) {
  if (!hex || typeof hex !== 'string') return '#000000'
  let clean = hex.replace('#', '').trim()
  if (clean.length === 3) clean = clean.split('').map(c => c + c).join('')
  if (clean.length !== 6) return '#000000'

  let r = parseInt(clean.substring(0, 2), 16) / 255
  let g = parseInt(clean.substring(2, 4), 16) / 255
  let b = parseInt(clean.substring(4, 6), 16) / 255

  let max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0, l = (max + min) / 2

  if (max === min) {
    h = s = 0
  } else {
    let d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }

  // Si el color base ya es oscuro (l < 0.3), escalamos su luminosidad (~65% del tono original, mín 0.055)
  // para evitar caer en #000000 (negro profundo) y mantener un tono 2 oscuro refinado y armónico
  let newL = l < 0.3 ? Math.max(0.055, l * 0.65) : Math.max(0, Math.min(1, l - percent))

  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1/6) return p + (q - p) * 6 * t
    if (t < 1/2) return q
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
    return p
  }

  let q = newL < 0.5 ? newL * (1 + s) : newL + s - newL * s
  let p = 2 * newL - q
  let nr = Math.round(hue2rgb(p, q, h + 1/3) * 255)
  let ng = Math.round(hue2rgb(p, q, h) * 255)
  let nb = Math.round(hue2rgb(p, q, h - 1/3) * 255)

  return '#' + nr.toString(16).padStart(2, '0') + ng.toString(16).padStart(2, '0') + nb.toString(16).padStart(2, '0')
}

  const adjustColor = (color, amount) => {
    if (!color || typeof color !== 'string') return '#000000'
    let hex = color.replace(/^#/, '')
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
    if (hex.length !== 6) return '#000000'

    let r = parseInt(hex.substring(0, 2), 16)
    let g = parseInt(hex.substring(2, 4), 16)
    let b = parseInt(hex.substring(4, 6), 16)

    r = Math.max(0, Math.min(255, r + amount))
    g = Math.max(0, Math.min(255, g + amount))
    b = Math.max(0, Math.min(255, b + amount))

    return '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0')
  }

/**
 * Detecta si un color hex es claro (luminosidad > 50%).
 */
function isColorLight(hexColor) {
  if (!hexColor || typeof hexColor !== 'string') return false
  const cleanHex = hexColor.trim().toLowerCase()
  if (cleanHex === '#e9eaf2' || cleanHex === '#272e38' || cleanHex === '#e9ecf2' || cleanHex === '#e6eaf0' || cleanHex === '#ffffff' || cleanHex === 'claro') return true
  const hex = hexColor.replace('#', '').trim()
  let r = 0, g = 0, b = 0
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16) || 0
    g = parseInt(hex[1] + hex[1], 16) || 0
    b = parseInt(hex[2] + hex[2], 16) || 0
  } else if (hex.length === 6) {
    r = parseInt(hex.substring(0, 2), 16) || 0
    g = parseInt(hex.substring(2, 4), 16) || 0
    b = parseInt(hex.substring(4, 6), 16) || 0
  }
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness > 128
}

// Inyección inmediata para asegurar que las variables del tema existan desde el primer frame
if (typeof document !== 'undefined') {
  if (!document.documentElement.style.getPropertyValue('--theme-primary')) {
    document.documentElement.style.setProperty('--theme-primary', '#1e40af')
    document.documentElement.style.setProperty('--theme-primary-contrast', '#ffffff')
    document.documentElement.style.setProperty('--theme-bg', '#E9EAF2')
    document.documentElement.style.setProperty('--theme-subcard-bg', '#E9EAF2')
    document.documentElement.style.setProperty('--theme-surface', '#FFFFFF')
    document.documentElement.style.setProperty('--theme-card', '#FFFFFF')
  }
}

export function ThemeProvider({ children }) {
  const [colorFondo, setColorFondo] = useState(() => {
    try {
      const isLight = localStorage.getItem('rest_theme_is_light') === 'true'
      return localStorage.getItem('rest_theme_bg') || (isLight ? '#E9EAF2' : '#1C1917')
    } catch {
      return '#1C1917'
    }
  })
  const [colorPrimario, setColorPrimario] = useState(() => {
    try {
      return localStorage.getItem('rest_theme_primary') || '#1e40af'
    } catch {
      return '#1e40af'
    }
  })
  const [colorApoyo, setColorApoyo] = useState('#06b6d4')
  const [restaurantName, setRestaurantName] = useState(() => {
    try {
      return localStorage.getItem('rest_name') || ''
    } catch {
      return ''
    }
  })
  const [logoUrl, setLogoUrl] = useState(() => {
    try {
      return localStorage.getItem('rest_logo') || null
    } catch {
      return null
    }
  })
  const [loaded, setLoaded] = useState(false)

  // Sincronizar título y favicon de la pestaña con la información del restaurante
  useEffect(() => {
    if (restaurantName) {
      updateDocumentTitle(restaurantName)
    }
  }, [restaurantName])

  useEffect(() => {
    if (logoUrl) {
      updateFavicon(logoUrl)
    }
  }, [logoUrl])

  // Cargar colores y configuración desde la API al montar
  useEffect(() => {
    getConfiguracion().then(res => {
      const config = res.data || {}
      const fondo = config.fondo_sistema === 'claro'
        ? '#E9EAF2'
        : config.fondo_sistema || config.fondoSistema || config.color_fondo || '#1C1917'
      const primario = config.color_primario || config.colorPrimario || config.brand_color || '#1e40af'
      const apoyo = config.color_apoyo || config.colorApoyo || config.secondary_color || '#06b6d4'
      const name = config.restaurant_name || config.nombre_comercial || config.nombre || config.name || ''
      const logo = config.logo_url || config.logotipo || config.logo || null

      const fondoFinal = isColorLight(fondo) ? '#E9EAF2' : fondo
      setColorFondo(fondoFinal)
      setColorPrimario(primario)
      setColorApoyo(apoyo)
      if (name) setRestaurantName(name)
      if (logo) setLogoUrl(logo)
      setLoaded(true)
    }).catch(() => {
      setLoaded(true)
    })
  }, [])

    // Aplicar body background y CSS vars globales siempre que cambien los colores
    useEffect(() => {
      const isLight = isColorLight(colorFondo)
      // Segundo tono (#E9EAF2): tono exterior suave para contraste con tarjetas blancas
      const activeFondo = isLight ? '#E9EAF2' : colorFondo
      
      // TONO 2 (Fondo de la vista <body> / <main> Nivel 0, y Segundos/Cuartos Contenedores Agrupadores Nivel 2 & 4):
      const themeBgDarker = darkenHex(activeFondo, 0.14) // El tono oscuro de los segundos y cuartos contenedores
      const themeBg       = isLight ? '#E9EAF2' : themeBgDarker // Fondo de la vista idéntico a los contenedores
      const themeSubcard  = themeBg // ÚNICA FUENTE DE VERDAD
      
      // TONO 1 (Menú Lateral / Sidebar, Topbar, Primer Contenedor / Tarjetas Principales Nivel 1):
      const themeCard     = isLight ? '#FFFFFF' : colorFondo // Tono original intacto (#1C1917)
      const themeSurface  = themeCard // Tono original intacto (#1C1917)
      const themeInput    = isLight ? '#FFFFFF' : themeSubcard // TONO 2 (El más oscuro / hundido para segundos campos e inputs)
      
      const themePrimary = colorPrimario
      const isPrimaryLight = isColorLight(colorPrimario)
      const themePrimaryText = isPrimaryLight ? '#000000' : '#FFFFFF'
      const themeText = isLight ? '#0f172a' : '#F1F5F9'
      const themeTextMuted = isLight ? '#475569' : 'rgba(241,245,249,0.6)'
      const themeTextSubtle = isLight ? '#64748b' : 'rgba(241,245,249,0.4)'
      
      const themeBorder = isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.12)'
      const themeBorderSubtle = isLight ? '#C5CBD5' : 'rgba(255, 255, 255, 0.08)'

    document.body.style.backgroundColor = themeBg

    // GUARDAR EN CACHÉ PARA EVITAR EL PARPADEO (FOIT) AL RECARGAR
    try {
      localStorage.setItem('rest_theme_bg', themeBg)
      localStorage.setItem('rest_theme_primary', themePrimary)
      localStorage.setItem('rest_theme_surface', themeSurface)
      localStorage.setItem('rest_theme_is_light', isLight ? 'true' : 'false')
    } catch (e) {
      // Ignorar si el usuario tiene bloqueado localStorage
    }

    // ASIGNACIÓN DEFINITIVA DE LAS VARIABLES DEL TEMA
    document.documentElement.style.setProperty('--theme-bg', themeBg)
    document.documentElement.style.setProperty('--theme-bg-darker', themeBgDarker)
    document.documentElement.style.setProperty('--theme-surface', themeSurface)
    document.documentElement.style.setProperty('--theme-card', themeCard)
    document.documentElement.style.setProperty('--theme-subcard-bg', themeSubcard)
    document.documentElement.style.setProperty('--theme-input', themeInput)
    document.documentElement.style.setProperty('--theme-primary', themePrimary)
    document.documentElement.style.setProperty('--theme-text', themeText)
    document.documentElement.style.setProperty('--theme-text-muted', themeTextMuted)
    document.documentElement.style.setProperty('--theme-text-subtle', themeTextSubtle)
    document.documentElement.style.setProperty('--theme-border', themeBorder)
    document.documentElement.style.setProperty('--theme-border-subtle', themeBorderSubtle)

    // Inyectar sombras al :root
    document.documentElement.style.setProperty('--theme-shadow-card', isLight ? '0 10px 30px -4px rgba(0,0,0,0.04), 0 4px 10px -2px rgba(0,0,0,0.02)' : '0 4px 6px -1px rgba(0,0,0,0.3), 0 2px 4px -1px rgba(0,0,0,0.2)')
    document.documentElement.style.setProperty('--theme-shadow-sidebar', isLight ? '4px 0 24px -2px rgba(0, 0, 0, 0.04), 1px 0 3px rgba(0, 0, 0, 0.02)' : 'none')
    document.documentElement.style.setProperty('--theme-shadow-topbar', isLight ? '0 4px 24px -2px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)' : 'none')

    const hexToRgb = (hex) => {
      if (!hex || typeof hex !== 'string') return { r: 124, g: 58, b: 237 }
      const clean = hex.replace('#', '')
      if (clean.length === 3) {
        return {
          r: parseInt(clean[0] + clean[0], 16) || 0,
          g: parseInt(clean[1] + clean[1], 16) || 0,
          b: parseInt(clean[2] + clean[2], 16) || 0
        }
      }
      return {
        r: parseInt(clean.slice(0, 2), 16) || 0,
        g: parseInt(clean.slice(2, 4), 16) || 0,
        b: parseInt(clean.slice(4, 6), 16) || 0
      }
    }
    const luminance = (hex) => {
      const { r, g, b } = hexToRgb(hex)
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255
    }
    const primaryColor = colorPrimario || '#1e40af'
    const contrastColor = luminance(primaryColor) > 0.5 ? '#000000' : '#ffffff'
    document.documentElement.style.setProperty('--theme-primary-contrast', contrastColor)

    document.documentElement.style.setProperty('--theme-primary-text', themePrimaryText)
    document.documentElement.style.setProperty('--theme-text', themeText)
    document.documentElement.style.setProperty('--theme-text-muted', themeTextMuted)
    document.documentElement.style.setProperty('--theme-border-subtle', themeBorderSubtle)

    // CSS variables legacy para compatibilidad
    document.documentElement.style.setProperty('--color-fondo', colorFondo)
    document.documentElement.style.setProperty('--color-primario', colorPrimario)
    document.documentElement.style.setProperty('--color-apoyo', colorApoyo)

    if (isLight) {
      document.documentElement.classList.add('theme-light')
      document.documentElement.classList.remove('theme-dark', 'dark')
      document.body.style.color = '#020617'
    } else {
      document.documentElement.classList.add('theme-dark', 'dark')
      document.documentElement.classList.remove('theme-light')
      document.body.style.color = '#F1F5F9'
    }

    return () => {
      // Las propiedades se sobreescriben atómicamente con setProperty en cada cambio.
      // No se eliminan aquí para evitar parpadeos o que queden vacías entre renders.
    }
  }, [colorFondo, colorPrimario, colorApoyo])

  // Función para actualizar colores desde Settings.jsx
  const updateTheme = useCallback((fondo, primario, apoyo) => {
    if (fondo) setColorFondo(fondo)
    if (primario) setColorPrimario(primario)
    if (apoyo) setColorApoyo(apoyo)
  }, [])

  // Colores y niveles calculados derivados del fondo
  const computed = useMemo(() => {
    const isLight = isColorLight(colorFondo)
    const isPrimaryLight = isColorLight(colorPrimario)
    const primaryBtnText = isPrimaryLight ? '#000000' : '#FFFFFF'

    if (isLight) {
      const lightBg = '#E9EAF2'
      return {
        isLight: true,
        isPrimaryLight,
        primaryBtnText,
        bgBody: lightBg,
        bgSidebar: '#FFFFFF',
        bgTopbar: colorPrimario,
        sidebarShadow: '4px 0 24px rgba(0, 0, 0, 0.06), 1px 0 4px rgba(0, 0, 0, 0.03)',
        topbarShadow: '0 4px 24px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.03)',
        bgCard: '#FFFFFF',
        cardShadow: '0 10px 25px -5px rgba(0,0,0,0.08), 0 4px 10px -4px rgba(0,0,0,0.04)',
        cardShadowHover: '0 10px 15px -3px rgba(0, 0, 0, 0.06), 0 4px 6px -4px rgba(0, 0, 0, 0.03)',
        bgSubcard: lightBg,
        bgTable: adjustColor(lightBg, -15),
        subcardShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.01)',
        bgInput: '#FFFFFF',
        inputShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        inputShadowFocus: '0 0 0 3px rgba(124, 58, 237, 0.15), 0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        bgModal: '#FFFFFF',
        bgDropdown: '#FFFFFF',
        modalShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        dropdownShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        border: '#CBD5E1',
        borderSubtle: 'rgba(0, 0, 0, 0.07)',
        borderFocus: colorPrimario,
        textColor: '#0f172a',
        textMuted: '#475569',
        textSubtle: '#64748b',
        colorPrimario,
        colorApoyo,
        colorFondo: lightBg,
      }
    }

    // Modo Oscuro
    const darkSubcardTone = darkenHex(colorFondo, 0.14) // Tono 2 (Fondo de la vista Nivel 0 y Contenedores Hundidos Nivel 2 & 4)
    const darkCardTone    = colorFondo                  // Tono 1 (Menú Lateral, Topbar, Tarjetas Principales Nivel 1, Inputs Nivel 3)
    return {
      isLight: false,
      isPrimaryLight,
      primaryBtnText,
      bgBody: darkSubcardTone,
      bgSidebar: darkCardTone,
      bgTopbar: darkCardTone,
      sidebarShadow: 'none',
      topbarShadow: 'none',
      bgCard: darkCardTone,
      cardShadow: '0 4px 6px -1px rgba(0,0,0,0.3), 0 2px 4px -1px rgba(0,0,0,0.2)',
      cardShadowHover: '0 10px 20px -5px rgba(0,0,0,0.4)',
      bgSubcard: darkSubcardTone,
      bgTable: darkCardTone,
      subcardShadow: '0 1px 3px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
      bgInput: darkSubcardTone,
      inputShadow: 'none',
      inputShadowFocus: '0 0 0 3px rgba(124, 58, 237, 0.3)',
      bgModal: darkCardTone,
      bgDropdown: darkCardTone,
      modalShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      dropdownShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
      border: 'rgba(255, 255, 255, 0.12)',
      borderSubtle: 'rgba(255, 255, 255, 0.08)',
      borderFocus: colorPrimario,
      textColor: '#F1F5F9',
      textMuted: 'rgba(241,245,249,0.6)',
      textSubtle: 'rgba(241,245,249,0.4)',
      colorPrimario,
      colorApoyo,
      colorFondo,
    }
  }, [colorFondo, colorPrimario, colorApoyo])

  const value = useMemo(() => ({
    ...computed,
    updateTheme,
    loaded,
    restaurantName,
    setRestaurantName,
    logoUrl,
    setLogoUrl,
  }), [computed, updateTheme, loaded, restaurantName, logoUrl])

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    // Fallback cuando se usa fuera del provider (ej. Landing pública)
    return {
      isLight: false,
      bgBody: 'rgb(8,5,3)',
      bgSidebar: 'rgb(18,15,13)',
      bgTopbar: 'rgb(18,15,13)',
      bgCard: '#1C1917',
      bgModal: '#1C1917',
      bgInput: 'rgb(13,10,8)',
      bgDropdown: 'rgb(13,10,8)',
      border: 'rgba(255, 255, 255, 0.12)',
      borderSubtle: 'rgba(255, 255, 255, 0.08)',
      textColor: '#F1F5F9',
      textMuted: 'rgba(241,245,249,0.6)',
      textSubtle: 'rgba(241,245,249,0.4)',
      colorPrimario: '#1e40af',
      colorApoyo: '#06b6d4',
      colorFondo: '#1C1917',
      updateTheme: () => {},
      loaded: false,
      restaurantName: '',
      logoUrl: null,
      setRestaurantName: () => {},
      setLogoUrl: () => {},
    }
  }
  return ctx
}
