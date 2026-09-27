import { useState, useEffect } from 'react'
import { PackageOpen } from 'lucide-react'
import { getIngresosDelivery } from '../../api/delivery'
import { useTheme } from '../../context/ThemeContext'

export default function CortesDelivery({ filtro, onFiltroChange, showLocalFilters = false }) {
  const { bgCard, bgSubcard, bgInput, colorPrimario, borderSubtle, textColor, textMuted, textSubtle, isLight, primaryBtnText, cardShadow } = useTheme()

  const [internalFiltro, setInternalFiltro] = useState('mes')
  const filtroActivo = filtro !== undefined ? filtro : internalFiltro
  const setFiltroActivo = onFiltroChange || setInternalFiltro

  const [datos, setDatos] = useState([])
  const [cargando, setCargando] = useState(false)
  const [paginaActual, setPaginaActual] = useState(1)

  // Definimos el estándar estricto de la tabla
  const FILAS_FIJAS = 8

  useEffect(() => {
    const cargarIngresos = async () => {
      setCargando(true)
      try {
        const respuesta = await getIngresosDelivery(filtroActivo)
        const rawData = respuesta?.data
        const lista = Array.isArray(rawData) ? rawData : (rawData?.datos || rawData?.data || [])
        setDatos(Array.isArray(lista) ? lista : [])
      } catch (error) {
        console.error('Error al cargar los cortes:', error)
        setDatos([])
      } finally {
        setCargando(false)
      }
    }

    cargarIngresos()
  }, [filtroActivo]) // Se vuelve a ejecutar cada vez que cambia el filtro

  useEffect(() => {
    setPaginaActual(1)
  }, [filtroActivo])

  // Paginación y cálculo de filas fijas
  const totalPaginas = Math.ceil((datos?.length || 0) / FILAS_FIJAS) || 1
  const indiceInicio = (paginaActual - 1) * FILAS_FIJAS
  const datosPaginados = (datos || []).slice(indiceInicio, indiceInicio + FILAS_FIJAS)
  const filasFaltantes = Math.max(0, FILAS_FIJAS - datosPaginados.length)
  const filasRelleno = Array.from({ length: filasFaltantes })

  // Función para formatear dinero (Ej. $ 1,500.00)
  const formatearDinero = (cantidad) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(cantidad) || 0)
  }

  const FILTROS = [
    { id: 'hoy', label: 'Hoy' },
    { id: 'semana', label: 'Esta semana' },
    { id: 'mes', label: 'Este mes' },
    { id: '3meses', label: 'Últimos 3 meses' }
  ]

  const inicioMostrado = datos.length > 0 ? indiceInicio + 1 : 0
  const finMostrado = Math.min(indiceInicio + FILAS_FIJAS, datos.length)

  return (
    <div className="w-full space-y-4 animate-fadeIn font-sans">
      {/* 1. Header de Sección */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold tracking-wide uppercase" style={{ color: textColor }}>
            Cortes y Rendimiento por Repartidor
          </h3>
          <p className="text-xs font-medium mt-0.5" style={{ color: textMuted }}>
            Monto total generado y pedidos completados por cada repartidor
          </p>
        </div>

        {/* BOTONES DE FILTRO LOCALES (opcionales si se requiere) */}
        {showLocalFilters && (
          <div className="flex flex-wrap gap-2 justify-end">
            {FILTROS.map(f => {
              const isSelected = filtroActivo === f.id
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFiltroActivo(f.id)}
                  className="px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer shadow-xs active:scale-95"
                  style={{
                    backgroundColor: isSelected
                      ? (colorPrimario || 'var(--theme-primary, #3b82f6)')
                      : (isLight ? '#eff6ff' : `${colorPrimario || '#3b82f6'}18`),
                    color: isSelected
                      ? 'var(--theme-primary-contrast, #ffffff)'
                      : (colorPrimario || 'var(--theme-primary, #3b82f6)'),
                    border: isSelected
                      ? `1px solid ${colorPrimario || 'var(--theme-primary, #3b82f6)'}`
                      : `1px solid ${colorPrimario || '#3b82f6'}30`,
                  }}
                >
                  {f.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* 2. CONTENEDOR PRINCIPAL DE LA TABLA */}
      <div 
        className="rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs"
        style={{ 
          backgroundColor: bgCard, 
          borderColor: borderSubtle,
          boxShadow: cardShadow || '0 4px 20px rgba(0,0,0,0.04)'
        }}
      >
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead 
              style={{ 
                backgroundColor: bgSubcard, 
                borderBottom: `1px solid ${borderSubtle}` 
              }}
            >
              <tr>
                <th className="py-3.5 px-6 text-xs font-bold uppercase tracking-wider text-left" style={{ color: textMuted }}>
                  Repartidor
                </th>
                <th className="py-3.5 px-6 text-xs font-bold uppercase tracking-wider text-center" style={{ color: textMuted }}>
                  Pedidos Realizados
                </th>
                <th className="py-3.5 px-6 text-xs font-bold uppercase tracking-wider text-right" style={{ color: textMuted }}>
                  Ingresos Generados
                </th>
              </tr>
            </thead>
            
            {/* Cuerpo de la tabla con alto fijo relativo */}
            <tbody className="divide-y text-xs" style={{ borderColor: borderSubtle }}>
              {/* Cargando */}
              {cargando ? (
                Array.from({ length: FILAS_FIJAS }).map((_, filaIndex) => (
                  <tr key={`skel-${filaIndex}`} className="h-16 border-b" style={{ borderColor: borderSubtle }}>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10 animate-pulse shrink-0" />
                        <div className="h-4 bg-slate-200 dark:bg-white/10 rounded-md animate-pulse w-36" />
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="h-5 bg-slate-200 dark:bg-white/10 rounded-full animate-pulse w-16 mx-auto" />
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="h-5 bg-slate-200 dark:bg-white/10 rounded-md animate-pulse w-24 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : datos.length === 0 ? (
                <tr>
                  <td colSpan={3} className="h-[512px] p-12 text-center" style={{ color: textMuted }}>
                    <div className="flex flex-col items-center justify-center gap-2 h-full">
                      <div 
                        className="w-12 h-12 rounded-2xl border flex items-center justify-center mb-1"
                        style={{ backgroundColor: bgSubcard, borderColor: borderSubtle, color: textMuted }}
                      >
                        <PackageOpen size={24} />
                      </div>
                      <h4 className="text-sm font-bold" style={{ color: textColor }}>Sin repartos</h4>
                      <p className="text-xs max-w-sm" style={{ color: textMuted }}>
                        No hay entregas completadas en este período.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {/* Renderizamos los datos reales */}
                  {datosPaginados.map((fila, index) => {
                    const nombreRepartidor = fila.repartidor || fila.driver_name || fila.nombre || `Repartidor #${indiceInicio + index + 1}`
                    const pedidosCount = fila.pedidos_realizados ?? fila.pedidos ?? fila.total_pedidos ?? 0
                    const montoGenerado = fila.ingresos_generados ?? fila.total_ingresos ?? fila.monto ?? 0
                    const initialLetter = String(nombreRepartidor).trim().charAt(0).toUpperCase() || 'R'

                    return (
                      <tr 
                        key={`dato-${fila.id || index}`} 
                        className="h-16 border-b transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                        style={{ borderColor: borderSubtle }}
                      >
                        {/* Nombre del repartidor con Avatar */}
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 border"
                              style={{ 
                                backgroundColor: `${colorPrimario || '#3b82f6'}18`, 
                                borderColor: `${colorPrimario || '#3b82f6'}30`,
                                color: colorPrimario || '#3b82f6' 
                              }}
                            >
                              {initialLetter}
                            </div>
                            <span className="font-bold text-xs capitalize truncate" style={{ color: textColor }}>
                              {nombreRepartidor}
                            </span>
                          </div>
                        </td>

                        {/* Pedidos Realizados */}
                        <td className="px-6 py-3.5 text-center">
                          <span 
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border font-mono"
                            style={{
                              backgroundColor: bgSubcard,
                              borderColor: borderSubtle,
                              color: textColor
                            }}
                          >
                            {pedidosCount} {pedidosCount === 1 ? 'pedido' : 'pedidos'}
                          </span>
                        </td>

                        {/* Ingresos Generados */}
                        <td className="px-6 py-3.5 text-right font-mono font-bold text-xs" style={{ color: textColor }}>
                          {formatearDinero(montoGenerado)}
                        </td>
                      </tr>
                    )
                  })}

                  {/* Rellenamos con filas vacías para mantener siempre el tamaño de 8 filas */}
                  {filasRelleno.map((_, index) => (
                    <tr 
                      key={`vacia-${index}`} 
                      className="h-16 border-b border-transparent"
                      style={{ backgroundColor: 'transparent' }}
                    >
                      <td className="px-6 py-3.5"></td>
                      <td className="px-6 py-3.5"></td>
                      <td className="px-6 py-3.5"></td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. PAGINACIÓN PERMANENTE ANCLADA AL FINAL (FUERA DE LA TABLA COMO EN EL DISEÑO DE AURUM) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 px-1">
        <span className="text-xs font-medium" style={{ color: textMuted }}>
          Mostrando {inicioMostrado} a {finMostrado} de {datos.length} repartidores
        </span>
        
        <div className="flex items-center gap-2">
          <button 
            type="button"
            disabled={paginaActual <= 1 || datos.length === 0}
            onClick={() => setPaginaActual(prev => Math.max(1, prev - 1))}
            className="px-3.5 py-1.5 border rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:opacity-80 shadow-xs"
            style={{
              borderColor: borderSubtle,
              color: paginaActual === 1 ? textSubtle : textColor,
              backgroundColor: bgCard
            }}
          >
            Anterior
          </button>
          
          <span className="text-xs font-mono font-bold px-2" style={{ color: textColor }}>
            {paginaActual} / {totalPaginas}
          </span>

          <button 
            type="button"
            disabled={paginaActual >= totalPaginas || datos.length === 0}
            onClick={() => setPaginaActual(prev => Math.min(totalPaginas, prev + 1))}
            className="px-3.5 py-1.5 border rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:opacity-90 shadow-xs"
            style={{
              backgroundColor: paginaActual === totalPaginas || datos.length === 0 ? bgCard : (colorPrimario || '#3b82f6'),
              color: paginaActual === totalPaginas || datos.length === 0 ? textSubtle : (primaryBtnText || '#ffffff'),
              borderColor: borderSubtle,
            }}
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  )
}
