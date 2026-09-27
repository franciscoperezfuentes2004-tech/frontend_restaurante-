import React from 'react'

/**
 * MetricCardsLayout
 * Componente contenedor estandarizado para métricas (StatCards).
 * En PC (xl): Cuadrícula estricta de N columnas (4 por defecto).
 * En Tablet/Móvil (< xl): Fila elástica (flex) con scroll horizontal (overflow-x-auto) y snap.
 */
export default function MetricCardsLayout({ 
  children, 
  cols = 4, 
  className = '',
  gap = 'gap-4 md:gap-6',
  colsClassOverride
}) {
  const colsClass = colsClassOverride || (cols === 5 
    ? 'xl:grid-cols-5' 
    : cols === 3 
      ? 'xl:grid-cols-3' 
      : 'xl:grid-cols-4')

  // Aplanar Fragmentos (<> ... </>) y filtrar elementos nulos o booleanos
  const childrenArray = React.Children.toArray(children).flatMap(child => {
    if (!child) return []
    if (child.type === React.Fragment) {
      return React.Children.toArray(child.props.children)
    }
    return [child]
  }).filter(Boolean)

  return (
    <div className={`flex xl:grid ${colsClass} ${gap} overflow-x-auto snap-x snap-mandatory pb-4 w-full scrollbar-none hide-scrollbar items-stretch ${className}`}>
      {childrenArray.map((child, index) => (
        <div key={child.key || index} className="flex-1 min-w-[280px] md:min-w-[320px] xl:min-w-0 snap-center">
          {child}
        </div>
      ))}
    </div>
  )
}
