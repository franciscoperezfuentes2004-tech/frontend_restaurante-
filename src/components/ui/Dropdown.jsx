import { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check, Search } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

export default function Dropdown({
  options = [],
  value,
  onChange,
  placeholder = 'Seleccione...',
  icon: Icon = null,
  className = '',
  dropdownClassName = '',
  disabled = false,
  variant = 'default',
  searchable = false,
  menuBg = 'var(--theme-surface)',
  buttonBg = null,
  buttonClassName = '',
  hasError = false,
}) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [hoveredValue, setHoveredValue] = useState(null)
  const [menuStyle, setMenuStyle] = useState({})
  const [openUpward, setOpenUpward] = useState(false)
  const buttonRef = useRef(null)
  const menuRef = useRef(null)
  const searchInputRef = useRef(null)
  const { bgSubcard, textColor, colorPrimario, dropdownShadow, isLight } = useTheme()

  const activeBorder = hasError 
    ? '#ef4444' 
    : (open ? (colorPrimario || 'var(--theme-primary)') : (isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)'))

  const updateMenuPosition = () => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const menuHeight = menuRef.current?.offsetHeight || 240
    const spaceBelow = window.innerHeight - rect.bottom
    const isUp = spaceBelow < menuHeight + 10 && rect.top > menuHeight
    setOpenUpward(isUp)

    setMenuStyle({
      position: 'fixed',
      top: isUp ? rect.top - menuHeight + 1 : rect.bottom - 1,
      left: rect.left,
      width: rect.width,
      zIndex: 99999,
    })
  }

  useEffect(() => {
    if (!open) return
    // slight delay so menuRef has rendered height
    const raf = requestAnimationFrame(updateMenuPosition)
    window.addEventListener('scroll', updateMenuPosition, true)
    window.addEventListener('resize', updateMenuPosition)
    if ((searchable || options.length > 15) && searchInputRef.current) {
      searchInputRef.current.focus()
    }
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', updateMenuPosition, true)
      window.removeEventListener('resize', updateMenuPosition)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (event) => {
      if (
        buttonRef.current && !buttonRef.current.contains(event.target) &&
        menuRef.current && !menuRef.current.contains(event.target)
      ) {
        setOpen(false)
        setSearchTerm('')
        setHoveredValue(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const selectedOption = useMemo(() => {
    return options.find(opt => opt.value === value)
  }, [options, value])

  const displayLabel = selectedOption ? selectedOption.label : placeholder
  const showSearch = searchable || options.length > 15

  const filteredOptions = useMemo(() => {
    let list = options
    if (showSearch && searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim()
      list = list.filter(opt => (opt.label || '').toString().toLowerCase().includes(term))
    }
    return list.slice(0, 100)
  }, [options, showSearch, searchTerm])

  const isUnderline = variant === 'underline'

  // Portal menu
  const menuContent = open ? (
    <div
      ref={menuRef}
      style={{
        ...menuStyle,
        backgroundColor: menuBg || 'var(--theme-surface, #FFFFFF)',
        color: textColor || 'var(--theme-text, #0f172a)',
        border: `1.5px solid ${activeBorder}`,
        borderTop: isUnderline ? 'none' : (openUpward ? `1.5px solid ${activeBorder}` : 'none'),
        borderBottom: isUnderline ? `1.5px solid ${activeBorder}` : (openUpward ? 'none' : `1.5px solid ${activeBorder}`),
        borderRadius: isUnderline 
          ? '0 0 12px 12px' 
          : (openUpward ? '12px 12px 0 0' : '0 0 12px 12px'),
        boxShadow: dropdownShadow || '0 12px 28px -4px rgba(0,0,0,0.18)',
        overflow: 'hidden',
      }}
      className="animate-fadeIn"
    >
      {showSearch && (
        <div className="relative p-2 border-b" style={{ borderColor: 'var(--theme-border-subtle, rgba(0,0,0,0.12))', backgroundColor: 'var(--theme-input, #D8DDE6)' }}>
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar opción..."
            style={{ color: 'var(--theme-text, #0f172a)' }}
            className="bg-transparent text-xs pl-7 pr-6 focus:outline-none w-full"
            onClick={e => e.stopPropagation()}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-1 cursor-pointer hover:opacity-100 text-[var(--theme-text-subtle)]"
            >
              ✕
            </button>
          )}
        </div>
      )}

      <div className="p-1.5 max-h-52 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-white/10 scrollbar-track-transparent space-y-0.5">
        {filteredOptions.length === 0 ? (
          <div className="px-3 py-2 text-xs text-center font-sans text-[var(--theme-text-subtle)]">
            {searchTerm ? 'Sin coincidencias' : 'Sin opciones registradas'}
          </div>
        ) : (
          filteredOptions.map((opt, idx) => {
            const isSelected = opt.value === value
            const isHovered = opt.value === hoveredValue

            let optBg = 'transparent'
            let optColor = textColor || 'var(--theme-text, #0f172a)'
            let optFontWeight = 500

            if (isSelected) {
              optBg = colorPrimario ? `${colorPrimario}24` : 'color-mix(in srgb, var(--theme-primary, #3b82f6) 20%, transparent)'
              optColor = colorPrimario || 'var(--theme-primary, #3b82f6)'
              optFontWeight = 600
            } else if (isHovered) {
              optBg = colorPrimario ? `${colorPrimario}14` : 'color-mix(in srgb, var(--theme-primary, #3b82f6) 12%, transparent)'
              optColor = colorPrimario || 'var(--theme-primary, #3b82f6)'
              optFontWeight = 500
            }

            return (
              <button
                key={opt.value ?? idx}
                type="button"
                onMouseEnter={() => setHoveredValue(opt.value)}
                onMouseLeave={() => setHoveredValue(null)}
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                  setSearchTerm('')
                  setHoveredValue(null)
                }}
                style={{
                  backgroundColor: optBg,
                  color: optColor,
                  fontWeight: optFontWeight,
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer text-left gap-3 transition-colors duration-150"
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && (
                  <Check size={13} className="shrink-0" style={{ color: colorPrimario || 'var(--theme-primary)' }} />
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  ) : null

  return (
    <div
      className={`relative text-left ${className.includes('w-full') ? 'w-full block' : 'inline-block'} ${className}`}
    >
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen(prev => !prev)
            setSearchTerm('')
          }
        }}
        style={
          isUnderline
            ? { color: 'var(--theme-text, #0f172a)', borderColor: activeBorder }
            : {
                backgroundColor: buttonBg || bgSubcard || 'var(--theme-input, #E2E8F0)',
                color: textColor || 'var(--theme-text, #0f172a)',
                borderColor: activeBorder,
                borderBottomLeftRadius: open && !openUpward ? 0 : 12,
                borderBottomRightRadius: open && !openUpward ? 0 : 12,
                borderTopLeftRadius: open && openUpward ? 0 : 12,
                borderTopRightRadius: open && openUpward ? 0 : 12,
              }
        }
        className={
          isUnderline
            ? `flex items-center gap-2.5 w-full justify-between select-none py-3 px-0 text-sm focus:outline-none border-b font-light
              ${disabled ? 'cursor-not-allowed opacity-60' : open ? 'border-[var(--theme-primary)] cursor-pointer' : 'cursor-pointer'} ${buttonClassName}`
            : `input-subcard bg-slate-100 dark:bg-white/5 border-[1.5px] flex items-center gap-2.5 w-full justify-between select-none px-4 py-2.5 text-sm focus:outline-none transition-all duration-150 h-11 font-medium
              ${hasError ? '!border-rose-500 ring-1 ring-rose-500/20' : ''}
              ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${buttonClassName}`
        }
      >
        <div className="flex items-center gap-2 min-w-0">
          {Icon}
          <span className="truncate font-medium text-[var(--theme-text)]">{displayLabel}</span>
        </div>
        <ChevronDown
          size={14}
          className={`text-[var(--theme-text-muted)] transition-transform duration-150 shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Portal: renders outside any overflow:hidden ancestor */}
      {typeof document !== 'undefined' && createPortal(menuContent, document.body)}
    </div>
  )
}

