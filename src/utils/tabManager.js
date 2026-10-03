/**
 * Utility to manage browser tab title and favicon dynamically.
 */

export function getFullImageUrl(url) {
  if (!url || typeof url !== 'string') return ''
  const trimmed = url.trim()
  if (!trimmed) return ''
  
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed
  }

  const apiBase = (import.meta.env?.VITE_API_URL || '').replace(/\/api\/?$/, '')
  const base = apiBase || origin
  return `${base}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`
}

/**
 * Formatea el título asegurando que por defecto la primera letra siempre sea mayúscula.
 * Por ejemplo: "paco" -> "Paco", "restaurante paco" -> "Restaurante Paco".
 */
export function formatTitle(name) {
  if (!name || typeof name !== 'string') return 'Restaurante'
  const trimmed = name.trim()
  if (!trimmed) return 'Restaurante'
  return trimmed.replace(/(^|\s)\S/g, letter => letter.toUpperCase())
}

export function updateDocumentTitle(name) {
  if (typeof document === 'undefined') return
  const formatted = formatTitle(name)
  document.title = formatted
  try {
    localStorage.setItem('rest_name', formatted)
    localStorage.setItem('nombre_comercial', formatted)
  } catch {
    // Ignore storage quota errors
  }
}

function applyFaviconToDom(iconHref) {
  try {
    const existing = document.querySelectorAll("link[rel*='icon']")
    existing.forEach(el => el.remove())

    const link = document.createElement('link')
    link.rel = 'icon'

    if (iconHref.includes('.svg')) {
      link.type = 'image/svg+xml'
    } else if (iconHref.includes('.png')) {
      link.type = 'image/png'
    } else if (iconHref.includes('.jpg') || iconHref.includes('.jpeg')) {
      link.type = 'image/jpeg'
    } else if (iconHref.includes('.webp')) {
      link.type = 'image/webp'
    }

    link.href = iconHref
    document.head.appendChild(link)

    let appleLink = document.querySelector("link[rel='apple-touch-icon']")
    if (!appleLink) {
      appleLink = document.createElement('link')
      appleLink.rel = 'apple-touch-icon'
      document.head.appendChild(appleLink)
    }
    appleLink.href = iconHref

    localStorage.setItem('rest_logo', iconHref)
  } catch {
    // Ignore errors
  }
}

/**
 * Aplica el logotipo original completo en el favicon sin recortes ni zoom.
 */
export function updateFavicon(url) {
  if (typeof document === 'undefined') return
  if (!url || typeof url !== 'string') return
  const fullUrl = getFullImageUrl(url)
  if (!fullUrl) return

  applyFaviconToDom(fullUrl)
}

export function updateTabInfo(name, logoUrl) {
  if (name) updateDocumentTitle(name)
  if (logoUrl) updateFavicon(logoUrl)
}
