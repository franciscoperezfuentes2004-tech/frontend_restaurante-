import { createPortal } from 'react-dom'
import { useTheme } from '../../context/ThemeContext'

export default function Modal({ title, children, onClose, footer = null, maxWidth = 'max-w-2xl' }) {
  const { bgModal, borderSubtle, modalShadow, textColor, colorPrimario } = useTheme()

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      {/* Background click to close */}
      <div className="fixed inset-0" onClick={onClose}></div>
      
      {/* 2. CONTENEDOR DEL MODAL (Límite del 70% en móvil para no saturar, 85% en md) */}
      <div 
        style={{ 
          backgroundColor: bgModal, 
          boxShadow: modalShadow, 
          color: textColor 
        }}
        className={`relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[70vh] md:max-h-[85vh] flex flex-col overflow-hidden animate-fadeInUp z-10`}
      >
        {/* Cabecera (Congelada) */}
        <div 
          className="bg-blue-800 text-white p-4 shrink-0 flex justify-between items-center transition-colors" 
          style={{ 
            backgroundColor: colorPrimario || '#1e40af', 
            borderColor: colorPrimario || '#1e40af',
            color: 'var(--theme-primary-contrast, #ffffff)' 
          }}
        >
          <h2 className="font-bold text-lg" style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}>{title}</h2>
          <button 
            type="button"
            onClick={onClose} 
            className="w-8 h-8 rounded-xl hover:bg-white/20 flex items-center justify-center transition-all duration-200 text-lg font-bold leading-none cursor-pointer"
            style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        {/* 3. CONTENIDO / FORMULARIO (Área de scroll interno) */}
        <div 
          className="flex-1 overflow-y-auto p-5 md:p-6 custom-scrollbar bg-slate-50 dark:bg-zinc-950"
        >
          {children}
        </div>

        {/* Pie del modal (Congelado si se proporciona) */}
        {footer && (
          <div 
            className="bg-white dark:bg-zinc-900 p-4 border-t border-slate-200 dark:border-zinc-800 shrink-0 flex justify-end gap-3"
            style={{ borderColor: borderSubtle }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
