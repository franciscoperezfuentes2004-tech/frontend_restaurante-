import React from 'react'

// EL ESTÁNDAR GLOBAL DE CARGA SHIMMER PARA ANTIGRAVITY (3 FRANJAS CON EFECTO SHIMMER)
export const EsqueletoBloqueSolido = ({ className = '', count = 3, height = 'h-12' }) => {
  return (
    <div className={`space-y-2.5 w-full ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`animate-shimmer rounded-lg ${height} w-full`} />
      ))}
    </div>
  )
}

// 1. ESQUELETO PARA TABLAS (Con animación shimmer en franjas horizontales)
export const TableSkeleton = ({ filas = 3, height = 'h-12', className = '' }) => {
  return (
    <div className={`space-y-2.5 w-full ${className}`}>
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} className={`animate-shimmer rounded-lg ${height} w-full`} />
      ))}
    </div>
  )
}

// 2. ESQUELETO PARA TARJETAS SUPERIORES (KPIs / Totales)
export const CardSkeleton = ({ className = '' }) => {
  return (
    <div className={`animate-shimmer rounded-2xl h-24 w-full ${className}`} />
  )
}

export default TableSkeleton
