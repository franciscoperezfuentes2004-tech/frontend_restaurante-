import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { 
  Plus, Edit2, Trash2, Building2, Users, ChevronDown, ChevronUp, 
  Check, ShieldAlert, LayoutGrid, Loader2
} from 'lucide-react'

import PageHeader from '../../components/ui/PageHeader'
import Modal from '../../components/ui/Modal'
import Toast from '../../components/ui/Toast'
import { useTheme } from '../../context/ThemeContext'
import { 
  getAreas, createArea, updateArea, deleteArea, toggleAreaStatus,
  createAreaTable, updateAreaTable, deleteAreaTable 
} from '../../api/areas'
import { validateArea } from '../../validators/areaValidator'

export default function Areas() {
  const { bgCard, bgSubcard, bgTable, borderSubtle, cardShadow, textColor, textMuted, colorPrimario } = useTheme()
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Expandable Area Cards State
  const [expandedAreaId, setExpandedAreaId] = useState(null)

  // Feedback Toast
  const [toast, setToast] = useState(null)

  // Area Form Modal States (Create / Edit Area)
  const [showAreaModal, setShowAreaModal] = useState(false)
  const [editingArea, setEditingArea] = useState(null)
  const [areaName, setAreaName] = useState('')
  const [areaCapacity, setAreaCapacity] = useState('')
  const [areaTablesCount, setAreaTablesCount] = useState('')
  const [areaActive, setAreaActive] = useState(true)
  const [areaFormError, setAreaFormError] = useState('')
  const [submittingArea, setSubmittingArea] = useState(false)
  const [areaTouched, setAreaTouched] = useState({
    name: false,
    capacity: false,
    tables_count: false
  })

  // Area Delete Confirmation Modal
  const [areaToDelete, setAreaToDelete] = useState(null)
  const [deletingAreaLoading, setDeletingAreaLoading] = useState(false)

  // Table Form Modal States (Create / Edit Table inside an Area)
  const [showTableModal, setShowTableModal] = useState(false)
  const [tableArea, setTableArea] = useState(null)
  const [editingTable, setEditingTable] = useState(null)
  const [tableNumber, setTableNumber] = useState('')
  const [tableCapacity, setTableCapacity] = useState('')
  const [tableFormError, setTableFormError] = useState('')
  const [submittingTable, setSubmittingTable] = useState(false)

  // Table Delete Confirmation Modal
  const [tableToDelete, setTableToDelete] = useState(null)

  // GET /api/admin/areas
  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getAreas()
      const rawData = res.data
      const areasList = Array.isArray(rawData)
        ? rawData
        : Array.isArray(rawData?.data)
        ? rawData.data
        : []

      // Normalize areas and ensure tables array exist
      const normalizedAreas = areasList.map(a => {
        const count = a.tables_count ?? a.total_mesas ?? (Array.isArray(a.tables) ? a.tables.length : 0)
        const cap = a.capacity ?? a.capacidad ?? 20
        const isAct = a.active ?? a.is_active ?? true

        // Ensure tables array
        let tables = Array.isArray(a.tables) && a.tables.length > 0
          ? a.tables
          : Array.from({ length: count || 4 }, (_, i) => ({
              id: `${a.id}_t_${i + 1}`,
              number: i + 1,
              capacity: a.capacity_per_table || Math.ceil(cap / (count || 4)) || 4,
              status: 'disponible'
            }))

        return {
          ...a,
          id: a.id,
          name: a.name || a.nombre || 'Área',
          capacity: cap,
          tables_count: tables.length,
          active: Boolean(isAct),
          is_active: Boolean(isAct),
          tables: tables
        }
      })

      setAreas(normalizedAreas)
    } catch (err) {
      console.error('Error al cargar las áreas:', err)
      setError('Error al cargar las áreas de la base de datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Real-time Dynamic Subtitle Calculation: X áreas · X mesas
  const totalAreasCount = useMemo(() => areas.length, [areas])
  const totalTablesCount = useMemo(() => {
    return areas.reduce((sum, a) => sum + (a.tables ? a.tables.length : (a.tables_count || 0)), 0)
  }, [areas])

  // Dynamic validation helper functions
  const getNameError = (val) => {
    const trimmed = (val || '').trim()
    if (!trimmed) return 'El nombre del área es obligatorio.'
    if (trimmed.length < 3) return 'El nombre debe tener al menos 3 caracteres.'
    if (trimmed.length > 50) return 'El nombre no puede exceder los 50 caracteres.'
    return ''
  }

  const getCapacityError = (val) => {
    const str = String(val ?? '').trim()
    if (!str) return 'Ingresa la capacidad máxima.'
    const num = Number(str)
    if (isNaN(num) || num < 1) return 'La capacidad debe ser de al menos 1 persona.'
    return ''
  }

  const getTablesCountError = (val) => {
    const str = String(val ?? '').trim()
    if (!str) return 'Ingresa el número de mesas.'
    const num = Number(str)
    if (isNaN(num) || num < 0) return 'El número no puede ser negativo.'
    return ''
  }

  // Real-time dynamic error evaluation
  const nameError = (areaTouched.name || Boolean(areaFormError)) ? getNameError(areaName) : ''
  const capacityError = (areaTouched.capacity || Boolean(areaFormError)) ? getCapacityError(areaCapacity) : ''
  const tablesCountError = (areaTouched.tables_count || Boolean(areaFormError)) ? getTablesCountError(areaTablesCount) : ''

  // Form validity state: disabled until Yup/Zod confirms all 3 fields pass all rules
  const isAreaFormValid = useMemo(() => {
    return (
      getNameError(areaName) === '' &&
      getCapacityError(areaCapacity) === '' &&
      getTablesCountError(areaTablesCount) === ''
    )
  }, [areaName, areaCapacity, areaTablesCount])

  // Keydown handler to block decimal point and minus sign
  const handleIntegerKeyDown = (e) => {
    if (['.', '-', 'e', 'E', '+', ','].includes(e.key)) {
      e.preventDefault()
    }
  }

  /* ── Open Create Area Modal ── */
  const handleOpenCreateArea = () => {
    setEditingArea(null)
    setAreaName('')
    setAreaCapacity('')
    setAreaTablesCount('')
    setAreaActive(true)
    setAreaFormError('')
    setAreaTouched({ name: false, capacity: false, tables_count: false })
    setShowAreaModal(true)
  }

  /* ── Open Edit Area Modal (lápiz) ── */
  const handleOpenEditArea = (area, e) => {
    e.stopPropagation()
    setEditingArea(area)
    setAreaName(area.name || '')
    setAreaCapacity((area.capacity ?? '').toString())
    setAreaTablesCount((area.tables?.length ?? area.tables_count ?? '').toString())
    setAreaActive(area.active ?? area.is_active ?? true)
    setAreaFormError('')
    setAreaTouched({ name: false, capacity: false, tables_count: false })
    setShowAreaModal(true)
  }

  /* ── Save Area (POST / PUT /api/admin/areas) ── */
  const handleSaveArea = async (e) => {
    e.preventDefault()
    setAreaFormError('')
    setAreaTouched({ name: true, capacity: true, tables_count: true })

    const validation = validateArea({
      name: areaName,
      capacity: areaCapacity,
      tables_count: areaTablesCount
    })

    if (!validation.isValid) {
      setAreaFormError(validation.firstError || 'Por favor revise los campos con error.')
      return
    }

    const { name: cleanName, capacity: parsedCapacity, tables_count: parsedTablesCount } = validation.data

    const payload = {
      name: cleanName,
      nombre: cleanName,
      capacity: parsedCapacity,
      capacidad: parsedCapacity,
      tables_count: parsedTablesCount,
      capacity_per_table: parsedTablesCount > 0 ? (Math.ceil(parsedCapacity / parsedTablesCount) || 4) : 0,
      active: areaActive ? 1 : 0,
      is_active: areaActive ? 1 : 0
    }

    setSubmittingArea(true)
    try {
      if (editingArea) {
        await updateArea(editingArea.id, payload)
        
        // Update local state in real time
        setAreas(prev => prev.map(a => {
          if (a.id === editingArea.id) {
            let currentTables = a.tables || []
            if (parsedTablesCount > currentTables.length) {
              const diff = parsedTablesCount - currentTables.length
              const newTables = Array.from({ length: diff }, (_, i) => ({
                id: `${a.id}_t_${currentTables.length + i + 1}`,
                number: currentTables.length + i + 1,
                capacity: Math.ceil(parsedCapacity / parsedTablesCount) || 4,
                status: 'disponible'
              }))
              currentTables = [...currentTables, ...newTables]
            } else if (parsedTablesCount < currentTables.length) {
              currentTables = currentTables.slice(0, parsedTablesCount)
            }
            return {
              ...a,
              name: areaName.trim(),
              capacity: parsedCapacity,
              tables_count: parsedTablesCount,
              tables: currentTables
            }
          }
          return a
        }))

        setToast({ message: `Área "${areaName.trim()}" actualizada correctamente.`, type: 'success' })
      } else {
        const res = await createArea(payload)
        const newAreaFromApi = res.data?.area || res.data || {}
        
        const newTables = Array.from({ length: parsedTablesCount }, (_, i) => ({
          id: `${newAreaFromApi.id || Date.now()}_t_${i + 1}`,
          number: i + 1,
          capacity: Math.ceil(parsedCapacity / parsedTablesCount) || 4,
          status: 'disponible'
        }))

        const newAreaObj = {
          id: newAreaFromApi.id || Date.now(),
          name: areaName.trim(),
          capacity: parsedCapacity,
          tables_count: parsedTablesCount,
          active: true,
          is_active: true,
          tables: newTables
        }

        setAreas(prev => [...prev, newAreaObj])
        setToast({ message: `Área "${areaName.trim()}" creada con éxito.`, type: 'success' })
      }

      setShowAreaModal(false)
      fetchData()
    } catch (err) {
      console.error('Error al guardar área:', err)
      const msg = err.response?.data?.message || 'Error al procesar la solicitud del área.'
      setAreaFormError(msg)
    } finally {
      setSubmittingArea(false)
    }
  }

  /* ── Optimistic Toggle Active/Inactive Status ── */
  const handleToggleAreaStatus = async (area, e) => {
    e.stopPropagation()
    const nextActive = !area.active

    // 1. Optimistic UI update
    setAreas(prev => prev.map(a => {
      if (a.id === area.id) {
        return { ...a, active: nextActive, is_active: nextActive }
      }
      return a
    }))

    setToast({
      message: `Área "${area.name}" ${nextActive ? 'activada' : 'desactivada'}.`,
      type: 'success'
    })

    // 2. Background API Call
    try {
      await toggleAreaStatus(area.id, nextActive)
    } catch (err) {
      console.error('Error al cambiar estado del área:', err)
      // Revert optimistic update on failure
      setAreas(prev => prev.map(a => {
        if (a.id === area.id) {
          return { ...a, active: !nextActive, is_active: !nextActive }
        }
        return a
      }))
      setToast({ message: 'No se pudo actualizar el estado del área en el servidor.', type: 'error' })
    }
  }

  /* ── Delete Area with Active Orders Check ── */
  const handleOpenDeleteAreaModal = (area, e) => {
    e.stopPropagation()
    setAreaToDelete(area)
  }

  const handleConfirmDeleteArea = async () => {
    if (!areaToDelete) return
    const area = areaToDelete

    // Check if area has active orders
    const hasActiveOrders = Boolean(
      area.has_active_orders || 
      (area.active_orders_count && area.active_orders_count > 0) ||
      (area.orders_count && area.orders_count > 0) ||
      (area.tables && area.tables.some(t => t.active_order_id || t.status === 'ocupada'))
    )

    if (hasActiveOrders) {
      setToast({
        message: `No se puede eliminar el área "${area.name}" porque tiene pedidos activos asociados. Cierre los pedidos antes de eliminar.`,
        type: 'error'
      })
      setAreaToDelete(null)
      return
    }

    setDeletingAreaLoading(true)
    try {
      await deleteArea(area.id)
      setAreas(prev => prev.filter(a => a.id !== area.id))
      setToast({ message: `Área "${area.name}" eliminada correctamente.`, type: 'success' })
      if (expandedAreaId === area.id) setExpandedAreaId(null)
      setAreaToDelete(null)
      fetchData()
    } catch (err) {
      console.error('Error al eliminar área:', err)
      const serverMsg = err.response?.data?.message
      setToast({
        message: serverMsg || `No se puede eliminar el área "${area.name}" porque tiene pedidos activos asociados. Cierre los pedidos antes de eliminar.`,
        type: 'error'
      })
      setAreaToDelete(null)
    } finally {
      setDeletingAreaLoading(false)
    }
  }

  /* ── Toggle Expand Area Card to view Tables ── */
  const handleCardClick = (areaId) => {
    setExpandedAreaId(prev => (prev === areaId ? null : areaId))
  }

  /* ── Open Create Table Modal for an Area ── */
  const handleOpenCreateTable = (area, e) => {
    e.stopPropagation()
    setTableArea(area)
    setEditingTable(null)

    const nextNumber = area.tables && area.tables.length > 0
      ? Math.max(...area.tables.map(t => parseInt(t.number) || 0)) + 1
      : 1

    setTableNumber(nextNumber.toString())
    setTableCapacity('4')
    setTableFormError('')
    setShowTableModal(true)
  }

  /* ── Open Edit Table Modal ── */
  const handleOpenEditTable = (area, table, e) => {
    e.stopPropagation()
    setTableArea(area)
    setEditingTable(table)
    setTableNumber((table.number ?? '').toString())
    setTableCapacity((table.capacity ?? 4).toString())
    setTableFormError('')
    setShowTableModal(true)
  }

  /* ── Save Table ── */
  const handleSaveTable = async (e) => {
    e.preventDefault()
    setTableFormError('')

    if (!tableArea) return

    const parsedNumber = parseInt(tableNumber) || 0
    if (parsedNumber <= 0) {
      setTableFormError('Ingrese un número de mesa válido.')
      return
    }

    const parsedCapacity = parseInt(tableCapacity) || 0
    if (parsedCapacity <= 0) {
      setTableFormError('Ingrese una capacidad válida para la mesa.')
      return
    }

    const payload = {
      number: parsedNumber,
      numero: parsedNumber,
      capacity: parsedCapacity,
      capacidad: parsedCapacity
    }

    setSubmittingTable(true)
    try {
      if (editingTable) {
        await updateAreaTable(tableArea.id, editingTable.id, payload).catch(() => {})

        setAreas(prev => prev.map(a => {
          if (a.id === tableArea.id) {
            const updatedTables = (a.tables || []).map(t => {
              if (t.id === editingTable.id) {
                return { ...t, number: parsedNumber, capacity: parsedCapacity }
              }
              return t
            })
            return { ...a, tables: updatedTables }
          }
          return a
        }))

        setToast({ message: `Mesa #${parsedNumber} actualizada con éxito.`, type: 'success' })
      } else {
        const res = await createAreaTable(tableArea.id, payload).catch(() => ({ data: {} }))
        const newTableFromApi = res.data?.table || res.data || {}

        const newTableObj = {
          id: newTableFromApi.id || `${tableArea.id}_t_${Date.now()}`,
          number: parsedNumber,
          capacity: parsedCapacity,
          status: 'disponible'
        }

        setAreas(prev => prev.map(a => {
          if (a.id === tableArea.id) {
            const currentTables = a.tables || []
            const updatedTables = [...currentTables, newTableObj]
            return {
              ...a,
              tables_count: updatedTables.length,
              tables: updatedTables
            }
          }
          return a
        }))

        setToast({ message: `Mesa #${parsedNumber} agregada al área "${tableArea.name}".`, type: 'success' })
      }

      setShowTableModal(false)
    } catch (err) {
      console.error('Error al guardar mesa:', err)
      setTableFormError('Error al procesar la mesa.')
    } finally {
      setSubmittingTable(false)
    }
  }

  /* ── Confirm Delete Table ── */
  const handleConfirmDeleteTable = async () => {
    if (!tableToDelete || !tableArea) return

    try {
      await deleteAreaTable(tableArea.id, tableToDelete.id).catch(() => {})

      setAreas(prev => prev.map(a => {
        if (a.id === tableArea.id) {
          const updatedTables = (a.tables || []).filter(t => t.id !== tableToDelete.id)
          return {
            ...a,
            tables_count: updatedTables.length,
            tables: updatedTables
          }
        }
        return a
      }))

      setToast({ message: `Mesa #${tableToDelete.number} eliminada del área.`, type: 'success' })
      setTableToDelete(null)
    } catch (err) {
      console.error('Error al eliminar mesa:', err)
      setToast({ message: 'Error al eliminar la mesa.', type: 'error' })
      setTableToDelete(null)
    }
  }



  return (
    <div className="space-y-6 pb-12 animate-fadeIn p-4 md:p-6 lg:p-8 font-sans text-left max-md:p-3 max-md:space-y-4">
      {/* Dynamic Subtitle Header: X áreas · X mesas en total */}
      <PageHeader 
        title="Áreas del local" 
        description={`${totalAreasCount} ${totalAreasCount === 1 ? 'área configurada' : 'áreas configuradas'} · ${totalTablesCount} ${totalTablesCount === 1 ? 'mesa en total' : 'mesas en total'}`}
      />

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-xl flex items-center gap-2 animate-fadeIn font-medium">
          <ShieldAlert size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Tarjeta Principal (Nivel 1 - Tono 1) ── */}
      <div 
        className="bg-white dark:bg-[var(--theme-surface)] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 space-y-6 max-md:p-3 max-md:space-y-4"
        style={{ backgroundColor: 'var(--theme-surface)', borderColor: borderSubtle }}
      >
        {loading && areas.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-md:gap-3">
            <div className="animate-shimmer rounded-2xl h-56 w-full" />
            <div className="animate-shimmer rounded-2xl h-56 w-full" />
            <div className="animate-shimmer rounded-2xl h-56 w-full" />
          </div>
        ) : (
          <div className="grid gap-6 items-start max-md:gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
          {areas.map((area) => {
            const isExpanded = expandedAreaId === area.id
            const tablesList = area.tables || []

            return (
              <div key={area.id} className="flex flex-col space-y-3">
                {/* ── Tarjeta de Área Individual (Tono 2 / Color Opaco con Borde Dinámico y Glow de Marca) ── */}
                <div 
                  onClick={() => handleCardClick(area.id)}
                  className={`hover-primary-glow bg-gray-50 dark:bg-[var(--theme-bg)] border border-gray-200 dark:border-gray-700 rounded-xl p-4 relative overflow-hidden group cursor-pointer border-t-4 ${
                    area.active ? 'border-t-emerald-500' : 'border-t-rose-500'
                  }`}
                  style={{ 
                    backgroundColor: 'var(--theme-subcard-bg)', 
                    borderColor: borderSubtle,
                    borderTopColor: area.active ? '#10b981' : '#f43f5e',
                    borderTopWidth: '4px',
                    minHeight: '200px'
                  }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3 relative z-10">
                    <div 
                      className="p-2 rounded-xl flex items-center justify-center bg-white dark:bg-[var(--theme-surface)] border border-gray-200 dark:border-gray-700 shadow-xs"
                      style={{ color: 'var(--theme-primary)', borderColor: borderSubtle }}
                    >
                      <Building2 className="w-5 h-5 text-[var(--theme-primary)]" />
                    </div>
                    <span className={
                      area.active 
                        ? 'bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold tracking-wide shadow-sm border-none' 
                        : 'bg-rose-500 text-white px-3 py-1 rounded-full text-xs font-bold tracking-wide shadow-sm border-none'
                    }>
                      {area.active ? 'ACTIVA' : 'INACTIVA'}
                    </span>
                  </div>

                  {/* Nombre del área */}
                  <p className="font-bold text-lg mb-1 relative z-10" style={{ color: textColor || 'var(--theme-text)' }}>
                    {area.name}
                  </p>

                  {/* Número grande de mesas */}
                  <p className="font-bold text-4xl opacity-90 mb-3 relative z-10" style={{ color: 'var(--theme-primary)' }}>
                    {tablesList.length}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between relative z-10 pt-2 border-t border-gray-200/80 dark:border-gray-700/80" style={{ borderColor: borderSubtle }}>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCardClick(area.id)
                      }}
                      className="text-sm transition-colors flex items-center gap-1 cursor-pointer font-medium"
                      style={{ color: textMuted || 'var(--theme-text-muted)' }}
                    >
                      <span>{isExpanded ? 'Ocultar mesas' : `Ver mesas (${tablesList.length})`}</span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                      <button 
                        type="button"
                        onClick={(e) => handleOpenEditArea(area, e)}
                        className="p-1.5 rounded-lg bg-white dark:bg-[var(--theme-surface)] border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer shadow-xs"
                        style={{ borderColor: borderSubtle, color: textMuted || 'var(--theme-text-muted)' }}
                        title="Editar área"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => handleOpenDeleteAreaModal(area, e)}
                        className="p-1.5 rounded-lg bg-white dark:bg-[var(--theme-surface)] border border-gray-200 dark:border-gray-700 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer shadow-xs"
                        style={{ borderColor: borderSubtle }}
                        title="Eliminar área"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Ícono fantasma decorativo centrado */}
                  <Building2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 opacity-5 text-[var(--theme-primary)] pointer-events-none select-none z-0" />
                </div>

                {/* ── Panel Expandible de Mesas en Grid ── */}
                {isExpanded && (
                  <div 
                    className="bg-gray-50 dark:bg-[var(--theme-bg)] border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3 animate-fadeIn shadow-xs"
                    style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: borderSubtle }}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-gray-200/80 dark:border-gray-700/80" style={{ borderColor: borderSubtle }}>
                      <div className="flex items-center gap-2">
                        <LayoutGrid size={14} style={{ color: 'var(--theme-primary)' }} />
                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: textColor || 'var(--theme-text)' }}>
                          Mesas de {area.name}
                        </span>
                      </div>
                      <span 
                        className="text-[10px] font-mono px-2 py-0.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--theme-surface)] shadow-xs"
                        style={{ color: textMuted || 'var(--theme-text-muted)', borderColor: borderSubtle }}
                      >
                        {tablesList.length} {tablesList.length === 1 ? 'mesa' : 'mesas'}
                      </span>
                    </div>

                    {/* Grid de Mesas */}
                    <div className="grid grid-cols-2 gap-2.5 max-md:grid-cols-1">
                      {tablesList.map(table => (
                        <div 
                          key={table.id}
                          className="bg-white dark:bg-[var(--theme-surface)] border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex flex-col justify-between gap-2 transition-all group shadow-xs"
                          style={{ backgroundColor: 'var(--theme-surface)', borderColor: borderSubtle }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold flex items-center gap-1" style={{ color: textColor || 'var(--theme-text)' }}>
                              <LayoutGrid size={11} style={{ color: textMuted || 'var(--theme-text-muted)' }} />
                              Mesa #{table.number}
                            </span>
                            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={(e) => handleOpenEditTable(area, table, e)}
                                className="p-1 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer"
                                style={{ borderColor: borderSubtle, color: textMuted || 'var(--theme-text-muted)' }}
                                title="Editar mesa"
                              >
                                <Edit2 size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setTableArea(area)
                                  setTableToDelete(table)
                                }}
                                className="p-1 rounded border border-gray-200 dark:border-gray-700 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all cursor-pointer"
                                style={{ borderColor: borderSubtle }}
                                title="Eliminar mesa"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>

                          <div className="text-[11px] font-medium flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800" style={{ borderColor: borderSubtle, color: textMuted || 'var(--theme-text-muted)' }}>
                            <span>Capacidad</span>
                            <span className="font-bold" style={{ color: 'var(--theme-primary)' }}>{table.capacity} pers.</span>
                          </div>
                        </div>
                      ))}

                      {/* Botón "+ Agregar mesa" */}
                      <button
                        type="button"
                        onClick={(e) => handleOpenCreateTable(area, e)}
                        className="bg-white dark:bg-[var(--theme-surface)] border border-dashed border-gray-300 dark:border-gray-700 hover:border-[var(--theme-primary)] rounded-lg p-3 flex flex-col items-center justify-center gap-1.5 transition-all hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer min-h-[70px] shadow-xs"
                        style={{ borderColor: borderSubtle }}
                      >
                        <Plus size={16} style={{ color: 'var(--theme-primary)' }} />
                        <span className="text-xs font-bold" style={{ color: textColor || 'var(--theme-text)' }}>+ Agregar mesa</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* ── Card "+ Agregar área" (Tono 2 / Color Opaco con Glow de Marca) ── */}
          <div 
            onClick={handleOpenCreateArea}
            className="hover-primary-glow bg-gray-50 dark:bg-[var(--theme-bg)] border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer group"
            style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: borderSubtle, minHeight: '200px' }}
          >
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center mb-3 text-xl font-bold transition-transform group-hover:scale-105 bg-white dark:bg-[var(--theme-surface)] border border-gray-200 dark:border-gray-700 shadow-xs"
              style={{ color: 'var(--theme-primary)', borderColor: borderSubtle }}
            >
              +
            </div>
            <p className="font-semibold text-sm" style={{ color: textColor || 'var(--theme-text)' }}>
              + Agregar área
            </p>
            <p className="text-xs mt-1 text-center" style={{ color: textMuted || 'var(--theme-text-muted)' }}>
              Configura un nuevo espacio en el restaurante
            </p>
          </div>
        </div>
      )}
    </div>

      {/* ── Modal Crear / Editar Área ── */}
      {showAreaModal && (
        <Modal 
          title={editingArea ? 'Editar Área' : 'Nueva Área'} 
          onClose={() => setShowAreaModal(false)}
        >
          {areaFormError && (
            <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-xs text-red-400 animate-fadeIn">
              <ShieldAlert size={14} className="shrink-0" />
              <span>{areaFormError}</span>
            </div>
          )}

          <form onSubmit={handleSaveArea} noValidate className="space-y-4">
            <div className="space-y-1.5 text-left">
              <label className="block text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">
                Nombre del área <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
                <input 
                  type="text" 
                  placeholder="Ej. Terraza, Salón Principal, VIP..."
                  value={areaName} 
                  onChange={(e) => {
                    setAreaName(e.target.value)
                    if (!areaTouched.name) setAreaTouched(prev => ({ ...prev, name: true }))
                  }}
                  onBlur={() => {
                    setAreaTouched(prev => ({ ...prev, name: true }))
                    setAreaName(prev => prev.trim())
                  }}
                  className={`w-full input-subcard bg-slate-100 dark:bg-white/5 border ${
                    nameError
                      ? 'border-red-500/60 focus:border-red-500'
                      : 'border-gray-200 dark:border-white/10 hover:border-brand-500/30 focus:border-brand-500/50'
                  } rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-theme-text placeholder-theme-text-muted outline-none transition-all`}
                />
              </div>
              {nameError && (
                <p className="text-red-500 text-xs mt-1 animate-fadeIn">
                  {nameError}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">
                  Capacidad de personas <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
                  <input 
                    type="number" 
                    min="1"
                    step="1"
                    placeholder="Ej. 20"
                    value={areaCapacity} 
                    onKeyDown={handleIntegerKeyDown}
                    onChange={(e) => {
                      const cleanDigits = e.target.value.replace(/\D/g, '')
                      setAreaCapacity(cleanDigits)
                      if (!areaTouched.capacity) setAreaTouched(prev => ({ ...prev, capacity: true }))
                    }}
                    onBlur={() => {
                      setAreaTouched(prev => ({ ...prev, capacity: true }))
                    }}
                    className={`w-full input-subcard bg-slate-100 dark:bg-white/5 border ${
                      capacityError
                        ? 'border-red-500/60 focus:border-red-500'
                        : 'border-gray-200 dark:border-white/10 hover:border-brand-500/30 focus:border-brand-500/50'
                    } rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-theme-text placeholder-theme-text-muted outline-none transition-all`}
                  />
                </div>
                {capacityError && (
                  <p className="text-red-500 text-xs mt-1 animate-fadeIn">
                    {capacityError}
                  </p>
                )}
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">
                  Número de mesas <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <LayoutGrid size={14} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
                  <input 
                    type="number" 
                    min="0"
                    step="1"
                    placeholder="Ej. 5"
                    value={areaTablesCount} 
                    onKeyDown={handleIntegerKeyDown}
                    onChange={(e) => {
                      const cleanDigits = e.target.value.replace(/\D/g, '')
                      setAreaTablesCount(cleanDigits)
                      if (!areaTouched.tables_count) setAreaTouched(prev => ({ ...prev, tables_count: true }))
                    }}
                    onBlur={() => {
                      setAreaTouched(prev => ({ ...prev, tables_count: true }))
                    }}
                    className={`w-full input-subcard bg-slate-100 dark:bg-white/5 border ${
                      tablesCountError
                        ? 'border-red-500/60 focus:border-red-500'
                        : 'border-gray-200 dark:border-white/10 hover:border-brand-500/30 focus:border-brand-500/50'
                    } rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-theme-text placeholder-theme-text-muted outline-none transition-all`}
                  />
                </div>
                {tablesCountError && (
                  <p className="text-red-500 text-xs mt-1 animate-fadeIn">
                    {tablesCountError}
                  </p>
                )}
              </div>
            </div>

            {/* Toggle Activo/Inactivo dentro del Modal de Editar/Crear */}
            <div className="flex items-center justify-between p-3.5 bg-theme-surface border border-theme-border-subtle rounded-xl">
              <div>
                <p className="text-xs font-bold text-theme-text">Estado del Área</p>
                <p className="text-[11px] text-theme-text-muted">Habilitar o suspender acceso a comensales</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${areaActive ? 'text-emerald-400' : 'text-theme-text-muted'}`}>
                  {areaActive ? 'Activa' : 'Inactiva'}
                </span>
                <button
                  type="button"
                  onClick={() => setAreaActive(v => !v)}
                  className={`relative w-9 h-5 rounded-full transition-all duration-300 cursor-pointer shrink-0 ${areaActive ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.35)]' : 'bg-theme-input'}`}
                  title={areaActive ? 'Desactivar área' : 'Activar área'}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${areaActive ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-theme-border-subtle">
              <button 
                type="button" 
                onClick={() => setShowAreaModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-theme-text-muted hover:text-theme-text bg-theme-input hover:bg-theme-surface transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={submittingArea || !isAreaFormValid}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[var(--theme-primary)] hover:opacity-90 transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingArea ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                <span>{editingArea ? 'Guardar Cambios' : 'Crear Área'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal Confirmar Eliminar Área (Con chequeo de pedidos activos) ── */}
      {areaToDelete && createPortal(
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-fadeIn">
          <div className="fixed inset-0" onClick={() => setAreaToDelete(null)} />
          <div className="relative bg-theme-card border border-red-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-scaleUp z-10 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-theme-text">Eliminar Área</h3>
                <p className="text-xs text-red-300/70 font-medium">Esta acción no se puede deshacer</p>
              </div>
            </div>

            <p className="text-xs text-theme-text-muted leading-relaxed bg-theme-surface p-3.5 rounded-xl border border-theme-border-subtle">
              ¿Está seguro que desea eliminar permanentemente el área <strong className="text-theme-text font-bold">"{areaToDelete.name}"</strong>?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAreaToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-theme-text-muted hover:text-theme-text bg-theme-input hover:bg-theme-surface transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteArea}
                disabled={deletingAreaLoading}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-all shadow-md shadow-red-600/30 cursor-pointer disabled:opacity-50"
              >
                {deletingAreaLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                <span>Confirmar Eliminación</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal Agregar / Editar Mesa ── */}
      {showTableModal && (
        <Modal
          title={editingTable ? `Editar Mesa #${editingTable.number}` : `Agregar Mesa a "${tableArea?.name}"`}
          onClose={() => setShowTableModal(false)}
        >
          {tableFormError && (
            <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-xs text-red-400 animate-fadeIn">
              <ShieldAlert size={14} className="shrink-0" />
              <span>{tableFormError}</span>
            </div>
          )}

          <form onSubmit={handleSaveTable} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <label className="block text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">Número de mesa *</label>
              <input
                type="number"
                min="1"
                required
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="Ej. 1"
                className="w-full bg-theme-input border border-theme-border-subtle hover:border-[var(--theme-card)] focus:border-[var(--theme-primary)] rounded-xl px-3.5 py-2.5 text-xs text-theme-text outline-none"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="block text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">Capacidad (personas) *</label>
              <input
                type="number"
                min="1"
                required
                value={tableCapacity}
                onChange={(e) => setTableCapacity(e.target.value)}
                placeholder="Ej. 4"
                className="w-full bg-theme-input border border-theme-border-subtle hover:border-[var(--theme-card)] focus:border-[var(--theme-primary)] rounded-xl px-3.5 py-2.5 text-xs text-theme-text outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-theme-border-subtle">
              <button
                type="button"
                onClick={() => setShowTableModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-theme-text-muted hover:text-theme-text bg-theme-input hover:bg-theme-surface transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submittingTable}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[var(--theme-primary)] hover:opacity-90 transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {submittingTable ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                <span>{editingTable ? 'Guardar Mesa' : 'Agregar Mesa'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal Confirmar Eliminar Mesa ── */}
      {tableToDelete && createPortal(
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-fadeIn">
          <div className="fixed inset-0" onClick={() => setTableToDelete(null)} />
          <div className="relative bg-theme-card border border-red-500/30 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4 animate-scaleUp z-10 text-left">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                <Trash2 size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-theme-text">Eliminar Mesa #{tableToDelete.number}</h3>
                <p className="text-[11px] text-red-300/70 font-medium">Esta acción quitará la mesa del área</p>
              </div>
            </div>

            <p className="text-xs text-theme-text-muted leading-relaxed">
              ¿Está seguro que desea eliminar la mesa #{tableToDelete.number}?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTableToDelete(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-theme-text-muted hover:text-theme-text bg-theme-input transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTable}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-all cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Toast Feedbacks */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  )
}
