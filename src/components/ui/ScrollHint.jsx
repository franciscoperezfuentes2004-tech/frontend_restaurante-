import { useEffect, useState, useRef } from 'react'

/**
 * ScrollHint — Aviso visual de scroll
 * Muestra un indicador flotante y sutil "Desplaza para ver más" en la parte inferior.
 * Se oculta automáticamente si el contenido del contenedor NO desborda (no hay scroll)
 * o cuando el usuario comienza a hacer scroll, reapareciendo al volver al inicio.
 *
 * Se posiciona automáticamente al pie de su contenedor hermano anterior (previousElementSibling).
 *
 * Props:
 *   visible   — boolean: true = visible, false = oculto con fade
 *   bgFrom    — string (obsoleto, mantenido por compatibilidad)
 *   text      — string: texto del aviso (por defecto "Desplaza para ver más datos")
 */
export default function ScrollHint({
  visible = true,
  bgFrom,
  text = 'Desplaza para ver más datos',
}) {
  const [hasOverflow, setHasOverflow] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const selfRef = useRef(null)

  useEffect(() => {
    const target = selfRef.current?.previousElementSibling
    if (!target) return

    const checkOverflow = () => {
      // Verifica si el contenedor realmente tiene desbordamiento vertical
      const canScroll = target.scrollHeight > target.clientHeight + 4
      setHasOverflow(canScroll)
    }

    const handleScroll = () => {
      setIsScrolled(target.scrollTop > 5)
    }

    // Ejecutar inicialmente
    checkOverflow()
    handleScroll()

    // Escuchar scroll
    target.addEventListener('scroll', handleScroll, { passive: true })
    // Escuchar redimensiones del viewport
    window.addEventListener('resize', checkOverflow)

    // Observar cambios en el contenido interno (carga de datos, cambios de DOM)
    const observer = new MutationObserver(checkOverflow)
    observer.observe(target, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
    })

    return () => {
      target.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', checkOverflow)
      observer.disconnect()
    }
  }, [visible])

  const isShown = visible && hasOverflow && !isScrolled

  return (
    <div
      ref={selfRef}
      className={`pointer-events-none absolute bottom-0 left-0 right-0 z-20
                  transition-opacity duration-300 ${isShown ? 'opacity-100' : 'opacity-0'}`}
    >
      {/* Degradado muy suave y traslúcido para asegurar contraste */}
      <div className="h-10 bg-gradient-to-t from-black/35 to-transparent w-full" />

      {/* Pill flotante y elegante */}
      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-500/10 backdrop-blur-md border border-brand-500/25 shadow-lg shadow-black/45">
        <svg
          width="11" height="11" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="3"
          className="text-brand-400 animate-bounce shrink-0"
        >
          <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-[9px] text-brand-300 font-black uppercase tracking-wider select-none whitespace-nowrap">
          {text}
        </span>
      </div>
    </div>
  )
}

