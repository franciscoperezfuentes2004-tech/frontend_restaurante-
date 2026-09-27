import { useRef, useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'

/**
 * Componente de Fila de Categoría en Carrusel Horizontal (CategoryCarouselRow)
 * 
 * - Desplazamiento horizontal fluido (touch swipe en móviles, arrastre y scroll en desktop).
 * - Barra superior indicadora de progreso de scroll (estilo Netflix) que aparece cuando hay contenido desplazable.
 * - Sin flechas molestas a los lados.
 * - Tarjetas uniformes y proporcionales.
 */
export default function CategoryCarouselRow({
  categoria,
  platillos = [],
  renderCard,
  onSelectCategoria,
  scrollTargetRef,
  platilloHighlight = null,
  className = ''
}) {
  const carouselRef = useRef(null)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [hasScroll, setHasScroll] = useState(false)
  const [ratio, setRatio] = useState(1)

  // Referencias para arrastre con ratón en desktop (Drag to scroll)
  const isDragging = useRef(false)
  const startX = useRef(0)
  const startScrollLeft = useRef(0)
  const hasDragged = useRef(false)

  // Comprobar scroll y calcular progreso
  const checkScrollProgress = useCallback(() => {
    const el = carouselRef.current
    if (!el) return

    const { scrollLeft, scrollWidth, clientWidth } = el
    const maxScroll = scrollWidth - clientWidth
    const canScroll = maxScroll > 10

    setHasScroll(canScroll)
    if (canScroll) {
      const prog = Math.min(1, Math.max(0, scrollLeft / maxScroll))
      setScrollProgress(prog)
      setRatio(Math.min(1, Math.max(0.15, clientWidth / scrollWidth)))
    } else {
      setScrollProgress(0)
      setRatio(1)
    }
  }, [])

  // Inicialización, listener de scroll y observador de tamaño
  useEffect(() => {
    checkScrollProgress()

    const el = carouselRef.current
    if (!el) return

    const handleScroll = () => checkScrollProgress()
    el.addEventListener('scroll', handleScroll, { passive: true })

    const resizeObserver = new ResizeObserver(() => {
      checkScrollProgress()
    })
    resizeObserver.observe(el)

    return () => {
      el.removeEventListener('scroll', handleScroll)
      resizeObserver.disconnect()
    }
  }, [platillos, checkScrollProgress])

  // Clic en la barra de progreso para saltar a una posición específica
  const handleTrackClick = (e) => {
    const el = carouselRef.current
    if (!el) return
    const rect = e.currentTarget.getBoundingClientRect()
    const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const maxScroll = el.scrollWidth - el.clientWidth
    el.scrollTo({ left: clickRatio * maxScroll, behavior: 'smooth' })
  }

  // Soporte de arrastre suave con ratón (Desktop drag-to-scroll)
  const handleMouseDown = (e) => {
    if (e.button !== 0 || !carouselRef.current) return
    isDragging.current = true
    hasDragged.current = false
    startX.current = e.pageX - carouselRef.current.offsetLeft
    startScrollLeft.current = carouselRef.current.scrollLeft
  }

  const handleMouseMove = (e) => {
    if (!isDragging.current || !carouselRef.current) return
    const x = e.pageX - carouselRef.current.offsetLeft
    const walk = (x - startX.current) * 1.25
    if (Math.abs(walk) > 6) {
      hasDragged.current = true
    }
    carouselRef.current.scrollLeft = startScrollLeft.current - walk
  }

  const handleMouseUpOrLeave = () => {
    isDragging.current = false
  }

  // Clic en "Ver todo": activa la categoría seleccionada y hace scroll suave arriba
  const handleVerTodo = () => {
    if (onSelectCategoria && categoria?.id) {
      onSelectCategoria(categoria.id)
    }

    if (scrollTargetRef?.current) {
      scrollTargetRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  if (!platillos || platillos.length === 0) {
    return null
  }

  const categoriaNombre = categoria?.nombre || categoria?.name || 'Categoría'
  const totalPlatillos = platillos.length

  // Cálculo de anchura y posición del cursor en la barra de progreso
  const thumbWidthPct = Math.min(50, Math.max(25, ratio * 100))
  const maxTravel = 100 - thumbWidthPct
  const thumbLeftPct = scrollProgress * maxTravel

  return (
    <section 
      aria-label={`Categoría ${categoriaNombre}`}
      className={`group/row relative w-full mb-8 sm:mb-10 text-left select-none ${className}`}
    >
      {/* ─── ENCABEZADO DE LA FILA ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 sm:gap-3 mb-2.5 px-1 sm:px-2">
        {/* Título de Categoría + Badge de Conteo */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 overflow-hidden">
          <h3 className="font-serif text-base sm:text-lg font-bold uppercase tracking-wide text-theme-text truncate">
            {categoriaNombre}
          </h3>

          <span 
            style={{
              backgroundColor: 'color-mix(in srgb, var(--theme-primary, #7c3aed) 12%, transparent)',
              color: 'var(--theme-primary, #7c3aed)',
              borderColor: 'color-mix(in srgb, var(--theme-primary, #7c3aed) 25%, transparent)'
            }}
            className="text-[10.5px] sm:text-xs font-semibold px-2 py-0.5 rounded-full border shadow-2xs whitespace-nowrap shrink-0"
          >
            {totalPlatillos} {totalPlatillos === 1 ? 'platillo' : 'platillos'}
          </span>
        </div>

        {/* Botón Interactivo 'Ver todo' con flecha animada */}
        <button
          type="button"
          onClick={handleVerTodo}
          aria-label={`Ver todos los platillos de ${categoriaNombre}`}
          className="group/btn inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-[var(--theme-primary)] hover:opacity-80 transition-all cursor-pointer py-1 px-2 rounded-lg hover:bg-[var(--theme-primary)]/10 whitespace-nowrap shrink-0 ml-auto"
        >
          <span>Ver todo</span>
          <span className="inline-block transition-transform duration-200 group-hover/btn:translate-x-1 font-bold">
            →
          </span>
        </button>
      </div>

      {/* ─── BARRA DE PROGRESO EN SU PROPIA LÍNEA (Solo si hay scroll disponible) ─── */}
      {hasScroll && (
        <div className="w-full px-1 sm:px-2 mb-2.5 sm:mb-3">
          <div
            onClick={handleTrackClick}
            role="progressbar"
            aria-label={`Progreso de desplazamiento en ${categoriaNombre}`}
            aria-valuenow={Math.round(scrollProgress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            title="Haz clic en cualquier punto para desplazarte"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--theme-text) 10%, transparent)'
            }}
            className="w-full h-1 sm:h-1.5 rounded-full relative overflow-hidden cursor-pointer group/track transition-all hover:h-2"
          >
            <div
              style={{
                backgroundColor: 'var(--theme-primary, #7c3aed)',
                width: `${thumbWidthPct}%`,
                left: `${thumbLeftPct}%`
              }}
              className="h-full rounded-full absolute top-0 transition-[left] duration-100 ease-out shadow-xs pointer-events-none group-hover/track:brightness-110"
            />
          </div>
        </div>
      )}

      {/* ─── CONTENEDOR DEL CARRUSEL (Sin flechas laterales invasivas) ─────── */}
      <div className="relative w-full">
        <div
          ref={carouselRef}
          tabIndex={0}
          role="region"
          aria-label={`Carrusel de platillos de ${categoriaNombre}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className="flex gap-4 sm:gap-5 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-none py-3 px-1 sm:px-2 items-stretch focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)]/40 rounded-xl cursor-grab active:cursor-grabbing"
        >
          {platillos.map((platillo) => (
            <div
              key={platillo.id}
              className="w-[260px] sm:w-[280px] shrink-0 snap-start h-full flex flex-col select-none"
              onClickCapture={(e) => {
                // Si el usuario estaba arrastrando para hacer scroll, evitar abrir el modal
                if (hasDragged.current) {
                  e.stopPropagation()
                  e.preventDefault()
                }
              }}
            >
              {renderCard ? (
                renderCard(platillo, Boolean(platilloHighlight && String(platilloHighlight) === String(platillo.id)))
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

CategoryCarouselRow.propTypes = {
  categoria: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    nombre: PropTypes.string,
    name: PropTypes.string,
  }).isRequired,
  platillos: PropTypes.arrayOf(PropTypes.object).isRequired,
  renderCard: PropTypes.func.isRequired,
  onSelectCategoria: PropTypes.func,
  scrollTargetRef: PropTypes.oneOfType([
    PropTypes.func, 
    PropTypes.shape({ current: PropTypes.any })
  ]),
  platilloHighlight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  className: PropTypes.string,
}
