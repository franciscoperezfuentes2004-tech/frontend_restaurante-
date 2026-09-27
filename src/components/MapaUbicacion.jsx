import React, { useMemo } from 'react'

export default function MapaUbicacion({ 
  latitude, 
  longitude, 
  address, 
  direccion, 
  mapsLink, 
  colorPrimario = '#7c3aed', 
  restName = 'Restaurante' 
}) {
  const ubicacionTexto = (address || direccion || '').trim()
  const lat = latitude ? parseFloat(latitude) : null
  const lng = longitude ? parseFloat(longitude) : null

  const hasLocation = Boolean(ubicacionTexto || (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) || mapsLink)

  // 1. Destino unificado y prioritario para garantizar que la vista previa y el botón apunten EXACTAMENTE al mismo lugar
  const targetQuery = useMemo(() => {
    // Si tenemos coordenadas numéricas válidas (máxima precisión de geolocalización)
    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      return `${lat},${lng}`
    }
    // Si tenemos dirección en texto (ej. "hacienda de cabañas, guerrero")
    if (ubicacionTexto) {
      return ubicacionTexto
    }
    // Si mapsLink tiene un query q= o destination=
    if (mapsLink && typeof mapsLink === 'string') {
      try {
        const urlObj = new URL(mapsLink)
        const qVal = urlObj.searchParams.get('q') || urlObj.searchParams.get('destination')
        if (qVal) return qVal
      } catch {
        // ignore
      }
    }
    return 'Mexico'
  }, [lat, lng, ubicacionTexto, mapsLink])

  // 2. Construir URL de Google Maps Embed
  const embedUrl = useMemo(() => {
    // Si el usuario ingresó un iframe HTML directo en mapsLink: <iframe src="..." ...>
    if (mapsLink && typeof mapsLink === 'string') {
      const iframeMatch = mapsLink.match(/src=["']([^"']+)["']/)
      if (iframeMatch && iframeMatch[1]) {
        return iframeMatch[1]
      }
      // Si ya es una URL de embed directa
      if (mapsLink.includes('/maps/embed')) {
        return mapsLink
      }
    }

    // Embed interactivo usando el destino exacto unificado
    return `https://maps.google.com/maps?q=${encodeURIComponent(targetQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`
  }, [mapsLink, targetQuery])

  // 3. URL para el botón CÓMO LLEGAR (Google Maps Navigation con la misma ubicación exacta)
  const directionsUrl = useMemo(() => {
    if (mapsLink && typeof mapsLink === 'string') {
      if (mapsLink.includes('/dir/') || mapsLink.includes('destination=')) {
        return mapsLink
      }
      if (mapsLink.includes('maps.app.goo.gl') || mapsLink.includes('goo.gl/maps')) {
        return mapsLink
      }
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(targetQuery)}`
  }, [mapsLink, targetQuery])

  if (!hasLocation) {
    return (
      <div 
        className="w-full h-full min-h-[300px] bg-neutral-900 rounded-xl animate-pulse border border-white/10 flex items-center justify-center text-white/40 text-xs"
      >
        Cargando mapa...
      </div>
    )
  }

  return (
    <div 
      className="relative w-full h-full min-h-[280px] sm:min-h-[350px] md:min-h-[400px] rounded-xl overflow-hidden shadow-lg border border-white/10 bg-neutral-900"
    >
      <iframe
        title={`Mapa de ubicación de ${restName}`}
        src={embedUrl}
        width="100%"
        height="100%"
        className="w-full h-full border-0"
        style={{ border: 0 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />

      {/* Botón Flotante Protegido ("Cómo llegar") */}
      <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-20">
        <a
          href={directionsUrl}
          target="_blank"
          // PROTECCIÓN CRÍTICA: Bloquea el acceso al objeto window.opener contra Reverse Tabnabbing
          rel="noopener noreferrer"
          style={{ backgroundColor: colorPrimario || '#7c3aed' }}
          className="flex items-center gap-2 text-white px-4 py-2.5 sm:px-6 sm:py-3 rounded-full font-bold text-xs sm:text-sm shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 hover:opacity-95 cursor-pointer"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          CÓMO LLEGAR
        </a>
      </div>
    </div>
  )
}
