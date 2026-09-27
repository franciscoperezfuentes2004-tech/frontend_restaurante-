import React from 'react';
import { createPortal } from 'react-dom';

export default function LoaderGlobal({ texto }) {
  // 1. Leemos el nombre guardado en caché si no pasamos un texto específico
  const textoAnimado = texto || localStorage.getItem('nombre_comercial') || localStorage.getItem('rest_name') || 'CARGANDO';
  
  const content = (
    // Fondo transparente adaptable: claro (slate-200/50) u oscuro (slate-900/40) con desenfoque
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-200/50 dark:bg-slate-900/40 backdrop-blur-sm transition-all duration-300">
      
      {/* Contenedor del Spinner Clásico */}
      <div className="relative flex items-center justify-center w-16 h-16">
        {/* Anillo de fondo estático adaptable */}
        <div className="absolute inset-0 border-4 border-slate-300/60 dark:border-white/10 rounded-full"></div>
        
        {/* Anillo giratorio principal fluido */}
        <div className="absolute inset-0 border-4 border-[var(--theme-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
      
      {/* Texto de carga dinámico adaptable */}
      <span className="text-slate-700 dark:text-white/90 text-sm font-semibold tracking-[0.15em] uppercase mt-6 drop-shadow-md text-center px-4">
        {textoAnimado}
      </span>
      
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }
  return content;
}

