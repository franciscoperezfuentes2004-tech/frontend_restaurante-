import { createContext, useContext, useState } from 'react'

const CalendarContext = createContext(null)

export function CalendarProvider({ children }) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  return (
    <CalendarContext.Provider value={{ isCalendarOpen, setIsCalendarOpen }}>
      {children}
    </CalendarContext.Provider>
  )
}

export function useCalendar() {
  const ctx = useContext(CalendarContext)
  if (!ctx) {
    // Si no hay contexto (componente usado fuera del provider), devuelve un fallback seguro
    return { isCalendarOpen: false, setIsCalendarOpen: () => {} }
  }
  return ctx
}
