import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Clock, ChevronDown, Check } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

// 48 intervalos de 30 min (00:00 a 23:30)
const DEFAULT_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0')
  const m = i % 2 === 0 ? '00' : '30'
  return `${h}:${m}`
})

export default function TimePicker({
  value,
  onChange,
  placeholder = 'Selecciona hora',
  slots = null,
  disabled = false,
  fullWidth = false,
  inputBg = null,
  hasError = false,
  className = '',
}) {
  const { bgSubcard } = useTheme()
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState(null)
  const rootRef = useRef(null)
  const dropdownRef = useRef(null)
  const listRef = useRef(null)

  const effectiveBg = inputBg || bgSubcard || 'var(--theme-subcard-bg, #E9EAF2)'
  const effectiveSlots = slots !== null && slots !== undefined ? slots : DEFAULT_SLOTS

  // Si hay un valor seleccionado que no está en la lista de slots, incluirlo para que no se pierda la selección actual
  const displaySlots = (value && effectiveSlots.length > 0 && !effectiveSlots.includes(value))
    ? [...effectiveSlots, value].sort()
    : effectiveSlots

  // Actualizar coordenadas fijas del menú flotante
  const updateCoords = useCallback(() => {
    if (!rootRef.current) return
    const rect = rootRef.current.getBoundingClientRect()
    const dropdownHeight = 220
    const spaceBelow = window.innerHeight - rect.bottom
    const openUp = spaceBelow < dropdownHeight && rect.top > dropdownHeight

    setCoords({
      top: openUp ? Math.max(8, rect.top - dropdownHeight - 6) : rect.bottom + 6,
      left: rect.left,
      width: fullWidth ? rect.width : Math.max(rect.width, 180),
      openUp
    })
  }, [fullWidth])

  useEffect(() => {
    if (!open) return
    updateCoords()
    const handleScrollOrResize = () => updateCoords()
    window.addEventListener('resize', handleScrollOrResize)
    window.addEventListener('scroll', handleScrollOrResize, true)
    return () => {
      window.removeEventListener('resize', handleScrollOrResize)
      window.removeEventListener('scroll', handleScrollOrResize, true)
    }
  }, [open, updateCoords])

  // Cerrar al clickear fuera
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (
        rootRef.current && !rootRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Encontrar el índice del slot tolerando formatos de hora ("9:00" vs "09:00")
  const findSlotIndex = useCallback((val) => {
    if (!val || typeof val !== 'string') return -1
    const norm = val.length === 4 ? '0' + val : val
    const exact = displaySlots.indexOf(norm)
    if (exact !== -1) return exact
    const [h, m] = val.split(':').map(n => parseInt(n, 10))
    if (isNaN(h)) return -1
    return displaySlots.findIndex(s => {
      if (typeof s !== 'string') return false
      const [sh, sm] = s.split(':').map(n => parseInt(n, 10))
      return sh === h && sm === (m || 0)
    })
  }, [displaySlots])

  const isSlotSelected = (slot, val) => {
    if (!val || !slot || typeof val !== 'string' || typeof slot !== 'string') return false
    if (slot === val) return true
    const [sh, sm] = slot.split(':').map(n => parseInt(n, 10))
    const [vh, vm] = val.split(':').map(n => parseInt(n, 10))
    return sh === vh && sm === (vm || 0)
  }

  // Desplazar automáticamente al elemento seleccionado al abrir
  useEffect(() => {
    if (open && listRef.current) {
      const selectedIndex = findSlotIndex(value)
      if (selectedIndex !== -1) {
        const itemEl = listRef.current.children[selectedIndex]
        if (itemEl && typeof itemEl.scrollIntoView === 'function') {
          setTimeout(() => {
            itemEl.scrollIntoView({ block: 'nearest' })
          }, 10)
        }
      }
    }
  }, [open, value, findSlotIndex])

  const displayValue = value ? formatTime(value) : null

  return (
    <div
      ref={rootRef}
      className={`font-sans relative ${fullWidth ? 'w-full block' : 'inline-block'} ${className}`}
    >
      {/* Campo Cerrado (botón de la hora - Contenedor Tono 2) */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(v => !v)}
        className={
          fullWidth
            ? `input-subcard bg-slate-100 dark:bg-white/5 w-full min-w-[130px] h-11 px-3 sm:px-4 py-2.5 flex items-center justify-between rounded-xl transition-all duration-200 select-none border font-medium ${
                hasError
                  ? '!border-rose-500 ring-1 ring-rose-500/20'
                  : open
                  ? 'border-[var(--theme-primary)] ring-1 ring-[var(--theme-primary)]/20'
                  : 'border-gray-200 dark:border-white/10 hover:border-brand-500/40'
              } ${
                disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:opacity-90'
              }`
            : `input-subcard bg-slate-100 dark:bg-white/5 inline-flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl transition-all duration-200 select-none border font-medium ${
                hasError
                  ? '!border-rose-500 ring-1 ring-rose-500/20'
                  : open
                  ? 'border-[var(--theme-primary)] ring-1 ring-[var(--theme-primary)]/20'
                  : 'border-gray-200 dark:border-white/10 hover:border-brand-500/40'
              } ${
                disabled ? 'opacity-30 cursor-not-allowed' : 'hover:opacity-85 cursor-pointer'
              }`
        }
        style={{
          backgroundColor: effectiveBg,
          borderColor: hasError ? '#ef4444' : undefined,
          color: 'var(--theme-text)',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Clock size={15} className="text-theme-text-muted shrink-0" />
          <span
            className="text-xs font-semibold whitespace-nowrap"
            style={{ color: displayValue ? 'var(--theme-text)' : 'var(--theme-text-muted)' }}
          >
            {displayValue || placeholder}
          </span>
        </div>
        <ChevronDown
          size={14}
          className={`text-theme-text-muted shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown flotante con createPortal para evitar overflow del modal */}
      {open && coords && createPortal(
        <div
          ref={dropdownRef}
          className="fixed animate-fadeIn rounded-2xl shadow-2xl overflow-hidden border transition-all duration-150"
          style={{
            zIndex: 99999,
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            backgroundColor: 'var(--theme-card, var(--theme-surface))',
            borderColor: 'var(--theme-border-subtle, rgba(0,0,0,0.15))',
            boxShadow: '0 20px 40px -8px rgba(0,0,0,0.3), 0 10px 20px -6px rgba(0,0,0,0.2)',
          }}
        >
          {displaySlots.length === 0 ? (
            <div className="p-4 text-center text-xs font-medium text-theme-text-muted">
              No hay horarios disponibles para esta fecha
            </div>
          ) : (
            <div
              ref={listRef}
              className="overflow-y-auto max-h-[220px] p-1.5 space-y-0.5 scrollbar-thin scrollbar-thumb-gray-400/25"
            >
              {displaySlots.map((slot) => {
                const isSelected = isSlotSelected(slot, value)
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => {
                      onChange(slot)
                      setOpen(false)
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--theme-primary)] text-white shadow-xs font-bold'
                        : 'text-theme-text hover:bg-black/5 dark:hover:bg-white/10'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Clock size={12} className={isSelected ? 'text-white' : 'text-theme-text-muted'} />
                      <span>{formatTime(slot)}</span>
                    </span>
                    {isSelected && <Check size={13} className="text-white shrink-0" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}

// Formatea "14:30" → "2:30 p. m."
function formatTime(slot) {
  if (!slot || typeof slot !== 'string') return slot
  const [hStr, mStr] = slot.split(':')
  const h24 = parseInt(hStr, 10)
  const m = mStr || '00'
  const period = h24 >= 12 ? 'p. m.' : 'a. m.'
  let h12 = h24 % 12
  if (h12 === 0) h12 = 12
  return `${h12}:${m} ${period}`
}
