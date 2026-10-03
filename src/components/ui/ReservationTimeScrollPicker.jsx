import { useRef, useEffect, useCallback, useMemo, useState } from 'react'
import { getConfiguracion } from '../../api/settings'

const ITEM_HEIGHT = 40
const CONTAINER_HEIGHT = 160
const EDGE_PADDING = (CONTAINER_HEIGHT - ITEM_HEIGHT) / 2

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const ALL_DAY_SLOTS = (() => {
  const slots = []
  for (let minutes = 8 * 60; minutes <= 23 * 60 + 30; minutes += 30) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }
  return slots
})()

function formatTimeLabel(slot) {
  if (!slot || typeof slot !== 'string') return slot
  const [hStr, mStr] = slot.split(':')
  const h24 = parseInt(hStr, 10)
  const m = mStr || '00'
  const period = h24 >= 12 ? 'p. m.' : 'a. m.'
  let h12 = h24 % 12
  if (h12 === 0) h12 = 12
  return `${h12}:${m} ${period}`
}

function isSlotInRange(slot, open, close) {
  return slot >= open && slot <= close
}

export default function ReservationTimeScrollPicker({ value, onChange, date }) {
  const listRef = useRef(null)
  const scrollTimeoutRef = useRef(null)
  const [schedule, setSchedule] = useState([])

  useEffect(() => {
    getConfiguracion()
      .then((res) => {
        const d = res.data || {}
        if (Array.isArray(d.schedule)) {
          setSchedule(d.schedule.map((item) => ({
            day: item.day,
            active: !!(item.active ?? item.is_active ?? true),
            open: item.open ?? '08:00',
            close: item.close ?? '23:30',
          })))
        }
      })
      .catch(() => {})
  }, [])

  const daySchedule = useMemo(() => {
    if (!date || !schedule.length) return null
    const d = new Date(`${date}T12:00:00`)
    if (Number.isNaN(d.getTime())) return null
    return schedule.find((s) => s.day === DAY_NAMES[d.getDay()]) ?? null
  }, [date, schedule])

  const isAllowed = useCallback((slot) => {
    if (!daySchedule) return true
    if (!daySchedule.active) return false
    return isSlotInRange(slot, daySchedule.open, daySchedule.close)
  }, [daySchedule])

  const scrollToIndex = useCallback((index, behavior = 'auto') => {
    if (!listRef.current) return
    listRef.current.scrollTo({ top: index * ITEM_HEIGHT, behavior })
  }, [])

  const findNearestAllowedIndex = useCallback((fromIndex) => {
    if (isAllowed(ALL_DAY_SLOTS[fromIndex])) return fromIndex

    for (let offset = 1; offset < ALL_DAY_SLOTS.length; offset++) {
      const before = fromIndex - offset
      const after = fromIndex + offset
      if (before >= 0 && isAllowed(ALL_DAY_SLOTS[before])) return before
      if (after < ALL_DAY_SLOTS.length && isAllowed(ALL_DAY_SLOTS[after])) return after
    }
    return fromIndex
  }, [isAllowed])

  const applySelection = useCallback((rawIndex) => {
    const clamped = Math.max(0, Math.min(ALL_DAY_SLOTS.length - 1, rawIndex))
    const targetIndex = findNearestAllowedIndex(clamped)
    const slot = ALL_DAY_SLOTS[targetIndex]

    scrollToIndex(targetIndex)
    if (slot && isAllowed(slot) && slot !== value) {
      onChange(slot)
    }
  }, [findNearestAllowedIndex, isAllowed, onChange, scrollToIndex, value])

  useEffect(() => {
    if (!listRef.current) return
    const idx = value ? ALL_DAY_SLOTS.indexOf(value) : -1
    const initialIndex = idx >= 0 ? findNearestAllowedIndex(idx) : findNearestAllowedIndex(0)
    requestAnimationFrame(() => scrollToIndex(initialIndex))
  }, [findNearestAllowedIndex, scrollToIndex, value])

  useEffect(() => {
    if (!value || isAllowed(value)) return
    const idx = ALL_DAY_SLOTS.indexOf(value)
    const nearest = findNearestAllowedIndex(idx >= 0 ? idx : 0)
    onChange(ALL_DAY_SLOTS[nearest])
  }, [date, daySchedule, findNearestAllowedIndex, isAllowed, onChange, value])

  const handleScroll = () => {
    if (!listRef.current) return

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }

    scrollTimeoutRef.current = setTimeout(() => {
      if (!listRef.current) return
      const rawIndex = Math.round(listRef.current.scrollTop / ITEM_HEIGHT)
      applySelection(rawIndex)
    }, 80)
  }

  const handleItemClick = (index) => {
    if (!isAllowed(ALL_DAY_SLOTS[index])) return
    applySelection(index)
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border border-theme-border-subtle bg-theme-input"
      style={{ height: CONTAINER_HEIGHT }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-14 pointer-events-none z-10"
        style={{
          background: 'linear-gradient(to bottom, var(--theme-card, var(--theme-surface)) 0%, transparent 100%)',
        }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-14 pointer-events-none z-10"
        style={{
          background: 'linear-gradient(to top, var(--theme-card, var(--theme-surface)) 0%, transparent 100%)',
        }}
      />

      <div
        ref={listRef}
        onScroll={handleScroll}
        className="h-full w-full overflow-y-auto scrollbar-none"
        style={{
          scrollSnapType: 'y mandatory',
          paddingTop: EDGE_PADDING,
          paddingBottom: EDGE_PADDING,
        }}
      >
        {ALL_DAY_SLOTS.map((slot, idx) => {
          const selected = slot === value
          const allowed = isAllowed(slot)

          return (
            <button
              key={slot}
              type="button"
              onClick={() => handleItemClick(idx)}
              disabled={!allowed}
              className={`flex items-center justify-center text-sm transition-all duration-150 ${
                selected
                  ? 'font-bold rounded-xl'
                  : 'text-theme-text-muted font-medium'
              } ${!allowed ? 'opacity-30 pointer-events-none' : 'cursor-pointer'}`}
              style={{
                height: ITEM_HEIGHT,
                scrollSnapAlign: 'center',
                width: selected ? 'calc(100% - 16px)' : '100%',
                marginLeft: selected ? 8 : 0,
                marginRight: selected ? 8 : 0,
                ...(selected
                  ? { backgroundColor: 'var(--color-primario)', color: '#ffffff' }
                  : {}),
              }}
            >
              {formatTimeLabel(slot)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
