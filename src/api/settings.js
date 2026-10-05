import client from './client'

export const isColorLight = (hexColor) => {
  if (!hexColor || typeof hexColor !== 'string') return false
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

export const darkenHex = (hex, percent = 0.14) => {
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

  let newL = l > 0.5 ? Math.max(0, l - percent) : Math.max(0, l * 0.4)

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

export const adjustColor = darkenHex

export const applyGlobalTheme = (fondo, primario, apoyo) => {
  const f = fondo || '#1C1917'
  const p = primario || '#7c3aed'
  const a = apoyo || '#06b6d4'
  const isLight = isColorLight(f)

  const fDarker = darkenHex(f, 0.14)
  const fCard = isLight ? darkenHex(f, 0.06) : darkenHex(f, -0.08)
  const textColor = isLight ? '#0f172a' : '#ffffff'
  const textMuted = isLight ? '#334155' : 'rgba(255, 255, 255, 0.75)'
  const textSubtle = isLight ? '#64748b' : 'rgba(255, 255, 255, 0.5)'
  const borderSubtle = isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.08)'

  document.documentElement.style.setProperty('--color-fondo', f)
  document.documentElement.style.setProperty('--color-primario', p)
  document.documentElement.style.setProperty('--color-apoyo', a)

  document.documentElement.style.setProperty('--theme-bg', f)
  document.documentElement.style.setProperty('--theme-bg-darker', fDarker)
  document.documentElement.style.setProperty('--theme-surface', fDarker)
  document.documentElement.style.setProperty('--theme-card', fCard)
  document.documentElement.style.setProperty('--theme-primary', p)
  document.documentElement.style.setProperty('--theme-text', textColor)
  document.documentElement.style.setProperty('--theme-text-muted', textMuted)
  document.documentElement.style.setProperty('--theme-text-subtle', textSubtle)
  document.documentElement.style.setProperty('--theme-border-subtle', borderSubtle)

  if (isLight) {
    document.documentElement.classList.add('theme-light')
    document.documentElement.classList.remove('theme-dark', 'dark')
  } else {
    document.documentElement.classList.add('theme-dark', 'dark')
    document.documentElement.classList.remove('theme-light')
  }
}

export const getConfiguracion = () =>
  Promise.all([
    client.get('/admin/configuracion').catch(() => ({ data: {} })),
    client.get('/settings').catch(() => ({ data: {} })),
    client.get('/admin/settings').catch(() => ({ data: {} }))
  ]).then(([configRes, settingsRes, adminRes]) => {
    const config = configRes.data || {}
    const settings = settingsRes.data || {}
    const admin = adminRes.data || {}

    const parseNested = (val) => {
      if (!val) return {}
      if (typeof val === 'string') {
        try { return JSON.parse(val) || {} } catch (e) { return {} }
      }
      return typeof val === 'object' ? val : {}
    }

    const discordSettings = {
      ...parseNested(config.discord_settings),
      ...parseNested(settings.discord_settings),
      ...parseNested(admin.discord_settings),
    }

    const telegramSettings = {
      ...parseNested(config.telegram_settings),
      ...parseNested(settings.telegram_settings),
      ...parseNested(admin.telegram_settings),
    }

    return {
      data: {
        ...config,
        ...settings,
        ...admin,
        restaurant_name: admin.restaurant_name
          || settings.restaurant_name
          || config.restaurant_name
          || config.nombre_comercial
          || config.nombre
          || 'Restaurante',
        logo_url: admin.logo_url
          || settings.logo_url
          || config.logo_url
          || config.logotipo
          || null,
        brand_color: admin.brand_color
          || settings.brand_color
          || config.color_primario
          || '#7c3aed',
        delivery_fee: admin.delivery_fee
          || settings.delivery_fee
          || config.delivery_fee
          || 0,
        free_delivery_over: admin.free_delivery_over
          || settings.free_delivery_over
          || config.free_delivery_over
          || 0,
        latitude: admin.latitude ?? settings.latitude ?? config.latitude ?? admin.lat ?? settings.lat ?? config.lat ?? null,
        longitude: admin.longitude ?? settings.longitude ?? config.longitude ?? admin.lng ?? settings.lng ?? config.lng ?? admin.lon ?? settings.lon ?? config.lon ?? null,
        delivery_radius_meters: admin.delivery_radius_meters
          || settings.delivery_radius_meters
          || 3000,
        active_notification_platform: admin.active_notification_platform ?? settings.active_notification_platform ?? config.active_notification_platform ?? 'none',
        discord_settings: discordSettings,
        telegram_settings: telegramSettings,
      }
    }
  })

export const updateConfiguracion     = (data) => client.put('/admin/configuracion', data).catch(() => client.put('/admin/settings', data))

export const uploadLogoConfiguracion = (file) => {
  const formData = new FormData()
  formData.append('logo', file, file.name)
  return client.post('/admin/settings/logo', formData, {
    headers: {
      'Content-Type': undefined
    }
  })
}

export const getSettings         = getConfiguracion
export const updateSettings = (data) => client.put('/admin/settings', data)
export const updateCredentials   = (data) => client.put('/admin/settings/credentials', data)
