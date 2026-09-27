import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useCalendar } from '../../context/CalendarContext'

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const WEEKDAYS = ['LU', 'MA', 'MI', 'JU', 'VI', 'SÁ', 'DO']

export default function DatePicker({
  value,
  selected,
  onChange,
  placeholder = 'Filtrar Fecha...',
  clearable = true,
  fullWidth = false,
  customPrefix = 'Filtrar Fecha:',
  align = 'left',
  highlightedDates = [],
  disabled = false,
  variant = 'default',
  className = '',
  minDate = null,
  min = null,
  filterDate = null,
  dateFormat = 'yyyy-MM-dd',
  inputBg = null,
  hasError = false,
}) {
  const { bgSubcard, bgCard, bgInput, borderSubtle, textColor, textMuted, isLight, colorPrimario } = useTheme()
  const { setIsCalendarOpen } = useCalendar()
  const [isOpen, setIsOpenState] = useState(false)

  const currentValue = value !== undefined ? value : selected

  const setIsOpen = (val) => {
    setIsOpenState(val)
    if (typeof setIsCalendarOpen === 'function') {
      setIsCalendarOpen(val)
    }
  }

  const toDateStr = (d) => {
    if (!d) return null
    if (d instanceof Date) {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }
    return typeof d === 'string' ? d.slice(0, 10) : null
  }

  const effectiveMinStr = toDateStr(minDate || min)

  const parseDateString = (val) => {
    if (!val) return null
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val
    if (typeof val !== 'string') return null
    const parts = val.split('-').map(Number)
    if (parts.length !== 3 || parts.some(n => isNaN(n))) return null
    const [y, m, d] = parts
    const dateObj = new Date(y, m - 1, d)
    return isNaN(dateObj.getTime()) ? null : dateObj
  }

  const [currentDate, setCurrentDate] = useState(() => {
    return parseDateString(currentValue) || new Date()
  })

  const panelRef = useRef(null)

  // Sync internal state with prop value / selected
  useEffect(() => {
    const parsed = parseDateString(currentValue)
    if (parsed) {
      setCurrentDate(parsed)
    }
  }, [currentValue])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const handlePrevMonth = (e) => {
    e.stopPropagation()
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const handleNextMonth = (e) => {
    e.stopPropagation()
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const handleSelectDay = (dayNum, isCurrentMonth, e) => {
    e.stopPropagation()
    let selectedDate
    if (isCurrentMonth) {
      selectedDate = new Date(year, month, dayNum)
    } else if (dayNum > 20) {
      // Previous month day
      selectedDate = new Date(year, month - 1, dayNum)
    } else {
      // Next month day
      selectedDate = new Date(year, month + 1, dayNum)
    }

    const yyyy = selectedDate.getFullYear()
    const mm = String(selectedDate.getMonth() + 1).padStart(2, '0')
    const dd = String(selectedDate.getDate()).padStart(2, '0')
    const formatted = `${yyyy}-${mm}-${dd}`
    
    if (typeof onChange === 'function') onChange(formatted)
    setIsOpen(false)
  }

  const handleToday = (e) => {
    e.stopPropagation()
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    const formatted = `${yyyy}-${mm}-${dd}`
    if (effectiveMinStr && formatted < effectiveMinStr) return
    if (typeof filterDate === 'function' && !filterDate(today)) return
    if (typeof onChange === 'function') onChange(formatted)
    setIsOpen(false)
  }

  const handleClear = (e) => {
    e.stopPropagation()
    if (typeof onChange === 'function') onChange('')
    setIsOpen(false)
  }

  // Calculate grid of days
  const getDaysGrid = () => {
    const grid = []
    
    // First day of current month
    const firstDayIndex = new Date(year, month, 1).getDay()
    // Convert Sunday = 0 to index 6, Monday = 1 to index 0, etc.
    const startOffset = (firstDayIndex + 6) % 7

    // Number of days in current and previous months
    const totalDays = new Date(year, month + 1, 0).getDate()
    const prevTotalDays = new Date(year, month, 0).getDate()

    // Add previous month filler days
    for (let i = startOffset - 1; i >= 0; i--) {
      grid.push({
        dayNum: prevTotalDays - i,
        isCurrentMonth: false
      })
    }

    // Add current month days
    for (let i = 1; i <= totalDays; i++) {
      grid.push({
        dayNum: i,
        isCurrentMonth: true
      })
    }

    // Add next month filler days to complete standard 6-row layout (42 items)
    const remaining = 42 - grid.length
    for (let i = 1; i <= remaining; i++) {
      grid.push({
        dayNum: i,
        isCurrentMonth: false
      })
    }

    return grid
  }

  // Display label on the input trigger button
  const getDisplayLabel = () => {
    const parsed = parseDateString(currentValue)
    if (!parsed) return placeholder
    return parsed.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const daysGrid = getDaysGrid()

  // Format date helper for comparison
  const isSelected = (dayNum, isCurrentMonth) => {
    if (!isCurrentMonth) return false
    const parsed = parseDateString(currentValue)
    if (!parsed) return false
    return parsed.getFullYear() === year && parsed.getMonth() === month && parsed.getDate() === dayNum
  }

  const isToday = (dayNum, isCurrentMonth) => {
    if (!isCurrentMonth) return false
    const today = new Date()
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === dayNum
  }

  const getFullDateString = (dayNum, isCurrentMonth) => {
    let dYear = year
    let dMonth = month
    if (!isCurrentMonth) {
      if (dayNum > 20) {
        dMonth = month - 1
        if (dMonth < 0) {
          dMonth = 11
          dYear = year - 1
        }
      } else {
        dMonth = month + 1
        if (dMonth > 11) {
          dMonth = 0
          dYear = year + 1
        }
      }
    }
    const yyyy = dYear
    const mm = String(dMonth + 1).padStart(2, '0')
    const dd = String(dayNum).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  const isUnderline = variant === 'underline'

  return (
    <div className={`font-sans ${fullWidth || isUnderline ? 'w-full' : 'inline-block w-full md:w-auto'} ${className}`}>
      {/* Trigger Button */}
      {isUnderline ? (
        <div 
          onClick={() => !disabled && setIsOpen(!isOpen)}
          style={{ borderColor: hasError ? '#ef4444' : (isOpen ? 'var(--theme-primary)' : 'color-mix(in srgb, var(--theme-primary) 40%, transparent)') }}
          className={`flex items-center justify-between select-none py-3 px-0 border-b font-light text-sm cursor-pointer transition-colors duration-200 ${
            hasError ? 'border-red-500' : 'hover:border-[var(--theme-primary)]'
          } ${
            disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''
          }`}
        >
          <span className={`truncate text-sm ${currentValue ? 'text-[var(--theme-text)]' : 'text-[var(--theme-text-subtle)]'}`}>
            {getDisplayLabel()}
          </span>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {currentValue && clearable && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleClear(e)
                }}
                className="text-[var(--theme-text-subtle)] hover:text-[var(--theme-text)] transition-colors p-0.5 cursor-pointer"
                title="Limpiar fecha"
              >
                <X size={14} />
              </button>
            )}
            <Calendar size={15} className="text-[var(--theme-text-muted)] shrink-0"/>
          </div>
        </div>
      ) : (
        <div 
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`input-subcard bg-slate-100 dark:bg-white/5 flex items-center gap-2 rounded-xl px-4 py-2.5 transition-all duration-200 justify-between select-none border font-medium ${
            fullWidth ? 'w-full h-11' : 'self-stretch md:self-auto'
          } ${
            hasError ? '!border-rose-500 ring-1 ring-rose-500/20' : 'border-gray-200 dark:border-white/10 hover:border-brand-500/40'
          } ${
            disabled 
              ? 'opacity-20 cursor-not-allowed pointer-events-none' 
              : 'hover:opacity-90 cursor-pointer'
          }`}
          style={{ backgroundColor: inputBg || bgSubcard, borderColor: hasError ? '#ef4444' : undefined }}
        >
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-theme-text-muted shrink-0"/>
            {!fullWidth && customPrefix && <span className="text-xs text-theme-text-muted font-semibold mr-1 shrink-0">{customPrefix}</span>}
            <span className={`text-xs font-semibold ${currentValue ? 'text-theme-text' : 'text-theme-text-muted'}`}>
              {getDisplayLabel()}
            </span>
          </div>
          
          {currentValue && clearable && (
            <button
              onClick={handleClear}
              className="text-white/25 hover:text-theme-text-muted transition-colors cursor-pointer shrink-0 ml-2"
              title="Limpiar fecha"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Popover DatePicker calendar panel as Centered Modal */}
      {isOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-xs bg-black/40 animate-fadeIn">
          {/* Clickable backdrop overlay to close */}
          <div className="absolute inset-0 cursor-default" onClick={() => setIsOpen(false)} />
          
          <div 
            ref={panelRef}
            className="relative w-[290px] rounded-2xl p-4 z-10 animate-scaleIn shadow-2xl"
            style={{ backgroundColor: 'var(--theme-card)', border: '1px solid var(--theme-border-subtle)' }}
          >
          {/* Header navigation */}
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-black/5 dark:hover:bg-white/10"
              style={{ border: '1px solid var(--theme-border-subtle)', color: 'var(--theme-text)' }}
            >
              <ChevronLeft size={16} />
            </button>
            
            <span style={{ color: 'var(--theme-text)' }} className="text-sm font-semibold select-none">
              {MONTHS[month]} {year}
            </span>

            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-black/5 dark:hover:bg-white/10"
              style={{ border: '1px solid var(--theme-border-subtle)', color: 'var(--theme-text)' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {WEEKDAYS.map(w => (
              <span 
                key={w} 
                style={{ color: 'var(--theme-text-muted)' }} 
                className="text-[10px] font-bold uppercase select-none py-1"
              >
                {w}
              </span>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {daysGrid.map((item, idx) => {
              const selected = isSelected(item.dayNum, item.isCurrentMonth)
              const today = isToday(item.dayNum, item.isCurrentMonth)
              const fullDateStr = getFullDateString(item.dayNum, item.isCurrentMonth)
              const hasMovement = highlightedDates && highlightedDates.includes(fullDateStr)

              const [cY, cM, cD] = fullDateStr.split('-').map(Number)
              const cellDate = new Date(cY, cM - 1, cD)

              const isPast = effectiveMinStr ? fullDateStr < effectiveMinStr : false
              const isFiltered = typeof filterDate === 'function' ? !filterDate(cellDate) : false
              const isDisabled = isPast || isFiltered
              
              let dayClass = isLight ? 'hover:bg-black/5' : 'hover:bg-white/10'
              if (selected && !isDisabled) {
                dayClass = 'text-white font-bold shadow-lg'
              } else if (today && !isDisabled) {
                dayClass = 'font-semibold'
              }

              const selectedStyle = (selected && !isDisabled) ? {
                backgroundColor: 'var(--theme-primary, #7c3aed)',
                color: '#ffffff',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
              } : (today && !isDisabled) ? {
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'var(--theme-primary, #7c3aed)',
                color: 'var(--theme-primary, #7c3aed)',
                backgroundColor: isLight ? 'transparent' : 'rgba(255, 255, 255, 0.08)'
              } : {
                color: item.isCurrentMonth ? 'var(--theme-text)' : 'var(--theme-text-muted)'
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isDisabled}
                  onClick={(e) => !isDisabled && handleSelectDay(item.dayNum, item.isCurrentMonth, e)}
                  className={`text-xs py-1.5 rounded-xl transition-all duration-150 flex items-center justify-center font-medium ${
                    isDisabled ? 'opacity-25 cursor-not-allowed pointer-events-none text-gray-400' : `cursor-pointer ${dayClass}`
                  }`}
                  style={isDisabled ? { opacity: 0.25, cursor: 'not-allowed' } : selectedStyle}
                >
                  {item.dayNum}
                </button>
              )
            })}
          </div>

          {/* Footer controls */}
          <div
            className="flex justify-between items-center mt-4 pt-3"
            style={{ borderTop: '1px solid var(--theme-border-subtle)' }}
          >
            <button
              onClick={handleClear}
              style={{ color: 'var(--theme-text-muted)' }}
              className="text-xs hover:text-red-400 transition-colors font-medium px-2 py-1 rounded-lg hover:bg-red-500/10 cursor-pointer"
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={handleToday}
              disabled={(effectiveMinStr && toDateStr(new Date()) < effectiveMinStr) || (typeof filterDate === 'function' && !filterDate(new Date()))}
              className="text-xs font-semibold px-3 py-1 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ color: 'var(--theme-primary, #7c3aed)', backgroundColor: 'var(--theme-primary, #7c3aed)1A' }}
            >
              Hoy
            </button>
          </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
