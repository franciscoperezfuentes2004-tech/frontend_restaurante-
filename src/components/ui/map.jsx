import React, { useEffect, useRef, createContext, useContext } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import circle from '@turf/circle'

const MapContext = createContext(null)

export const OPENFREEMAP_DARK_STYLE = 'https://tiles.openfreemap.org/styles/dark'

export const CARTO_DARK_STYLE = {
  version: 8,
  sources: {
    'carto-dark': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'
      ],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }
  },
  layers: [
    {
      id: 'carto-dark-layer',
      type: 'raster',
      source: 'carto-dark',
      minzoom: 0,
      maxzoom: 20
    }
  ]
}

export const CARTO_LIGHT_STYLE = {
  version: 8,
  sources: {
    'carto-light': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png'
      ],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }
  },
  layers: [
    {
      id: 'carto-light-layer',
      type: 'raster',
      source: 'carto-light',
      minzoom: 0,
      maxzoom: 20
    }
  ]
}

export const CARTO_VOYAGER_STYLE = CARTO_LIGHT_STYLE

export function parseAndSanitizeCoords(rawLng, rawLat, defaultLng = -99.133209, defaultLat = 19.432608) {
  let lng = (rawLng !== undefined && rawLng !== null && rawLng !== '') ? parseFloat(rawLng) : defaultLng
  let lat = (rawLat !== undefined && rawLat !== null && rawLat !== '') ? parseFloat(rawLat) : defaultLat

  if (isNaN(lng)) lng = defaultLng
  if (isNaN(lat)) lat = defaultLat

  // Inversión de seguridad si la latitud viene fuera de los límites [-90, 90]
  if (lng !== null && lat !== null && Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
    const temp = lat
    lat = lng
    lng = temp
  }

  return { lng, lat }
}

export function Map({ 
  initialViewState, 
  mapStyle, 
  style: styleProp, 
  zoom: zoomProp,
  latitude: latProp,
  longitude: lngProp,
  navigationControl = true,
  showCompass = false,
  scrollZoom = true,
  dragPan = true,
  children, 
  className = 'w-full h-full', 
  onLoad 
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const [mapLoaded, setMapLoaded] = React.useState(false)

  // Separar style de cartografía vs style CSS de contenedor para evitar colisión de props en React
  const customCssStyle = (styleProp && typeof styleProp === 'object' && !styleProp.version && !styleProp.sources) ? styleProp : {}
  const cartographyStyle = mapStyle || ((typeof styleProp === 'string' || styleProp?.version) ? styleProp : null) || CARTO_DARK_STYLE

  useEffect(() => {
    if (!containerRef.current) return

    const rawLng = lngProp ?? initialViewState?.longitude
    const rawLat = latProp ?? initialViewState?.latitude
    const { lng, lat } = parseAndSanitizeCoords(rawLng, rawLat)
    
    const rawZoom = zoomProp ?? initialViewState?.zoom ?? 15
    const zoom = !isNaN(Number(rawZoom)) ? parseFloat(rawZoom) : 15

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: cartographyStyle,
      center: [lng, lat], // ESTRICTO [longitude, latitude] para MapLibre
      zoom: zoom,
      scrollZoom: scrollZoom,
      dragPan: dragPan,
      attributionControl: true
    })

    if (navigationControl) {
      map.addControl(new maplibregl.NavigationControl({ showCompass: showCompass }), 'top-right')
    }

    const triggerResize = () => {
      if (mapRef.current) {
        mapRef.current.resize()
      }
    }

    map.on('load', () => {
      setMapLoaded(true)
      triggerResize()
      requestAnimationFrame(triggerResize)
      setTimeout(triggerResize, 60)
      setTimeout(triggerResize, 180)
      setTimeout(triggerResize, 400)
      setTimeout(triggerResize, 800)
      if (onLoad) onLoad(map)
    })

    map.on('error', (e) => {
      if (mapRef.current && cartographyStyle !== CARTO_DARK_STYLE) {
        try {
          mapRef.current.setStyle(CARTO_DARK_STYLE)
        } catch (err) {}
      }
    })

    const resizeObserver = new ResizeObserver(() => {
      triggerResize()
    })
    resizeObserver.observe(containerRef.current)

    window.addEventListener('resize', triggerResize)

    mapRef.current = map

    return () => {
      window.removeEventListener('resize', triggerResize)
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (mapRef.current && (initialViewState || (lngProp !== undefined && latProp !== undefined))) {
      const rawLng = lngProp ?? initialViewState?.longitude
      const rawLat = latProp ?? initialViewState?.latitude
      const { lng, lat } = parseAndSanitizeCoords(rawLng, rawLat, null, null)
      if (lng !== null && lat !== null) {
        const rawZoom = zoomProp ?? initialViewState?.zoom ?? 15
        const zoom = !isNaN(Number(rawZoom)) ? parseFloat(rawZoom) : 15
        mapRef.current.flyTo({
          center: [lng, lat], // ESTRICTO [longitude, latitude]
          zoom: zoom,
          essential: true
        })
      }
    }
  }, [initialViewState?.longitude, initialViewState?.latitude, initialViewState?.zoom, lngProp, latProp, zoomProp])

  return (
    <MapContext.Provider value={mapRef.current}>
      <div 
        ref={containerRef} 
        className={className}
        style={{ width: '100%', height: '100%', minHeight: '100%', position: 'relative', ...customCssStyle }}
      >
        {mapLoaded && children}
      </div>
    </MapContext.Provider>
  )
}

export function Marker({ longitude, latitude, color, draggable = false, onDragEnd }) {
  const map = useContext(MapContext)
  const markerRef = useRef(null)

  const { lng, lat } = parseAndSanitizeCoords(longitude, latitude, null, null)
  const markerColor = color || 'var(--theme-primary, var(--color-primario, #7c3aed))'

  useEffect(() => {
    if (!map || lng === null || lat === null) return

    // Pin minimalista estilo mapcn con color dinámico de la marca
    const el = document.createElement('div')
    el.className = 'mapcn-minimal-marker'
    el.innerHTML = `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; cursor: pointer; width: 28px; height: 28px;">
        <div style="position: absolute; width: 26px; height: 26px; border-radius: 50%; background-color: ${markerColor}; opacity: 0.25; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="width: 14px; height: 14px; border-radius: 50%; background-color: ${markerColor}; border: 2.5px solid #ffffff; box-shadow: 0 2px 10px rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 2;">
          <div style="width: 4px; height: 4px; border-radius: 50%; background-color: #ffffff;"></div>
        </div>
      </div>
    `

    const marker = new maplibregl.Marker({
      element: el,
      draggable: draggable
    })
      .setLngLat([lng, lat]) // ESTRICTO [longitude, latitude]
      .addTo(map)

    markerRef.current = marker

    if (draggable && onDragEnd) {
      const handleDragEnd = () => {
        const lngLat = marker.getLngLat()
        onDragEnd({ lngLat: { lng: lngLat.lng, lat: lngLat.lat } })
      }
      marker.on('dragend', handleDragEnd)
    }

    return () => {
      marker.remove()
      markerRef.current = null
    }
  }, [map, lng, lat, markerColor, draggable])

  useEffect(() => {
    if (markerRef.current && lng !== null && lat !== null) {
      markerRef.current.setLngLat([lng, lat])
    }
  }, [lng, lat])

  return null
}

const SourceContext = createContext(null)

export function Source({ id, type = 'geojson', data, children }) {
  const map = useContext(MapContext)

  useEffect(() => {
    if (!map || !id) return

    // 1. El source se inicializa con un GeoJSON vacío válido: { type: 'FeatureCollection', features: [] } — nunca null ni undefined
    const geojsonData = data || { type: 'FeatureCollection', features: [] }

    const addOrUpdateSource = () => {
      if (!map.getSource(id)) {
        map.addSource(id, { type, data: geojsonData })
      } else {
        // 3. El source se actualiza con map.getSource('radius-source').setData(geojson) cada vez que cambia el radio o las coordenadas del pin — no se vuelve a agregar la capa
        const src = map.getSource(id)
        if (src && src.setData) {
          src.setData(geojsonData)
        }
      }
    }

    // 2. La capa / source solo se agrega después de que el mapa dispare el evento load
    if (map.loaded()) {
      addOrUpdateSource()
    } else {
      map.once('load', addOrUpdateSource)
    }

    return () => {
      if (map && map.getSource(id)) {
        try {
          map.removeSource(id)
        } catch (e) {}
      }
    }
  }, [map, id, data])

  return (
    <SourceContext.Provider value={{ sourceId: id }}>
      {children}
    </SourceContext.Provider>
  )
}

export function Layer({ id, type = 'fill', paint, layout }) {
  const map = useContext(MapContext)
  const { sourceId } = useContext(SourceContext) || {}

  useEffect(() => {
    if (!map || !id || !sourceId) return

    const addOrUpdateLayer = () => {
      if (!map.getSource(sourceId)) return

      if (!map.getLayer(id)) {
        const layerConfig = {
          id,
          type,
          source: sourceId
        }
        if (paint) layerConfig.paint = paint
        if (layout) layerConfig.layout = layout
        map.addLayer(layerConfig)
      } else {
        if (paint) {
          Object.entries(paint).forEach(([key, val]) => {
            map.setPaintProperty(id, key, val)
          })
        }
      }
    }

    // 2. La capa radius-layer solo se agrega después de que el mapa dispare el evento load
    if (map.loaded()) {
      addOrUpdateLayer()
    } else {
      map.once('load', addOrUpdateLayer)
    }

    return () => {
      if (map && map.getLayer(id)) {
        try {
          map.removeLayer(id)
        } catch (e) {}
      }
    }
  }, [map, id, sourceId, paint, layout])

  return null
}

export function RadiusCircle({ pinCoords, radiusKm }) {
  const map = useContext(MapContext)
  const markerRef = useRef(null)
  const elRef = useRef(null)

  useEffect(() => {
    if (!map || !pinCoords?.lat || !pinCoords?.lng) return

    if (!elRef.current) {
      elRef.current = document.createElement('div')
    }

    const el = elRef.current
    el.style.borderRadius = '50%'
    el.style.border = '2px solid #7c3aed'
    el.style.backgroundColor = 'rgba(139, 92, 246, 0.25)'
    el.style.pointerEvents = 'none'

    const updateSize = () => {
      const center = map.project([pinCoords.lng, pinCoords.lat])
      const edge = map.project([
        pinCoords.lng + (radiusKm / (111.32 * Math.cos(pinCoords.lat * Math.PI / 180))),
        pinCoords.lat
      ])
      const px = Math.abs(edge.x - center.x) * 2
      el.style.width = px + 'px'
      el.style.height = px + 'px'
    }

    if (markerRef.current) {
      markerRef.current.setLngLat([pinCoords.lng, pinCoords.lat])
    } else {
      markerRef.current = new maplibregl.Marker({ 
        element: el, 
        anchor: 'center',
        offset: [0, 0]
      })
        .setLngLat([pinCoords.lng, pinCoords.lat])
        .addTo(map)
    }

    updateSize()
    map.on('zoom', updateSize)
    map.on('move', updateSize)

    return () => {
      map.off('zoom', updateSize)
      map.off('move', updateSize)
    }
  }, [map, pinCoords, radiusKm])

  useEffect(() => {
    return () => {
      if (markerRef.current) {
        markerRef.current.remove()
        markerRef.current = null
      }
    }
  }, [])

  return null
}

