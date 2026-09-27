import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Search } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

export default function DishesMultiSelect({ dishes = [], selected = [], onChange, buttonBg, buttonClassName, hasError = false }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef(null)
  const { bgSubcard, bgDropdown, bgCard, textColor, textMuted, dropdownShadow, isLight } = useTheme()

  const safeDishes = Array.isArray(dishes) ? dishes : []
  const safeSelected = Array.isArray(selected) ? selected : []

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const filteredDishes = safeDishes.filter(dish => 
    (dish?.name || '').toLowerCase().includes((search || '').toLowerCase())
  )

  const isAllSelected = safeDishes.length > 0 && safeSelected.length === safeDishes.length

  const handleToggleAll = () => {
    if (isAllSelected) {
      if (onChange) onChange([])
    } else {
      if (onChange) onChange(safeDishes.map(d => d?.id).filter(Boolean))
    }
  }

  const handleToggleDish = (id) => {
    if (safeSelected.includes(id)) {
      if (onChange) onChange(safeSelected.filter(item => item !== id))
    } else {
      if (onChange) onChange([...safeSelected, id])
    }
  }

  const getDisplayText = () => {
    if (safeSelected.length === 0) return 'Seleccionar platillos...'
    if (isAllSelected) return 'Todos los platillos'
    
    return safeSelected
      .map(id => {
        const d = safeDishes.find(dish => String(dish?.id) === String(id))
        return d?.name || id
      })
      .join(', ')
  }

  return (
    <div ref={containerRef} className="relative w-full text-left">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          backgroundColor: buttonBg || bgSubcard,
          color: textColor,
          borderColor: hasError ? '#ef4444' : (isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)')
        }}
        className={`input-subcard bg-slate-100 dark:bg-white/5 border flex items-center gap-2.5 w-full justify-between cursor-pointer select-none transition-all duration-200 px-4 py-2.5 text-sm focus:outline-none h-11 font-medium
          ${hasError ? '!border-rose-500 ring-1 ring-rose-500/20' : ''}
          ${open 
            ? 'rounded-t-xl rounded-b-none shadow-md' 
            : 'rounded-xl'
          } ${buttonClassName || ''}`}
      >
        <span className={`truncate ${safeSelected.length === 0 ? 'opacity-50' : 'font-medium'}`} style={{ color: textColor }}>
          {getDisplayText()}
        </span>
        <ChevronDown 
          size={14}
          style={{ color: textMuted }}
          className={`transition-transform duration-200 shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Options Container */}
      <div 
        style={{
          backgroundColor: bgDropdown || bgCard,
          borderColor: isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)',
          boxShadow: dropdownShadow
        }}
        className={`absolute left-0 right-0 z-50 border-x border-b rounded-b-xl overflow-hidden transition-all duration-200 origin-top transform flex flex-col ${
          open 
            ? 'opacity-100 scale-y-100 pointer-events-auto' 
            : 'opacity-0 scale-y-95 pointer-events-none'
        }`}
      >
        {/* Search Bar inside options container */}
        <div 
          className="relative p-2 border-b"
          style={{ 
            borderColor: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)',
            backgroundColor: isLight ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.02)'
          }}
        >
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar platillo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ color: textColor }}
            className="w-full bg-transparent border-none text-xs pl-8 pr-2 focus:outline-none placeholder:opacity-50"
          />
        </div>

        {/* Option List */}
        <div className="p-1.5 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent space-y-1">
          {/* Select All option */}
          {search === '' && safeDishes.length > 0 && (
            <button
              type="button"
              onClick={handleToggleAll}
              style={{ color: isAllSelected ? undefined : textColor }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer
                         transition-all duration-150 text-left gap-4
                         ${isAllSelected ? 'bg-brand-600/15 text-brand-600 dark:text-brand-300 font-bold' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
              <span>[ Seleccionar todos los platillos ]</span>
              {isAllSelected && <Check size={12} className="text-brand-500 shrink-0" />}
            </button>
          )}

          {filteredDishes.map((dish) => {
            const isSelected = safeSelected.includes(dish?.id)
            return (
              <button
                key={dish?.id || dish?.name}
                type="button"
                onClick={() => handleToggleDish(dish?.id)}
                style={{ color: isSelected ? undefined : textColor }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer
                           transition-all duration-150 text-left gap-4
                           ${isSelected
                             ? 'bg-brand-600/15 text-brand-600 dark:text-brand-300 font-semibold'
                             : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
              >
                <span className="truncate">{dish?.name}</span>
                {isSelected && <Check size={12} className="text-brand-500 shrink-0" />}
              </button>
            )
          })}

          {filteredDishes.length === 0 && (
            <div className="text-center py-4 text-xs" style={{ color: textMuted }}>
              No se encontraron platillos
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
