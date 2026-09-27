import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Clock, ChevronDown } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

const DEFAULT_TIME_OPTIONS = [
  { value: '06:00', label: '06:00 a. m.' },
  { value: '06:30', label: '06:30 a. m.' },
  { value: '07:00', label: '07:00 a. m.' },
  { value: '07:30', label: '07:30 a. m.' },
  { value: '08:00', label: '08:00 a. m.' },
  { value: '08:30', label: '08:30 a. m.' },
  { value: '09:00', label: '09:00 a. m.' },
  { value: '09:30', label: '09:30 a. m.' },
  { value: '10:00', label: '10:00 a. m.' },
  { value: '10:30', label: '10:30 a. m.' },
  { value: '11:00', label: '11:00 a. m.' },
  { value: '11:30', label: '11:30 a. m.' },
  { value: '12:00', label: '12:00 p. m.' },
  { value: '12:30', label: '12:30 p. m.' },
  { value: '13:00', label: '01:00 p. m.' },
  { value: '13:30', label: '01:30 p. m.' },
  { value: '14:00', label: '02:00 p. m.' },
  { value: '14:30', label: '02:30 p. m.' },
  { value: '15:00', label: '03:00 p. m.' },
  { value: '15:30', label: '03:30 p. m.' },
  { value: '16:00', label: '04:00 p. m.' },
  { value: '16:30', label: '04:30 p. m.' },
  { value: '17:00', label: '05:00 p. m.' },
  { value: '17:30', label: '05:30 p. m.' },
  { value: '18:00', label: '06:00 p. m.' },
  { value: '18:30', label: '06:30 p. m.' },
  { value: '19:00', label: '07:00 p. m.' },
  { value: '19:30', label: '07:30 p. m.' },
  { value: '20:00', label: '08:00 p. m.' },
  { value: '20:30', label: '08:30 p. m.' },
  { value: '21:00', label: '09:00 p. m.' },
  { value: '21:30', label: '09:30 p. m.' },
  { value: '22:00', label: '10:00 p. m.' },
  { value: '22:30', label: '10:30 p. m.' },
  { value: '23:00', label: '11:00 p. m.' },
  { value: '23:30', label: '11:30 p. m.' },
  { value: '23:59', label: '11:59 p. m.' },
  { value: '00:00', label: '12:00 a. m.' },
  { value: '00:30', label: '12:30 a. m.' },
  { value: '01:00', label: '01:00 a. m.' },
  { value: '01:30', label: '01:30 a. m.' },
  { value: '02:00', label: '02:00 a. m.' },
  { value: '02:30', label: '02:30 a. m.' },
  { value: '03:00', label: '03:00 a. m.' },
  { value: '03:30', label: '03:30 a. m.' },
  { value: '04:00', label: '04:00 a. m.' },
  { value: '04:30', label: '04:30 a. m.' },
  { value: '05:00', label: '05:00 a. m.' },
  { value: '05:30', label: '05:30 a. m.' },
]

const ITEM_HEIGHT = 40

export default function TimeWheelPicker({
  value,
  onChange,
  options = DEFAULT_TIME_OPTIONS,
  placeholder = 'Seleccione hora',
  variant = 'default',
  placement = 'bottom',
  className = '',
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const containerRef = useRef(null)
  const wheelRef = useRef(null)
  const scrollTimeoutRef = useRef(null)
  const isDraggingRef = useRef(false)
  const startYRef = useRef(0)
  const startScrollTopRef = useRef(0)

  const { 
    bgInput, 
    bgDropdown, 
    borderSubtle, 
    textColor, 
    textMuted, 
    textSubtle, 
    colorPrimario, 
    dropdownShadow, 
    isLight 
  } = useTheme()

  // Find index of selected value
  useEffect(() => {
    const idx = options.findIndex(opt => opt.value === value)
    if (idx !== -1) {
      setSelectedIndex(idx)
    }
  }, [value, options])

  const selectedOption = useMemo(() => {
    return options.find(opt => opt.value === value) || options[selectedIndex] || null
  }, [options, selectedIndex, value])

  // Center scroll position on mount & open
  const centerWheelOnIndex = useCallback((index, behavior = 'auto') => {
    if (!wheelRef.current) return
    wheelRef.current.scrollTo({ top: index * ITEM_HEIGHT, behavior })
  }, [])

  // Auto-position wheel when opening
  useEffect(() => {
    if (isOpen) {
      const idx = options.findIndex(opt => opt.value === value)
      const targetIdx = idx !== -1 ? idx : 0
      setSelectedIndex(targetIdx)
      requestAnimationFrame(() => {
        centerWheelOnIndex(targetIdx, 'auto')
      })
    }
  }, [isOpen, value, options, centerWheelOnIndex])

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Snap to nearest item after scroll finishes without blocking scroll events
  const handleScroll = () => {
    if (!wheelRef.current) return
    const scrollTop = wheelRef.current.scrollTop
    const rawIndex = Math.round(scrollTop / ITEM_HEIGHT)
    const clampedIndex = Math.max(0, Math.min(options.length - 1, rawIndex))

    if (clampedIndex !== selectedIndex) {
      setSelectedIndex(clampedIndex)
      if (options[clampedIndex] && options[clampedIndex].value !== value) {
        onChange(options[clampedIndex].value)
      }
    }

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }

    // Smooth magnetic settle after user stops scrolling
    scrollTimeoutRef.current = setTimeout(() => {
      if (!wheelRef.current) return
      const finalIndex = Math.max(0, Math.min(options.length - 1, Math.round(wheelRef.current.scrollTop / ITEM_HEIGHT)))
      wheelRef.current.scrollTo({ top: finalIndex * ITEM_HEIGHT, behavior: 'smooth' })
    }, 70)
  }

  // Mouse & Touch dragging
  const handleMouseDown = (e) => {
    isDraggingRef.current = true
    startYRef.current = e.clientY
    startScrollTopRef.current = wheelRef.current?.scrollTop || 0
  }

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current || !wheelRef.current) return
    const deltaY = startYRef.current - e.clientY
    wheelRef.current.scrollTop = startScrollTopRef.current + deltaY
  }

  const handleMouseUp = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false
      handleScroll()
    }
  }

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        setIsOpen(true)
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = Math.min(options.length - 1, selectedIndex + 1)
      setSelectedIndex(next)
      centerWheelOnIndex(next, 'smooth')
      onChange(options[next].value)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = Math.max(0, selectedIndex - 1)
      setSelectedIndex(prev)
      centerWheelOnIndex(prev, 'smooth')
      onChange(options[prev].value)
    } else if (e.key === 'Enter' || e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault()
      setIsOpen(false)
    }
  }

  const handleItemClick = (index) => {
    setSelectedIndex(index)
    centerWheelOnIndex(index, 'smooth')
    onChange(options[index].value)
  }

  const isUnderline = variant === 'underline'
  const isTop = placement === 'top'

  return (
    <div 
      ref={containerRef} 
      className={`relative ${isUnderline ? 'w-full block' : 'inline-block'} ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      {isUnderline ? (
        <div
          onClick={() => !disabled && setIsOpen(!isOpen)}
          style={{ borderColor: isOpen ? 'var(--theme-primary)' : 'var(--theme-border-subtle, rgba(0, 0, 0, 0.12))' }}
          className={`flex items-center justify-between select-none py-3 px-0 border-b font-light text-sm cursor-pointer transition-colors duration-200 hover:border-[var(--theme-primary)] ${
            disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Clock size={15} className="text-[var(--theme-primary)] shrink-0" />
            <span className={`truncate text-sm font-medium ${value ? 'text-[var(--theme-text)]' : 'text-[var(--theme-text-subtle)]'}`}>
              {selectedOption?.label || (value ? value : placeholder)}
            </span>
          </div>
          <ChevronDown 
            size={14} 
            className={`text-[var(--theme-text-muted)] shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-[var(--theme-primary)]' : ''}`} 
          />
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          style={{ 
            backgroundColor: bgInput || 'var(--theme-input)', 
            borderColor: isOpen ? (colorPrimario || 'var(--theme-primary)') : (borderSubtle || 'var(--theme-border-subtle)'), 
            color: textColor || 'var(--theme-text)' 
          }}
          className="w-full border rounded-xl pl-3.5 pr-9 py-2.5 text-sm font-semibold flex items-center justify-between transition-all duration-200 cursor-pointer shadow-2xs group hover:border-black/30 dark:hover:border-white/30"
        >
          <div className="flex items-center gap-2.5">
            <Clock size={16} style={{ color: colorPrimario || 'var(--theme-primary)' }} className="shrink-0" />
            <span className="tracking-wide text-sm font-bold">{selectedOption?.label || value}</span>
          </div>
          <ChevronDown 
            size={16} 
            style={{ color: textMuted || 'var(--theme-text-muted)' }} 
            className={`shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-brand-500' : ''}`} 
          />
        </button>
      )}

      {/* Floating Wheel Picker Popup */}
      {isOpen && (
        <div
          style={{ 
            backgroundColor: 'var(--theme-card, #FFFFFF)', 
            borderColor: 'var(--theme-border-subtle, rgba(0, 0, 0, 0.12))', 
            boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.25)' 
          }}
          className={`absolute left-0 right-0 ${
            isTop ? 'bottom-full mb-2 animate-fadeInUp' : 'top-full mt-2 animate-fadeIn'
          } z-[9999] rounded-2xl border p-2 overflow-hidden flex flex-col items-center select-none`}
        >
          {/* Wheel Viewport (200px height for 5 visible items @ 40px each) */}
          <div className="relative w-full h-[200px] overflow-hidden flex items-center justify-center">
            
            {/* Center Active Selection Indicator Pill - soft primary tint with subtle border */}
            <div 
              style={{ 
                height: `${ITEM_HEIGHT}px`,
                backgroundColor: 'color-mix(in srgb, var(--theme-primary, #7c3aed) 12%, transparent)',
                border: '1px solid color-mix(in srgb, var(--theme-primary, #7c3aed) 22%, transparent)'
              }}
              className="absolute left-2 right-2 top-1/2 -translate-y-1/2 rounded-xl pointer-events-none z-10 transition-colors duration-200"
            />

            {/* Top & Bottom Perspective Shadow Gradients */}
            <div 
              className="absolute top-0 left-0 right-0 h-14 pointer-events-none z-20"
              style={{
                background: 'linear-gradient(to bottom, var(--theme-card, #FFFFFF) 15%, transparent 100%)'
              }}
            />
            <div 
              className="absolute bottom-0 left-0 right-0 h-14 pointer-events-none z-20"
              style={{
                background: 'linear-gradient(to top, var(--theme-card, #FFFFFF) 15%, transparent 100%)'
              }}
            />

            {/* Scrollable Wheel List (Ultra-fluid, iOS snap physics) */}
            <div
              ref={wheelRef}
              onScroll={handleScroll}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{
                scrollSnapType: 'y mandatory',
                WebkitOverflowScrolling: 'touch'
              }}
              className="w-full h-full overflow-y-auto scrollbar-none relative z-0 py-[80px]"
            >
              {options.map((opt, idx) => {
                const distance = Math.abs(idx - selectedIndex)
                const isSelected = idx === selectedIndex

                // Font weight & Opacity levels - same text-sm size for all
                let opacity = 'opacity-100'
                let fontWeight = 'font-normal'

                if (isSelected) {
                  opacity = 'opacity-100'
                  fontWeight = 'font-bold'
                } else if (distance === 1) {
                  opacity = 'opacity-60'
                  fontWeight = 'font-normal'
                } else if (distance === 2) {
                  opacity = 'opacity-30'
                  fontWeight = 'font-normal'
                } else {
                  opacity = 'opacity-10'
                  fontWeight = 'font-normal'
                }

                return (
                  <div
                    key={opt.value}
                    onClick={() => handleItemClick(idx)}
                    style={{
                      height: `${ITEM_HEIGHT}px`,
                      scrollSnapAlign: 'center',
                      color: isSelected ? 'var(--theme-primary, #7c3aed)' : 'var(--theme-text, #0f172a)'
                    }}
                    className={`h-[40px] flex items-center justify-center cursor-pointer text-sm text-center tracking-wide ${opacity} ${fontWeight} transition-opacity duration-150`}
                  >
                    {opt.label}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
